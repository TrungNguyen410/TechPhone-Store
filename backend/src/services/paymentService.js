const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const orderRepository = require('../repositories/orderRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const orderService = require('./orderService');
const vnpayProvider = require('./paymentProviders/vnpayProvider');

const PAYMENT_URL_TTL_MS = 15 * 60 * 1000;

class PaymentService {
  getConfig() {
    const bank = {
      name: String(env.bank.name || '').trim(),
      bin: String(env.bank.bin || '').trim(),
      accountNumber: String(env.bank.accountNumber || '').trim(),
      accountName: String(env.bank.accountName || '').trim(),
    };
    const momo = {
      phone: String(env.momo.phone || '').trim(),
      accountName: String(env.momo.accountName || '').trim(),
    };
    const bankEnabled = Boolean(
      bank.name && bank.bin && bank.accountNumber && bank.accountName,
    );
    const momoEnabled = Boolean(momo.phone && momo.accountName);
    return {
      providers: {
        cod: { enabled: true },
        bank: {
          enabled: bankEnabled,
          ...(bankEnabled
            ? {
                display: {
                  bankName: bank.name,
                  bankBin: bank.bin,
                  accountNumber: bank.accountNumber,
                  accountName: bank.accountName,
                },
              }
            : {}),
        },
        momo: {
          enabled: momoEnabled,
          ...(momoEnabled
            ? { display: { phone: momo.phone, accountName: momo.accountName } }
            : {}),
        },
        vnpay: {
          enabled: Boolean(env.vnpay.tmnCode && env.vnpay.hashSecret),
          mode: env.nodeEnv === 'production' ? 'production' : 'sandbox',
        },
      },
    };
  }

  assertVnpayConfigured() {
    if (!env.vnpay.tmnCode || !env.vnpay.hashSecret) {
      throw new AppError('VNPay is not configured. Add VNPAY_TMN_CODE and VNPAY_HASH_SECRET.', 503);
    }
  }

  async createVnpayCheckout(payload, user, metadata = {}) {
    this.assertVnpayConfigured();

    const idempotencyKey = orderService.buildIdempotencyKey(
      metadata.idempotencyKey,
      user,
      payload.customer,
    );
    const existing = await paymentTransactionRepository.findPendingByIdempotencyKey(
      idempotencyKey,
    );
    if (existing) {
      const stale = new Date(existing.createdAt).getTime() <= Date.now() - PAYMENT_URL_TTL_MS;
      if (!stale) {
        const order = await orderRepository.findById(existing.orderId);
        return { order, paymentUrl: existing.rawResponse?.paymentUrl, transaction: existing };
      }
      await paymentTransactionRepository.expirePendingBefore(
        idempotencyKey,
        new Date(Date.now() - PAYMENT_URL_TTL_MS),
      );

      const replacement = await paymentTransactionRepository.findPendingByIdempotencyKey(
        idempotencyKey,
      );
      if (replacement) {
        const order = await orderRepository.findById(replacement.orderId);
        return {
          order,
          paymentUrl: replacement.rawResponse?.paymentUrl,
          transaction: replacement,
        };
      }
    }

    const order = await orderService.create(
      { ...payload, paymentMethod: 'card' },
      user,
      { idempotencyKey: metadata.idempotencyKey },
    );
    if (order.paymentStatus === 'paid') {
      throw new AppError('This order has already been paid', 409);
    }
    const reference =
      `${order.orderNumber}${Date.now().toString().slice(-6)}${crypto.randomBytes(3).toString('hex')}`;

    const paymentUrl = vnpayProvider.createPaymentUrl({
      amount: order.total,
      config: env.vnpay,
      ipAddress: metadata.ipAddress,
      orderInfo: `Thanh toan don hang ${order.orderNumber}`,
      reference,
    });
    try {
      const transaction = await paymentTransactionRepository.create({
        orderId: order.id,
        provider: 'vnpay',
        method: 'card',
        amount: order.total,
        reference,
        idempotencyKey: idempotencyKey || undefined,
        activeIdempotencyKey: idempotencyKey || undefined,
        rawResponse: { paymentUrl },
      });
      await orderRepository.update(order.id, {
        paymentReference: reference,
        paymentStatus: 'pending',
      });
      return {
        order: { ...order, paymentReference: reference, paymentStatus: 'pending' },
        paymentUrl,
        transaction,
      };
    } catch (error) {
      if (idempotencyKey && error?.code === 11000) {
        const winner = await paymentTransactionRepository.findPendingByIdempotencyKey(
          idempotencyKey,
        );
        if (winner) {
          const winnerOrder = await orderRepository.findById(winner.orderId);
          return {
            order: winnerOrder,
            paymentUrl: winner.rawResponse?.paymentUrl,
            transaction: winner,
          };
        }
      }
      throw error;
    }
  }

  async processVnpayIpn(query) {
    if (!vnpayProvider.verifyCallback(query, env.vnpay.hashSecret)) {
      return { RspCode: '97', Message: 'Invalid checksum' };
    }

    const reference = query.vnp_TxnRef;
    const transaction = await paymentTransactionRepository.findByReference(reference);
    if (!transaction) return { RspCode: '01', Message: 'Order not found' };

    const callbackAmount = Number(query.vnp_Amount) / 100;
    if (callbackAmount !== transaction.amount) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }
    if (transaction.status === 'paid') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }
    const order = await orderRepository.findById(transaction.orderId);
    if (order?.paymentStatus === 'paid') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const paid = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
    const transactionUpdate = {
      status: paid ? 'paid' : 'failed',
      providerTransactionId: query.vnp_TransactionNo || '',
      bankCode: query.vnp_BankCode || '',
      responseCode: query.vnp_ResponseCode || '',
      rawResponse: query,
      paidAt: paid ? new Date() : null,
    };
    await paymentTransactionRepository.settle(transaction.id, transactionUpdate);
    if (paid) {
      await paymentTransactionRepository.expireOtherPending(
        transaction.orderId,
        transaction.id,
      );
      await orderRepository.update(transaction.orderId, {
        paymentStatus: 'paid',
        status: 'confirmed',
      });
    } else {
      const activeAttempt = await paymentTransactionRepository.findPendingByOrderId(
        transaction.orderId,
      );
      if (!activeAttempt) {
        await orderRepository.update(transaction.orderId, { paymentStatus: 'failed' });
      }
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  verifyVnpayReturn(query) {
    return vnpayProvider.verifyCallback(query, env.vnpay.hashSecret);
  }

  createResultProof(query) {
    if (!this.verifyVnpayReturn(query)) return '';
    return jwt.sign(
      {
        provider: 'vnpay',
        reference: query.vnp_TxnRef || '',
        code: query.vnp_ResponseCode || '',
      },
      env.jwtAccessSecret,
      {
        expiresIn: '5m',
        audience: 'vnpay-result',
        issuer: 'techphone',
      },
    );
  }

  verifyResultProof(proof) {
    try {
      const payload = jwt.verify(proof, env.jwtAccessSecret, {
        audience: 'vnpay-result',
        issuer: 'techphone',
      });
      if (payload.provider !== 'vnpay') throw new Error('Invalid payment provider');
      return {
        valid: true,
        reference: payload.reference,
        code: payload.code,
      };
    } catch {
      throw new AppError('Payment result proof is invalid or expired', 400);
    }
  }
}

module.exports = new PaymentService();
