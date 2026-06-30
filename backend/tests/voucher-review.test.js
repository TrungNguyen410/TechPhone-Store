const request = require('supertest');
const Voucher = require('../src/models/Voucher');
const { app, createUser, login } = require('./helpers');

describe('Voucher and review APIs', () => {
  it('validates an active voucher', async () => {
    await Voucher.create({
      code: 'TECH10',
      type: 'percent',
      value: 10,
      minOrder: 5000000,
      maxDiscount: 1000000,
      quantity: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
    });

    const response = await request(app).post('/api/vouchers/check').send({
      code: 'tech10',
      subtotal: 6000000,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.code).toBe('TECH10');
  });

  it('creates a pending review and lets an admin approve it', async () => {
    await createUser({ email: 'customer@test.com', phone: '0911111111' });
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    const customerToken = await login('customer@test.com');
    const adminToken = await login('admin@test.com');

    const created = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: 'phone-1',
        rating: 5,
        comment: 'This phone is excellent for daily work.',
        images: ['http://localhost:5000/uploads/reviews/review-1.png'],
      });

    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');
    expect(created.body.data.images).toHaveLength(1);

    const duplicate = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: 'phone-1',
        rating: 4,
        comment: 'Trying to review the same phone again.',
      });

    expect(duplicate.status).toBe(409);

    const otherProduct = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: 'phone-2',
        rating: 4,
        comment: 'Reviewing a different phone should still work.',
      });

    expect(otherProduct.status).toBe(201);

    const approved = await request(app)
      .put(`/api/admin/reviews/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('approved');

    const accessoryReview = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        accessoryId: 'accessory-1',
        rating: 5,
        comment: 'This accessory works well with my phone.',
      });

    expect(accessoryReview.status).toBe(201);

    await request(app)
      .put(`/api/admin/reviews/${accessoryReview.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const accessoryReviews = await request(app).get('/api/reviews/accessory/accessory-1');
    expect(accessoryReviews.status).toBe(200);
    expect(accessoryReviews.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accessoryId: 'accessory-1', status: 'approved' }),
      ]),
    );
  });
});
