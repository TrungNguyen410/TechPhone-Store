import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = storage.get(STORAGE_KEYS.token);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      return payload.data;
    }
    return payload;
  },
  (error) => {
    if (error.response?.status === 401) {
      storage.remove(STORAGE_KEYS.token);
      storage.remove(STORAGE_KEYS.currentUser);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    const message =
      error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
    error.message = message;
    return Promise.reject(Object.assign(error, { friendlyMessage: message }));
  },
);

export default axiosClient;
