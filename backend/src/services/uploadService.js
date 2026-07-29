const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const allowedFolders = new Set([
  'adminImage',
  'productImage',
  'bannerImage',
  'avatar',
  'reviewImage',
]);

class UploadService {
  async save(file) {
    if (!file?.buffer || !file.detectedType) {
      throw new AppError('Validated image file is required', 422);
    }
    if (!allowedFolders.has(file.fieldname)) {
      throw new AppError('Upload destination is invalid', 422);
    }

    const destination = path.join(process.cwd(), env.uploadDir, file.fieldname);
    await fs.mkdir(destination, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomUUID()}.${file.detectedType.ext}`;
    await fs.writeFile(path.join(destination, filename), file.buffer, { flag: 'wx' });
    const relativeUrl = `/uploads/${file.fieldname}/${filename}`;

    return {
      filename,
      url: `${env.apiPublicUrl.replace(/\/+$/, '')}${relativeUrl}`,
      field: file.fieldname,
      mimeType: file.detectedType.mime,
    };
  }
}

module.exports = new UploadService();
