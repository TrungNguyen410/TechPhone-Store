const BaseRepository = require('./baseRepository');
const PaymentTransaction = require('../models/PaymentTransaction');

class PaymentTransactionRepository extends BaseRepository {
  constructor() {
    super(PaymentTransaction);
  }

  async ensureIndexes() {
    await PaymentTransaction.init();
  }

  async create(payload) {
    await this.ensureIndexes();
    return super.create(payload);
  }

  async findByReference(reference) {
    const doc = await PaymentTransaction.findOne({ reference });
    return doc?.toJSON() || null;
  }

  async findPendingByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    await this.ensureIndexes();
    const doc = await PaymentTransaction.findOne({
      status: 'pending',
      $or: [
        { activeIdempotencyKey: idempotencyKey },
        { idempotencyKey, activeIdempotencyKey: { $exists: false } },
      ],
    });
    return doc?.toJSON() || null;
  }

  async expirePendingBefore(idempotencyKey, cutoff) {
    if (!idempotencyKey) return null;
    const doc = await PaymentTransaction.findOneAndUpdate(
      { idempotencyKey, status: 'pending', createdAt: { $lte: cutoff } },
      { $set: { status: 'expired' }, $unset: { activeIdempotencyKey: 1 } },
      { returnDocument: 'after', runValidators: true },
    );
    return doc?.toJSON() || null;
  }

  async findPendingByOrderId(orderId) {
    const doc = await PaymentTransaction.findOne({ orderId, status: 'pending' });
    return doc?.toJSON() || null;
  }

  async expireOtherPending(orderId, transactionId) {
    return PaymentTransaction.updateMany(
      { orderId, _id: { $ne: transactionId }, status: 'pending' },
      { $set: { status: 'expired' }, $unset: { activeIdempotencyKey: 1 } },
    );
  }

  async settle(id, payload) {
    const doc = await PaymentTransaction.findOneAndUpdate(
      { _id: id },
      { $set: payload, $unset: { activeIdempotencyKey: 1 } },
      { returnDocument: 'after', runValidators: true },
    );
    return doc?.toJSON() || null;
  }
}

module.exports = new PaymentTransactionRepository();
