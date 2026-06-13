module.exports = async (_req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
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
    }),
  );
};
