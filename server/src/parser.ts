import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { TeamConfig, InboxMessage, TeamSnapshot } from './types.js';

/**
 * 列出工作区中所有团队
 */
export async function listTeams(workspace: string): Promise<string[]> {
  const teamsDir = join(workspace, '.codebuddy', 'teams');
  try {
    const entries = await readdir(teamsDir);
    const dirs: string[] = [];
    for (const e of entries) {
      const s = await stat(join(teamsDir, e));
      if (s.isDirectory()) dirs.push(e);
    }
    return dirs;
  } catch {
    return [];
  }
}

/**
 * 读取单个团队的 config + inboxes
 */
export async function readTeam(
  workspace: string,
  teamName: string
): Promise<TeamSnapshot | null> {
  const teamDir = join(workspace, '.codebuddy', 'teams', teamName);
  const configPath = join(teamDir, 'config.json');
  let config: TeamConfig;

  try {
    const raw = await readFile(configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch {
    return null;
  }

  const inboxes: Record<string, InboxMessage[]> = {};
  const inboxDir = join(teamDir, 'inboxes');
  try {
    const files = await readdir(inboxDir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const memberName = f.replace(/\.json$/, '');
      try {
        const raw = await readFile(join(inboxDir, f), 'utf-8');
        const arr = JSON.parse(raw);
        inboxes[memberName] = Array.isArray(arr) ? arr : [];
      } catch {
        inboxes[memberName] = [];
      }
    }
  } catch {
    // inboxes 目录可能不存在
  }

  return { config, inboxes };
}

/**
 * 读取所有团队
 */
export async function readAllTeams(workspace: string): Promise<TeamSnapshot[]> {
  const names = await listTeams(workspace);
  const snapshots: TeamSnapshot[] = [];
  for (const name of names) {
    const snap = await readTeam(workspace, name);
    if (snap) snapshots.push(snap);
  }
  return snapshots;
}

/**
 * 解析单个 inbox 文件为消息列表
 */
export async function readInbox(filePath: string): Promise<InboxMessage[]> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
