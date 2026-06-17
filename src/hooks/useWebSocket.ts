import { useEffect, useRef, useState, useCallback } from 'react';
import type { LogEvent, WsStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export function useWebSocket(apiKey: string | null, onEvent: (ev: LogEvent) => void): WsStatus {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const destroyedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback((key: string) => {
    if (destroyedRef.current) return;
    wsRef.current?.close();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    setStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}?apiKey=${encodeURIComponent(key)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (destroyedRef.current) { ws.close(); return; }
      setStatus('connected');
      retryCountRef.current = 0;
    };

    ws.onclose = () => {
      if (destroyedRef.current) return;
      setStatus('disconnected');
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => connect(key), delay);
    };

    ws.onerror = () => { ws.close(); };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data as string) as { type?: string; data?: LogEvent };
        if (parsed?.type === 'new_event' && parsed?.data) {
          onEventRef.current(parsed.data);
        }
      } catch {
        // ignore malformed frames
      }
    };
  }, []);

  useEffect(() => {
    destroyedRef.current = false;
    if (!apiKey) {
      setStatus('disconnected');
      return;
    }
    connect(apiKey);
    return () => {
      destroyedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, [apiKey, connect]);

  return status;
}