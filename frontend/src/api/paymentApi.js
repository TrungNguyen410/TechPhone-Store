import { USE_MOCK } from '../utils/constants';
import { mockDb } from '../mock/mockDb';
import axiosClient from './axiosClient';

export const paymentApi = {
  getConfig: () =>
    USE_MOCK
      ? Promise.resolve({ providers: { vnpay: { enabled: true, mode: 'sandbox' } } })
      : axiosClient.get('/payments/config'),
  createVnpayCheckout: (payload, idempotencyKey) =>
    USE_MOCK
      ? mockDb.createVnpayCheckout(payload)
      : axiosClient.post('/payments/vnpay/checkout', payload, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
};
