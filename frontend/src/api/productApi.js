import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const productApi = {
  getAll: (params = {}) => (USE_MOCK ? mockDb.list('products') : axiosClient.get('/products', { params })),
  getById: (id) => (USE_MOCK ? mockDb.get('products', id) : axiosClient.get(`/products/${id}`)),
  create: (payload) => (USE_MOCK ? mockDb.save('products', payload) : axiosClient.post('/products', payload)),
  update: (id, payload) =>
    USE_MOCK ? mockDb.save('products', { ...payload, id }) : axiosClient.put(`/products/${id}`, payload),
  remove: (id) => (USE_MOCK ? mockDb.remove('products', id) : axiosClient.delete(`/products/${id}`)),
};
