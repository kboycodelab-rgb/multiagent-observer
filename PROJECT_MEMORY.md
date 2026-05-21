# 🛰️ CodeBuddy Team Observer — 项目记忆文档

> 这是一份**完整的项目恢复文档**。
> 如果你切换了工作目录、换了机器，或者隔了很久回来继续，**只要打开这份文件，就能立刻恢复全部上下文**。
> AI 助手（Claude / CodeBuddy）也应该把这份文档作为继续工作的第一手依据。

---

## 📌 一、项目身份卡

| 项 | 值 |
|----|---|
| 项目名 | `codebuddy-team-observer`（简称 CTO） |
| 工作目录 | `/Users/zongyunpeng/CodeBuddy/codebuddy-team-observer/` |
| 当前版本 | v0.1（MVP 已跑通） |
| 创建时间 | 2026-05-21 |
| 创建者 | yunpengzong |
| 父级缘起 | 在做 `beach-landing-3d` multi-agent 游戏开发时，意识到需要可视化监控工具 |
| 定位 | **通用的** CodeBuddy Multi-Agent 团队实时监控 Dashboard，可挂在任意 CodeBuddy 工作区 |
| 关键资产 | 见下方"关键资产"段 |

---

## 🎯 二、为什么要做这个项目（核心动机）

### 背景痛点
做 `beach-landing-3d`（《抢滩登陆 2000》1:1 复刻）项目时使用了 CodeBuddy 的 Multi-Agent Team Mode，启动了 designer + engine 两个 Agent 异步并行开发。出现以下问题：

1. **Agent 工作时无法可视化** —— 只能用 `ls` / `find` 命令手动扫描文件来推测进度
2. **无法实时同步 Agent 状态** —— Agent 完成后才发 send_message，中间过程是黑盒
3. **跨 Agent 通信不直观** —— 消息存在 `inboxes/*.json`，但没有图形化展示
4. **冲突边界不可监控** —— 无法实时预警跨边界文件修改

### 决定不做的事
- ❌ **不做 Agent 之间的实时同步**（用户反馈："意义不大且增加 token 消耗"）
- ❌ **不修改 CodeBuddy 任何文件**（只读监听）
- ❌ **不做 Agent 行为干预**（纯观察工具）

### 要做的事
- ✅ **只读监听** `.codebuddy/teams/<team>/` 目录的所有 JSON 变化
- ✅ **可视化 Dashboard**：Agent 卡片 / 消息流 / 文件变更
- ✅ **可复用**：监控任意 CodeBuddy 项目，不止 beach-landing

---

## 🏛️ 三、整体架构

