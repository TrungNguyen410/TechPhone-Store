export const createRuntimeConfig = (env = {}) => {
  const useMock = env.VITE_USE_MOCK === 'true';
  const normalizeHttpUrl = (name, value, fallback = '') => {
    const resolved = String(value || fallback).trim();

    if (!resolved) return '';

    if (env.PROD) {
      let parsed;
      try {
        parsed = new URL(resolved);
      } catch {
        throw new Error(`${name} must be an absolute HTTP(S) URL in production`);
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`${name} must be an absolute HTTP(S) URL in production`);
      }
    }

    return resolved.replace(/\/+$/, '');
  };
  const apiUrl = normalizeHttpUrl(
    'VITE_API_URL',
    env.VITE_API_URL,
    env.PROD ? '' : 'http://localhost:5000/api',
  );
  const siteUrl = normalizeHttpUrl(
    'VITE_SITE_URL',
    env.VITE_SITE_URL,
    env.PROD ? '' : 'http://localhost:5173',
  );

  if (env.PROD && !useMock && !apiUrl) {
    throw new Error('VITE_API_URL là bắt buộc khi VITE_USE_MOCK được đặt thành false');
  }
  if (env.PROD && !siteUrl) {
    throw new Error('VITE_SITE_URL is required in production');
  }

  return {
    useMock,
    apiUrl,
    siteUrl,
    cloudinary: {
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
    },
  };
};

export const runtimeConfig = createRuntimeConfig(import.meta.env);
