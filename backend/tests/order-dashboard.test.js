const request = require('supertest');
const jwt = require('jsonwebtoken');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');
const Product = require('../src/models/Product');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Voucher = require('../src/models/Voucher');
const env = require('../src/config/env');
const orderItemRepository = require('../src/repositories/orderItemRepository');
const { app, createUser, login } = require('./helpers');

describe('Orders and dashboard APIs', () => {
  const seedTaxonomy = async () => {
    const brand = await Brand.create({ name: 'Apple', slug: 'apple', active: true });
    const category = await Category.create({ name: 'Dien thoai', slug: 'dien-thoai', active: true });
    return { brandId: brand.id, categoryId: category.id };
  };
  const seedVoucher = (overrides = {}) => Voucher.create({
    code: overrides.code || 'LASTONE',
    type: 'fixed',
    value: 100000,
    minOrder: 0,
    quantity: overrides.quantity ?? 1,
    used: overrides.used ?? 0,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    active: true,
  });
  it('creates an order and allows lookup by order number and phone', async () => {
    await createUser({ email: 'customer@test.com', phone: '0911111111' });
    const token = await login('customer@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'phone-1',
      name: 'iPhone 16 Pro Max',
      ...taxonomy,
      price: 33990000,
      stock: 5,
      status: 'active',
    });

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ id: product.id, productId: product.id, name: product.name, price: 1, quantity: 1 }],
        customer: {
          fullName: 'Test Customer',
          email: 'customer@test.com',
          phone: '0911111111',
          address: 'Test address',
        },
        subtotal: product.price,
        shippingFee: 0,
        discount: 0,
        total: product.price,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.orderNumber).toMatch(/^TP/);
    expect(created.body.data.subtotal).toBe(product.price);
    expect(created.body.data.total).toBe(product.price);
    const updatedProduct = await Product.findById(product.id);
    expect(updatedProduct.stock).toBe(4);
    expect(updatedProduct.sold).toBe(1);

    const lookup = await request(app).get('/api/orders/lookup').query({
      orderNumber: created.body.data.orderNumber,
      phone: '0911111111',
    });
    expect(lookup.status).toBe(200);
    expect(lookup.body.data.id).toBe(created.body.data.id);
  });

  it('rejects orders that exceed product stock', async () => {
    await createUser({ email: 'stock@test.com', phone: '0922222222' });
    const token = await login('stock@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'stock-phone-1',
      name: 'Low Stock Phone',
      ...taxonomy,
      price: 1000000,
      stock: 1,
      status: 'active',
    });

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
        customer: {
          fullName: 'Stock Customer',
          email: 'stock@test.com',
          phone: '0922222222',
          address: 'Test address',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns the same order and decrements stock once for a repeated idempotency key', async () => {
    await createUser({ email: 'idempotent@test.com', phone: '0944444444' });
    const token = await login('idempotent@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'idempotent-phone',
      name: 'Idempotent Phone',
      ...taxonomy,
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, price: 1, quantity: 1 }],
      customer: {
        fullName: 'Idempotent Customer',
        email: 'idempotent@test.com',
        phone: '0944444444',
        address: 'Test address',
      },
      subtotal: 1,
      shippingFee: 0,
      discount: 999999,
      total: 1,
    };

    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-attempt-1')
      .send(payload);
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-attempt-1')
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(first.body.data.subtotal).toBe(product.price);
    expect(first.body.data.total).toBe(product.price + 40000);
    const productAfter = await Product.findById(product.id);
    expect(productAfter.stock).toBe(2);
  });

  it('handles concurrent requests with one idempotency key without double-decrementing stock', async () => {
    await createUser({ email: 'race@test.com', phone: '0955555555' });
    const token = await login('race@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'race-phone',
      name: 'Race Phone',
      ...taxonomy,
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Race Customer',
        email: 'race@test.com',
        phone: '0955555555',
        address: 'Test address',
      },
    };
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'checkout-race')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
    const productAfter = await Product.findById(product.id);
    expect(productAfter.stock).toBe(2);
  });

  it('returns only fully durable embedded orders when secondary item persistence fails', async () => {
    await createUser({ email: 'durable@test.com', phone: '0901010101' });
    const token = await login('durable@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'durable-phone',
      name: 'Durable Phone',
      ...taxonomy,
      price: 3500000,
      stock: 3,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Durable Customer',
        email: 'durable@test.com',
        phone: '0901010101',
        address: 'Test address',
      },
    };
    const secondaryWrite = jest
      .spyOn(orderItemRepository, 'create')
      .mockRejectedValue(new Error('Injected secondary persistence failure'));
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'durable-checkout')
      .send(payload);

    try {
      const [first, second] = await Promise.all([post(), post()]);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(first.body.data.items).toEqual([
        expect.objectContaining({ productId: product.id, quantity: 1, price: product.price }),
      ]);
      expect(await Order.countDocuments()).toBe(1);
      expect(await OrderItem.countDocuments()).toBe(0);
      expect((await Product.findById(product.id)).stock).toBe(2);
      expect(secondaryWrite).not.toHaveBeenCalled();
    } finally {
      secondaryWrite.mockRestore();
    }
  });

  it('does not expose another user order when they reuse the same raw idempotency key', async () => {
    await createUser({ email: 'first@test.com', phone: '0966666666' });
    await createUser({ email: 'second@test.com', phone: '0977777777' });
    const firstToken = await login('first@test.com');
    const secondToken = await login('second@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'scoped-phone',
      name: 'Scoped Phone',
      ...taxonomy,
      price: 4000000,
      stock: 3,
      status: 'active',
    });
    const payloadFor = (email, phone) => ({
      items: [{ productId: product.id, quantity: 1 }],
      customer: { fullName: 'Customer', email, phone, address: 'Test address' },
    });

    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${firstToken}`)
      .set('Idempotency-Key', 'same-browser-key')
      .send(payloadFor('first@test.com', '0966666666'));
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'same-browser-key')
      .send(payloadFor('second@test.com', '0977777777'));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(second.body.data.userId).not.toBe(first.body.data.userId);
  });

  it('scopes guest keys by email and phone and ignores payload userId', async () => {
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'guest-scoped-phone',
      name: 'Guest Scoped Phone',
      ...taxonomy,
      price: 5000000,
      stock: 4,
      status: 'active',
    });
    const payloadFor = (email, phone, userId) => ({
      userId,
      items: [{ productId: product.id, quantity: 1 }],
      customer: { fullName: 'Guest', email, phone, address: 'Test address' },
    });
    const post = (payload) => request(app)
      .post('/api/orders')
      .set('Idempotency-Key', 'guest-shared-key')
      .send(payload);

    const first = await post(payloadFor('guest-one@test.com', '0988888888', 'victim-user'));
    const repeated = await post(payloadFor('guest-one@test.com', '0988888888', 'another-user'));
    const otherGuest = await post(payloadFor('guest-two@test.com', '0999999999', 'victim-user'));

    expect(first.status).toBe(201);
    expect(repeated.status).toBe(201);
    expect(otherGuest.status).toBe(201);
    expect(repeated.body.data.id).toBe(first.body.data.id);
    expect(otherGuest.body.data.id).not.toBe(first.body.data.id);
    expect(first.body.data.userId).toBeNull();
    expect(otherGuest.body.data.userId).toBeNull();
    const productAfter = await Product.findById(product.id);
    expect(productAfter.stock).toBe(2);
  });

  it('rejects an expired bearer token before refresh and owns the retried order', async () => {
    const user = await createUser({ email: 'refresh-order@test.com', phone: '0902020202' });
    const session = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'refresh-order@test.com', password: '123456' })
      .expect(200);
    const expiredToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.jwtAccessSecret,
      { expiresIn: -1 },
    );
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'refresh-owned-phone',
      name: 'Refresh Owned Phone',
      ...taxonomy,
      price: 4500000,
      stock: 2,
      status: 'active',
    });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Refresh Customer',
        email: 'refresh-order@test.com',
        phone: '0902020202',
        address: 'Test address',
      },
    };

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Idempotency-Key', 'refresh-owned-order')
      .send(payload)
      .expect(401);
    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(product.id)).stock).toBe(2);

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.body.data.refreshToken })
      .expect(200);
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${refreshed.body.data.token}`)
      .set('Idempotency-Key', 'refresh-owned-order')
      .send(payload)
      .expect(201);

    expect(created.body.data.userId).toBe(user.id);
    expect((await Product.findById(product.id)).stock).toBe(1);
  });

  it('exhausts a limited voucher sequentially from authoritative usage', async () => {
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'sequential-voucher-phone',
      name: 'Sequential Voucher Phone',
      ...taxonomy,
      price: 2000000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'SEQUENTIAL', quantity: 1 });
    const payloadFor = (email, phone) => ({
      items: [{ productId: product.id, quantity: 1 }],
      customer: { fullName: 'Voucher Guest', email, phone, address: 'Test address' },
      voucherCode: 'SEQUENTIAL',
    });

    await request(app)
      .post('/api/orders')
      .set('Idempotency-Key', 'voucher-sequential-1')
      .send(payloadFor('voucher-one@test.com', '0903030303'))
      .expect(201);
    await request(app)
      .post('/api/orders')
      .set('Idempotency-Key', 'voucher-sequential-2')
      .send(payloadFor('voucher-two@test.com', '0904040404'))
      .expect(400);

    expect((await Voucher.findOne({ code: 'SEQUENTIAL' })).used).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('allows only one concurrent last-voucher redemption', async () => {
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'concurrent-voucher-phone',
      name: 'Concurrent Voucher Phone',
      ...taxonomy,
      price: 2500000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'CONCURRENT', quantity: 1 });
    const post = (email, phone, key) => request(app)
      .post('/api/orders')
      .set('Idempotency-Key', key)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        customer: { fullName: 'Voucher Guest', email, phone, address: 'Test address' },
        voucherCode: 'CONCURRENT',
      });

    const responses = await Promise.all([
      post('concurrent-one@test.com', '0905050505', 'voucher-concurrent-1'),
      post('concurrent-two@test.com', '0906060606', 'voucher-concurrent-2'),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    expect((await Voucher.findOne({ code: 'CONCURRENT' })).used).toBe(1);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  it('compensates the duplicate loser and releases voucher usage once on cancellation', async () => {
    await createUser({ email: 'voucher-cancel@test.com', phone: '0907070707' });
    const token = await login('voucher-cancel@test.com');
    const taxonomy = await seedTaxonomy();
    const product = await Product.create({
      _id: 'voucher-cancel-phone',
      name: 'Voucher Cancel Phone',
      ...taxonomy,
      price: 3000000,
      stock: 3,
      status: 'active',
    });
    await seedVoucher({ code: 'CANCELONCE', quantity: 2 });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        fullName: 'Voucher Customer',
        email: 'voucher-cancel@test.com',
        phone: '0907070707',
        address: 'Test address',
      },
      voucherCode: 'CANCELONCE',
    };
    const post = () => request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'voucher-duplicate')
      .send(payload);

    const [first, second] = await Promise.all([post(), post()]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect((await Voucher.findOne({ code: 'CANCELONCE' })).used).toBe(1);

    await request(app)
      .put(`/api/orders/${first.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .put(`/api/orders/${first.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((await Voucher.findOne({ code: 'CANCELONCE' })).used).toBe(0);
    expect((await Product.findById(product.id)).stock).toBe(3);
  });

  it('enforces valid admin order status transitions', async () => {
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    const adminToken = await login('admin@test.com');
    const order = await Order.create({
      orderNumber: 'TP26061799',
      userId: 'customer-id',
      status: 'pending',
      items: [{ id: 'phone-1', productId: 'phone-1', name: 'Phone', price: 1000000, quantity: 1 }],
      subtotal: 1000000,
      shippingFee: 30000,
      discount: 0,
      total: 1030000,
      customer: {
        fullName: 'Transition Customer',
        email: 'transition@test.com',
        phone: '0933333333',
        address: 'Test address',
      },
    });

    const invalid = await request(app)
      .put(`/api/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .put(`/api/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    expect(valid.status).toBe(200);
    expect(valid.body.data.status).toBe('confirmed');
  });

  it('returns admin dashboard statistics', async () => {
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    const token = await login('admin@test.com');

    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.stats).toEqual(
      expect.objectContaining({
        products: 0,
        orders: 0,
        customers: 0,
        revenue: 0,
      }),
    );
    expect(response.body.data.monthlyRevenue).toHaveLength(12);
  });
});
