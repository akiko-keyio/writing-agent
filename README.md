# Writing Agent

面向论文与专业文档的本地写作助手，帮助作者改进结构与表达、核对引用、从读者视角审阅文稿，并依据使用反馈持续改进。

<p align="center">
  <img src="docs/screenshots/review-queue.png" alt="Writing Agent" width="840" />
</p>

## 基本特性

- **文档协作编辑**：在 Chat 中与 Agent 讨论文稿内容；Agent 提出修改建议，用户在 Review Queue 中审阅 diff 并 Apply 或 Dismiss，未接受的建议不会改动原稿。
- **引用核对与质量评估**：自动检查引用链接是否可访问、是否与文献库一致。可开启 Auto Review，在独立上下文中模拟读者反馈后再给出修改建议。
- **写作偏好学习**：根据 Apply、Dismiss 及对建议的手动调整，归纳写作原则与案例；确认后写入 Memory，形成「提出—审阅—学习」的改进循环。
- **跨会话上下文**：持久保存目标读者、领域术语与项目背景，供后续会话读取与更新，减少重复说明。

## 快速开始

环境：Node.js ≥ 18、pnpm、Python ≥ 3.11、[uv](https://docs.astral.sh/uv/)，以及 OpenAI 兼容 API。

```bash
cp .env.example .env
cp config/tools.yaml.example config/tools.yaml
cp config/subagents.yaml.example config/subagents.yaml
cp config/models.yaml.example config/models.yaml

npm install
cd frontend && pnpm install && cd ..
npm run dev
```

打开 http://localhost:5173
