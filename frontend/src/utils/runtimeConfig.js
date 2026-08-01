export const createRuntimeConfig = (env = {}) => {
  const useMock = env.VITE_USE_MOCK === 'true';
  const apiUrl = env.VITE_API_URL || '';

  if (env.PROD && !useMock && !apiUrl) {
    throw new Error('VITE_API_URL là bắt buộc khi VITE_USE_MOCK được đặt thành false');
  }

  return {
    useMock,
    apiUrl: apiUrl || 'http://localhost:5000/api',
    siteUrl: env.VITE_SITE_URL || 'http://localhost:5173',
    cloudinary: {
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
    },
  };
};

export const runtimeConfig = createRuntimeConfig(import.meta.env);
