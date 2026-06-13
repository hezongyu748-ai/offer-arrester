const { analyzeOfferArrester } = require("../lib/offer-arrester");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  try {
    let payload = req.body;

    if (!payload || (typeof payload === "object" && Object.keys(payload).length === 0)) {
      payload = await readJsonBody(req);
    } else if (typeof payload === "string") {
      payload = JSON.parse(payload);
    }

    const result = await analyzeOfferArrester(payload || {});
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message || "分析失败" }));
  }
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
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
        reject(new Error("请求体不是有效的 JSON"));
      }
    });
    req.on("error", reject);
  });
}
