import { useState } from 'react';
import type { InboxMessage } from '../types';

interface Props {
  messages: { member: string; msg: InboxMessage }[];
}

export function MessageFeed({ messages }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (messages.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 italic">
        暂无消息记录
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
      {messages.map(({ member, msg }) => {
        const isExpanded = expanded === msg.id;
        return (
          <div
            key={msg.id}
            className="bg-panel border border-border rounded-lg p-3 hover:border-accent/40 transition cursor-pointer"
            onClick={() => setExpanded(isExpanded ? null : msg.id)}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">{msg.from}</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">{msg.to}</span>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-700 text-[10px]">{msg.type}</span>
                {!msg.read && <span className="text-green-400">● 未读</span>}
              </div>
              <span>{new Date(msg.timestamp).toLocaleString('zh-CN')}</span>
            </div>
            <p className={`text-sm text-slate-200 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3'}`}>
              {msg.content}
            </p>
            {!isExpanded && msg.content.length > 200 && (
              <p className="text-xs text-accent mt-1">点击展开</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
