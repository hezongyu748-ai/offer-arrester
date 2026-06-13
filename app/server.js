const http = require("http");
const fs = require("fs");
const path = require("path");

loadDotEnv();

const { analyzeOfferArrester } = require("./lib/offer-arrester");
const {
  applySecurityHeaders,
  createHttpError,
  getClientIp,
  logServerError,
  readJsonBody,
  sendError,
  sendJson,
} = require("./lib/http-utils");
const { enforceRateLimit } = require("./lib/rate-limit");
const { validateAnalyzePayload } = require("./lib/request-validator");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(ROOT, decodeURIComponent(requestPath));

  if (!filePath.startsWith(ROOT)) {
    sendError(
      res,
      createHttpError(403, "Forbidden", {
        publicMessage: "访问被拒绝",
      }),
    );
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendError(
        res,
        createHttpError(404, "Not Found", {
          publicMessage: "页面不存在",
        }),
      );
      return;
    }

    const ext = path.extname(filePath);
    applySecurityHeaders(res);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/health")) {
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
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/api/analyze")) {
    try {
      enforceRateLimit(`analyze:${getClientIp(req)}`, {
        windowMs: 10 * 60 * 1000,
        maxRequests: 10,
      });

      const payload = await readJsonBody(req, { maxBytes: 1024 * 1024 });
      validateAnalyzePayload(payload);
      const result = await analyzeOfferArrester(payload);
      sendJson(res, 200, result);
    } catch (error) {
      logServerError("server.analyze", error, {
        ip: getClientIp(req),
        method: req.method,
        url: req.url,
      });
      sendError(res, error, "分析暂时不可用，请稍后重试");
    }
    return;
  }

  if (req.url.startsWith("/api/")) {
    sendError(
      res,
      createHttpError(404, "API route not found", {
        publicMessage: "接口不存在",
      }),
    );
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Offer Arrester running on http://localhost:${PORT}`);
});
