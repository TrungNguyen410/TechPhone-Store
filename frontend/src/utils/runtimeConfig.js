const isLoopbackUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value)
      .hostname
      .replace(/^\[|\]$/g, '')
      .toLowerCase();

    return (
      hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '::1'
    );
  } catch {
    return false;
  }
};


export const createRuntimeConfig = (env = {}) => {
  const useMock = env.VITE_USE_MOCK === 'true';
  const allowLoopback = env.VITE_ALLOW_LOOPBACK === 'true';
  const apiUrl = env.VITE_API_URL || '';
  const siteUrl = env.VITE_SITE_URL || 'http://localhost:5173';

  if (env.PROD && !useMock && !apiUrl) {
    throw new Error(
      'VITE_API_URL là bắt buộc khi VITE_USE_MOCK được đặt thành false',
    );
  }

  if (env.PROD && !useMock && !allowLoopback && isLoopbackUrl(apiUrl)) {
    throw new Error(
      'VITE_API_URL không được trỏ tới localhost trong môi trường production',
    );
  }

  if (env.PROD && !allowLoopback && isLoopbackUrl(siteUrl)) {
    throw new Error(
      'VITE_SITE_URL phải là URL public trong môi trường production',
    );
  }

  return {
    useMock,
    apiUrl: apiUrl || 'http://localhost:5000/api',
    siteUrl,
    cloudinary: {
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
    },
  };
};


export const runtimeConfig = createRuntimeConfig(import.meta.env);
