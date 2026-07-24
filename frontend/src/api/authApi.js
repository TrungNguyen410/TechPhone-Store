import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const authApi = {
  login: (payload) =>
    USE_MOCK ? mockDb.login(payload.identifier, payload.password) : axiosClient.post('/auth/login', payload),
  requestRegistrationOtp: (payload) =>
    USE_MOCK ? mockDb.requestRegistrationOtp(payload) : axiosClient.post('/auth/register/request-otp', payload),
  verifyRegistrationOtp: ({ email, otp }) =>
    USE_MOCK ? mockDb.verifyRegistrationOtp(email, otp) : axiosClient.post('/auth/register/verify-otp', { email, otp }),
  requestPasswordReset: ({ identifier, channel }) =>
    USE_MOCK ? mockDb.requestPasswordReset(identifier, channel) : axiosClient.post('/auth/forgot-password/request-otp', { identifier, channel }),
  resetPassword: ({ identifier, channel, otp, newPassword }) =>
    USE_MOCK ? mockDb.resetPassword(identifier, channel, otp, newPassword) : axiosClient.post('/auth/forgot-password/reset', { identifier, channel, otp, newPassword }),
  me: (user) => (USE_MOCK ? Promise.resolve(user) : axiosClient.get('/auth/me')),
  updateProfile: (userId, payload) =>
    USE_MOCK ? mockDb.updateUser(userId, payload) : axiosClient.put('/auth/profile', payload),
  changePassword: (userId, payload) =>
    USE_MOCK
      ? mockDb.changePassword(userId, payload.currentPassword, payload.newPassword)
      : axiosClient.put('/auth/change-password', payload),
};
