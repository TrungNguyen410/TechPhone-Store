import { describe, expect, it } from 'vitest';
import { createRuntimeConfig } from './runtimeConfig';


describe('createRuntimeConfig', () => {
  it('enables mock mode only for the exact string true', () => {
    expect(createRuntimeConfig({
      VITE_USE_MOCK: 'true',
    }).useMock).toBe(true);

    expect(createRuntimeConfig({
      VITE_USE_MOCK: 'false',
    }).useMock).toBe(false);

    expect(createRuntimeConfig({}).useMock).toBe(false);
  });


  it('requires an API URL for a production API build', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_SITE_URL: 'https://techphone-store.netlify.app',
    })).toThrow('VITE_API_URL');
  });


  it('rejects a localhost API URL in production', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'http://localhost:5000/api',
      VITE_SITE_URL: 'https://techphone-store.netlify.app',
    })).toThrow('VITE_API_URL');
  });


  it('rejects a localhost site URL in production', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://techphone-store-api.vercel.app/api',
      VITE_SITE_URL: 'http://localhost:5173',
    })).toThrow('VITE_SITE_URL');
  });


  it('accepts Netlify frontend and Vercel backend URLs in production', () => {
    const config = createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://techphone-store-api.vercel.app/api',
      VITE_SITE_URL: 'https://techphone-store.netlify.app',
      VITE_CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      VITE_CLOUDINARY_UPLOAD_PRESET: 'demo-preset',
    });

    expect(config.useMock).toBe(false);
    expect(config.apiUrl).toBe(
      'https://techphone-store-api.vercel.app/api',
    );
    expect(config.siteUrl).toBe(
      'https://techphone-store.netlify.app',
    );
    expect(config.cloudinary).toEqual({
      cloudName: 'demo-cloud',
      uploadPreset: 'demo-preset',
    });
  });
});