const OPENAI_API_BASE = "https://api.openai.com/v1";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const DEFAULT_ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_ARK_MODEL = process.env.ARK_MODEL || "";
const DEFAULT_DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const { extractResumeText, mergeProfileWithResume } = require("./resume-parser");

function buildPrompt(profile, resumeText = "") {
  return [
    "你是 Offer Arrester，一个面向大学生求职场景的 AI 求职匹配助手。",
    "你要根据学生画像、项目经历、求职意向、目标岗位 JD，以及可选的简历文本，输出结构化分析。",
    "请输出严格 JSON，不要使用 Markdown，不要输出解释性前缀。",
    "JSON 字段必须包含：",
    "matchScore: 0-100 整数",
    "matchSummary: 一句话总结",
    "passScore: 0-100 整数",
    "passSummary: 一句话总结",
    "bestRole: 最推荐投递的岗位名称",
    "bestRoleReason: 推荐理由，一句话",
    "recommendedJobs: 长度 3 的数组，每项包含 title, score, reason",
    "strengths: 长度 3-4 的字符串数组",
    "gaps: 长度 3-4 的字符串数组",
    "actions: 长度 3-5 的字符串数组，必须可执行",
    "traces: 长度 3 的字符串数组，说明判定依据",
    "rewrite: 对象，包含 before 和 after 两个字段",
    "submissionSummary: 1 段 120 字以内的作品简介",
    "publicUrlHint: 1 句提醒，说明部署后把公网首页链接填到表单第 6 项",
    "",
    "要求：",
    "1. 分析必须贴近学生求职，而不是泛泛职业建议。",
    "2. 分数要有区分度，不要总给高分。",
    "3. actions 必须明确到简历如何改。",
    "4. rewrite.after 要更像真实简历语言。",
    "5. 如果用户没填完整表单，但有简历文本，请优先利用简历文本补足判断。",
    "",
    "以下是学生输入：",
    `姓名：${profile.name || ""}`,
    `学校/专业/年级：${profile.school || ""}`,
    `求职意向：${profile.goal || ""}`,
    `核心技能：${profile.skills || ""}`,
    `项目经历：${profile.projects || ""}`,
    `目标岗位JD：${profile.jd || ""}`,
    "",
    "以下是从简历文件中提取的文本（如果为空说明用户未上传或提取失败）：",
    resumeText || "",
  ].join("\n");
}

