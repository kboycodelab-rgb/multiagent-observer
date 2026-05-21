import { useMemo } from 'react';
import { useStore } from './store/team-store';
import { useSnapshot } from './hooks/useSnapshot';
import { useWebSocket } from './hooks/useWebSocket';
import { AgentCard } from './components/AgentCard';
import { MessageFeed } from './components/MessageFeed';
import { FileChangeList } from './components/FileChangeList';

export function App() {
  useSnapshot();
  useWebSocket();

  const workspace = useStore((s) => s.workspace);
  const teams = useStore((s) => s.teams);
  const activeTeam = useStore((s) => s.activeTeam);
  const setActiveTeam = useStore((s) => s.setActiveTeam);
  const fileChanges = useStore((s) => s.fileChanges);
  const wsConnected = useStore((s) => s.wsConnected);

  const current = useMemo(
    () => teams.find((t) => t.config.name === activeTeam),
    [teams, activeTeam]
  );

  // 把当前团队的所有消息按时间倒序合并
  const allMessages = useMemo(() => {
    if (!current) return [];
    const arr: { member: string; msg: typeof current.inboxes[string][number] }[] = [];
    for (const [member, msgs] of Object.entries(current.inboxes)) {
      for (const msg of msgs) arr.push({ member, msg });
    }
    arr.sort((a, b) => new Date(b.msg.timestamp).getTime() - new Date(a.msg.timestamp).getTime());
    return arr;
  }, [current]);

  // 找出每个成员的最新一条消息（来自他人的）
  const latestByMember = useMemo(() => {
    if (!current) return new Map();
    const map = new Map<string, typeof allMessages[number]['msg']>();
    for (const { member, msg } of allMessages) {
      if (!map.has(member)) map.set(member, msg);
    }
    return map;
  }, [current, allMessages]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部 */}
      <header className="bg-panel border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛰️</span>
          <h1 className="text-xl font-bold">CodeBuddy Team Observer</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">📁 {workspace}</span>
          <span className={`flex items-center gap-1 ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {wsConnected ? 'WS Connected' : 'WS Disconnected'}
          </span>
        </div>
      </header>

      {/* 团队选择 */}
      {teams.length > 0 && (
        <div className="bg-panel/50 border-b border-border px-6 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-sm text-slate-400 whitespace-nowrap">Teams:</span>
          {teams.map((t) => (
            <button
              key={t.config.name}
              onClick={() => setActiveTeam(t.config.name)}
              className={`text-xs px-3 py-1 rounded whitespace-nowrap transition ${
                activeTeam === t.config.name
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-bg border border-border hover:border-accent/40'
              }`}
            >
              {t.config.name}
              <span className="ml-2 opacity-60">({t.config.members.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* 主体 */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {teams.length === 0 && (
          <div className="col-span-12 text-center text-slate-500 py-20">
            <p className="text-2xl mb-2">没有发现团队数据</p>
            <p className="text-sm">请确认 WORKSPACE 路径下存在 .codebuddy/teams/ 目录</p>
          </div>
        )}

        {current && (
          <>
            {/* Agent 卡片区 */}
            <section className="xl:col-span-12">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>👥 Team Members</span>
                <span className="text-xs text-slate-400">({current.config.members.length})</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {current.config.members.map((m) => {
                  const inbox = current.inboxes[m.name] || [];
                  return (
                    <AgentCard
                      key={m.memberId}
                      memberName={m.name}
                      role={m.role}
                      messageCount={inbox.length}
                      latestMessage={latestByMember.get(m.name)}
                    />
                  );
                })}
              </div>
            </section>

            {/* 消息流 */}
            <section className="xl:col-span-7">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>💬 Message Feed</span>
                <span className="text-xs text-slate-400">({allMessages.length})</span>
              </h2>
              <MessageFeed messages={allMessages} />
            </section>

            {/* 文件变更 */}
            <section className="xl:col-span-5">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📁 File Changes</span>
                <span className="text-xs text-slate-400">({fileChanges.length})</span>
              </h2>
              <FileChangeList changes={fileChanges} />
            </section>
          </>
        )}
      </main>

      {/* 底部 */}
      <footer className="bg-panel/50 border-t border-border px-6 py-2 text-xs text-slate-500 flex justify-between">
        <span>CodeBuddy Team Observer v0.1 (MVP)</span>
        <span>Polling via WebSocket · {new Date().toLocaleTimeString('zh-CN')}</span>
      </footer>
    </div>
  );
}
