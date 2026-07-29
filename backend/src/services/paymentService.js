const AppError = require('../utils/AppError');
const env = require('../config/env');
const orderRepository = require('../repositories/orderRepository');
const paymentTransactionRepository = require('../repositories/paymentTransactionRepository');
const orderService = require('./orderService');
const vnpayProvider = require('./paymentProviders/vnpayProvider');

class PaymentService {
  getConfig() {
    return {
      providers: {
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

    const idempotencyKey = String(metadata.idempotencyKey || '').slice(0, 120);
    const existing = await paymentTransactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const order = await orderRepository.findById(existing.orderId);
      return { order, paymentUrl: existing.rawResponse?.paymentUrl, transaction: existing };
    }

    const order = await orderService.create({ ...payload, paymentMethod: 'card' }, user);
    const reference = `${order.orderNumber}${Date.now().toString().slice(-6)}`;

    try {
      const paymentUrl = vnpayProvider.createPaymentUrl({
        amount: order.total,
        config: env.vnpay,
        ipAddress: metadata.ipAddress,
        orderInfo: `Thanh toan don hang ${order.orderNumber}`,
        reference,
      });
      const transaction = await paymentTransactionRepository.create({
        orderId: order.id,
        provider: 'vnpay',
        method: 'card',
        amount: order.total,
        reference,
        idempotencyKey,
        rawResponse: { paymentUrl },
      });
      await orderRepository.update(order.id, { paymentReference: reference });
      return { order: { ...order, paymentReference: reference }, paymentUrl, transaction };
    } catch (error) {
      await orderService.updateStatus(order.id, 'cancelled').catch(() => {});
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

    const paid = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
    const transactionUpdate = {
      status: paid ? 'paid' : 'failed',
      providerTransactionId: query.vnp_TransactionNo || '',
      bankCode: query.vnp_BankCode || '',
      responseCode: query.vnp_ResponseCode || '',
      rawResponse: query,
      paidAt: paid ? new Date() : null,
    };
    await paymentTransactionRepository.update(transaction.id, transactionUpdate);
    await orderRepository.update(transaction.orderId, {
      paymentStatus: paid ? 'paid' : 'failed',
      ...(paid ? { status: 'confirmed' } : {}),
    });

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  verifyVnpayReturn(query) {
    return vnpayProvider.verifyCallback(query, env.vnpay.hashSecret);
  }
}

module.exports = new PaymentService();
