const BaseRepository = require('./baseRepository');
const PaymentTransaction = require('../models/PaymentTransaction');

class PaymentTransactionRepository extends BaseRepository {
  constructor() {
    super(PaymentTransaction);
  }

  async findByReference(reference) {
    const doc = await PaymentTransaction.findOne({ reference });
    return doc?.toJSON() || null;
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const doc = await PaymentTransaction.findOne({ idempotencyKey });
    return doc?.toJSON() || null;
  }
}

module.exports = new PaymentTransactionRepository();
