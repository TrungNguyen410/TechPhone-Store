import { STORAGE_KEYS } from './constants';
import { storage } from './storage';

const isInternalPath = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/')) return false;
  try {
    return new URL(value, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
};

export function safeInternalRedirect(value, fallback = '/') {
  if (isInternalPath(value)) return value;
  return isInternalPath(fallback) ? fallback : '/';
}

export function persistAuthSession(session) {
  storage.set(STORAGE_KEYS.token, session.token);
  storage.set(STORAGE_KEYS.refreshToken, session.refreshToken);
  storage.set(STORAGE_KEYS.currentUser, session.user);
  return session;
}

export function clearAuthSession() {
  storage.remove(STORAGE_KEYS.token);
  storage.remove(STORAGE_KEYS.refreshToken);
  storage.remove(STORAGE_KEYS.currentUser);
}
