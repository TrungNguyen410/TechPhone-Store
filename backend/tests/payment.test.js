const request = require('supertest');
const { app } = require('./helpers');
const env = require('../src/config/env');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const PaymentTransaction = require('../src/models/PaymentTransaction');
const { signParams } = require('../src/services/paymentProviders/vnpayProvider');
const vnpayProvider = require('../src/services/paymentProviders/vnpayProvider');

const customer = {
  fullName: 'Guest Customer',
  email: 'guest@example.com',
  phone: '0912345678',
  address: '1 Nguyen Hue',
  province: 'Ho Chi Minh',
};

describe('VNPay checkout and IPN', () => {
  env.bank ||= {};
  env.momo ||= {};
  const originalBank = { ...env.bank };
  const originalMomo = { ...env.momo };

  beforeEach(() => {
    env.vnpay.tmnCode = 'TESTCODE';
    env.vnpay.hashSecret = 'test-vnpay-secret';
    env.vnpay.returnUrl = 'http://localhost:5000/api/payments/vnpay/return';
    Object.assign(env.bank, {
      name: '',
      bin: '',
      accountNumber: '',
      accountName: '',
    });
    Object.assign(env.momo, { phone: '', accountName: '' });
  });

  afterAll(() => {
    Object.assign(env.bank, originalBank);
    Object.assign(env.momo, originalMomo);
  });

  it('returns only enabled providers and public payment display data', async () => {
    Object.assign(env.bank, {
      name: 'Test Bank',
      bin: '970436',
      accountNumber: '123456789',
      accountName: 'TECHPHONE TEST',
    });

    const response = await request(app).get('/api/payments/config').expect(200);

    expect(response.body.data.providers.bank).toEqual({
      enabled: true,
      display: {
        bankName: 'Test Bank',
        bankBin: '970436',
        accountNumber: '123456789',
        accountName: 'TECHPHONE TEST',
      },
    });
    expect(response.body.data.providers.momo.enabled).toBe(false);
    expect(response.body.data.providers.vnpay.enabled).toBe(true);
    expect(JSON.stringify(response.body.data)).not.toContain(env.vnpay.hashSecret);
    expect(response.body.data.providers.vnpay).not.toHaveProperty('tmnCode');
  });

  it('creates a guest order and confirms it only after a valid IPN', async () => {
    const product = await Product.create({
      name: 'Test Phone',
      slug: 'test-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 1000000,
      stock: 3,
      status: 'active',
    });

    const checkout = await request(app)
      .post('/api/payments/vnpay/checkout')
      .set('Idempotency-Key', 'checkout-test-1')
      .send({
        items: [{ id: product.id, type: 'product', quantity: 1 }],
        customer,
        paymentMethod: 'card',
      })
      .expect(201);

    expect(checkout.body.data.paymentUrl).toContain('sandbox.vnpayment.vn');
    expect(checkout.body.data.order.paymentStatus).toBe('pending');

    const transaction = await PaymentTransaction.findOne();
    const query = {
      vnp_Amount: String(transaction.amount * 100),
      vnp_BankCode: 'NCB',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14567890',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: transaction.reference,
    };
    query.vnp_SecureHash = signParams(query, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(query).expect(200, {
      RspCode: '00',
      Message: 'Confirm Success',
    });

    const order = await Order.findById(transaction.orderId);
    expect(order.paymentStatus).toBe('paid');
    expect(order.status).toBe('confirmed');
  });

  it('retries a failed VNPay URL creation with the same pending order and reserved stock', async () => {
    const product = await Product.create({
      name: 'Retry Phone',
      slug: 'retry-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const createPaymentUrl = vnpayProvider.createPaymentUrl;
    const providerSpy = jest
      .spyOn(vnpayProvider, 'createPaymentUrl')
      .mockImplementationOnce(() => {
        throw new Error('Temporary VNPay failure');
      })
      .mockImplementation(createPaymentUrl);

    try {
      await request(app)
        .post('/api/payments/vnpay/checkout')
        .set('Idempotency-Key', 'checkout-retry-1')
        .send(payload)
        .expect(500);

      const pendingOrder = await Order.findOne();
      expect(pendingOrder.status).toBe('pending');
      expect((await Product.findById(product.id)).stock).toBe(2);

      const retry = await request(app)
        .post('/api/payments/vnpay/checkout')
        .set('Idempotency-Key', 'checkout-retry-1')
        .send(payload)
        .expect(201);

      expect(retry.body.data.order.id).toBe(pendingOrder.id);
      expect(retry.body.data.order.status).toBe('pending');
      expect((await Product.findById(product.id)).stock).toBe(2);
      expect(await Order.countDocuments()).toBe(1);
    } finally {
      providerSpy.mockRestore();
    }
  });

  it('rejects a callback with an invalid signature', async () => {
    const response = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({ vnp_TxnRef: 'missing', vnp_SecureHash: 'invalid' })
      .expect(200);

    expect(response.body).toEqual({ RspCode: '97', Message: 'Invalid checksum' });
  });
});
