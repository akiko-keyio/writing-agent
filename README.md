# Writing Agent

Writing Agent 是面向论文与专业文档的本地写作工作区。它帮助作者改进结构与表达、核对引用、从读者视角审阅文档，能从用户反馈中学习。

<p align="center">
  <img src="docs/screenshots/review-queue.png" alt="Writing Agent" width="840" />
</p>

## 基本特性

- **文档协作编辑**：类 IDE 的文稿工作区，Agent 通过面向改稿任务定制的工具与指令工作；修改建议以 diff 进入 Review Queue，Apply 前不会改动文件。
- **质量评估与引用核对**：自动校验引用链接可访问性及与文献库的一致性；可选 Auto Review，在隔离上下文中模拟读者反馈，再提出修改方案。
- **写作偏好学习**：从 Apply、Dismiss 及对建议的调整中归纳写作原则与案例；确认后写入 Memory，形成提议、审阅、学习的持续改进。
- **跨会话上下文**：持久记录目标读者、领域术语与项目背景，供后续会话读取与更新，减少重复沟通。

## 快速开始

环境：Node.js ≥ 18、pnpm、Python ≥ 3.11、[uv](https://docs.astral.sh/uv/)，以及 OpenAI 兼容 API。

```bash
cp .env.example .env
cp tools.yaml.example tools.yaml
cp subagents.yaml.example subagents.yaml
cp models.yaml.example models.yaml

npm install
cd frontend && pnpm install && cd ..
npm run dev
```

打开 http://localhost:5173
