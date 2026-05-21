# 🛰️ CodeBuddy Team Observer

> 通用的 CodeBuddy Multi-Agent 团队实时监控 Dashboard。
> 一次开发，可挂在任意 CodeBuddy 工作区上。

## 功能（MVP）

- 🟢 **实时 Agent 状态卡片** —— 看到每个团队成员的角色与活跃度
- 💬 **消息时序流** —— 按时间倒序展示所有 inbox 消息（from / to / content）
- 📁 **文件变更监听** —— 监听工作区的 git status 变化，展示谁动了哪些文件
- 🔄 **WebSocket 实时推送** —— 文件变化即时同步到前端，无需刷新
- 🔍 **多团队切换** —— 一个工作区里有多个团队时可下拉选择

## 快速开始

```bash
# 1. 安装依赖
cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer
npm run install:all

# 2. 启动（默认监控 beach-landing 项目）
WORKSPACE=/Users/zongyunpeng/CodeBuddy/20260517145811 npm run dev

# 3. 浏览器访问
open http://localhost:5173
```

## 监控原理

```
被监控工作区
  └── .codebuddy/teams/<team>/
      ├── config.json           ← 团队元数据（成员列表）
      └── inboxes/
          └── <member>.json     ← 消息队列

         │ chokidar 文件监听
         ▼
   Observer Server (port 3001)
         │ WebSocket 推送
         ▼
   Observer Web (port 5173)
```

## 架构

```
codebuddy-team-observer/
├── server/                # Node + Fastify + ws + chokidar
│   └── src/
│       ├── index.ts       # 启动入口
│       ├── watcher.ts     # 文件监听
│       ├── parser.ts      # 解析 .codebuddy/teams 数据
│       └── ws-hub.ts      # WebSocket 推送
└── web/                   # Vite + React + Tailwind
    └── src/
        ├── App.tsx
        ├── components/    # AgentCard / MessageFeed / FileChanges
        ├── hooks/         # useWebSocket
        └── store/         # Zustand 状态
```

## 配置

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `WORKSPACE` | `process.cwd()` | 被监控工作区绝对路径 |
| `SERVER_PORT` | `3001` | 后端端口 |
| `WEB_PORT` | `5173` | 前端端口 |

## 开发路线

- ✅ MVP（v0.1）：成员状态 + 消息流 + 文件变更
- ⏳ v0.2：Token 消耗曲线 + 工具调用统计
- ⏳ v0.3：消息时序图（React Flow 拓扑）
- ⏳ v0.4：CLI 打包 `npx codebuddy-observer <path>`
- ⏳ v0.5：冲突预警 + 历史回溯
