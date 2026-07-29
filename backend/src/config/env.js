require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const getJwtSecret = (name, developmentFallback) => {
  const value = process.env[name] || (isProduction ? '' : developmentFallback);
  const looksLikePlaceholder = /^(change|replace|dev|docker|example|test)[\s_-]/i.test(value);
  if (isProduction && (!value || value.length < 32 || looksLikePlaceholder)) {
    throw new Error(`${name} must be a strong, unique value of at least 32 characters in production`);
  }

  return value;
};

const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/techphone_store',
  jwtAccessSecret: getJwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: getJwtSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  publicSiteUrl: process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  apiPublicUrl:
    process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT || 5000)}`,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'TechPhone <no-reply@techphone.local>',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM || '',
  },
  bank: {
    name: process.env.BANK_NAME || '',
    bin: process.env.BANK_BIN || '',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
    accountName: process.env.BANK_ACCOUNT_NAME || '',
  },
  momo: {
    phone: process.env.MOMO_PHONE || '',
    accountName: process.env.MOMO_ACCOUNT_NAME || '',
  },
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    paymentUrl: process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl:
      process.env.VNPAY_RETURN_URL
      || `http://localhost:${Number(process.env.PORT || 5000)}/api/payments/vnpay/return`,
    version: process.env.VNPAY_VERSION || '2.1.0',
  },
};

module.exports = env;
