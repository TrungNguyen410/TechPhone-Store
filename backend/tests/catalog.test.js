const request = require('supertest');
const Product = require('../src/models/Product');
const { app, createUser, login } = require('./helpers');

describe('Product API', () => {
  it('lists products and supports search filters', async () => {
    await Product.create({
      name: 'iPhone 16 Pro Max',
      brand: 'Apple',
      category: 'Dien thoai',
      price: 33990000,
      status: 'active',
    });
    await Product.create({
      name: 'Galaxy S25 Ultra',
      brand: 'Samsung',
      category: 'Dien thoai',
      price: 30990000,
      status: 'active',
    });

    const response = await request(app).get('/api/products?q=iphone&brand=Apple');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].brand).toBe('Apple');
  });

  it('lets admins create products and blocks customers', async () => {
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    await createUser({ email: 'customer@test.com', phone: '0911111111', role: 'customer' });
    const adminToken = await login('admin@test.com');
    const customerToken = await login('customer@test.com');

    const payload = {
      name: 'Pixel 9 Pro',
      brand: 'Google',
      category: 'Dien thoai',
      price: 23990000,
      stock: 10,
    };

    const forbidden = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe('Pixel 9 Pro');
  });
});
