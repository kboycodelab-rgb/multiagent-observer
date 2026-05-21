import { create } from 'zustand';
import type { TeamSnapshot, FileChange, InboxMessage } from '../types';

interface State {
  workspace: string;
  teams: TeamSnapshot[];
  fileChanges: FileChange[];
  activeTeam: string | null;
  wsConnected: boolean;
  setWorkspace: (ws: string) => void;
  setTeams: (teams: TeamSnapshot[]) => void;
  upsertTeam: (team: TeamSnapshot) => void;
  updateInbox: (teamName: string, member: string, messages: InboxMessage[]) => void;
  setFileChanges: (changes: FileChange[]) => void;
  pushFileChange: (change: FileChange) => void;
  setActiveTeam: (name: string) => void;
  setWsConnected: (b: boolean) => void;
}

export const useStore = create<State>((set, get) => ({
  workspace: '',
  teams: [],
  fileChanges: [],
  activeTeam: null,
  wsConnected: false,
  setWorkspace: (workspace) => set({ workspace }),
  setTeams: (teams) =>
    set({
      teams,
      activeTeam: get().activeTeam ?? teams[0]?.config.name ?? null,
    }),
  upsertTeam: (team) => {
    const teams = get().teams.slice();
    const idx = teams.findIndex((t) => t.config.name === team.config.name);
    if (idx >= 0) teams[idx] = team;
    else teams.push(team);
    set({ teams, activeTeam: get().activeTeam ?? team.config.name });
  },
  updateInbox: (teamName, member, messages) => {
    const teams = get().teams.map((t) => {
      if (t.config.name !== teamName) return t;
      return { ...t, inboxes: { ...t.inboxes, [member]: messages } };
    });
    set({ teams });
  },
  setFileChanges: (fileChanges) => set({ fileChanges }),
  pushFileChange: (change) => {
    const existing = get().fileChanges;
    const next = existing.filter((c) => c.path !== change.path);
    next.unshift(change);
    set({ fileChanges: next.slice(0, 200) });
  },
  setActiveTeam: (activeTeam) => set({ activeTeam }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
}));
