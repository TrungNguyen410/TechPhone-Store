import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const authApi = {
  login: (payload) =>
    USE_MOCK ? mockDb.login(payload.identifier, payload.password) : axiosClient.post('/auth/login', payload),
  register: (payload) => (USE_MOCK ? mockDb.register(payload) : axiosClient.post('/auth/register', payload)),
  me: (user) => (USE_MOCK ? Promise.resolve(user) : axiosClient.get('/auth/me')),
  updateProfile: (userId, payload) =>
    USE_MOCK ? mockDb.updateUser(userId, payload) : axiosClient.put('/auth/profile', payload),
  changePassword: (userId, payload) =>
    USE_MOCK
      ? mockDb.changePassword(userId, payload.currentPassword, payload.newPassword)
      : axiosClient.put('/auth/change-password', payload),
};