```
┌──────────────────────────────────────────────────────────────┐
│            被监控工作区（任意 CodeBuddy 项目）                  │
│  /CodeBuddy/<any-project>/                                   │
│  └── .codebuddy/teams/<team-name>/                           │
│      ├── config.json           ← 团队元数据（成员列表）        │
│      └── inboxes/                                            │
│          ├── <member-1>.json   ← 消息队列                    │
│          ├── <member-2>.json                                 │
│          └── team-lead.json                                  │
└─────────────────┬────────────────────────────────────────────┘
                  │ chokidar 文件监听（只读）
                  ▼
┌──────────────────────────────────────────────────────────────┐
│   Observer Server (Node.js + Fastify + ws)  port 3001        │
│                                                               │
│  ┌────────────────┐   ┌────────────────┐                     │
│  │ FileWatcher    │   │ TeamParser     │                     │
│  │ - chokidar     │   │ - readTeam()   │                     │
│  │ - debounce     │   │ - readInbox()  │                     │
│  └───────┬────────┘   └───────┬────────┘                     │
│          │                     │                              │
│          └──────┬──────────────┘                              │
│                 ▼                                             │
│         ┌──────────────────┐                                  │
│         │  WSHub (ws path) │ ws://localhost:3001/ws          │
│         └────────┬─────────┘                                  │
│                  │                                            │
│         ┌────────┴─────────┐                                  │
│         │  REST API        │ http://localhost:3001/api/...   │
│         │  /api/snapshot   │                                  │
│         │  /api/health     │                                  │
│         └──────────────────┘                                  │
└─────────────────┬────────────────────────────────────────────┘
                  │ WebSocket 实时推送
                  ▼
┌──────────────────────────────────────────────────────────────┐
│   Observer Web (Vite + React + Tailwind)    port 5173        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  顶部：项目路径 / WS 状态 / 团队切换                       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  Agent 卡片网格（按角色分色）                              │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                       │ │
│  │  │designer│ │engine  │ │gameplay│                       │ │
│  │  └────────┘ └────────┘ └────────┘                       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  💬 消息流（左 7/12）  │  📁 文件变更（右 5/12）           │ │
│  │  - 全成员消息          │  - git status 实时               │ │
│  │  - 时间倒序            │  - A/M/D/? 状态色                │ │
│  │  - 点击展开            │                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 四、技术栈（已锁定，不要随意更换）

### 后端 (`server/`)
| 包 | 版本 | 用途 |
|----|------|------|
| `fastify` | ^4.28.1 | HTTP 服务器（轻量、快） |
| `@fastify/cors` | ^9.0.1 | 跨域支持 |
| `chokidar` | ^3.6.0 | 文件监听（跨平台） |
| `ws` | ^8.18.0 | WebSocket 原生实现 |
| `tsx` | ^4.16.0 | TS 开发热重载 |
| `typescript` | ^5.4.5 | 类型 |

### 前端 (`web/`)
| 包 | 版本 | 用途 |
|----|------|------|
| `react` | ^18.3.1 | UI 框架 |
| `zustand` | ^4.5.4 | 极简状态管理 |
| `vite` | ^5.3.4 | 构建工具 |
| `tailwindcss` | ^3.4.7 | 原子化 CSS |
| `@vitejs/plugin-react` | ^4.3.1 | React 插件 |

### 关键决策
- ✅ **不用 socket.io**：原生 ws 足够，避免重型封装
- ✅ **不用 Redux**：Zustand 简单 10 倍
- ✅ **不用 React Router**：单页应用，无路由需求
- ✅ **不用 UI 组件库**：Tailwind 自己写，保持轻量
- ✅ **不引入数据库**：直接读 JSON 文件，重启零负担

---

## 📁 五、项目目录结构（完整文件清单）

```
codebuddy-team-observer/
├── PROJECT_MEMORY.md              ⭐ 本文件（项目记忆）
├── README.md                      使用说明
├── package.json                   workspace 根（npm workspaces）
├── .gitignore
├── server/                        后端
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               Fastify 入口 + 启动逻辑
│       ├── types.ts               共享类型 (TeamConfig/InboxMessage/WSEvent)
│       ├── parser.ts              解析 .codebuddy/teams JSON
│       ├── git-watcher.ts         git status --porcelain 封装
│       ├── watcher.ts             chokidar 监听 + 防抖
│       └── ws-hub.ts              WebSocket 推送中心
└── web/                           前端
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts             代理 /api 和 /ws 到 3001
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx               React 入口
        ├── App.tsx                主页面（顶栏 + 团队切换 + 主体三栏）
        ├── index.css              Tailwind + 滚动条美化
        ├── types.ts               与 server/src/types.ts 等价
        ├── store/
        │   └── team-store.ts      Zustand store（teams/messages/files/ws状态）
        ├── hooks/
        │   ├── useSnapshot.ts     初始 fetch /api/snapshot
        │   └── useWebSocket.ts    WS 订阅 + 自动重连
        └── components/
            ├── AgentCard.tsx      成员卡片（按 name 配色 + 活跃指示灯）
            ├── MessageFeed.tsx    消息流（点击展开）
            └── FileChangeList.tsx 文件变更列表
```

---

## 🔑 六、关键资产 / 数据流

### 1. 监听的数据源（被监控工作区）
```
.codebuddy/teams/<team-name>/
├── config.json
│   {
│     "name": "_auto_xxx",
│     "leadAgentId": "xxx",
│     "workspacePath": "/path/to/project",
│     "createdAt": "2026-05-20T03:45:46.328Z",
│     "isAutoTeam": true,
│     "members": [
│       { "memberId": "designer@_auto_xxx", "name": "designer", "role": "..." }
│     ]
│   }
└── inboxes/<member>.json
    [
      {
        "id": "msg-xxx",
        "from": "designer",
        "to": "team-lead",
        "type": "message",
        "content": "...",
        "timestamp": "2026-05-20T03:58:52.464Z",
        "read": true
      }
    ]
