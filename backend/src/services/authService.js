const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { hashToken, signAccessToken, signRefreshToken } = require('../utils/token');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const verificationCodeRepository = require('../repositories/verificationCodeRepository');
const userRepository = require('../repositories/userRepository');
const otpDeliveryService = require('./otpDeliveryService');

const publicUser = (user) => (typeof user.toJSON === 'function' ? user.toJSON() : user);

class AuthService {
  createOtp() {
    return String(crypto.randomInt(100000, 1000000));
  }

  otpHash(code, target, purpose) {
    return hashToken(`${purpose}:${target}:${code}:${env.jwtAccessSecret}`);
  }

  async storeAndDeliverOtp({ target, channel, purpose, payload = null }) {
    const code = this.createOtp();
    await verificationCodeRepository.replace({
      target,
      purpose,
      channel,
      codeHash: this.otpHash(code, target, purpose),
      payload,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const deliveryTarget = await otpDeliveryService.send(channel, target, code, purpose);
    return {
      deliveryTarget,
      expiresInSeconds: 600,
      ...(env.nodeEnv !== 'production' ? { debugOtp: code } : {}),
    };
  }

  async verifyOtp({ target, purpose, otp }) {
    const verification = await verificationCodeRepository.findActive(target, purpose);
    if (!verification || verification.attempts >= 5) {
      throw new AppError('OTP is invalid or expired', 400);
    }
    const expected = Buffer.from(verification.codeHash, 'hex');
    const received = Buffer.from(this.otpHash(otp, target, purpose), 'hex');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      await verificationCodeRepository.incrementAttempts(verification.id);
      throw new AppError('OTP is invalid or expired', 400);
    }
    await verificationCodeRepository.consume(verification.id);
    return verification;
  }

  async issueSession(userDoc) {
    const user = publicUser(userDoc);
    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const decodedRefresh = jwt.decode(refreshToken);

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decodedRefresh.exp * 1000),
    });

    return {
      token,
      accessToken: token,
      refreshToken,
      user,
    };
  }

  async requestRegistrationOtp(payload) {
    const [existingEmail, existingPhone] = await Promise.all([
      userRepository.findByEmail(payload.email),
      userRepository.findByPhone(payload.phone),
    ]);

    if (existingEmail) throw new AppError('Email is already registered', 409);
    if (existingPhone) throw new AppError('Phone number is already registered', 409);

    const password = await bcrypt.hash(payload.password, 12);
    return this.storeAndDeliverOtp({
      target: payload.email.toLowerCase(),
      channel: 'email',
      purpose: 'register',
      payload: {
        ...payload,
        password,
        role: 'customer',
        status: 'active',
      },
    });
  }

  async register(payload) {
    return this.requestRegistrationOtp(payload);
  }

  async verifyRegistrationOtp({ email, otp }) {
    const target = email.toLowerCase();
    const verification = await this.verifyOtp({ target, purpose: 'register', otp });
    const payload = verification.payload;
    const [existingEmail, existingPhone] = await Promise.all([
      userRepository.findByEmail(payload.email),
      userRepository.findByPhone(payload.phone),
    ]);
    if (existingEmail) throw new AppError('Email is already registered', 409);
    if (existingPhone) throw new AppError('Phone number is already registered', 409);
    const user = await userRepository.create({
      ...payload,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    return this.issueSession(user);
  }

  async requestPasswordReset({ identifier, channel }) {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) return { message: 'If the account exists, an OTP has been sent.' };
    const target = channel === 'sms' ? user.phone : user.email;
    const delivery = await this.storeAndDeliverOtp({
      target,
      channel,
      purpose: 'password-reset',
      payload: { userId: user.id },
    });
    return { message: 'If the account exists, an OTP has been sent.', ...delivery };
  }

  async resetPassword({ identifier, channel, otp, newPassword }) {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) throw new AppError('OTP is invalid or expired', 400);
    const target = channel === 'sms' ? user.phone : user.email;
    await this.verifyOtp({ target, purpose: 'password-reset', otp });
    const password = await bcrypt.hash(newPassword, 12);
    await userRepository.update(user.id, { password });
    await refreshTokenRepository.revokeUserTokens(user.id);
    return { message: 'Password reset successfully' };
  }

  async login({ identifier, email, phone, password }) {
    const loginIdentifier = identifier || email || phone;
    const user = await userRepository.findByIdentifier(loginIdentifier, true);
    if (!user) throw new AppError('Invalid credentials', 401);
    if (user.status === 'locked') throw new AppError('Account is locked', 403);
    if (user.status !== 'active') throw new AppError('Account is inactive', 403);
    if (!user.emailVerified) throw new AppError('Email is not verified', 403);

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new AppError('Invalid credentials', 401);

    return this.issueSession(user);
  }

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId, payload) {
    if (payload.phone) {
      const existingPhone = await userRepository.findByPhone(payload.phone);
      if (existingPhone && existingPhone.id !== userId) {
        throw new AppError('Phone number is already registered', 409);
      }
    }

    const allowed = ['fullName', 'phone', 'address', 'avatar'];
    const updates = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
    return userRepository.update(userId, updates);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new AppError('User not found', 404);

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) throw new AppError('Current password is incorrect', 400);

    const password = await bcrypt.hash(newPassword, 12);
    await userRepository.update(userId, { password });
    await refreshTokenRepository.revokeUserTokens(userId);
    return { message: 'Password changed successfully' };
  }

  async getWishlist(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user.wishlist || [];
  }

  async updateWishlist(userId, items = []) {
    const uniqueItems = [...new Set((Array.isArray(items) ? items : []).filter((item) => typeof item === 'string'))].slice(0, 100);
    const user = await userRepository.update(userId, { wishlist: uniqueItems });
    return user.wishlist || [];
  }

  async refresh(refreshToken) {
    if (!refreshToken) throw new AppError('Refresh token is required', 401);
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const storedToken = await refreshTokenRepository.findByHash(hashToken(refreshToken));
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token is invalid', 401);
    }

    await refreshTokenRepository.revoke(hashToken(refreshToken));
    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError('User not found', 404);
    if (user.status === 'locked') throw new AppError('Account is locked', 403);
    if (user.status !== 'active') throw new AppError('Account is inactive', 403);
    return this.issueSession(user);
  }

  async logout(refreshToken) {
    if (refreshToken) await refreshTokenRepository.revoke(hashToken(refreshToken));
    return { message: 'Logged out successfully' };
  }
}

module.exports = new AuthService();
