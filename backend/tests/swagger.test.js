const swaggerDocument = require('../src/config/swagger');

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

describe('Swagger OpenAPI document', () => {
  it('documents a response for every operation', () => {
    for (const pathItem of Object.values(swaggerDocument.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (httpMethods.has(method)) expect(operation.responses).toBeDefined();
      }
    }
  });

  it('documents every path parameter used in a route', () => {
    for (const [path, pathItem] of Object.entries(swaggerDocument.paths)) {
      const names = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!httpMethods.has(method)) continue;

        for (const name of names) {
          expect(operation.parameters).toEqual(
            expect.arrayContaining([expect.objectContaining({ name, in: 'path', required: true })]),
          );
        }
      }
    }
  });

  it('uses API_PUBLIC_URL in production without advertising localhost', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'production-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET: 'production-refresh-secret-at-least-32-characters',
      FRONTEND_URL: 'https://shop.techphone.example',
      PUBLIC_SITE_URL: 'https://shop.techphone.example',
      API_PUBLIC_URL: 'https://api.techphone.example/',
      DEPLOYMENT_TARGET: 'render',
      UPLOAD_DIR: '/app/uploads',
      VNPAY_TMN_CODE: '',
      VNPAY_HASH_SECRET: '',
      VNPAY_RETURN_URL: '',
    };
    jest.resetModules();

    try {
      const productionSwagger = require('../src/config/swagger');
      expect(productionSwagger.servers).toEqual([
        { url: 'https://api.techphone.example/api', description: 'Production' },
      ]);
      expect(JSON.stringify(productionSwagger.servers)).not.toContain('localhost');
    } finally {
      process.env = originalEnv;
      jest.resetModules();
    }
  });

  it('adds the Express /api mount exactly once', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'production-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET: 'production-refresh-secret-at-least-32-characters',
      FRONTEND_URL: 'https://shop.techphone.example',
      PUBLIC_SITE_URL: 'https://shop.techphone.example',
      API_PUBLIC_URL: 'https://api.techphone.example/',
      DEPLOYMENT_TARGET: 'render',
      UPLOAD_DIR: '/app/uploads',
      VNPAY_TMN_CODE: '',
      VNPAY_HASH_SECRET: '',
      VNPAY_RETURN_URL: '',
    };
    jest.resetModules();

    try {
      const productionSwagger = require('../src/config/swagger');
      expect(productionSwagger.servers[0].url).toBe('https://api.techphone.example/api');
      expect(productionSwagger.servers[0].url).not.toMatch(/\/api\/api\/?$/);
    } finally {
      process.env = originalEnv;
      jest.resetModules();
    }
  });
});
