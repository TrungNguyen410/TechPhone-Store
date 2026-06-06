import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

const resourceApi = (name, endpoint) => ({
  getAll: () => (USE_MOCK ? mockDb.list(name) : axiosClient.get(`/admin/${endpoint}`)),
  create: (payload) =>
    USE_MOCK ? mockDb.save(name, payload) : axiosClient.post(`/admin/${endpoint}`, payload),
  update: (id, payload) =>
    USE_MOCK ? mockDb.save(name, { ...payload, id }) : axiosClient.put(`/admin/${endpoint}/${id}`, payload),
  remove: (id) =>
    USE_MOCK ? mockDb.remove(name, id) : axiosClient.delete(`/admin/${endpoint}/${id}`),
});

export const adminApi = {
  getDashboard: () => (USE_MOCK ? mockDb.dashboard() : axiosClient.get('/admin/dashboard')),
  getCustomers: async () => {
    if (!USE_MOCK) return axiosClient.get('/admin/customers');
    const users = await mockDb.list('users');
    const orders = await mockDb.list('orders');
    return users
      .filter((user) => user.role === 'customer')
      .map(({ password: _password, ...user }) => {
        const userOrders = orders.filter((order) => order.userId === user.id);
        return {
          ...user,
          orderCount: userOrders.length,
          totalSpent: userOrders
            .filter((order) => order.status === 'completed')
            .reduce((sum, order) => sum + order.total, 0),
        };
      });
  },
  updateCustomer: (id, payload) =>
    USE_MOCK ? mockDb.updateUser(id, payload) : axiosClient.put(`/admin/customers/${id}`, payload),
  categories: resourceApi('categories', 'categories'),
  brands: resourceApi('brands', 'brands'),
};
