import { useEffect, useState } from 'react';
import { getStoreSettings, STORE_SETTINGS_EVENT } from '../utils/storeSettings';

export function useStoreSettings() {
  const [settings, setSettings] = useState(getStoreSettings);

  useEffect(() => {
    const refresh = () => setSettings(getStoreSettings());
    window.addEventListener(STORE_SETTINGS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(STORE_SETTINGS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return settings;
}
