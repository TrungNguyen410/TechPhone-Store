import { STORAGE_KEYS } from './constants';
import { storage } from './storage';

export const DEFAULT_STORE_SETTINGS = {
  storeName: 'TechPhone',
  hotline: '0918550811',
  email: 'trungnguyen550811@gmail.com',
  address: 'Đường Trần Văn Giàu, Hòa Thuận, Vĩnh Long',
  logo: '/brand/techphone-mark.svg',
  facebook: 'https://www.facebook.com/trung.nguyen.592626',
  tiktok: 'https://www.tiktok.com/@guppy.farm.tr.vin',
  youtube: 'https://www.youtube.com/@nguyentrung8133',
  zaloUrl: '',
};

export const STORE_SETTINGS_EVENT = 'store-settings-updated';

export const normalizeSettings = (settings) => {
  const values = Array.isArray(settings)
    ? Object.fromEntries(
        settings
          .filter((setting) => setting?.key)
          .map((setting) => [setting.key, setting.value]),
      )
    : settings || {};
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...values,
  };
};

export const getStoreSettings = () => ({
  ...normalizeSettings(storage.get(STORAGE_KEYS.mockSettings, {})),
});

export const saveStoreSettings = (settings) => {
  const normalized = normalizeSettings(settings);
  storage.set(STORAGE_KEYS.mockSettings, normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORE_SETTINGS_EVENT, { detail: normalized }));
  }
  return normalized;
};
