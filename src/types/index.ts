export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface ApiKeyDoc {
  _id: string;
  key: string;
  name: string;
  projectId: string;
  createdAt: string;
}

export interface LogEvent {
  _id: string;
  projectId: string;
  channelId: string;
  event: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';