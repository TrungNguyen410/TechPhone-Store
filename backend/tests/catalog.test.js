const request = require('supertest');
const Brand = require('../src/models/Brand');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const { app, createUser, login } = require('./helpers');

const seedTaxonomy = async () => {
  const [apple, samsung, google] = await Brand.insertMany([
    { name: 'Apple', slug: 'apple', active: true },
    { name: 'Samsung', slug: 'samsung', active: true },
    { name: 'Google', slug: 'google', active: true },
  ]);
  const phones = await Category.create({ name: 'Dien thoai', slug: 'dien-thoai', active: true });
  return { apple, samsung, google, phones };
};

describe('Product API', () => {
  it('lists products and supports search filters', async () => {
    const { apple, samsung, phones } = await seedTaxonomy();
    await Product.create({ name: 'iPhone 16 Pro Max', brandId: apple.id, categoryId: phones.id, price: 33990000, status: 'active' });
    await Product.create({ name: 'Galaxy S25 Ultra', brandId: samsung.id, categoryId: phones.id, price: 30990000, status: 'active' });
    const response = await request(app).get('/api/products?q=iphone&brand=Apple');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ brand: 'Apple', category: 'Dien thoai', brandId: apple.id }));
  });

  it('lets admins create products, validates taxonomy, and blocks customers', async () => {
    const { google, phones } = await seedTaxonomy();
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    await createUser({ email: 'customer@test.com', phone: '0911111111', role: 'customer' });
    const adminToken = await login('admin@test.com');
    const customerToken = await login('customer@test.com');
    const payload = {
      name: 'Pixel 9 Pro',
      brandId: google.id,
      categoryId: phones.id,
      price: 23990000,
      stock: 10,
      images: ['https://example.com/front.png', 'https://example.com/back.png'],
    };
    expect((await request(app).post('/api/products').set('Authorization', `Bearer ${customerToken}`).send(payload)).status).toBe(403);
    const created = await request(app).post('/api/products').set('Authorization', `Bearer ${adminToken}`).send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(expect.objectContaining({
      name: 'Pixel 9 Pro',
      brand: 'Google',
      category: 'Dien thoai',
      image: 'https://example.com/front.png',
      images: payload.images,
    }));
    const tooManyImages = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...payload,
        name: 'Pixel with too many images',
        images: Array.from({ length: 6 }, (_, index) => `https://example.com/${index}.png`),
      });
    expect(tooManyImages.status).toBe(422);
    const invalid = await request(app).post('/api/products').set('Authorization', `Bearer ${adminToken}`).send({ ...payload, brandId: 'missing' });
    expect(invalid.status).toBe(422);
  });
});
