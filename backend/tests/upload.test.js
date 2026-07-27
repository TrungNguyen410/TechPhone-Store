const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');
const { app, createUser, login } = require('./helpers');

describe('Admin image uploads', () => {
  test('allows an admin to upload an image selected from their machine', async () => {
    await createUser({ email: 'upload-admin@test.com', phone: '0900000010', role: 'admin' });
    const token = await login('upload-admin@test.com');

    const response = await request(app)
      .post('/api/uploads/admin')
      .set('Authorization', `Bearer ${token}`)
      .attach('adminImage', Buffer.from('fake png content'), {
        filename: 'phone.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toContain('/uploads/adminImage/');

    const uploadedPath = path.resolve(
      process.cwd(),
      'uploads',
      'adminImage',
      response.body.data.filename,
    );
    await fs.rm(uploadedPath, { force: true });
  });

  test('rejects non-image files', async () => {
    await createUser({ email: 'upload-admin-2@test.com', phone: '0900000011', role: 'admin' });
    const token = await login('upload-admin-2@test.com');

    const response = await request(app)
      .post('/api/uploads/admin')
      .set('Authorization', `Bearer ${token}`)
      .attach('adminImage', Buffer.from('plain text'), {
        filename: 'payload.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(422);
  });
});
