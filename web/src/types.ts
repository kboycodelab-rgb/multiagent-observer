// 与 server/src/types.ts 等价的前端类型
export interface TeamMember {
  memberId: string;
  name: string;
  role: string;
}

export interface TeamConfig {
  name: string;
  leadAgentId: string;
  workspacePath: string;
  createdAt: string;
  isAutoTeam?: boolean;
  members: TeamMember[];
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  type: string;
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

export interface TeamSnapshot {
  config: TeamConfig;
  inboxes: Record<string, InboxMessage[]>;
}

export type WSEvent =
  | { kind: 'snapshot'; teams: TeamSnapshot[]; fileChanges: FileChange[] }
  | { kind: 'team:update'; team: TeamSnapshot }
  | { kind: 'inbox:update'; team: string; member: string; messages: InboxMessage[] }
  | { kind: 'file:change'; change: FileChange };
