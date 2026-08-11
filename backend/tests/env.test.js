const originalEnv = process.env;

const loadEnv = (overrides = {}) => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'development',
    VERCEL: '',
    NETLIFY: '',
    AWS_LAMBDA_FUNCTION_NAME: '',
    DEPLOYMENT_TARGET: '',
    ...overrides,
  };

  jest.resetModules();

  return require('../src/config/env');
};

describe('deployment environment configuration', () => {
  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test('uses local deployment settings in development', () => {
    const env = loadEnv();

    expect(env.deploymentTarget).toBe('local');
    expect(env.trustProxy).toBe(false);
    expect(env.localUploadsEnabled).toBe(true);
  });

  test('detects Vercel and disables local uploads', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      JWT_ACCESS_SECRET:
        'production-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET:
        'production-refresh-secret-at-least-32-characters',
    });

    expect(env.deploymentTarget).toBe('vercel');
    expect(env.trustProxy).toBe(1);
    expect(env.localUploadsEnabled).toBe(false);
  });

  test('detects Netlify and disables local uploads', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      NETLIFY: '1',
      JWT_ACCESS_SECRET:
        'production-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET:
        'production-refresh-secret-at-least-32-characters',
    });

    expect(env.deploymentTarget).toBe('netlify');
    expect(env.trustProxy).toBe(1);
    expect(env.localUploadsEnabled).toBe(false);
  });

  test('keeps local uploads enabled for Render', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      DEPLOYMENT_TARGET: 'render',
      JWT_ACCESS_SECRET:
        'production-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET:
        'production-refresh-secret-at-least-32-characters',
    });

    expect(env.deploymentTarget).toBe('render');
    expect(env.trustProxy).toBe(1);
    expect(env.localUploadsEnabled).toBe(true);
  });
});