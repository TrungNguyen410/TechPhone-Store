const customerService = require('../services/customerService');
const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const dashboard = asyncHandler(async (_req, res) => {
  const data = await dashboardService.statistics();
  successResponse(res, data, 'Dashboard statistics retrieved');
});

const customers = asyncHandler(async (_req, res) => {
  const data = await customerService.list();
  successResponse(res, data, 'Customers retrieved');
});

const updateCustomer = asyncHandler(async (req, res) => {
  const data = await customerService.update(req.params.id, req.body);
  successResponse(res, data, 'Customer updated');
});

module.exports = { dashboard, customers, updateCustomer };
