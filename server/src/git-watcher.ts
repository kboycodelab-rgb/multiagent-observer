import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { FileChange } from './types.js';

const pexec = promisify(exec);

/**
 * 调用 git status --porcelain 获取当前工作区的文件变更
 * 不需要 simple-git 等依赖，直接调系统 git。
 */
export async function getGitStatus(workspace: string): Promise<FileChange[]> {
  try {
    const { stdout } = await pexec('git status --porcelain', {
      cwd: workspace,
      timeout: 5000,
    });

    const changes: FileChange[] = [];
    const lines = stdout.split('\n').filter(Boolean);
    const now = new Date().toISOString();

    for (const line of lines) {
      // 格式: "XY path" 例如 " M src/foo.ts" "?? new.ts" "A  added.ts"
      const code = line.slice(0, 2);
      const path = line.slice(3).trim();
      let status: FileChange['status'] = 'modified';
      if (code.includes('?')) status = 'untracked';
      else if (code.includes('A')) status = 'added';
      else if (code.includes('D')) status = 'deleted';
      else if (code.includes('M')) status = 'modified';
      changes.push({ path, status, timestamp: now });
    }

    return changes;
  } catch {
    return [];
  }
}
