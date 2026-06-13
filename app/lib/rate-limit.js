const { createHttpError } = require("./http-utils");

const buckets = new Map();

function enforceRateLimit(key, options = {}) {
  const windowMs = options.windowMs || 10 * 60 * 1000;
  const maxRequests = options.maxRequests || 12;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }

  if (bucket.count >= maxRequests) {
    throw createHttpError(429, "Rate limit exceeded", {
      publicMessage: "操作太频繁了，请稍后再试",
    });
  }

  bucket.count += 1;
}

module.exports = {
  enforceRateLimit,
};
