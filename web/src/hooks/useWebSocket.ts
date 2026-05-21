import { useEffect } from 'react';
import { useStore } from '../store/team-store';
import type { WSEvent } from '../types';

export function useWebSocket() {
  const setWsConnected = useStore((s) => s.setWsConnected);
  const upsertTeam = useStore((s) => s.upsertTeam);
  const updateInbox = useStore((s) => s.updateInbox);
  const pushFileChange = useStore((s) => s.pushFileChange);

  useEffect(() => {
    const url = `ws://${location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[ws] connected');
        setWsConnected(true);
      };

      ws.onclose = () => {
        console.log('[ws] disconnected, retrying in 2s');
        setWsConnected(false);
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      ws.onerror = (e) => {
        console.error('[ws] error', e);
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WSEvent;
          switch (event.kind) {
            case 'team:update':
              upsertTeam(event.team);
              break;
            case 'inbox:update':
              updateInbox(event.team, event.member, event.messages);
              break;
            case 'file:change':
              pushFileChange(event.change);
              break;
          }
        } catch (err) {
          console.error('[ws] parse error', err);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [setWsConnected, upsertTeam, updateInbox, pushFileChange]);
}
