const AppError = require('../utils/AppError');
const voucherRepository = require('../repositories/voucherRepository');

class VoucherService {
  async list() {
    return voucherRepository.findAll({}, { sort: { createdAt: -1 } });
  }

  async getById(id) {
    const voucher = await voucherRepository.findById(id);
    if (!voucher) throw new AppError('Voucher not found', 404);
    return voucher;
  }

  async create(payload) {
    return voucherRepository.create({ ...payload, code: payload.code.toUpperCase() });
  }

  async update(id, payload) {
    const nextPayload = { ...payload };
    if (payload.code) nextPayload.code = payload.code.toUpperCase();
    return voucherRepository.update(id, nextPayload);
  }

  async remove(id) {
    return voucherRepository.softDelete(id);
  }

  async validate(code, subtotal) {
    const voucher = await voucherRepository.findByCode(code);
    if (!voucher || !voucher.active) throw new AppError('Voucher code is invalid', 400);
    if (voucher.quantity && voucher.used >= voucher.quantity) throw new AppError('Voucher has been fully used', 400);
    if (Number(subtotal) < voucher.minOrder) throw new AppError('Order does not meet voucher minimum value', 400);

    const today = new Date();
    const start = new Date(voucher.startDate);
    const end = new Date(voucher.endDate);
    end.setHours(23, 59, 59, 999);
    if (today < start || today > end) throw new AppError('Voucher is outside its valid date range', 400);

    return voucher;
  }

  async reserve(code, subtotal) {
    const voucher = await voucherRepository.reserve(code, subtotal);
    if (voucher) return voucher;
    await this.validate(code, subtotal);
    throw new AppError('Voucher could not be reserved', 409);
  }

  async release(code) {
    return voucherRepository.release(code);
  }
}

module.exports = new VoucherService();
