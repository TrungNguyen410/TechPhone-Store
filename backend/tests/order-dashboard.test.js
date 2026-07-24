const request = require('supertest');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const { app, createUser, login } = require('./helpers');

describe('Orders and dashboard APIs', () => {
  const seedTaxonomy = async () => {
    const brand = await Brand.create({ name: 'Apple', slug: 'apple', active: true });
    const category = await Category.create({ name: 'Dien thoai', slug: 'dien-thoai', active: true });
    return { brandId: brand.id, categoryId: category.id };
  };
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
