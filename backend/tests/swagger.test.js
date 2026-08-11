const swaggerDocument = require('../src/config/swagger');
const app = require('../src/app');
const env = require('../src/config/env');

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

describe('Swagger OpenAPI document', () => {
  it('uses the configured trust proxy setting', () => {
  expect(app.get('trust proxy')).toBe(env.trustProxy);
});

  it('uses API_PUBLIC_URL for the configured deployment server', () => {
    const previousApiPublicUrl = process.env.API_PUBLIC_URL;
    process.env.API_PUBLIC_URL = 'https://api.techphone.example/';
    jest.resetModules();

    const configuredSwaggerDocument = require('../src/config/swagger');

    if (previousApiPublicUrl === undefined) {
      delete process.env.API_PUBLIC_URL;
    } else {
      process.env.API_PUBLIC_URL = previousApiPublicUrl;
    }
    jest.resetModules();

    expect(configuredSwaggerDocument.servers).toContainEqual({
      url: 'https://api.techphone.example/api',
      description: 'Configured deployment',
    });
  });

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
});
