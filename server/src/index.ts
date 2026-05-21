import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readAllTeams } from './parser.js';
import { getGitStatus } from './git-watcher.js';
import { startWatcher } from './watcher.js';
import { WSHub } from './ws-hub.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const WORKSPACE = resolve(process.env.WORKSPACE || process.cwd());
const PORT = Number(process.env.SERVER_PORT || 3001);

if (!existsSync(WORKSPACE)) {
  console.error(`❌ WORKSPACE not found: ${WORKSPACE}`);
  process.exit(1);
}

console.log(`🛰️  CodeBuddy Team Observer`);
console.log(`📁 Workspace: ${WORKSPACE}`);
console.log(`🔌 Server port: ${PORT}\n`);

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

// REST: 获取当前所有团队快照
fastify.get('/api/snapshot', async () => {
  const teams = await readAllTeams(WORKSPACE);
  const fileChanges = await getGitStatus(WORKSPACE);
  return { workspace: WORKSPACE, teams, fileChanges };
});

// REST: 健康检查
fastify.get('/api/health', async () => ({
  ok: true,
  workspace: WORKSPACE,
  uptime: process.uptime(),
}));

// 启动 HTTP server
const address = await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`✅ HTTP API: ${address}`);
console.log(`✅ WebSocket: ws://localhost:${PORT}/ws\n`);

// 挂载 WebSocket
const hub = new WSHub(fastify.server);

// 启动文件监听
startWatcher(WORKSPACE, hub);

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n[server] shutting down...');
  await fastify.close();
  process.exit(0);
});
