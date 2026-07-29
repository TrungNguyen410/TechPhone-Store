const request = require('supertest');
const Contact = require('../src/models/Contact');
const { app, createUser, login } = require('./helpers');

describe('Contact support workflow', () => {
  test('stores a customer request and lets an admin resolve it', async () => {
    const created = await request(app).post('/api/contacts').send({
      fullName: 'Customer A',
      email: 'customer@example.com',
      phone: '0912345678',
      subject: 'Need support',
      message: 'Please help me with my recent purchase.',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('new');

    await createUser({ email: 'contact-admin@test.com', phone: '0900000001', role: 'admin' });
    const token = await login('contact-admin@test.com');
    const listed = await request(app).get('/api/contacts').set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    const resolved = await request(app)
      .put(`/api/contacts/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved', adminNote: 'Customer contacted.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('resolved');
    expect((await Contact.findById(created.body.data.id)).adminNote).toBe('Customer contacted.');
  });
});
