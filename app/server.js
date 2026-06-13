const http = require("http");
const fs = require("fs");
const path = require("path");

loadDotEnv();

const { analyzeOfferArrester } = require("./lib/offer-arrester");

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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(ROOT, decodeURIComponent(requestPath));

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not Found" });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/health")) {
    sendJson(res, 200, {
      ok: true,
      provider: process.env.DEEPSEEK_API_KEY
        ? "deepseek"
        : process.env.GEMINI_API_KEY
        ? "gemini"
        : process.env.ARK_API_KEY && process.env.ARK_MODEL
          ? "ark"
          : process.env.OPENAI_API_KEY
            ? "openai"
            : "none",
      hasDeepSeekKey: Boolean(process.env.DEEPSEEK_API_KEY),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasArkKey: Boolean(process.env.ARK_API_KEY),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.DEEPSEEK_API_KEY
        ? process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"
        : process.env.GEMINI_API_KEY
        ? process.env.GEMINI_MODEL || "gemini-3.5-flash"
        : process.env.ARK_API_KEY && process.env.ARK_MODEL
          ? process.env.ARK_MODEL
        : process.env.OPENAI_MODEL || "gpt-4.1-mini",
    });
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/api/analyze")) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = await analyzeOfferArrester(payload);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 400, { error: error.message || "分析失败" });
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Offer Arrester running on http://localhost:${PORT}`);
});
