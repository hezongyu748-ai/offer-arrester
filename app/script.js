const jdCategories = [
  { id: "all", label: "全部方向" },
  { id: "product", label: "产品" },
  { id: "data", label: "数据" },
  { id: "ops", label: "运营" },
];

const sampleJds = [
  {
    id: "ai-pm",
    category: "product",
    label: "AI 产品经理",
    teaser: "需求分析 / 用户研究 / 数据分析 / AI 理解",
    jd:
      "岗位：AI产品经理实习生\n职责：参与AI产品需求分析、用户研究、竞品调研、数据分析与功能迭代；与研发和设计协同推进项目落地。\n要求：本科及以上在读，逻辑清晰，有产品意识；具备数据分析能力，熟悉 SQL 或 Python 优先；有AI产品、校园项目、用户研究经历优先；表达能力强，能够把复杂问题讲清楚。",
  },
  {
    id: "data-analyst",
    category: "data",
    label: "数据分析实习生",
    teaser: "SQL / Python / 指标体系 / 可视化",
    jd:
      "岗位：数据分析实习生\n职责：支持业务指标监控、报表搭建、用户行为分析、增长漏斗分析和专题复盘。\n要求：熟悉 SQL、Excel、Python 中两项；具备结构化分析能力，能输出洞察结论；有数据分析项目、商业分析或增长分析经历优先。",
  },
  {
    id: "product-ops",
    category: "ops",
    label: "产品运营实习生",
    teaser: "活动运营 / 增长转化 / 用户沟通 / 内容策划",
    jd:
      "岗位：产品运营实习生\n职责：参与活动策划、用户运营、内容搭建和转化提升；协同产品和设计推动优化。\n要求：有用户意识和执行力，善于沟通；有校园活动、内容运营或增长项目经历优先，能结合数据发现问题并提出方案。",
  },
];

