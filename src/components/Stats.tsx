import type { LogEvent } from '../types';

interface Props {
  events: LogEvent[];
  total: number;
}

export function Stats({ events, total }: Props) {
  const channels = new Set(events.map(e => e.channelId)).size;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = events.filter(e => new Date(e.timestamp) >= today).length;

  const lastEvent = events[0]
    ? formatRelative(new Date(events[0].timestamp))
    : '—';

  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-value">{total.toLocaleString()}</span>
        <span className="stat-label">Total events</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{todayCount}</span>
        <span className="stat-label">Today</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{channels}</span>
        <span className="stat-label">Channels</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value stat-value--sm">{lastEvent}</span>
        <span className="stat-label">Last event</span>
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}