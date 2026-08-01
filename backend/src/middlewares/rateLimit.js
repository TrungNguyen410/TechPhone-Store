const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 5 } = {}) => (req, res, next) => {
  const key = `${req.ip}:${req.baseUrl}${req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    const cleanup = setTimeout(() => {
      if (buckets.get(key)?.resetAt === resetAt) buckets.delete(key);
    }, windowMs);
    cleanup.unref?.();
    return next();
  }
  if (bucket.count >= max) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({
      success: false,
      message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
    });
  }
  bucket.count += 1;
  return next();
};

module.exports = rateLimit;
