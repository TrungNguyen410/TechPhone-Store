const originalEnv = process.env;

const productionEnv = (overrides = {}) => ({
  ...originalEnv,
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'production-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'production-refresh-secret-at-least-32-characters',
  FRONTEND_URL: 'https://shop.techphone.example/',
  PUBLIC_SITE_URL: 'https://shop.techphone.example///',
  API_PUBLIC_URL: 'https://api.techphone.example/',
  DEPLOYMENT_TARGET: 'render',
  UPLOAD_DIR: '/app/uploads',
  VNPAY_TMN_CODE: '',
  VNPAY_HASH_SECRET: '',
  VNPAY_RETURN_URL: '',
  ...overrides,
});

const loadEnv = (overrides = {}) => {
  process.env = productionEnv(overrides);
  jest.resetModules();
  return require('../src/config/env');
};

describe('production environment configuration', () => {
  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('requires absolute public HTTP URLs and trims trailing slashes', () => {
    const env = loadEnv();

    expect(env.frontendUrl).toBe('https://shop.techphone.example');
    expect(env.publicSiteUrl).toBe('https://shop.techphone.example');
    expect(env.apiPublicUrl).toBe('https://api.techphone.example');
  });

  it.each(['FRONTEND_URL', 'PUBLIC_SITE_URL', 'API_PUBLIC_URL'])(
    'fails fast when %s is not an absolute HTTP URL',
    (name) => {
      expect(() => loadEnv({ [name]: '/relative-url' })).toThrow(name);
    },
  );

  it('requires VNPAY_RETURN_URL only when VNPay is enabled', () => {
    expect(() => loadEnv()).not.toThrow();
    expect(() => loadEnv({
      VNPAY_TMN_CODE: 'merchant-code',
      VNPAY_HASH_SECRET: 'merchant-secret',
    })).toThrow('VNPAY_RETURN_URL');

    const env = loadEnv({
      VNPAY_TMN_CODE: 'merchant-code',
      VNPAY_HASH_SECRET: 'merchant-secret',
      VNPAY_RETURN_URL: 'https://api.techphone.example/api/payments/vnpay/return/',
    });
    expect(env.vnpay.returnUrl)
      .toBe('https://api.techphone.example/api/payments/vnpay/return');
  });

  it('rejects local uploads on a serverless production target', () => {
    expect(() => loadEnv({
      DEPLOYMENT_TARGET: 'vercel',
      UPLOAD_DIR: '/tmp/uploads',
    })).toThrow(/serverless.*local uploads/i);
  });
});
