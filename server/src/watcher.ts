import chokidar from 'chokidar';
import { join, basename } from 'node:path';
import { readTeam, readInbox, listTeams } from './parser.js';
import { getGitStatus } from './git-watcher.js';
import type { WSHub } from './ws-hub.js';

/**
 * 启动文件监听：
 * - .codebuddy/teams/** 下的 config.json / inbox 变化 → 推送 team:update / inbox:update
 * - 整个 workspace 下的源码变化 → 触发 git status 重新计算 → 推送 file:change
 */
export function startWatcher(workspace: string, hub: WSHub) {
  const teamsRoot = join(workspace, '.codebuddy', 'teams');

  // 1. 监听 .codebuddy/teams/
  const teamWatcher = chokidar.watch(teamsRoot, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  teamWatcher.on('all', async (event, fullPath) => {
    if (event === 'addDir' || event === 'unlinkDir') return;

    const rel = fullPath.replace(teamsRoot + '/', '');
    const parts = rel.split('/');
    const teamName = parts[0];
    const fileName = basename(fullPath);

    console.log(`[watcher:team] ${event} ${rel}`);

    if (fileName === 'config.json') {
      const snap = await readTeam(workspace, teamName);
      if (snap) hub.broadcast({ kind: 'team:update', team: snap });
    } else if (parts[1] === 'inboxes' && fileName.endsWith('.json')) {
      const memberName = fileName.replace(/\.json$/, '');
      const messages = await readInbox(fullPath);
      hub.broadcast({
        kind: 'inbox:update',
        team: teamName,
        member: memberName,
        messages,
      });
    }
  });

  // 2. 监听整个 workspace 文件变化（用于触发 git status 刷新）
  const codeWatcher = chokidar.watch(workspace, {
    persistent: true,
    ignoreInitial: true,
    ignored: [
      /node_modules/,
      /\.git\//,
      /\.codebuddy\/teams\//, // 已经被 teamWatcher 处理
      /dist\//,
      /\.DS_Store/,
    ],
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  // 防抖：500ms 内多次变化合并为一次 git status
  let gitTimer: NodeJS.Timeout | null = null;
  const triggerGitStatus = () => {
    if (gitTimer) clearTimeout(gitTimer);
    gitTimer = setTimeout(async () => {
      const changes = await getGitStatus(workspace);
      // 简单实现：每次发完整列表（前端自己 diff）
      for (const c of changes) {
        hub.broadcast({ kind: 'file:change', change: c });
      }
      console.log(`[watcher:code] git status → ${changes.length} changes`);
    }, 500);
  };

  codeWatcher.on('all', (event, p) => {
    if (event === 'addDir' || event === 'unlinkDir') return;
    triggerGitStatus();
  });

  console.log(`[watcher] watching team data: ${teamsRoot}`);
  console.log(`[watcher] watching code dir:  ${workspace}`);

  return () => {
    teamWatcher.close();
    codeWatcher.close();
  };
}
