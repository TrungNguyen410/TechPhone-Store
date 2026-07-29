const BaseRepository = require('./baseRepository');
const Order = require('../models/Order');

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async findByOrderNumberAndPhone(orderNumber, phone) {
    const order = await Order.findOne({
      isDeleted: false,
      orderNumber: orderNumber.toUpperCase(),
      'customer.phone': phone,
    });
    return order?.toJSON() || null;
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const order = await Order.findOne({ isDeleted: false, idempotencyKey });
    return order?.toJSON() || null;
  }

  async transitionToCancelled(id, statuses) {
    const order = await Order.findOneAndUpdate(
      { _id: id, isDeleted: false, status: { $in: statuses } },
      { status: 'cancelled' },
      { returnDocument: 'before', runValidators: true },
    );
    return order?.toJSON() || null;
  }

  async claimVoucherUsageRelease(id) {
    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        voucherCode: { $ne: null },
        voucherUsageReleased: { $ne: true },
      },
      { voucherUsageReleased: true },
      { returnDocument: 'after', runValidators: true },
    );
    return order?.toJSON() || null;
  }

  async findRecent(limit = 5) {
    const docs = await Order.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(limit);
    return docs.map((doc) => doc.toJSON());
  }
}

module.exports = new OrderRepository();
