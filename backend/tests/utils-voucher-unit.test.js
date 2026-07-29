const voucherService = require('../src/services/voucherService');
const Voucher = require('../src/models/Voucher');
const AppError = require('../src/utils/AppError');
const { successResponse, errorResponse } = require('../src/utils/apiResponse');
const asyncHandler = require('../src/utils/asyncHandler');
const { createId } = require('../src/utils/id');
const { buildRegex, parsePagination } = require('../src/utils/query');
const slugify = require('../src/utils/slugify');
const { hashToken, signAccessToken, signRefreshToken } = require('../src/utils/token');
const { errorHandler } = require('../src/middlewares/errorMiddleware');

describe('Utility helpers', () => {
  it('formats success and error API responses', () => {
    const successRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    successResponse(successRes, { ok: true });
    expect(successRes.status).toHaveBeenCalledWith(200);
    expect(successRes.json).toHaveBeenCalledWith({ success: true, message: 'Success', data: { ok: true } });

    const errorRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorResponse(errorRes, 'Bad input', 422, [{ msg: 'Invalid' }]);
    expect(errorRes.status).toHaveBeenCalledWith(422);
    expect(errorRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Bad input',
      data: { errors: [{ msg: 'Invalid' }] },
    });

    const plainErrorRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorResponse(plainErrorRes);
    expect(plainErrorRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      data: {},
    });
  });

  it('handles async errors and small helper branches', async () => {
    const error = new AppError('Custom failure', 418, ['x']);
    expect(error.statusCode).toBe(418);
    expect(error.errors).toEqual(['x']);

    const defaultError = new AppError('Default failure');
    expect(defaultError.statusCode).toBe(500);

    const next = jest.fn();
    await asyncHandler(async () => {
      throw error;
    })({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);

    expect(createId()).toHaveLength(24);
    expect(buildRegex('iPhone.').test('iphone.')).toBe(true);
    expect(parsePagination({})).toBeNull();
    expect(parsePagination({ page: 0, limit: 200 })).toBeNull();
    expect(parsePagination({ page: 2, pageSize: 500 })).toEqual({ page: 2, limit: 100 });
    expect(slugify('Dien thoai Apple')).toBe('dien-thoai-apple');
    expect(slugify()).toBe('');
  });

  it('hides unexpected server errors in production while preserving AppError messages', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';

    try {
      const unexpectedRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      errorHandler(new Error('mongodb://private-host/internal'), {}, unexpectedRes, jest.fn());
      expect(unexpectedRes.status).toHaveBeenCalledWith(500);
      expect(unexpectedRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        data: {},
      });

      const operationalRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      errorHandler(new AppError('Payment temporarily unavailable', 503), {}, operationalRes, jest.fn());
      expect(operationalRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Payment temporarily unavailable',
        data: {},
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      consoleSpy.mockRestore();
    }
  });

  it('signs and hashes JWT values', () => {
    const user = { id: 'user-1', role: 'admin' };
    expect(signAccessToken(user).split('.')).toHaveLength(3);
    expect(signRefreshToken(user).split('.')).toHaveLength(3);
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });
});

describe('Voucher service unit coverage', () => {
  const createVoucher = (overrides = {}) =>
    Voucher.create({
      code: overrides.code || 'TECH10',
      type: overrides.type || 'percent',
      value: overrides.value ?? 10,
      minOrder: overrides.minOrder ?? 5000000,
      maxDiscount: overrides.maxDiscount ?? 1000000,
      quantity: overrides.quantity ?? 10,
      used: overrides.used ?? 0,
      startDate: overrides.startDate || '2026-01-01',
      endDate: overrides.endDate || '2026-12-31',
      active: overrides.active ?? true,
    });

  it('creates, lists, updates, retrieves, and soft deletes vouchers', async () => {
    const created = await voucherService.create({
      code: 'save50',
      type: 'fixed',
      value: 50000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(created.code).toBe('SAVE50');

    const list = await voucherService.list();
    expect(list).toHaveLength(1);

    const updated = await voucherService.update(created.id, { code: 'save100', value: 100000 });
    expect(updated.code).toBe('SAVE100');

    const fetched = await voucherService.getById(created.id);
    expect(fetched.id).toBe(created.id);

    const removed = await voucherService.remove(created.id);
    expect(removed.deleted).toBe(true);
  });

  it('validates voucher business rules', async () => {
    await createVoucher();
    await expect(voucherService.validate('tech10', 6000000)).resolves.toEqual(
      expect.objectContaining({ code: 'TECH10' }),
    );

    await expect(voucherService.validate('missing', 6000000)).rejects.toThrow('Voucher code is invalid');
    await expect(voucherService.validate('tech10', 1000000)).rejects.toThrow('minimum value');
  });

  it('rejects inactive, exhausted, and expired vouchers', async () => {
    await createVoucher({ code: 'OFF', active: false });
    await createVoucher({ code: 'FULL', quantity: 1, used: 1 });
    await createVoucher({ code: 'OLD', startDate: '2020-01-01', endDate: '2020-12-31' });

    await expect(voucherService.validate('OFF', 6000000)).rejects.toThrow('invalid');
    await expect(voucherService.validate('FULL', 6000000)).rejects.toThrow('fully used');
    await expect(voucherService.validate('OLD', 6000000)).rejects.toThrow('date range');
  });

  it('throws when fetching a missing voucher', async () => {
    await expect(voucherService.getById('missing')).rejects.toThrow('Voucher not found');
  });
});
