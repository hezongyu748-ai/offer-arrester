class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.publicMessage = options.publicMessage || message;
    this.details = options.details;
  }
}

function createHttpError(statusCode, message, options) {
  return new HttpError(statusCode, message, options);
}

function applySecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", buildContentSecurityPolicy());
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
}

function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
  ].join("; ");
}

function sendJson(res, statusCode, payload) {
  applySecurityHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendError(res, error, fallbackMessage = "Request failed, please try again later.") {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const publicMessage =
    error?.publicMessage || (statusCode >= 500 ? fallbackMessage : error?.message) || fallbackMessage;

  sendJson(res, statusCode, { error: publicMessage });
}

function readJsonBody(req, { maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        reject(
          createHttpError(413, "Request body too large", {
            publicMessage: "提交内容过大，请精简文本或压缩简历后重试",
          }),
        );
        req.destroy();
        return;
      }

      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(
          createHttpError(400, "Invalid JSON body", {
            publicMessage: "请求格式无效，请刷新页面后重试",
          }),
        );
      }
    });

    req.on("error", (error) => {
      reject(
        createHttpError(400, error.message || "Request stream error", {
          publicMessage: "请求读取失败，请稍后重试",
        }),
      );
    });
  });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function logServerError(scope, error, context = {}) {
  const record = {
    scope,
    message: error?.message || "Unknown error",
    statusCode: error?.statusCode || 500,
    details: error?.details,
    context,
  };

  console.error("[offer-arrester]", JSON.stringify(record));
}

module.exports = {
  HttpError,
  applySecurityHeaders,
  createHttpError,
  getClientIp,
  logServerError,
  readJsonBody,
  sendError,
  sendJson,
};
