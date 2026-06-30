const request = require('supertest');
const User = require('../src/models/User');
const { app, createUser, login } = require('./helpers');

describe('Auth API', () => {
  it('registers a customer and returns frontend-compatible token data', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'Nguyen Minh Anh',
      email: 'minhanh@example.com',
      phone: '0912345678',
      password: '123456',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
    expect(response.body.data.user.email).toBe('minhanh@example.com');
    expect(response.body.data.user.password).toBeUndefined();
  });

  it('does not allow public registration to set admin role', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'Privilege Attempt',
      email: 'privilege@example.com',
      phone: '0912345679',
      password: '123456',
      role: 'admin',
    });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('logs in and reads the current profile', async () => {
    await createUser({ email: 'admin@test.com', phone: '0900000000', role: 'admin' });
    const token = await login('admin@test.com');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('admin');
  });

  it('rejects locked users', async () => {
    await createUser({ email: 'locked@test.com', phone: '0999999999', status: 'locked' });

    const response = await request(app).post('/api/auth/login').send({
      identifier: 'locked@test.com',
      password: '123456',
    });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('rejects refresh tokens after a user is locked', async () => {
    const user = await createUser({ email: 'refresh-locked@test.com', phone: '0988888888' });
    const loginResponse = await request(app).post('/api/auth/login').send({
      identifier: 'refresh-locked@test.com',
      password: '123456',
    });

    await User.findByIdAndUpdate(user.id, { status: 'locked' });

    const response = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
