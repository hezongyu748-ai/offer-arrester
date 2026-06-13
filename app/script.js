const sampleJds = [
  {
    id: "ai-pm",
    label: "AI 产品经理",
    teaser: "需求分析 / 用户研究 / 数据分析 / AI 理解",
    jd:
      "岗位：AI产品经理实习生\n职责：参与 AI 产品需求分析、用户研究、竞品调研、数据分析与功能迭代；与研发和设计协同推进项目落地。\n要求：本科及以上在读，逻辑清晰，有产品意识；具备数据分析能力，熟悉 SQL 或 Python 优先；有 AI 产品、校园项目、用户研究经历优先；表达能力强，能把复杂问题讲清楚。",
  },
  {
    id: "data-analyst",
    label: "数据分析实习生",
    teaser: "SQL / Python / 指标体系 / 可视化",
    jd:
      "岗位：数据分析实习生\n职责：支持业务指标监控、报表搭建、用户行为分析、增长漏斗分析和专题复盘。\n要求：熟悉 SQL、Excel、Python 其中两项；具备结构化分析能力，能输出洞察结论；有数据分析项目、商业分析或增长分析经历优先。",
  },
  {
    id: "product-ops",
    label: "产品运营实习生",
    teaser: "活动运营 / 增长转化 / 用户沟通 / 内容策划",
    jd:
      "岗位：产品运营实习生\n职责：参与活动策划、用户运营、内容搭建和转化提升；协同产品和设计推动优化。\n要求：有用户意识和执行力，善于沟通，有校园活动、内容运营或增长项目经验优先，能结合数据发现问题并提出方案。",
  },
];

const demoProfile = {
  name: "李然",
  school: "中山大学 / 信息管理与信息系统 / 大三",
  goal: "AI 产品经理、数据分析师、商业分析实习生",
  skills: "SQL、Python、Excel、问卷设计、用户访谈、竞品分析、Axure、Prompt 设计、基础数据可视化",
  projects:
    "1. 校园二手交易平台项目：负责需求分析、原型设计与 32 名学生访谈，并输出 12 条关键洞察。\n2. 社团招新增长分析：清洗报名数据，输出转化漏斗和海报投放建议，报名转化率提升 18%。\n3. AIGC 学习搭子项目：用大模型帮助新生制定复习计划并收集用户反馈，7 天留存达到 41%。",
  jd: sampleJds[0].jd,
};

const $ = (selector) => document.querySelector(selector);
const form = $("#profile-form");
const fillDemoButton = $("#fill-demo");
const statusBadge = $("#status-badge");
const matchScore = $("#match-score");
const matchSummary = $("#match-summary");
const passScore = $("#pass-score");
const passSummary = $("#pass-summary");
const bestRole = $("#best-role");
const bestRoleSummary = $("#best-role-summary");
const jobList = $("#job-list");
const strengthList = $("#strength-list");
const gapList = $("#gap-list");
const actionList = $("#action-list");
const beforeText = $("#before-text");
const afterText = $("#after-text");
const copyRewriteButton = $("#copy-rewrite");
const jdCardList = $("#jd-card-list");
const resumeFileInput = $("#resume-file");
const resumeFileName = $("#resume-file-name");
const traceList = $("#trace-list");
const deploymentNote = $("#deployment-note");
const submissionSummary = $("#submission-summary");
const alertModal = $("#alert-modal");
const alertMessage = $("#alert-message");
const alertClose = $("#alert-close");
const alertConfirm = $("#alert-confirm");

let uploadedFile = null;

renderJdCards();

alertClose.addEventListener("click", closeAlert);
alertConfirm.addEventListener("click", closeAlert);
alertModal.addEventListener("click", (event) => {
  if (event.target === alertModal) {
    closeAlert();
  }
});

fillDemoButton.addEventListener("click", () => {
  Object.entries(demoProfile).forEach(([key, value]) => {
    form.elements[key].value = value;
  });
  statusBadge.textContent = "已加载示例";
});

