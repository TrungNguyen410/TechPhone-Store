const isStrong = (value = '') => value.length >= 12 && !['123456', 'password'].includes(value);

const resolveSeedPassword = (env = process.env) => {
  if ((env.NODE_ENV || 'development') !== 'production') return env.SEED_DEMO_PASSWORD || '123456';
  if (!isStrong(env.SEED_DEMO_PASSWORD)) {
    throw new Error('SEED_DEMO_PASSWORD phải có ít nhất 12 ký tự trong môi trường production');
  }
  return env.SEED_DEMO_PASSWORD;
};

// Tai khoan admin dung mat khau rieng voi cac tai khoan khach demo: khach demo
// co the dung mat khau ngan o dev, con admin thi luon phai du manh.
const DEFAULT_ADMIN_PASSWORD = 'TechPhone2026';

const resolveAdminPassword = (env = process.env) => {
  const value = env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  if (!isStrong(value)) {
    throw new Error('SEED_ADMIN_PASSWORD phải có ít nhất 12 ký tự');
  }
  return value;
};

module.exports = { resolveSeedPassword, resolveAdminPassword, DEFAULT_ADMIN_PASSWORD };