```

### 2. WebSocket 事件协议（server → web）
```ts
type WSEvent =
  | { kind: 'team:update'; team: TeamSnapshot }                          // 团队元数据变化
  | { kind: 'inbox:update'; team: string; member: string; messages: [] } // 邮箱变化
  | { kind: 'file:change'; change: FileChange }                          // 文件变更
```

### 3. REST API
```
GET /api/health
  → { ok: true, workspace: "...", uptime: 71.4 }

GET /api/snapshot
  → { workspace: "...", teams: TeamSnapshot[], fileChanges: FileChange[] }
```

---

## 🚀 七、启动 / 停止操作手册

### 启动（开发）
```bash
# 选项 A：手动两个终端启动
cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer/server
WORKSPACE=/Users/zongyunpeng/CodeBuddy/20260517145811 npx tsx src/index.ts

cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer/web
npx vite --port 5173

# 选项 B：根目录一键（推荐，但需要 npm workspaces 解析）
cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer
WORKSPACE=/任意/CodeBuddy/项目 npm run dev
```

### 后台启动（不挂前台）
```bash
# server
cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer/server
WORKSPACE=/Users/zongyunpeng/CodeBuddy/20260517145811 nohup npx tsx src/index.ts > /tmp/cto-server.log 2>&1 &

# web
cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer/web
nohup npx vite --port 5173 > /tmp/cto-web.log 2>&1 &
```

### 查看日志
```bash
tail -f /tmp/cto-server.log
tail -f /tmp/cto-web.log
```

### 停止
```bash
# 找进程
lsof -i :3001    # server
lsof -i :5173    # web

# 杀进程
kill <PID>

