const { createHttpError } = require("./http-utils");

const MAX_BASE64_SIZE = 5 * 1024 * 1024;
const ALLOWED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

function validateAnalyzePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError(400, "Invalid payload", {
      publicMessage: "提交内容格式不正确，请刷新页面后重试",
    });
  }

  const profile = payload.profile || {};
  if (typeof profile !== "object" || Array.isArray(profile)) {
    throw createHttpError(400, "Invalid profile payload", {
      publicMessage: "求职信息格式不正确，请检查后重试",
    });
  }

  for (const key of ["name", "school", "goal", "skills", "projects", "jd"]) {
    if (profile[key] != null && typeof profile[key] !== "string") {
      throw createHttpError(400, `Invalid profile field: ${key}`, {
        publicMessage: "有字段格式不正确，请检查输入内容",
      });
    }
  }

  validateResumeFile(payload.resumeFile);
}

function validateResumeFile(resumeFile) {
  if (!resumeFile) return;
  if (typeof resumeFile !== "object" || Array.isArray(resumeFile)) {
    throw createHttpError(400, "Invalid resume file payload", {
      publicMessage: "简历文件信息无效，请重新上传",
    });
  }

  const { fileName, mimeType, base64 } = resumeFile;
  if (fileName != null && typeof fileName !== "string") {
    throw createHttpError(400, "Invalid resume file name", {
      publicMessage: "简历文件名无效，请重新上传",
    });
  }

  if (mimeType != null && typeof mimeType !== "string") {
    throw createHttpError(400, "Invalid resume mime type", {
      publicMessage: "简历文件类型无效，请重新上传",
    });
  }

  if (base64 != null && typeof base64 !== "string") {
    throw createHttpError(400, "Invalid resume content", {
      publicMessage: "简历文件内容无效，请重新上传",
    });
  }

  if (base64 && base64.length > MAX_BASE64_SIZE) {
    throw createHttpError(413, "Resume file too large", {
      publicMessage: "简历文件过大，请控制在 5MB 以内后重试",
    });
  }

  if (mimeType && !ALLOWED_RESUME_MIME_TYPES.has(mimeType)) {
    throw createHttpError(415, "Unsupported resume mime type", {
      publicMessage: "目前仅支持 PDF、DOC、DOCX 简历",
    });
  }
}

module.exports = {
  MAX_BASE64_SIZE,
  validateAnalyzePayload,
};
