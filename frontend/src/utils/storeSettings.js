import { STORAGE_KEYS } from './constants';
import { storage } from './storage';

export const DEFAULT_STORE_SETTINGS = {
  storeName: 'TechPhone',
  hotline: '1900 6868',
  email: 'support@techphone.vn',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  logo: '',
  facebook: 'https://facebook.com/techphone',
  instagram: 'https://instagram.com/techphone',
  youtube: 'https://youtube.com/@techphone',
};

export const STORE_SETTINGS_EVENT = 'store-settings-updated';

export const getStoreSettings = () => ({
  ...DEFAULT_STORE_SETTINGS,
  ...storage.get(STORAGE_KEYS.mockSettings, {}),
});

export const saveStoreSettings = (settings) => {
  storage.set(STORAGE_KEYS.mockSettings, settings);
  window.dispatchEvent(new CustomEvent(STORE_SETTINGS_EVENT, { detail: settings }));
};
