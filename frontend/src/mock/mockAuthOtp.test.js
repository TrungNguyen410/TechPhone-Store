import { afterEach, describe, expect, it } from 'vitest';
import { mockDb } from './mockDb';

describe('mock OTP authentication', () => {
  afterEach(() => mockDb.reset());

  it('does not create a registration before OTP verification', async () => {
    const payload = {
      fullName: 'OTP User',
      email: 'otp@example.com',
      phone: '0966666666',
      password: '123456',
    };
    const requested = await mockDb.requestRegistrationOtp(payload);
    expect((await mockDb.list('users')).some((user) => user.email === payload.email)).toBe(false);

    const session = await mockDb.verifyRegistrationOtp(payload.email, requested.debugOtp);
    expect(session.user.email).toBe(payload.email);
    expect(session.user.emailVerified).toBe(true);
  });

  it('resets a password through the selected OTP channel', async () => {
    const requested = await mockDb.requestPasswordReset('user@gmail.com', 'email');
    await mockDb.resetPassword('user@gmail.com', 'email', requested.debugOtp, 'new-password');
    const session = await mockDb.login('user@gmail.com', 'new-password');
    expect(session.user.email).toBe('user@gmail.com');
  });
});
