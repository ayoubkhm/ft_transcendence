import { RawData } from 'ws';

// This interface now correctly represents the structure of the connection
// object provided by @fastify/websocket.
export interface SocketStream {
  readyState: number;
  send(data: string | Buffer): void;
  on(event: 'message', listener: (data: RawData) => void): void;
  on(event: 'close', listener: () => void): void;
  destroy(error?: Error): void;
}