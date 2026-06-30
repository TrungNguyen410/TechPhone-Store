const BaseRepository = require('./baseRepository');
const Voucher = require('../models/Voucher');

class VoucherRepository extends BaseRepository {
  constructor() {
    super(Voucher);
  }

  async findByCode(code) {
    const voucher = await Voucher.findOne({
      code: code.trim().toUpperCase(),
      isDeleted: false,
    });
    return voucher?.toJSON() || null;
  }
}

module.exports = new VoucherRepository();
