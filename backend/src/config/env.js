require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = Number(process.env.PORT || 5000);

const requiredUrl = (name, developmentFallback = '') => {
  const value = String(process.env[name] || (isProduction ? '' : developmentFallback)).trim();
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }

  return value.replace(/\/+$/, '');
};

const getJwtSecret = (name, developmentFallback) => {
  const value = process.env[name] || (isProduction ? '' : developmentFallback);
  const looksLikePlaceholder = /^(change|replace|dev|docker|example|test)[\s_-]/i.test(value);
  if (isProduction && (!value || value.length < 32 || looksLikePlaceholder)) {
    throw new Error(`${name} phải là giá trị mạnh, duy nhất và có ít nhất 32 ký tự trong môi trường production`);
  }

  return value;
};

const vnpayTmnCode = String(process.env.VNPAY_TMN_CODE || '').trim();
const vnpayHashSecret = String(process.env.VNPAY_HASH_SECRET || '').trim();
const vnpayEnabled = Boolean(vnpayTmnCode && vnpayHashSecret);
const inferredDeploymentTarget = process.env.VERCEL
  ? 'vercel'
  : process.env.NETLIFY
    ? 'netlify'
    : process.env.AWS_LAMBDA_FUNCTION_NAME
      ? 'serverless'
      : isProduction
        ? 'render'
        : 'local';
const deploymentTarget = String(
  process.env.DEPLOYMENT_TARGET || inferredDeploymentTarget,
).trim().toLowerCase();
const serverlessTargets = new Set(['vercel', 'netlify', 'serverless', 'aws-lambda']);

if (isProduction && serverlessTargets.has(deploymentTarget)) {
  throw new Error(
    `Serverless production target "${deploymentTarget}" cannot use the local uploads routes; deploy on Render with a persistent disk`,
  );
}

const env = {
  nodeEnv,
  port,
  deploymentTarget,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/techphone_store',
  jwtAccessSecret: getJwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: getJwtSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  frontendUrl: requiredUrl('FRONTEND_URL', 'http://localhost:5173'),
  publicSiteUrl: requiredUrl(
    'PUBLIC_SITE_URL',
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ),
  apiPublicUrl: requiredUrl('API_PUBLIC_URL', `http://localhost:${port}`),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
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
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM || '',
  },
  vnpay: {
    tmnCode: vnpayTmnCode,
    hashSecret: vnpayHashSecret,
    paymentUrl: process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: vnpayEnabled
      ? requiredUrl(
        'VNPAY_RETURN_URL',
        `http://localhost:${port}/api/payments/vnpay/return`,
      )
      : String(
        process.env.VNPAY_RETURN_URL
          || (isProduction ? '' : `http://localhost:${port}/api/payments/vnpay/return`),
      ).trim().replace(/\/+$/, ''),
    version: process.env.VNPAY_VERSION || '2.1.0',
  },
};

module.exports = env;
