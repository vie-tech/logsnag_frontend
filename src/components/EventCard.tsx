import type { LogEvent } from '../types';

interface Props {
  event: LogEvent;
}

export function EventCard({ event: ev }: Props) {
  const time = new Date(ev.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const hasMetadata = ev.metadata && Object.keys(ev.metadata).length > 0;

  return (
    <div className="event-card">
      <div className="event-main">
        <div className="event-header">
          <span className="event-channel">{ev.channelId || 'default'}</span>
          <span className="event-name">{ev.event}</span>
        </div>
        {ev.userId && <div className="event-user">{ev.userId}</div>}
        {hasMetadata && (
          <pre className="event-metadata">{JSON.stringify(ev.metadata, null, 2)}</pre>
        )}
      </div>
      <div className="event-time">{time}</div>
    </div>
  );
}