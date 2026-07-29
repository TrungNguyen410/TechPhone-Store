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

  it('trims display values and does not enable whitespace-only providers', async () => {
    Object.assign(env.bank, {
      name: '  Test Bank  ',
      bin: ' 970436 ',
      accountNumber: ' 123456789 ',
      accountName: ' TECHPHONE TEST ',
    });
    Object.assign(env.momo, { phone: '   ', accountName: ' TECHPHONE MOMO ' });

    const response = await request(app).get('/api/payments/config').expect(200);

    expect(response.body.data.providers.bank.display).toEqual({
      bankName: 'Test Bank',
      bankBin: '970436',
      accountNumber: '123456789',
      accountName: 'TECHPHONE TEST',
    });
    expect(response.body.data.providers.momo).toEqual({ enabled: false });
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

  it('converges concurrent checkout requests to one order, transaction, and payment URL', async () => {
    const product = await Product.create({
      name: 'Concurrent Payment Phone',
      slug: 'concurrent-payment-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => request(app)
      .post('/api/payments/vnpay/checkout')
      .set('Idempotency-Key', 'checkout-concurrent-payment')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.order.id).toBe(first.body.data.order.id);
    expect(second.body.data.transaction.id).toBe(first.body.data.transaction.id);
    expect(second.body.data.paymentUrl).toBe(first.body.data.paymentUrl);
    expect(await Order.countDocuments()).toBe(1);
    expect(await PaymentTransaction.countDocuments()).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
    const activeKeyIndex = (await PaymentTransaction.collection.indexes())
      .find((index) => index.key?.activeIdempotencyKey === 1);
    expect(activeKeyIndex).toEqual(expect.objectContaining({ unique: true, sparse: true }));
  });

  it('issues one fresh attempt when concurrent retries follow a failed transaction', async () => {
    const product = await Product.create({
      name: 'Failed Retry Phone',
      slug: 'failed-retry-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 4000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => request(app)
      .post('/api/payments/vnpay/checkout')
      .set('Idempotency-Key', 'checkout-failed-retry')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { status: 'failed' }, $unset: { activeIdempotencyKey: 1 } },
    );

    const [firstRetry, secondRetry] = await Promise.all([post(), post()]);

    expect(firstRetry.status).toBe(201);
    expect(secondRetry.status).toBe(201);
    expect(firstRetry.body.data.order.id).toBe(initial.body.data.order.id);
    expect(firstRetry.body.data.transaction.id).not.toBe(initial.body.data.transaction.id);
    expect(secondRetry.body.data.transaction.id).toBe(firstRetry.body.data.transaction.id);
    expect(secondRetry.body.data.paymentUrl).toBe(firstRetry.body.data.paymentUrl);
    expect(await PaymentTransaction.countDocuments({ status: 'pending' })).toBe(1);
    expect(await PaymentTransaction.countDocuments({ status: 'failed' })).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('expires a stale URL and issues a fresh attempt on the same order', async () => {
    const product = await Product.create({
      name: 'Expired Retry Phone',
      slug: 'expired-retry-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 5000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => request(app)
      .post('/api/payments/vnpay/checkout')
      .set('Idempotency-Key', 'checkout-expired-retry')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.collection.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } },
    );

    const retry = await post().expect(201);

    expect(retry.body.data.order.id).toBe(initial.body.data.order.id);
    expect(retry.body.data.transaction.id).not.toBe(initial.body.data.transaction.id);
    expect(
      (await PaymentTransaction.findById(initial.body.data.transaction.id)).status,
    ).toBe('expired');
    expect(await PaymentTransaction.countDocuments({ status: 'pending' })).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('does not let a late failed callback overwrite a fresh pending attempt', async () => {
    const product = await Product.create({
      name: 'Late Failure Phone',
      slug: 'late-failure-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 5500000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => request(app)
      .post('/api/payments/vnpay/checkout')
      .set('Idempotency-Key', 'checkout-late-failure')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.collection.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } },
    );
    const retry = await post().expect(201);
    const failedQuery = {
      vnp_Amount: String(initial.body.data.transaction.amount * 100),
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
      vnp_TxnRef: initial.body.data.transaction.reference,
    };
    failedQuery.vnp_SecureHash = signParams(failedQuery, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(failedQuery).expect(200);

    const order = await Order.findById(initial.body.data.order.id);
    expect(order.paymentStatus).toBe('pending');
    expect((await PaymentTransaction.findById(retry.body.data.transaction.id)).status)
      .toBe('pending');
  });

  it('closes replacement attempts after a late success and prevents another payment', async () => {
    const product = await Product.create({
      name: 'Late Success Phone',
      slug: 'late-success-phone',
      categoryId: 'category-test',
      brandId: 'brand-test',
      price: 6000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ id: product.id, type: 'product', quantity: 1 }],
      customer,
      paymentMethod: 'card',
    };
    const post = () => request(app)
      .post('/api/payments/vnpay/checkout')
      .set('Idempotency-Key', 'checkout-late-success')
      .send(payload);
    const initial = await post().expect(201);
    await PaymentTransaction.collection.updateOne(
      { _id: initial.body.data.transaction.id },
      { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } },
    );
    const retry = await post().expect(201);
    const paidQuery = {
      vnp_Amount: String(initial.body.data.transaction.amount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: initial.body.data.transaction.reference,
    };
    paidQuery.vnp_SecureHash = signParams(paidQuery, env.vnpay.hashSecret);

    await request(app).get('/api/payments/vnpay/ipn').query(paidQuery).expect(200);

    expect((await Order.findById(initial.body.data.order.id)).paymentStatus).toBe('paid');
    expect((await PaymentTransaction.findById(retry.body.data.transaction.id)).status)
      .toBe('expired');
    await post().expect(409);
    expect(await PaymentTransaction.countDocuments()).toBe(2);
  });

  it('issues and verifies a short-lived result proof for a signed VNPay return', async () => {
    const query = {
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'SIGNED-RETURN-01',
    };
    query.vnp_SecureHash = signParams(query, env.vnpay.hashSecret);

    const returned = await request(app)
      .get('/api/payments/vnpay/return')
      .query(query)
      .expect(302);
    const redirect = new URL(returned.headers.location);
    const proof = redirect.searchParams.get('proof');

    expect(proof).toBeTruthy();
    expect(redirect.searchParams.has('valid')).toBe(false);

    const verified = await request(app)
      .post('/api/payments/vnpay/result')
      .send({ proof })
      .expect(200);
    expect(verified.body.data).toEqual({
      valid: true,
      reference: 'SIGNED-RETURN-01',
      code: '00',
    });

    await request(app)
      .post('/api/payments/vnpay/result')
      .send({ proof: `${proof}tampered` })
      .expect(400);
  });

  it('rejects a callback with an invalid signature', async () => {
    const response = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({ vnp_TxnRef: 'missing', vnp_SecureHash: 'invalid' })
      .expect(200);

    expect(response.body).toEqual({ RspCode: '97', Message: 'Invalid checksum' });
  });
});
