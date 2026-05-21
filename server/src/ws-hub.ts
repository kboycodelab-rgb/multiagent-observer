import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { WSEvent } from './types.js';

export class WSHub {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[ws] client connected, total=${this.clients.size}`);
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[ws] client disconnected, total=${this.clients.size}`);
      });
      ws.on('error', () => this.clients.delete(ws));
    });
  }

  broadcast(event: WSEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (e) {
          console.error('[ws] send error', e);
        }
      }
    }
  }

  get clientCount() {
    return this.clients.size;
  }
}
