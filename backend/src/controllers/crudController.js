const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const createCrudController = (service, resourceName) => ({
  list: asyncHandler(async (req, res) => {
    const data = await service.list(req.query);
    successResponse(res, data, `${resourceName} list retrieved`);
  }),

  listPublic: asyncHandler(async (req, res) => {
    const data = await service.listPublic(req.query);
    successResponse(res, data, `${resourceName} list retrieved`);
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await service.getById(req.params.id);
    successResponse(res, data, `${resourceName} retrieved`);
  }),

  getPublicById: asyncHandler(async (req, res) => {
    const data = await service.getPublicById(req.params.id);
    successResponse(res, data, `${resourceName} retrieved`);
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.create(req.body);
    successResponse(res, data, `${resourceName} created`, 201);
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.update(req.params.id, req.body);
    successResponse(res, data, `${resourceName} updated`);
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await service.remove(req.params.id);
    successResponse(res, data, `${resourceName} deleted`);
  }),
});

module.exports = createCrudController;
