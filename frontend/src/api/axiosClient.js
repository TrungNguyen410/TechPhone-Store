import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../utils/constants';
import { clearAuthSession, persistAuthSession } from '../utils/authSession';
import { storage } from '../utils/storage';
import { authApi } from './authApi';

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

const isRefreshRequest = (config) => {
  try {
    return new URL(config?.url || '', API_URL).pathname.endsWith('/auth/refresh');
  } catch {
    return false;
  }
};

const redirectToLogin = () => {
  if (window.location.pathname.includes('/login')) return;
  const intended = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/login?redirect=${encodeURIComponent(intended)}`);
};

const refreshSessionOnce = (refreshToken) => {
  if (!refreshPromise) {
    refreshPromise = authApi.refresh(refreshToken)
      .then(persistAuthSession)
      .catch((error) => {
        clearAuthSession();
        redirectToLogin();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const rejectFriendly = (error) => {
  const message =
    error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
  error.message = message;
  return Promise.reject(Object.assign(error, { friendlyMessage: message }));
};

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
  async (error) => {
    const originalRequest = error.config || {};
    const refreshToken = storage.get(STORAGE_KEYS.refreshToken);
    const status = error.response?.status;
    const isAuthRefreshRequest = isRefreshRequest(originalRequest);

    if (status === 401 && !originalRequest._retry && refreshToken && !isAuthRefreshRequest) {
      originalRequest._retry = true;
      try {
        const session = await refreshSessionOnce(refreshToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${session.token}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        return rejectFriendly(refreshError);
      }
    }

    if (status === 401 && !originalRequest._retry && !refreshToken && !isAuthRefreshRequest) {
      clearAuthSession();
      redirectToLogin();
    }
    return rejectFriendly(error);
  },
);

export default axiosClient;
