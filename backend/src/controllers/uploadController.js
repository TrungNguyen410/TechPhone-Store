const uploadService = require('../services/uploadService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const uploadSingle = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw new AppError('Image file is required', 422);
  const uploaded = await uploadService.save(file);
  successResponse(
    res,
    uploaded,
    'File uploaded',
    201,
  );
});

module.exports = { uploadSingle };
