const { sendJson } = require("../lib/http-utils");

module.exports = async (_req, res) => {
  sendJson(res, 200, {
    ok: true,
    service: "offer-arrester",
    apiReady: Boolean(
      process.env.DEEPSEEK_API_KEY ||
        process.env.GEMINI_API_KEY ||
        (process.env.ARK_API_KEY && process.env.ARK_MODEL) ||
        process.env.OPENAI_API_KEY,
    ),
  });
};
