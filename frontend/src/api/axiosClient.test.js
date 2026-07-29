import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './authApi';
import axiosClient from './axiosClient';
import { persistAuthSession } from '../utils/authSession';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

const originalAdapter = axiosClient.defaults.adapter;

const responseFor = (config, data) => ({
  config,
  data: { success: true, data },
  headers: {},
  status: 200,
  statusText: 'OK',
});

const rejectUnauthorized = (config) => Promise.reject(Object.assign(new Error('expired'), {
  config,
  response: {
    config,
    data: { message: 'expired' },
    headers: {},
    status: 401,
    statusText: 'Unauthorized',
  },
}));

describe('axiosClient session refresh', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  it('shares one refresh across simultaneous 401 responses and retries both requests', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'old-refresh',
      user: { id: 'u1' },
    });
    let refreshRequests = 0;
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });

    axiosClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        await refreshGate;
        return responseFor(config, {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1' },
        });
      }
      if (config.headers.Authorization !== 'Bearer new-access') return rejectUnauthorized(config);
      return responseFor(config, { url: config.url });
    };

    const requests = [
      axiosClient.get('/orders'),
      axiosClient.get('/wishlist'),
    ];
    await vi.waitFor(() => expect(refreshRequests).toBe(1));
    releaseRefresh();

    await expect(Promise.all(requests)).resolves.toEqual([
      { url: '/orders' },
      { url: '/wishlist' },
    ]);
    expect(refreshRequests).toBe(1);
    expect(storage.get(STORAGE_KEYS.token)).toBe('new-access');
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBe('new-refresh');
  });

  it('retries an unauthorized request only once', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'refresh',
      user: { id: 'u1' },
    });
    let protectedRequests = 0;
    let refreshRequests = 0;

    axiosClient.defaults.adapter = (config) => {
      if (config.url === '/auth/refresh') {
        refreshRequests += 1;
        return Promise.resolve(responseFor(config, {
          token: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1' },
        }));
      }
      protectedRequests += 1;
      return rejectUnauthorized(config);
    };

    await expect(axiosClient.get('/always-unauthorized')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });
    expect(protectedRequests).toBe(2);
    expect(refreshRequests).toBe(1);
  });

  it('clears the session and safely redirects with the complete intended URL when refresh fails', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'invalid-refresh',
      user: { id: 'u1' },
    });
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        assign,
        hash: '#confirm',
        pathname: '/checkout',
        search: '?step=payment',
      },
    });

    axiosClient.defaults.adapter = (config) => rejectUnauthorized(config);

    await expect(axiosClient.get('/orders')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });
    expect(storage.get(STORAGE_KEYS.token)).toBeNull();
    expect(storage.get(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(storage.get(STORAGE_KEYS.currentUser)).toBeNull();
    expect(assign).toHaveBeenCalledWith(
      '/login?redirect=%2Fcheckout%3Fstep%3Dpayment%23confirm',
    );
  });

  it('does not try to refresh a rejected refresh request again', async () => {
    persistAuthSession({
      token: 'expired-access',
      refreshToken: 'invalid-refresh',
      user: { id: 'u1' },
    });
    let refreshRequests = 0;
    axiosClient.defaults.adapter = (config) => {
      refreshRequests += 1;
      return rejectUnauthorized(config);
    };

    await expect(authApi.refresh('invalid-refresh')).rejects.toMatchObject({
      friendlyMessage: 'expired',
    });
    expect(refreshRequests).toBe(1);
  });

  it('sends the refresh token when revoking the backend session', async () => {
    let request;
    axiosClient.defaults.adapter = (config) => {
      request = config;
      return Promise.resolve(responseFor(config, { message: 'Logged out successfully' }));
    };

    await authApi.logout('refresh-to-revoke');

    expect(request.url).toBe('/auth/logout');
    expect(JSON.parse(request.data)).toEqual({ refreshToken: 'refresh-to-revoke' });
  });
});
