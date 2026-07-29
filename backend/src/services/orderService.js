const crypto = require('crypto');
const AppError = require('../utils/AppError');
const accessoryRepository = require('../repositories/accessoryRepository');
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const Accessory = require('../models/Accessory');
const Product = require('../models/Product');
const voucherService = require('./voucherService');
const withTransaction = require('../utils/withTransaction');

const allowedStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'];
const statusTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'completed'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};
const safeUpdateFields = [
  'customer',
  'note',
  'shippingProvider',
  'trackingNumber',
  'estimatedDelivery',
];

class OrderService {
  buildIdempotencyKey(rawKey, user, customer = {}) {
    const key = String(rawKey || '').trim().slice(0, 120);
    if (!key) return '';
    const principal = user?.id
      ? `user:${user.id}`
      : `guest:${String(customer.email || '').trim().toLowerCase()}:${String(customer.phone || '').trim()}`;
    return crypto.createHash('sha256').update(`${principal}:${key}`).digest('hex');
  }

  buildRequestFingerprint(payload = {}) {
    const customer = payload.customer || {};
    const items = (payload.items || [])
      .map((item) => {
        const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
        const id = type === 'accessory'
          ? item.accessoryId || item.productId || item.id
          : item.productId || item.id;
        return {
          id: String(id || ''),
          quantity: Number(item.quantity),
          type,
        };
      })
      .sort((left, right) => (
        `${left.type}:${left.id}:${left.quantity}`
          .localeCompare(`${right.type}:${right.id}:${right.quantity}`)
      ));
    const intent = {
      items,
      customer: {
        fullName: String(customer.fullName || '').trim(),
        email: String(customer.email || '').trim().toLowerCase(),
        phone: String(customer.phone || '').trim(),
        address: String(customer.address || '').trim(),
        province: String(customer.province || '').trim(),
        district: String(customer.district || '').trim(),
        ward: String(customer.ward || '').trim(),
      },
      paymentMethod: payload.paymentMethod || 'cod',
      voucherCode: String(payload.voucherCode || '').trim().toUpperCase(),
      note: String(payload.note || '').trim(),
    };
    return crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex');
  }

  assertMatchingIntent(existing, requestFingerprint, paymentMethod) {
    const matches = existing.requestFingerprint
      ? existing.requestFingerprint === requestFingerprint
      : existing.paymentMethod === paymentMethod;
    if (!matches) {
      throw new AppError(
        'This idempotency key was already used for a different checkout request',
        409,
      );
    }
  }

  shippingQuote(customer = {}, subtotal = 0) {
    if (subtotal >= 10000000) return { fee: 0, days: 1 };
    const province = String(customer.province || customer.address || '').toLowerCase();
    if (province.includes('hồ chí minh') || province.includes('ho chi minh') || province.includes('tp.hcm')) {
      return { fee: 20000, days: 1 };
    }
    if (province.includes('hà nội') || province.includes('ha noi') || province.includes('đà nẵng') || province.includes('da nang')) {
      return { fee: 30000, days: 2 };
    }
    return { fee: 40000, days: 4 };
  }

  async generateOrderNumber(session) {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replaceAll('-', '');
    const sequence = await orderRepository.nextSequence(datePart, session);
    return `TP${datePart}${String(sequence).padStart(4, '0')}`;
  }

  async normalizeItems(items = [], session) {
    const normalized = [];
    for (const item of items) {
      const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
      const itemId = type === 'accessory'
        ? item.accessoryId || item.productId || item.id
        : item.productId || item.id;
      const quantity = Number(item.quantity);
      const catalogItem = type === 'accessory'
        ? await accessoryRepository.findById(itemId, { session })
        : await productRepository.findById(itemId, { session });

      if (!catalogItem || catalogItem.status !== 'active') {
        throw new AppError(`${type === 'accessory' ? 'Accessory' : 'Product'} is unavailable`, 400);
      }
      if (catalogItem.stock < quantity) {
        throw new AppError(`${catalogItem.name} does not have enough stock`, 400);
      }

      normalized.push({
        id: catalogItem.id,
        productId: type === 'product' ? catalogItem.id : null,
        accessoryId: type === 'accessory' ? catalogItem.id : null,
        name: catalogItem.name,
        image: catalogItem.image || '',
        price: Number(catalogItem.price),
        quantity,
        type,
      });
    }
    return normalized;
  }

  calculateDiscount(voucher, subtotal, shippingFee) {
    if (!voucher) return 0;
    if (voucher.type === 'percent') {
      return Math.min((subtotal * voucher.value) / 100, voucher.maxDiscount || Infinity);
    }
    if (voucher.type === 'fixed') return Math.min(voucher.value, subtotal);
    if (voucher.type === 'shipping') return Math.min(voucher.value, shippingFee);
    return 0;
  }

  async rollbackInventory(decrements, session) {
    for (const { Model, id, quantity } of decrements) {
      await Model.updateOne(
        { _id: id },
        { $inc: { stock: quantity, sold: -quantity } },
        { session },
      );
    }
  }

