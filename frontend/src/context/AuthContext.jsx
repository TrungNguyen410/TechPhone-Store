import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.get(STORAGE_KEYS.currentUser));
  const [token, setToken] = useState(() => storage.get(STORAGE_KEYS.token));
  const [loading, setLoading] = useState(Boolean(token));

  const persistSession = useCallback((session) => {
    setToken(session.token);
    setUser(session.user);
    storage.set(STORAGE_KEYS.token, session.token);
    storage.set(STORAGE_KEYS.currentUser, session.user);
    return session;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.currentUser);
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const persistedUser = storage.get(STORAGE_KEYS.currentUser);
    if (!token || !persistedUser) {
      setLoading(false);
      return null;
    }
    try {
      const currentUser = await authApi.me(persistedUser);
      setUser(currentUser);
      storage.set(STORAGE_KEYS.currentUser, currentUser);
      return currentUser;
    } catch {
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout, token]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(async (credentials) => persistSession(await authApi.login(credentials)), [persistSession]);
  const requestRegistrationOtp = useCallback((payload) => authApi.requestRegistrationOtp(payload), []);
  const verifyRegistrationOtp = useCallback(
    async (payload) => persistSession(await authApi.verifyRegistrationOtp(payload)),
    [persistSession],
  );

  const updateProfile = useCallback(
    async (payload) => {
      const updatedUser = await authApi.updateProfile(user.id, payload);
      setUser(updatedUser);
      storage.set(STORAGE_KEYS.currentUser, updatedUser);
      return updatedUser;
    },
    [user],
  );

  const changePassword = useCallback(
    (payload) => authApi.changePassword(user.id, payload),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      login,
      requestRegistrationOtp,
      verifyRegistrationOtp,
      logout,
      updateProfile,
      changePassword,
      loadCurrentUser,
    }),
    [changePassword, loadCurrentUser, loading, login, logout, requestRegistrationOtp, token, updateProfile, user, verifyRegistrationOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
