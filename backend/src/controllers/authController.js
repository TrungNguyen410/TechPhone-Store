const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const register = asyncHandler(async (req, res) => {
  const session = await authService.register(req.body);
  successResponse(res, session, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body);
  successResponse(res, session, 'Login successful');
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  successResponse(res, user, 'Current user retrieved');
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  successResponse(res, user, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  successResponse(res, result, 'Password changed');
});

const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refresh(req.body.refreshToken);
  successResponse(res, session, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  successResponse(res, result, 'Logout successful');
});

module.exports = { register, login, me, updateProfile, changePassword, refresh, logout };
