const pdfParse = require("pdf-parse");
const zlib = require("zlib");

async function extractResumeText(resumeFile) {
  if (!resumeFile?.base64) return "";

  const buffer = Buffer.from(resumeFile.base64, "base64");
  const fileName = (resumeFile.fileName || "").toLowerCase();
  const mimeType = (resumeFile.mimeType || "").toLowerCase();

  if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (mimeType.includes("wordprocessingml") || fileName.endsWith(".docx")) {
    return extractDocxText(buffer);
  }

  return "";
}

async function extractPdfText(buffer) {
  try {
    const result = await pdfParse(buffer);
    return sanitizeText(result.text || "");
  } catch (_error) {
    return "";
  }
}

function extractDocxText(buffer) {
  try {
    const xml = unzipDocxXml(buffer, "word/document.xml");
    if (!xml) return "";
    return sanitizeText(
      xml
        .replace(/<w:p[^>]*>/g, "\n")
        .replace(/<w:tab\/>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    );
  } catch (_error) {
    return "";
  }
}

function unzipDocxXml(buffer, targetPath) {
  const signature = 0x04034b50;
  let offset = 0;

  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) !== signature) {
      offset += 1;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);
    const fileName = buffer
      .slice(offset + 30, offset + 30 + fileNameLength)
      .toString("utf8");
    const dataStart = offset + 30 + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + compressedSize;

    if (fileName === targetPath) {
      const compressed = buffer.slice(dataStart, dataEnd);
      if (compressionMethod === 0) return compressed.toString("utf8");
      if (compressionMethod === 8) return zlib.inflateRawSync(compressed).toString("utf8");
      return "";
    }

    offset = dataEnd;
  }

  return "";
}

function mergeProfileWithResume(profile, resumeText) {
  const next = { ...profile };
  if (!resumeText) return next;

  if (!next.projects || next.projects.trim().length < 20) {
    next.projects = resumeText.slice(0, 1800);
  }

  if (!next.skills || next.skills.trim().length < 4) {
    next.skills = extractSkillsHint(resumeText);
  }

  if (!next.goal || next.goal.trim().length < 2) {
    next.goal = inferGoal(resumeText);
  }

  return next;
}

function extractSkillsHint(text) {
  const hits = [];
  const keywords = [
    "SQL",
    "Python",
    "Excel",
    "Power BI",
    "Tableau",
    "Axure",
    "Figma",
    "Prompt",
    "AIGC",
    "用户研究",
    "数据分析",
    "产品设计",
    "竞品分析",
  ];

  for (const keyword of keywords) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      hits.push(keyword);
    }
  }

  return hits.length ? hits.join("、") : "请根据简历补充核心技能";
}

function inferGoal(text) {
  const lower = text.toLowerCase();
  if (lower.includes("产品") || lower.includes("原型") || lower.includes("用户研究")) {
    return "产品经理、AI 产品经理、产品运营";
  }
  if (lower.includes("sql") || lower.includes("python") || lower.includes("数据")) {
    return "数据分析师、商业分析师";
  }
  return "请根据简历自动推断目标岗位";
}

function sanitizeText(text) {
  return String(text).replace(/\0/g, "").replace(/\s+\n/g, "\n").trim();
}

module.exports = {
  extractResumeText,
  mergeProfileWithResume,
};
