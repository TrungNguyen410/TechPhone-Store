const request = require('supertest');
const User = require('../src/models/User');
const { app, createUser, login } = require('./helpers');

describe('Auth API', () => {
  it('creates a customer only after the email OTP is verified', async () => {
    const requested = await request(app).post('/api/auth/register/request-otp').send({
      fullName: 'Nguyen Minh Anh',
      email: 'minhanh@example.com',
      phone: '0912345678',
      password: '123456',
    });

    expect(requested.status).toBe(202);
    expect(await User.findOne({ email: 'minhanh@example.com' })).toBeNull();

    const verified = await request(app).post('/api/auth/register/verify-otp').send({
      email: 'minhanh@example.com',
      otp: requested.body.data.debugOtp,
    });

    expect(verified.status).toBe(201);
    expect(verified.body.data.token).toBeTruthy();
    expect(verified.body.data.user.emailVerified).toBe(true);
    expect(verified.body.data.user.password).toBeUndefined();
  });

  it('resets a forgotten password with a one-time code', async () => {
    await createUser({ email: 'forgot@test.com', phone: '0977777777' });
    const requested = await request(app).post('/api/auth/forgot-password/request-otp').send({
      identifier: 'forgot@test.com',
      channel: 'email',
    });
    expect(requested.status).toBe(200);

    const reset = await request(app).post('/api/auth/forgot-password/reset').send({
      identifier: 'forgot@test.com',
      channel: 'email',
      otp: requested.body.data.debugOtp,
      newPassword: 'new-password',
    });
    expect(reset.status).toBe(200);

    const loggedIn = await request(app).post('/api/auth/login').send({
      identifier: 'forgot@test.com',
      password: 'new-password',
    });
    expect(loggedIn.status).toBe(200);
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

  it('returns 401 instead of 500 for an invalid access token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer expired-or-invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication token is invalid or expired');
  });
});