# 或者一键杀所有 tsx + vite 进程（小心，会影响其他项目）
pkill -f "tsx src/index.ts"
pkill -f "vite --port 5173"
```

### 浏览器访问
```
open http://localhost:5173
```

---

## 🎨 八、UI 设计规范（已实现，作为后续迭代基线）

### 配色（Tailwind config）
```js
colors: {
  bg:     '#0a0e1a',  // 主背景（深邃蓝黑）
  panel:  '#141a2e',  // 面板色
  border: '#1f2740',  // 边框
  accent: '#4ade80',  // 强调绿（活跃 / WS 连接）
}
```

### 角色色码（AgentCard.tsx）
```
team-lead → 紫色   (purple-500)
designer  → 粉色   (pink-500)
engine    → 蓝色   (blue-500)
gameplay  → 绿色   (green-500)
ui        → 黄色   (yellow-500)
art       → 橙色   (orange-500)
audioqa   → 青色   (cyan-500)
others    → 灰色   (slate-500)
```

### 状态指示
- 🟢 绿色脉动：5 分钟内有最新消息（活跃）
- ⚪ 灰色：长时间无活动
- 🔴 红色：WebSocket 断开

### 布局
- xl 断点（≥1280px）：12 栅格
  - Agent 卡片：full
  - 消息流：col-span-7
  - 文件变更：col-span-5
- 移动端：全部纵向堆叠

---

## 🧠 九、设计决策日志（避免日后重蹈覆辙）

| # | 决策 | 原因 | 备选 |
|---|------|------|------|
| D1 | 不使用 socket.io | 原生 ws 足够 + 减少包体积 | socket.io |
| D2 | 不引入数据库 | 文件 JSON 即数据库，重启零负担 | SQLite |
| D3 | git status 用系统 git 而不是 simple-git | 减少依赖 | simple-git |
| D4 | chokidar 加 awaitWriteFinish | 避免 IDE 部分写入触发频繁刷新 | 不加 |
| D5 | 文件监听 500ms 防抖 | git status 较慢，避免雪崩 | 100ms / 1s |
| D6 | 前端 fileChanges 仅保留 200 条 | 避免内存爆 | 全保留 |
| D7 | Zustand 而非 Redux | 简单项目无需复杂状态机 | Redux Toolkit |
| D8 | Tailwind 而非 styled-components | 原子化更快 + 无运行时开销 | css-in-js |
| D9 | server 与 web 分两个 npm workspace | 解耦清晰，但共享类型需要复制 | monorepo (pnpm) |
| D10 | 不实现 Agent 内部 token 监控（v0.1） | history.json 不一定可用，留 v0.2 | 立即做 |

---

## 🔮 十、迭代路线图（v0.1 → v1.0）

### ✅ v0.1 MVP（已完成 2026-05-21）
- 团队成员卡片
- 消息流
- 文件变更监听
- WebSocket 实时推送
- 多团队切换

### 🟡 v0.2（计划）
- [ ] Token 消耗曲线（解析 history.json）
- [ ] 工具调用次数统计（每个 Agent 调了多少次 write_to_file / execute_command）
- [ ] 消息搜索 / 过滤（按 from/to/type/关键字）
- [ ] 暗色 / 亮色主题切换
- [ ] 时间范围选择（最近 5min / 1h / 全部）

### 🟡 v0.3（计划）
- [ ] **消息时序图（拓扑）** —— React Flow 可视化 Agent 间通信关系
- [ ] **文件变更热力图** —— Treemap 按目录展示变更频率
- [ ] **冲突预警** —— 监听跨边界写入并 Toast
- [ ] 历史快照回放（时间轴拖动）

### 🟡 v0.4（计划）
- [ ] **CLI 打包**：`npx codebuddy-observer <workspace-path>`
- [ ] 配置文件支持（`.observer.config.json`）
- [ ] 多工作区切换（顶部下拉）

### 🔴 v1.0（远期）
- [ ] 集成到 IDE 内（Webview / VSCode 扩展）
- [ ] 公开发布到 npm
- [ ] 文档站（VitePress）

---

## 🐛 十一、已知问题 / TODO

| ID | 问题 | 优先级 | 备注 |
|----|------|--------|------|
| T1 | `npm run dev` 在根目录可能因 workspaces 解析失败 | P2 | 当前两个终端独立启动可用 |
| T2 | 文件变更未做按目录分组 | P2 | v0.3 做热力图时一并解决 |
| T3 | 消息流没有去重 | P2 | inbox.json 改动会全量重发 |
| T4 | 没有错误边界 (ErrorBoundary) | P2 | 网络错误会白屏 |
| T5 | 没有持久化设置（如折叠/展开偏好） | P3 | localStorage 一行解决 |
| T6 | `_auto_xxx` 团队名太长，UI 显示截断 | P3 | 加 tooltip |
| T7 | git 命令依赖系统 git 命令存在 | P3 | 给出友好错误提示 |

---

## 🔌 十二、与 beach-landing 项目的关系

```
beach-landing-3d (游戏项目)            codebuddy-team-observer (本项目)
       ↓                                       ↑
       │  生成 .codebuddy/teams/...            │
       │  (运行时数据，被监听)                   │
       └───────────────────────────────────────┘
              监控关系（只读）

两个项目完全独立，互不依赖。
本项目可以监控任何 CodeBuddy 工作区，beach-landing 只是首批用例。
```

**重要约束**：本项目**绝不**写入 `.codebuddy/` 任何文件，绝不影响 Agent 运行。

---

## 🧪 十三、测试 / 验证方法

### 模拟实时推送测试

```bash
WORKSPACE=/Users/zongyunpeng/CodeBuddy/20260517145811

# 1. 在被监控工作区改个文件，看 Dashboard 是否立刻显示
echo "test" >> $WORKSPACE/test.tmp
# Dashboard 右侧 File Changes 应立刻出现 ?? test.tmp

# 2. 模拟 Agent 写消息到 inbox
TEAM=$WORKSPACE/.codebuddy/teams/_auto_88008678e7ab4df69ccb03b3ea1252cc
NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
echo "[{\"id\":\"test-1\",\"from\":\"main\",\"to\":\"engine\",\"type\":\"message\",\"content\":\"测试推送 $NOW\",\"timestamp\":\"$NOW\",\"read\":false}]" > $TEAM/inboxes/engine.json
# Dashboard 应立刻在 engine 卡片显示 1 msgs，消息流出现新消息