function clampInt(value, min, max, fallback) {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function ensureStrings(value, minLength, fallback) {
  const arr = Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  while (arr.length < minLength) arr.push(fallback);
  return arr.slice(0, Math.max(minLength, arr.length));
}

function ensureJobs(value) {
  const arr = Array.isArray(value) ? value : [];
  const normalized = arr
    .filter((item) => item && item.title)
    .map((item, index) => ({
      title: String(item.title),
      score: clampInt(item.score, 0, 100, Math.max(60, 80 - index * 5)),
      reason: item.reason ? String(item.reason) : "",
    }));

  while (normalized.length < 3) {
    normalized.push({
      title: `推荐岗位 ${normalized.length + 1}`,
      score: Math.max(60, 80 - normalized.length * 5),
      reason: "",
    });
  }

  return normalized.slice(0, 3);
}

function normalizeAnalysis(data) {
  return {
    matchScore: clampInt(data.matchScore, 0, 100, 72),
    matchSummary: data.matchSummary || "已生成匹配分析。",
    passScore: clampInt(data.passScore, 0, 100, 68),
    passSummary: data.passSummary || "已生成简历通过率预测。",
    bestRole: data.bestRole || "待进一步分析",
    bestRoleReason: data.bestRoleReason || "系统已根据当前画像给出岗位建议。",
    recommendedJobs: ensureJobs(data.recommendedJobs),
    strengths: ensureStrings(data.strengths, 3, "已识别出与目标岗位相关的基础能力。"),
    gaps: ensureStrings(data.gaps, 3, "建议补充更多量化成果和岗位化表达。"),
    actions: ensureStrings(data.actions, 3, "将项目经历改写为“动作 + 方法 + 结果”的简历表述。"),
    traces: ensureStrings(data.traces, 3, "系统已结合技能关键词、项目类型和岗位要求进行分析。"),
    rewrite: {
      before: data.rewrite?.before || "原始项目表达未提供。",
      after: data.rewrite?.after || "建议将项目经历改写为更贴近目标岗位的语言。",
    },
    submissionSummary:
      data.submissionSummary ||
      "Offer Arrester 是一个面向大学生求职场景的 AI 匹配工具，帮助学生快速找到更适合自己的岗位方向，并针对目标 JD 输出匹配分析与简历优化建议。",
    publicUrlHint:
      data.publicUrlHint || "部署到公网后，请将首页 URL 填写到提交表单第 6 项。",
  };
}

function safeJsonParse(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function extractOpenAIOutputText(responseJson) {
  const chunks = [];
  for (const item of responseJson.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function extractGeminiOutputText(responseJson) {
  const parts = responseJson?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function extractChatCompletionText(responseJson) {
  return responseJson?.choices?.[0]?.message?.content?.trim() || "";
}

async function uploadCompatibleFile(apiKey, baseUrl, resumeFile) {
  const formData = new FormData();
  const bytes = Buffer.from(resumeFile.base64, "base64");
  const file = new File([bytes], resumeFile.fileName || "resume.bin", {
    type: resumeFile.mimeType || "application/octet-stream",
  });

  formData.set("purpose", "user_data");
  formData.set("file", file);

  const response = await fetch(`${baseUrl}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`兼容接口文件上传失败：${await response.text()}`);
  }

  return response.json();
}

async function createCompatibleAnalysis({
  apiKey,
  baseUrl,
  model,
  providerLabel,
  profile,
  resumeFile,
  resumeText,
}) {
  const content = [{ type: "input_text", text: buildPrompt(profile, resumeText) }];

  if (resumeFile?.base64) {
    const uploaded = await uploadCompatibleFile(apiKey, baseUrl, resumeFile);
    content.unshift({
      type: "input_file",
      file_id: uploaded.id,
    });
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      temperature: 0.3,
      max_output_tokens: 1400,
      input: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    throw new Error(`${providerLabel} 调用失败：${await response.text()}`);
  }

  const json = await response.json();
  return normalizeAnalysis(safeJsonParse(extractOpenAIOutputText(json)));
}

function buildGeminiParts(profile, resumeFile, resumeText) {
  const parts = [{ text: buildPrompt(profile, resumeText) }];

  if (resumeFile?.base64) {
    parts.unshift({
      inlineData: {
        mimeType: resumeFile.mimeType || "application/octet-stream",
        data: resumeFile.base64,
      },
    });
  }

  return parts;
}

async function createGeminiAnalysis(apiKey, profile, resumeFile, resumeText) {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: buildGeminiParts(profile, resumeFile, resumeText),
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini 调用失败：${await response.text()}`);
  }

  const json = await response.json();
  const outputText = extractGeminiOutputText(json);
  if (!outputText) {
    throw new Error("Gemini 未返回可解析内容");
  }

  return normalizeAnalysis(safeJsonParse(outputText));
}

async function createDeepSeekAnalysis(apiKey, profile, resumeText) {
  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      messages: [
        {
          role: "system",
          content:
            "你是一个严格输出 JSON 的求职匹配助手。不要输出 Markdown，不要输出解释，只返回 JSON 对象。",
        },
        {
          role: "user",
          content: buildPrompt(profile, resumeText),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek 调用失败：${await response.text()}`);
  }

  const json = await response.json();
  const outputText = extractChatCompletionText(json);
  if (!outputText) {
    throw new Error("DeepSeek 未返回可解析内容");
  }

  return normalizeAnalysis(safeJsonParse(outputText));
}

async function analyzeOfferArrester(payload) {
  const incomingProfile = payload?.profile || {};
  const resumeText = await extractResumeText(payload?.resumeFile);
  const profile = mergeProfileWithResume(incomingProfile, resumeText);

  if (!profile.jd || !profile.jd.trim()) {
    throw new Error("请至少填写目标岗位 JD，或先从示例岗位库选择一个目标岗位。");
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return createDeepSeekAnalysis(process.env.DEEPSEEK_API_KEY, profile, resumeText);
  }

  if (process.env.GEMINI_API_KEY) {
    return createGeminiAnalysis(process.env.GEMINI_API_KEY, profile, payload.resumeFile, resumeText);
  }

  if (process.env.ARK_API_KEY && DEFAULT_ARK_MODEL) {
    return createCompatibleAnalysis({
      apiKey: process.env.ARK_API_KEY,
      baseUrl: DEFAULT_ARK_BASE_URL,
      model: DEFAULT_ARK_MODEL,
      providerLabel: "豆包 / 火山方舟",
      profile,
      resumeFile: payload.resumeFile,
      resumeText,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return createCompatibleAnalysis({
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: OPENAI_API_BASE,
      model: DEFAULT_OPENAI_MODEL,
      providerLabel: "OpenAI",
      profile,
      resumeFile: payload.resumeFile,
      resumeText,
    });
  }

  throw new Error(
    "未配置可用模型密钥。可配置 DEEPSEEK_API_KEY，或 GEMINI_API_KEY，或 ARK_API_KEY + ARK_MODEL，也可使用 OPENAI_API_KEY。",
  );
}

module.exports = {
  analyzeOfferArrester,
};
