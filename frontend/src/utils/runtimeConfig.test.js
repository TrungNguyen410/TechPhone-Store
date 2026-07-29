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
});