  async decrementInventory(items, session) {
    const decrements = [];
    for (const item of items) {
      const Model = item.type === 'accessory' ? Accessory : Product;
      const id = item.type === 'accessory' ? item.accessoryId : item.productId;
      const updated = await Model.findOneAndUpdate(
        { _id: id, isDeleted: false, status: 'active', stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, sold: item.quantity } },
        { returnDocument: 'after', runValidators: true, session },
      );

      if (!updated) {
        if (!session) await this.rollbackInventory(decrements);
        throw new AppError(`${item.name} does not have enough stock`, 400);
      }

      decrements.push({ Model, id, quantity: item.quantity });
    }
    return decrements;
  }

  async restoreInventory(items = [], session) {
    for (const item of items) {
      const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
      const Model = type === 'accessory' ? Accessory : Product;
      const id = type === 'accessory' ? item.accessoryId || item.id : item.productId || item.id;
      await Model.updateOne(
        { _id: id },
        { $inc: { stock: item.quantity, sold: -item.quantity } },
        { session },
      );
    }
  }

  async create(payload, user, metadata = {}) {
    const paymentMethod = payload.paymentMethod || 'cod';
    const requestFingerprint = this.buildRequestFingerprint({
      ...payload,
      paymentMethod,
    });
    const idempotencyKey = this.buildIdempotencyKey(
      metadata.idempotencyKey,
      user,
      payload.customer,
    );
    await orderRepository.ensureIndexes();
    try {
      return await withTransaction(async (session) => {
        if (idempotencyKey) {
          const existing = await orderRepository.findByIdempotencyKey(
            idempotencyKey,
            session,
          );
          if (existing) {
            this.assertMatchingIntent(existing, requestFingerprint, paymentMethod);
            return existing;
          }
        }

        const items = await this.normalizeItems(payload.items, session);
        if (!items.length) throw new AppError('Order must contain at least one item', 422);
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shipping = this.shippingQuote(payload.customer, subtotal);
        const shippingFee = shipping.fee;
        const voucher = payload.voucherCode
          ? await voucherService.reserve(payload.voucherCode, subtotal, session)
          : null;
        const discount = this.calculateDiscount(voucher, subtotal, shippingFee);
        const total = Math.max(0, subtotal + shippingFee - discount);

        await this.decrementInventory(items, session);
        return orderRepository.create({
          orderNumber: await this.generateOrderNumber(session),
          idempotencyKey: idempotencyKey || undefined,
          requestFingerprint,
          userId: user?.id || null,
          items,
          subtotal,
          shippingFee,
          discount,
          total,
          customer: payload.customer,
          paymentMethod,
          paymentStatus: 'pending',
          paymentReference: payload.paymentReference || '',
          shippingProvider: 'TechPhone Express',
          trackingNumber: `TPX${Date.now().toString().slice(-10)}`,
          estimatedDelivery: new Date(Date.now() + shipping.days * 24 * 60 * 60 * 1000),
          note: payload.note || '',
          voucherCode: voucher?.code || null,
          status: 'pending',
        }, session);
      });
    } catch (error) {
      if (idempotencyKey && error?.code === 11000) {
        const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          this.assertMatchingIntent(existing, requestFingerprint, paymentMethod);
          return existing;
        }
      }
      throw error;
    }
  }

  async list(user, query = {}) {
    const filter = {};
    if (user.role !== 'admin') filter.userId = user.id;
    if (query.status) filter.status = query.status;
    return orderRepository.findAll(filter, { sort: { createdAt: -1 } });
  }

  async myOrders(userId) {
    return orderRepository.findAll({ userId }, { sort: { createdAt: -1 } });
  }

  async getById(id, user) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError('Order not found', 404);
    if (user.role !== 'admin' && order.userId !== user.id) throw new AppError('Order access denied', 403);
    return order;
  }

  async lookup(orderNumber, phone) {
    const order = await orderRepository.findByOrderNumberAndPhone(orderNumber, phone);
    if (!order) throw new AppError('No matching order found', 404);
    return order;
  }

  async update(id, payload) {
    const fields = Object.keys(payload || {});
    if (!fields.length || fields.some((field) => !safeUpdateFields.includes(field))) {
      throw new AppError('Only customer and shipping details can be updated here', 422);
    }
    const safePayload = Object.fromEntries(
      fields.map((field) => [field, payload[field]]),
    );
    return orderRepository.update(id, safePayload);
  }

  async updateStatus(id, status) {
    if (!allowedStatuses.includes(status)) throw new AppError('Invalid order status', 422);
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === status) return order;
    if (!statusTransitions[order.status].includes(status)) {
      throw new AppError(`Cannot change order status from ${order.status} to ${status}`, 400);
    }
    if (status === 'cancelled') return this.cancelOrder(order.id);
    return orderRepository.update(id, { status });
  }

  async cancelOrder(id, user) {
    return withTransaction(async (session) => {
      const order = await orderRepository.findById(id, { session });
      if (!order) throw new AppError('Order not found', 404);
      if (user && user.role !== 'admin' && order.userId !== user.id) {
        throw new AppError('Order access denied', 403);
      }
      if (order.status === 'cancelled') return order;
      if (['paid', 'refund_required', 'refunded'].includes(order.paymentStatus)) {
        throw new AppError('A paid order cannot be cancelled automatically', 400);
      }
      if (['shipping', 'delivered', 'completed'].includes(order.status)) {
        throw new AppError('Order can no longer be cancelled', 400);
      }

      const previous = await orderRepository.transitionToCancelled(
        id,
        ['pending', 'confirmed'],
        session,
      );
      if (!previous) {
        const current = await orderRepository.findById(id, { session });
        if (current?.status === 'cancelled') return current;
        throw new AppError('Order can no longer be cancelled', 400);
      }

      await this.restoreInventory(previous.items, session);
      if (previous.voucherCode && !previous.voucherUsageReleased) {
        await voucherService.release(previous.voucherCode, session);
        await orderRepository.claimVoucherUsageRelease(id, session);
      }
      return orderRepository.findById(id, { session });
    });
  }

  async cancel(id, user) {
    return this.cancelOrder(id, user);
  }

  async remove(id) {
    return orderRepository.softDelete(id);
  }
}

module.exports = new OrderService();
