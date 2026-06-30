const uploadService = require('../services/uploadService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const uploadSingle = asyncHandler(async (req, res) => {
  const file = req.file;
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
