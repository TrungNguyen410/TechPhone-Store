const uploadService = require('../services/uploadService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const uploadSingle = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw new AppError('Image file is required', 422);
  successResponse(
    res,
    {
      filename: file.filename,
      path: file.path,
      url: uploadService.fileUrl(req, file),
      field: file.fieldname,
    },
    'File uploaded',
    201,
  );
});

module.exports = { uploadSingle };