const demoProfile = {
  name: "李然",
  school: "中山大学信息管理与信息系统 / 大三",
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
const jdFilterBar = $("#jd-filter-bar");
const resumeFileInput = $("#resume-file");
const resumeFileName = $("#resume-file-name");
const resumeAutoFill = $("#resume-auto-fill");
const traceList = $("#trace-list");
const jdInput = $("#jd-input");
const alertModal = $("#alert-modal");
const alertMessage = $("#alert-message");
const alertClose = $("#alert-close");
const alertConfirm = $("#alert-confirm");
const resultExplain = $("#result-explain");
const improvementPotential = $("#improvement-potential");
const jdKeywords = $("#jd-keywords");
const matchedKeywords = $("#matched-keywords");
const privacyNote = $("#privacy-note");
const topThreeJobs = $("#top-three-jobs");
const topThreeSummary = $("#top-three-summary");
const confidenceLabel = $("#confidence-label");
const confidenceScore = $("#confidence-score");
const confidenceSummary = $("#confidence-summary");
const compareNote = $("#compare-note");
const compareUplift = $("#compare-uplift");
const submissionSummary = $("#submission-summary");

let uploadedFile = null;
let pendingFocusTarget = null;
let activeCategory = "all";

renderJdFilters();
renderJdCards();
renderStaticPrimer();

alertClose.addEventListener("click", closeAlert);
alertConfirm.addEventListener("click", closeAlert);
alertModal.addEventListener("click", (event) => {
  if (event.target === alertModal) closeAlert();
});

fillDemoButton.addEventListener("click", () => {
  Object.entries(demoProfile).forEach(([key, value]) => {
    form.elements[key].value = value;
  });
  statusBadge.textContent = "已填充样例";
});

resumeFileInput.addEventListener("change", async () => {
  const file = resumeFileInput.files[0];
  if (!file) {
    uploadedFile = null;
    resumeFileName.textContent = "未选择文件";
    resumeAutoFill.textContent = "";
    return;
  }

  try {
    uploadedFile = {
      fileName: file.name,
      mimeType: file.type || guessMimeType(file.name),
      base64: await fileToBase64(file),
    };
    resumeFileName.textContent = `已载入：${file.name}`;
    resumeAutoFill.textContent = "系统已识别到简历内容，项目与技能信息会自动回填到分析流程中。";
    resumeFileInput.closest(".upload-card")?.classList.add("auto-filled");
  } catch (_error) {
    uploadedFile = null;
    resumeFileName.textContent = "文件读取失败，请重试";
    resumeAutoFill.textContent = "";
    resumeFileInput.closest(".upload-card")?.classList.remove("auto-filled");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = Object.fromEntries(new FormData(form).entries());

  if (uploadedFile && !payload.jd.trim()) {
    showAlert("请至少填写目标岗位 JD，或先从示例岗位库选择一个目标岗位。", jdInput);
    statusBadge.textContent = "等待输入";
    return;
  }

  statusBadge.textContent = "AI 分析中";
  resetOutput();

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    traceList.innerHTML = `<div class="trace-item">接口暂未返回有效结果，请稍后重试。当前提示：${escapeHtml(error.message || "未知错误")}</div>`;
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

function renderStaticPrimer() {
  if (submissionSummary) {
    submissionSummary.textContent =
      "Offer Arrester 是一个面向大学生求职场景的 AI 匹配工具，帮助学生快速找到更适合自己的岗位方向，并针对目标 JD 输出匹配分析与简历优化建议。";
  }

  if (privacyNote) {
    privacyNote.textContent = "简历仅用于本次分析，不做长期存储；页面提交内容也不会用于除分析之外的用途。由于本项目通过 Vercel 部署在公网，国内网络环境下可能存在访问不稳定或加载缓慢的情况。若出现无法打开页面的情况，建议切换到可正常访问外网的网络环境后再尝试访问，以确保页面能够稳定加载与使用。";
  }
}

function renderJdFilters() {
  jdFilterBar.innerHTML = "";

  jdCategories.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${item.id === activeCategory ? " active" : ""}`;
    button.textContent = item.label;
    button.addEventListener("click", () => {
      activeCategory = item.id;
      renderJdFilters();
      renderJdCards();
    });
    jdFilterBar.appendChild(button);
  });
}

function getVisibleJds() {
  if (activeCategory === "all") return sampleJds;
  return sampleJds.filter((item) => item.category === activeCategory);
}

function renderJdCards() {
  jdCardList.innerHTML = "";

  getVisibleJds().forEach((item, index) => {
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
      focusField(jdInput);
    });
    jdCardList.appendChild(button);
  });
}

function renderAnalysis(result) {
  matchScore.textContent = `${result.matchScore ?? "--"}%`;
  matchSummary.textContent = result.matchSummary || "已生成匹配结论";
  passScore.textContent = `${result.passScore ?? "--"}%`;
  passSummary.textContent = result.passSummary || "";
  bestRole.textContent = result.bestRole || "--";
  bestRoleSummary.textContent = result.bestRoleReason || "";
  beforeText.textContent = result.compareCase?.before || result.rewrite?.before || "未提供原始表述";
  afterText.textContent = result.compareCase?.after || result.rewrite?.after || "未提供优化结果";

  renderChips(topThreeJobs, result.topThreeJobs || result.recommendedJobs || []);
  renderBullets(strengthList, result.strengths || []);
  renderBullets(gapList, result.gaps || []);
  renderBullets(actionList, result.actions || []);
  renderTraces(result.traces || []);
  renderExplainCard(result);
  renderKeywordHighlights(result);
  renderCompareCard(result);
  renderTopThreeSummary(result);
  renderConfidence(result);
}

function renderExplainCard(result) {
  if (resultExplain) {
    resultExplain.textContent = result.scoreExplanation || "当前画像和岗位已完成结构化匹配。";
  }
  if (improvementPotential) {
    improvementPotential.textContent = result.improvementPotential || "如果按建议完成简历优化，预估匹配表现可继续提升。";
  }
}

function renderKeywordHighlights(result) {
  if (jdKeywords) {
    jdKeywords.innerHTML = "";
    (result.jdKeywords || []).forEach((keyword) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = keyword;
      jdKeywords.appendChild(chip);
    });
    if (!result.jdKeywords?.length) {
      jdKeywords.innerHTML = `<span class="empty-inline">暂无关键词</span>`;
    }
  }

  if (matchedKeywords) {
    matchedKeywords.innerHTML = "";
    (result.matchedKeywords || []).forEach((keyword) => {
      const chip = document.createElement("span");
      chip.className = "chip highlight-chip";
      chip.textContent = keyword;
      matchedKeywords.appendChild(chip);
    });
    if (!result.matchedKeywords?.length) {
      matchedKeywords.innerHTML = `<span class="empty-inline">暂无高亮命中</span>`;
    }
  }
}

function renderCompareCard(result) {
  if (compareUplift) compareUplift.textContent = `预估提升 ${result.compareCase?.uplift ?? 0}%`;
}

function renderTopThreeSummary(result) {
  if (!topThreeSummary) return;

  const jobs = result.topThreeJobs || result.recommendedJobs || [];
  if (!jobs.length) {
    topThreeSummary.textContent = "";
    return;
  }

  const lead = jobs[0];
  const second = jobs[1];
  const third = jobs[2];
  const parts = [`优先建议投递 ${lead?.title || "当前方向"}，因为它最贴近你的项目背景和技能命中点。`];
  if (second?.title) parts.push(`其次可以准备 ${second.title}。`);
  if (third?.title) parts.push(`再把 ${third.title} 作为补充方向。`);
  topThreeSummary.textContent = parts.join(" ");
}

function renderConfidence(result) {
  if (!confidenceLabel || !confidenceScore || !confidenceSummary) return;

  const score = Number(result.matchScore);
  if (!Number.isFinite(score)) {
    confidenceLabel.textContent = "--";
    confidenceScore.textContent = "--";
    confidenceSummary.textContent = "分析完成后会显示当前把握度。";
    return;
  }

  confidenceScore.textContent = `${Math.round(score)}%`;
  if (score >= 82) {
    confidenceLabel.textContent = "高把握";
    confidenceSummary.textContent = "当前画像和目标岗位重合度较高，适合优先投递并做轻量优化。";
    return;
  }

  if (score >= 68) {
    confidenceLabel.textContent = "中等把握";
    confidenceSummary.textContent = "方向基本匹配，但建议补强项目表述和岗位关键词。";
    return;
  }

  confidenceLabel.textContent = "待补强";
  confidenceSummary.textContent = "现阶段更适合先补齐项目表达，再集中投递目标岗位。";
}
function renderChips(container, jobs) {
  container.innerHTML = "";
  if (!jobs.length) {
    container.innerHTML = `<span class="empty-inline">暂无推荐岗位</span>`;
    return;
  }

  jobs.forEach((job) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "job-chip";
    chip.setAttribute("aria-pressed", "false");
    chip.innerHTML = `<strong>${job.title}</strong><span>${job.score}% · ${job.reason || "匹配理由待补充"}</span>`;
    chip.addEventListener("click", () => {
      const matchedSample = sampleJds.find((item) => job.title.includes(item.label.split(" ")[0]));
      const nextJd = matchedSample?.jd || sampleJds[0].jd;
      form.elements.jd.value = nextJd;
      document.querySelectorAll(".job-chip").forEach((item) => {
        item.classList.remove("selected");
        item.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("selected");
      chip.setAttribute("aria-pressed", "true");
      statusBadge.textContent = `已选择：${job.title}`;
      focusField(jdInput);
      showAlert(
        `已帮你定位到“${job.title}”方向，JD 已自动带入输入框。你可以直接在此基础上继续微调，再生成更精确的结果。`,
        jdInput,
      );
    });
    container.appendChild(chip);
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
    traceList.innerHTML = `<div class="trace-item">系统已完成结构化分析。</div>`;
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
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
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

function showAlert(message, focusTarget = null) {
  alertMessage.textContent = message;
  pendingFocusTarget = focusTarget;
  alertModal.classList.remove("hidden");
}

function closeAlert() {
  alertModal.classList.add("hidden");
  if (pendingFocusTarget) {
    focusField(pendingFocusTarget);
    pendingFocusTarget = null;
  }
}

function focusField(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("field-highlight");
  element.focus({ preventScroll: true });
  setTimeout(() => {
    element.classList.remove("field-highlight");
  }, 2200);
}
