# Offer Arrester

面向学生求职场景的 AI 岗位匹配与简历优化 Web 应用。

## 本地运行

先配置环境变量：

```powershell
cd C:\Users\hello\Documents\Codex\2026-06-13\offer-1-2-ai-demo-1000\app
copy .env.example .env
```

推荐优先直接使用 `DEEPSEEK_API_KEY`，当前项目已经完成 DeepSeek 联调；如果你想用免费层方案，可填写 `GEMINI_API_KEY`；如果你想接豆包，可填写 `ARK_API_KEY` 和 `ARK_MODEL`；如果你想切回 OpenAI，再填 `OPENAI_API_KEY`。

然后启动服务：

```powershell
npm start
```

然后访问 `http://localhost:4173`。

## 部署建议

当前项目适合部署到：

- Vercel
- Netlify
- 支持 Node Serverless 的云平台

部署时需要配置环境变量：

- `DEEPSEEK_API_KEY`（推荐，DeepSeek 官方 API）
- `DEEPSEEK_MODEL`（可选，默认 `deepseek-v4-flash`）
- `GEMINI_API_KEY`（推荐，优先使用）
- `GEMINI_MODEL`（可选，默认 `gemini-3.5-flash`）
- `ARK_API_KEY`（可选，豆包 / 火山方舟）
- `ARK_BASE_URL`（可选，默认 `https://ark.cn-beijing.volces.com/api/v3`）
- `ARK_MODEL`（豆包必填，一般填写火山方舟里的接入点 ID）
- `OPENAI_API_KEY`（可选，作为备选）
- `OPENAI_MODEL`（可选，默认 `gpt-4.1-mini`）

## 目录说明

- `index.html`: 首页
- `script.js`: 前端交互与 API 调用逻辑
- `styles.css`: 页面样式
- `api/analyze.js`: 分析接口
- `api/health.js`: 健康检查接口
- `lib/offer-arrester.js`: Gemini / 豆包兼容接口 / OpenAI 调用与分析编排
- `server.js`: 本地 Node 服务
- `package.json`: 项目启动配置
- `vercel.json`: Vercel 部署配置
- `netlify.toml`: Netlify 部署配置
