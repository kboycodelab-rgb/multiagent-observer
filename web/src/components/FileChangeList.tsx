import type { FileChange } from '../types';

const STATUS_STYLES: Record<FileChange['status'], string> = {
  added: 'bg-green-500/20 text-green-300',
  modified: 'bg-yellow-500/20 text-yellow-300',
  deleted: 'bg-red-500/20 text-red-300',
  untracked: 'bg-blue-500/20 text-blue-300',
};

const STATUS_LABELS: Record<FileChange['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  untracked: '?',
};

interface Props {
  changes: FileChange[];
}

export function FileChangeList({ changes }: Props) {
  if (changes.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 italic">
        工作区无文件变更
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 font-mono text-sm">
      {changes.map((c) => (
        <div
          key={c.path + c.status}
          className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-panel transition"
        >
          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${STATUS_STYLES[c.status]}`}>
            {STATUS_LABELS[c.status]}
          </span>
          <span className="text-slate-200 truncate flex-1" title={c.path}>{c.path}</span>
        </div>
      ))}
    </div>
  );
}
