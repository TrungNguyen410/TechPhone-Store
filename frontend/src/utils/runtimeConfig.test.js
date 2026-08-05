import { describe, expect, it } from 'vitest';
import { createRuntimeConfig } from './runtimeConfig';

describe('createRuntimeConfig', () => {
  it('enables mock mode only for the exact string true', () => {
    expect(createRuntimeConfig({ VITE_USE_MOCK: 'true' }).useMock).toBe(true);
    expect(createRuntimeConfig({ VITE_USE_MOCK: 'false' }).useMock).toBe(false);
    expect(createRuntimeConfig({}).useMock).toBe(false);
  });

  it('requires an API URL for a production API build', () => {
    expect(() => createRuntimeConfig({ PROD: true, VITE_USE_MOCK: 'false' }))
      .toThrow('VITE_API_URL');
  });

  it('does not require an API URL for a production mock build', () => {
    expect(createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'true',
      VITE_SITE_URL: 'https://shop.techphone.example',
    }).apiUrl).toBe('');
  });

  it('requires an absolute site URL instead of localhost fallback in production', () => {
    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api',
      VITE_SITE_URL: '',
    })).toThrow('VITE_SITE_URL');

    expect(() => createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: '/api',
      VITE_SITE_URL: 'https://shop.techphone.example',
    })).toThrow('VITE_API_URL');
  });

  it('normalizes configured production URLs', () => {
    const config = createRuntimeConfig({
      PROD: true,
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'https://api.techphone.example/api/',
      VITE_SITE_URL: 'https://shop.techphone.example///',
    });

    expect(config.apiUrl).toBe('https://api.techphone.example/api');
    expect(config.siteUrl).toBe('https://shop.techphone.example');
  });
});
