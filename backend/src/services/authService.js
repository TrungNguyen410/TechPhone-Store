const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { hashToken, signAccessToken, signRefreshToken } = require('../utils/token');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const userRepository = require('../repositories/userRepository');

const publicUser = (user) => (typeof user.toJSON === 'function' ? user.toJSON() : user);

class AuthService {
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

  async register(payload) {
    const [existingEmail, existingPhone] = await Promise.all([
      userRepository.findByEmail(payload.email),
      userRepository.findByPhone(payload.phone),
    ]);

    if (existingEmail) throw new AppError('Email is already registered', 409);
    if (existingPhone) throw new AppError('Phone number is already registered', 409);

    const password = await bcrypt.hash(payload.password, 12);
    const user = await userRepository.create({
      ...payload,
      password,
      role: 'customer',
      status: 'active',
    });

    return this.issueSession(user);
  }

  async login({ identifier, email, phone, password }) {
    const loginIdentifier = identifier || email || phone;
    const user = await userRepository.findByIdentifier(loginIdentifier, true);
    if (!user) throw new AppError('Invalid credentials', 401);
    if (user.status === 'locked') throw new AppError('Account is locked', 403);
    if (user.status !== 'active') throw new AppError('Account is inactive', 403);

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
