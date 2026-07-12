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
});
