import { useState } from 'react';
import { QuickStart } from './QuickStart';
import type { LogEvent, Project, ApiKeyDoc } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Props {
  project: Project;
  apiKeys: ApiKeyDoc[];
  activeApiKey: ApiKeyDoc | null;
  events: LogEvent[];
  activeChannel: string | null;
  onChannelSelect: (channel: string | null) => void;
  token: string;
  onApiKeysChange: (keys: ApiKeyDoc[]) => void;
}

export function Sidebar({
  project,
  apiKeys,
  activeApiKey,
  events,
  activeChannel,
  onChannelSelect,
  token,
  onApiKeysChange,
}: Props) {
  const [channel, setChannel] = useState('');
  const [eventName, setEventName] = useState('');
  const [user, setUser] = useState('');
  const [metaRaw, setMetaRaw] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendOk, setSendOk] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  const channelCounts = events.reduce<Record<string, number>>((acc, ev) => {
    const ch = ev.channelId || 'default';
    acc[ch] = (acc[ch] ?? 0) + 1;
    return acc;
  }, {});
  const channels = Object.keys(channelCounts).sort();

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !activeApiKey) return;
    setSending(true);
    setSendError('');
    setSendOk(false);

    let parsedMeta: Record<string, unknown> | undefined;
    if (metaRaw.trim()) {
      try {
        parsedMeta = JSON.parse(metaRaw) as Record<string, unknown>;
      } catch {
        setSendError('Metadata must be valid JSON');
        setSending(false);
        return;
      }
    }

    try {
      const body: Record<string, unknown> = {
        channel: channel.trim() || 'default',
        event: eventName.trim(),
      };
      if (user.trim()) body.user = user.trim();
      if (parsedMeta) body.metadata = parsedMeta;

      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': activeApiKey.key },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      setSendOk(true);
      setEventName('');
      setUser('');
      setMetaRaw('');
      setChannel('');
      setTimeout(() => setSendOk(false), 2500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send event');
    } finally {
      setSending(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newKeyName.trim() || 'New Key' }),
      });
      const data = await res.json() as { apiKey?: ApiKeyDoc };
      if (res.ok && data.apiKey) {
        onApiKeysChange([data.apiKey, ...apiKeys]);
        setNewKeyName('');
        setShowNewKeyForm(false);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Delete this API key? Any SDK clients using it will stop working.')) return;
    try {
      await fetch(`${API_BASE}/projects/${project._id}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onApiKeysChange(apiKeys.filter(k => k._id !== keyId));
    } catch {
      // silently fail
    }
  };

  return (
    <aside className="sidebar">
      {/* API Keys */}
      <div className="sidebar-section">
        <div className="sidebar-label">API Keys</div>
        <div className="key-list">
          {apiKeys.map(k => (
            <div key={k._id} className="api-key-row">
              <div className="api-key-info">
                <span className="api-key-name">{k.name}</span>
                <span className="api-key-mono">{k.key}</span>
              </div>
              <div className="api-key-actions">
                <button className="copy-btn" onClick={() => copyText(k.key, k._id)}>
                  {copied === k._id ? 'Copied' : 'Copy'}
                </button>
                {apiKeys.length > 1 && (
                  <button className="copy-btn copy-btn-danger" onClick={() => handleDeleteKey(k._id)}>
                    Del
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showNewKeyForm ? (
          <form className="new-key-form" onSubmit={handleCreateKey}>
            <input
              className="input input-sm"
              placeholder="Key name"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              autoFocus
            />
            <div className="new-key-actions">
              <button className="btn btn-sm btn-primary" type="submit" disabled={creatingKey}>
                {creatingKey ? 'Creating…' : 'Create'}
              </button>
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => setShowNewKeyForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 8 }} onClick={() => setShowNewKeyForm(true)}>
            + Add key
          </button>
        )}
      </div>

      {/* Channels */}
      <div className="sidebar-section">
        <div className="sidebar-label">Channels</div>
        <nav className="channel-list">
          <button
            className={`channel-item${activeChannel === null ? ' active' : ''}`}
            onClick={() => onChannelSelect(null)}
          >
            <span>All channels</span>
            <span className="channel-count">{events.length}</span>
          </button>
          {channels.map(ch => (
            <button
              key={ch}
              className={`channel-item${activeChannel === ch ? ' active' : ''}`}
              onClick={() => onChannelSelect(ch)}
            >
              <span>{ch}</span>
              <span className="channel-count">{channelCounts[ch]}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Send test event */}
      <div className="sidebar-section">
        <div className="sidebar-label">Send Test Event</div>
        <form className="send-form" onSubmit={handleSend}>
          <input
            className="input input-sm"
            type="text"
            placeholder="Channel (default)"
            value={channel}
            onChange={e => setChannel(e.target.value)}
            autoComplete="off"
          />
          <input
            className="input input-sm"
            type="text"
            placeholder="Event name *"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            required
            autoComplete="off"
          />
          <input
            className="input input-sm"
            type="text"
            placeholder="User (optional)"
            value={user}
            onChange={e => setUser(e.target.value)}
            autoComplete="off"
          />
          <textarea
            className="input input-sm input-textarea"
            placeholder={'Metadata JSON (optional)\n{"key": "value"}'}
            value={metaRaw}
            onChange={e => setMetaRaw(e.target.value)}
            rows={3}
            spellCheck={false}
          />
          {sendError && <div className="error-msg">{sendError}</div>}
          <button
            className={`btn btn-full${sendOk ? ' btn-success' : ''}`}
            type="submit"
            disabled={sending || !eventName.trim() || !activeApiKey}
          >
            {sendOk ? 'Sent!' : sending ? 'Sending…' : 'Send Event'}
          </button>
        </form>
      </div>

      {/* Quick Start */}
      <div className="sidebar-section">
        <button
          className="btn btn-ghost btn-sm btn-full"
          onClick={() => setShowQuickStart(s => !s)}
        >
          {showQuickStart ? 'Hide Quick Start' : 'Show Quick Start'}
        </button>
        {showQuickStart && activeApiKey && (
          <div style={{ marginTop: 12 }}>
            <QuickStart apiKey={activeApiKey.key} projectName={project.name} />
          </div>
        )}
      </div>
    </aside>
  );
}