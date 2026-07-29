const BaseRepository = require('./baseRepository');
const Order = require('../models/Order');

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async ensureIndexes() {
    await Order.init();
  }

  async create(payload, session) {
    await this.ensureIndexes();
    if (!session) return super.create(payload);
    const [order] = await Order.create([payload], { session });
    return order.toJSON();
  }

  async findByOrderNumberAndPhone(orderNumber, phone) {
    const order = await Order.findOne({
      isDeleted: false,
      orderNumber: orderNumber.toUpperCase(),
      'customer.phone': phone,
    });
    return order?.toJSON() || null;
  }

  async findByIdempotencyKey(idempotencyKey, session) {
    if (!idempotencyKey) return null;
    await this.ensureIndexes();
    const order = await Order.findOne({ isDeleted: false, idempotencyKey }).session(session || null);
    return order?.toJSON() || null;
  }

  async transitionToCancelled(id, statuses, session) {
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        status: { $in: statuses },
        paymentStatus: { $nin: ['paid', 'refund_required', 'refunded'] },
      },
      { status: 'cancelled' },
      { returnDocument: 'before', runValidators: true, session },
    );
    return order?.toJSON() || null;
  }

  async claimVoucherUsageRelease(id, session) {
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        voucherCode: { $ne: null },
        voucherUsageReleased: { $ne: true },
      },
      { voucherUsageReleased: true },
      { returnDocument: 'after', runValidators: true, session },
    );
    return order?.toJSON() || null;
  }

  async updateState(id, filter, payload, session) {
    const order = await Order.findOneAndUpdate(
      { _id: id, isDeleted: false, ...filter },
      { $set: payload },
      { returnDocument: 'after', runValidators: true, session },
    );
    return order?.toJSON() || null;
  }

  async findRecent(limit = 5) {
    const docs = await Order.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(limit);
    return docs.map((doc) => doc.toJSON());
  }
}

module.exports = new OrderRepository();
