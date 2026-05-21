// 共享类型定义（前后端均可参考此文件实现等价类型）

export interface TeamConfig {
  name: string;
  leadAgentId: string;
  workspacePath: string;
  createdAt: string;
  isAutoTeam?: boolean;
  members: TeamMember[];
}

export interface TeamMember {
  memberId: string;
  name: string;
  role: string;
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  type: 'message' | 'broadcast' | 'shutdown_request' | 'shutdown_response' | string;
  content: string;
  timestamp: string;
  read?: boolean;
  summary?: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked';
  timestamp: string;
}

// 推送给前端的事件
export type WSEvent =
  | { kind: 'snapshot'; teams: TeamSnapshot[]; fileChanges: FileChange[] }
  | { kind: 'team:update'; team: TeamSnapshot }
  | { kind: 'inbox:update'; team: string; member: string; messages: InboxMessage[] }
  | { kind: 'file:change'; change: FileChange };

export interface TeamSnapshot {
  config: TeamConfig;
  inboxes: Record<string, InboxMessage[]>; // memberName → messages
}