resumeFileInput.addEventListener("change", async () => {
  const file = resumeFileInput.files[0];
  if (!file) {
    uploadedFile = null;
    resumeFileName.textContent = "未选择文件";
    return;
  }

  try {
    uploadedFile = {
      fileName: file.name,
      mimeType: file.type || guessMimeType(file.name),
      base64: await fileToBase64(file),
    };
    resumeFileName.textContent = `已载入：${file.name}`;
  } catch (_error) {
    uploadedFile = null;
    resumeFileName.textContent = "文件读取失败，请重试";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = Object.fromEntries(new FormData(form).entries());

  if (uploadedFile && !payload.jd.trim()) {
    showAlert("请至少填写目标岗位 JD，或先从示例岗位库选择一个目标岗位。");
    statusBadge.textContent = "等待输入";
    return;
  }

  statusBadge.textContent = "AI 分析中";
  resetOutput();

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile: payload,
        resumeFile: uploadedFile,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "分析失败，请稍后重试");
    }

    renderAnalysis(result);
    statusBadge.textContent = "分析完成";
  } catch (error) {
    statusBadge.textContent = "调用失败";
    matchSummary.textContent = error.message || "接口调用失败";
    traceList.innerHTML = `<div class="trace-item">接口未返回有效结果。请检查 DeepSeek 环境变量、/api/analyze 返回内容，或稍后重试。当前错误：${escapeHtml(error.message || "未知错误")}</div>`;
  }
});

copyRewriteButton.addEventListener("click", async () => {
  const text = afterText.textContent.trim();
  if (!text || text.includes("AI 会自动")) return;

  try {
    await navigator.clipboard.writeText(text);
    copyRewriteButton.textContent = "已复制";
    setTimeout(() => {
      copyRewriteButton.textContent = "复制优化文案";
    }, 1500);
  } catch (_error) {
    copyRewriteButton.textContent = "复制失败";
    setTimeout(() => {
      copyRewriteButton.textContent = "复制优化文案";
    }, 1500);
  }
});

function renderJdCards() {
  jdCardList.innerHTML = "";

  sampleJds.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `jd-card${index === 0 ? " active" : ""}`;
    button.innerHTML = `
      <strong>${item.label}</strong>
      <span>${item.teaser}</span>
    `;
    button.addEventListener("click", () => {
      form.elements.jd.value = item.jd;
      document.querySelectorAll(".jd-card").forEach((card) => card.classList.remove("active"));
      button.classList.add("active");
      statusBadge.textContent = `已切换到 ${item.label}`;
    });
    jdCardList.appendChild(button);
  });
}

function renderAnalysis(result) {
  matchScore.textContent = `${result.matchScore ?? "--"}%`;
  matchSummary.textContent = result.matchSummary || "已生成分析结果";
  passScore.textContent = `${result.passScore ?? "--"}%`;
  passSummary.textContent = result.passSummary || "";
  bestRole.textContent = result.bestRole || "--";
  bestRoleSummary.textContent = result.bestRoleReason || "";
  beforeText.textContent = result.rewrite?.before || "未返回原始表达";
  afterText.textContent = result.rewrite?.after || "未返回优化结果";

  renderChips(result.recommendedJobs || []);
  renderBullets(strengthList, result.strengths || []);
  renderBullets(gapList, result.gaps || []);
  renderBullets(actionList, result.actions || []);
  renderTraces(result.traces || []);

  if (result.publicUrlHint) {
    deploymentNote.textContent = result.publicUrlHint;
  }
  if (result.submissionSummary) {
    submissionSummary.textContent = result.submissionSummary;
  }
}

function renderChips(jobs) {
  jobList.innerHTML = "";
  if (!jobs.length) {
    jobList.textContent = "暂无推荐岗位";
    return;
  }

  jobs.forEach((job) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${job.title} ${job.score}%`;
    jobList.appendChild(chip);
  });
}

function renderBullets(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "暂无内容";
    container.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderTraces(items) {
  traceList.innerHTML = "";
  if (!items.length) {
    traceList.innerHTML = `<div class="trace-item">暂无判定依据。</div>`;
    return;
  }

  items.forEach((item) => {
    const block = document.createElement("div");
    block.className = "trace-item";
    block.textContent = item;
    traceList.appendChild(block);
  });
}

function resetOutput() {
  matchScore.textContent = "--";
  passScore.textContent = "--";
  bestRole.textContent = "--";
  matchSummary.textContent = "系统正在生成结果";
  passSummary.textContent = "请稍候";
  bestRoleSummary.textContent = "请稍候";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function guessMimeType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showAlert(message) {
  alertMessage.textContent = message;
  alertModal.classList.remove("hidden");
}

function closeAlert() {
  alertModal.classList.add("hidden");
}
