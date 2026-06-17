import type { LogEvent } from '../types';
import { EventCard } from './EventCard';

interface Props {
  events: LogEvent[];
  channel: string | null;
  onClear: () => void;
}

export function EventFeed({ events, channel, onClear }: Props) {
  const filtered = channel
    ? events.filter(ev => (ev.channelId || 'default') === channel)
    : events;

  return (
    <section className="feed">
      <div className="feed-header">
        <div>
          <h2 className="feed-title">{channel ?? 'All Events'}</h2>
          <p className="feed-subtitle">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''} this session
          </p>
        </div>
        {filtered.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <div className="event-feed">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No events yet</div>
            <div className="empty-body">
              {channel
                ? `No events on the "${channel}" channel yet.`
                : 'Send a test event using the form on the left, or push events from your app with the SDK.'}
            </div>
          </div>
        ) : (
          filtered.map((ev, i) => <EventCard key={ev._id ?? i} event={ev} />)
        )}
      </div>
    </section>
  );
}