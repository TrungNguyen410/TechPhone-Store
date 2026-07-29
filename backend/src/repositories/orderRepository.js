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

  async findRecent(limit = 5) {
    const docs = await Order.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(limit);
    return docs.map((doc) => doc.toJSON());
  }
}

module.exports = new OrderRepository();