# 清理测试
rm $WORKSPACE/test.tmp
```

### 健康检查
```bash
curl http://localhost:3001/api/health
# 期望: { "ok": true, "workspace": "...", "uptime": ... }

curl -s http://localhost:3001/api/snapshot | python3 -m json.tool | head -50
# 期望: 看到 teams 数组 + fileChanges 数组
```

---

## 📜 十四、Git / 版本管理状态

> ⚠️ **当前未初始化 Git 仓库**

如果要纳管 git，建议：
```bash
cd /Users/zongyunpeng/CodeBuddy/codebuddy-team-observer
git init
git add .
git commit -m "feat: 初始化 CodeBuddy Team Observer v0.1 MVP"

# 推到 CNB（如需）
git remote add origin https://cnb.woa.com/<your-org>/codebuddy-team-observer.git
git push -u origin main
```

`.gitignore` 已配置忽略：
- `node_modules/`
- `dist/`
- `*.log`
- `.env`
- `.DS_Store`

---

## 🤖 十五、给 AI 助手的恢复指令（重要）

如果 AI 助手（CodeBuddy / Claude / 其他）打开这个项目想继续协助开发，**必须先做的事**：

1. **读完本 PROJECT_MEMORY.md 全部内容**（不要跳过任何章节）
2. 用 `ls -la` 扫描当前文件结构，对照"项目目录结构"章节，确认与文档一致
3. 用 `lsof -i :3001` 和 `lsof -i :5173` 检查 server 和 web 是否在运行
4. 如未运行，按"启动 / 停止操作手册"启动
5. **参考"迭代路线图"**判断当前应该做哪个版本的功能
6. **绝不**修改"技术栈"和"设计决策日志"章节的既定决策，除非用户明确要求

### 协作方式
- 改架构 → 先读"整体架构"章节
- 改 UI → 先读"UI 设计规范"章节
- 加新功能 → 检查"迭代路线图"是否已规划，按版本顺序做
- 修 bug → 优先解决"已知问题 / TODO"中的高优先级条目

---

## 📞 十六、快速链接

| 资源 | URL |
|------|-----|
| Web Dashboard | http://localhost:5173 |
| REST API 健康 | http://localhost:3001/api/health |
| REST API 快照 | http://localhost:3001/api/snapshot |
| WebSocket | ws://localhost:3001/ws |
| 默认监控目标 | `/Users/zongyunpeng/CodeBuddy/20260517145811`（beach-landing-3d） |

---

## 🏁 十七、本次开发会话总结（开发上下文快照）

### 时间
2026-05-21（耗时约 30 分钟从需求到 MVP 跑通）

### 决策路径
1. 用户需要可视化监控 multi-agent 协作
2. 否决了"实时同步消息"方案（用户认为意义不大且费 token）
3. 选定路径 B（独立 Web Dashboard）+ MVP 优先
4. 独立项目 `codebuddy-team-observer/` 与 beach-landing 解耦
5. 一次性生成全部代码并启动验证

### 关键里程碑
- ✅ 11:00 创建目录结构
- ✅ 11:01 完成 server 全部代码
- ✅ 11:02 完成 web 全部代码
- ✅ 11:03 npm install 完成
- ✅ 11:04 server 启动成功（port 3001）
- ✅ 11:05 web 启动成功（port 5173）
- ✅ 11:06 浏览器预览验证通过

### 当前运行进程（如果还活着）
- server PID: 3471（启动时的，可能已被清理）
- web PID: 5720（启动时的，可能已被清理）

### 下一步未完成的事
1. 提交 git 初始化
2. 实测 WebSocket 实时推送（用户尚未触发测试）
3. 决定下一阶段做 v0.2（Token 监控）还是先打磨现有功能

---

**📝 文档版本**：v1.0
**📅 最后更新**：2026-05-21
**✍️ 维护原则**：每次新增功能 / 修改架构 / 做关键决策时，**同步更新本文档**。这份文档就是项目的"宪法 + 日志 + 索引"。
