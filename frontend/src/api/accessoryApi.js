import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const accessoryApi = {
  getAll: (params = {}) =>
    USE_MOCK ? mockDb.list('accessories') : axiosClient.get('/accessories', { params }),
  getById: (id) =>
    USE_MOCK ? mockDb.get('accessories', id) : axiosClient.get(`/accessories/${id}`),
  create: (payload) =>
    USE_MOCK ? mockDb.save('accessories', payload) : axiosClient.post('/accessories', payload),
  update: (id, payload) =>
    USE_MOCK
      ? mockDb.save('accessories', { ...payload, id })
      : axiosClient.put(`/accessories/${id}`, payload),
  remove: (id) =>
    USE_MOCK ? mockDb.remove('accessories', id) : axiosClient.delete(`/accessories/${id}`),
};
