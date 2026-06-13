const { analyzeOfferArrester } = require("../lib/offer-arrester");
const {
  createHttpError,
  getClientIp,
  logServerError,
  readJsonBody,
  sendError,
  sendJson,
} = require("../lib/http-utils");
const { enforceRateLimit } = require("../lib/rate-limit");
const { validateAnalyzePayload } = require("../lib/request-validator");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    sendError(
      res,
      createHttpError(405, "Method Not Allowed", {
        publicMessage: "请求方式不支持",
      }),
    );
    return;
  }

  try {
    enforceRateLimit(`analyze:${getClientIp(req)}`, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
    });

    let payload = req.body;

    if (!payload || (typeof payload === "object" && Object.keys(payload).length === 0)) {
      payload = await readJsonBody(req, { maxBytes: 1024 * 1024 });
    } else if (typeof payload === "string") {
      payload = JSON.parse(payload);
    }

    validateAnalyzePayload(payload || {});
    const result = await analyzeOfferArrester(payload || {});
    sendJson(res, 200, result);
  } catch (error) {
    logServerError("api.analyze", error, {
      ip: getClientIp(req),
      method: req.method,
      url: req.url,
    });
    sendError(res, error, "分析暂时不可用，请稍后重试");
  }
};
