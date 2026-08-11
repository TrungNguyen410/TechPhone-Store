require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/*
 * Deployment configuration
 * Bổ sung để nhận diện Vercel / Netlify / serverless.
 */
const detectedPlatformTarget = process.env.VERCEL
  ? 'vercel'
  : process.env.NETLIFY
    ? 'netlify'
    : process.env.AWS_LAMBDA_FUNCTION_NAME
      ? 'aws-lambda'
      : '';

const deploymentTarget = String(
  detectedPlatformTarget
    || process.env.DEPLOYMENT_TARGET
    || (isProduction ? 'render' : 'local'),
).trim().toLowerCase();

const serverlessTargets = new Set([
  'vercel',
  'netlify',
  'serverless',
  'aws-lambda',
]);

const hostedTargets = new Set([
  'render',
  'vercel',
  'netlify',
  'serverless',
  'aws-lambda',
]);

const localUploadsEnabled = !serverlessTargets.has(deploymentTarget);

const trustProxy = hostedTargets.has(deploymentTarget) ? 1 : false;


const getJwtSecret = (name, developmentFallback) => {
  const value = process.env[name] || (isProduction ? '' : developmentFallback);

  const looksLikePlaceholder =
    /^(change|replace|dev|docker|example|test)[\s_-]/i.test(value);

  if (
    isProduction
    && (!value || value.length < 32 || looksLikePlaceholder)
  ) {
    throw new Error(
      `${name} phải là giá trị mạnh, duy nhất và có ít nhất 32 ký tự trong môi trường production`,
    );
  }

  return value;
};


const env = {
  nodeEnv,

  deploymentTarget,
  trustProxy,
  localUploadsEnabled,

  port: Number(process.env.PORT || 5000),

  mongoUri:
    process.env.MONGO_URI || 'mongodb://localhost:27017/techphone_store',

  jwtAccessSecret: getJwtSecret(
    'JWT_ACCESS_SECRET',
    'dev-access-secret',
  ),

  jwtRefreshSecret: getJwtSecret(
    'JWT_REFRESH_SECRET',
    'dev-refresh-secret',
  ),

  jwtAccessExpiresIn:
    process.env.JWT_ACCESS_EXPIRES_IN || '15m',

  jwtRefreshExpiresIn:
    process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  frontendUrl:
    process.env.FRONTEND_URL || 'http://localhost:5173',

  publicSiteUrl:
    process.env.PUBLIC_SITE_URL
    || process.env.FRONTEND_URL
    || 'http://localhost:5173',

  apiPublicUrl:
    process.env.API_PUBLIC_URL
    || `http://localhost:${Number(process.env.PORT || 5000)}`,

  uploadDir:
    process.env.UPLOAD_DIR || 'uploads',

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
    tmnCode:
      process.env.VNPAY_TMN_CODE || '',

    hashSecret:
      process.env.VNPAY_HASH_SECRET || '',

    paymentUrl:
      process.env.VNPAY_PAYMENT_URL
      || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',

    returnUrl:
      process.env.VNPAY_RETURN_URL
      || `http://localhost:${Number(process.env.PORT || 5000)}/api/payments/vnpay/return`,

    version:
      process.env.VNPAY_VERSION || '2.1.0',
  },
};


module.exports = env;