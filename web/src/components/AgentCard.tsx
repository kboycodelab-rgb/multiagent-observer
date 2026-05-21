import { useStore } from '../store/team-store';
import type { InboxMessage } from '../types';

interface Props {
  memberName: string;
  role: string;
  messageCount: number;
  latestMessage?: InboxMessage;
}

const ROLE_COLORS: Record<string, string> = {
  'team-lead': 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  designer: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
  engine: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  gameplay: 'bg-green-500/20 border-green-500/40 text-green-300',
  ui: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  art: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  audioqa: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
};

export function AgentCard({ memberName, role, messageCount, latestMessage }: Props) {
  const color = ROLE_COLORS[memberName] || 'bg-slate-500/20 border-slate-500/40 text-slate-300';
  const isActive = latestMessage && Date.now() - new Date(latestMessage.timestamp).getTime() < 5 * 60 * 1000;

  return (
    <div className={`rounded-lg border ${color} p-4 transition hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          {memberName}
        </h3>
        <span className="text-xs px-2 py-1 rounded bg-black/30">
          {messageCount} msgs
        </span>
      </div>
      <p className="text-sm opacity-70 mb-3 line-clamp-2">{role}</p>
      {latestMessage && (
        <div className="text-xs opacity-60 border-t border-current/20 pt-2 mt-2">
          <div className="flex justify-between mb-1">
            <span>← {latestMessage.from}</span>
            <span>{new Date(latestMessage.timestamp).toLocaleTimeString('zh-CN')}</span>
          </div>
          <p className="line-clamp-1">{latestMessage.content.slice(0, 80)}</p>
        </div>
      )}
    </div>
  );
}
