import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EventFeed } from './components/EventFeed';
import { Stats } from './components/Stats';
import { useWebSocket } from './hooks/useWebSocket';
import type { LogEvent, Project, ApiKeyDoc } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Dashboard() {
  const { token, user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyDoc[]>([]);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const isFetchingKeys = useRef(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  // Load projects once on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/projects`, { headers: authHeader });
        if (res.status === 401) { logout(); return; }
        const data = await res.json() as { projects: Project[] };
        const list = data.projects ?? [];
        setProjects(list);
        if (list.length > 0) {
          const savedId = localStorage.getItem('rp_active_project');
          const found = savedId ? list.find(p => p._id === savedId) : null;
          setActiveProject(found ?? list[0]);
        }
      } catch {
        // network error handled silently
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When active project changes, fetch its keys then events
  useEffect(() => {
    if (!activeProject) {
      setApiKeys([]);
      setEvents([]);
      setTotal(0);
      return;
    }
    localStorage.setItem('rp_active_project', activeProject._id);
    setEvents([]);
    setTotal(0);
    setActiveChannel(null);
    isFetchingKeys.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/projects/${activeProject._id}/api-keys`, { headers: authHeader });
        const data = await res.json() as { apiKeys: ApiKeyDoc[] };
        const keys = data.apiKeys ?? [];
        setApiKeys(keys);
      } catch {
        setApiKeys([]);
      } finally {
        isFetchingKeys.current = false;
      }
    })();
  }, [activeProject?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When first API key becomes available, fetch recent events
  const activeApiKey = apiKeys[0] ?? null;
  useEffect(() => {
    if (!activeApiKey) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/events?limit=100`, {
          headers: { 'x-api-key': activeApiKey.key },
        });
        const data = await res.json() as { events: LogEvent[]; total: number };
        setEvents(data.events ?? []);
        setTotal(data.total ?? 0);
      } catch {
        // backend may not be reachable yet
      }
    })();
  }, [activeApiKey?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIncomingEvent = useCallback((ev: LogEvent) => {
    setEvents(prev => {
      if (prev.some(e => e._id === ev._id)) return prev;
      return [ev, ...prev].slice(0, 200);
    });
    setTotal(t => t + 1);
  }, []);

  const wsStatus = useWebSocket(activeApiKey?.key ?? null, handleIncomingEvent);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json() as { project?: Project; apiKey?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create project');
      const project = data.project!;
      const key: ApiKeyDoc = {
        _id: '',
        key: data.apiKey!,
        name: 'Default Key',
        projectId: project._id,
        createdAt: new Date().toISOString(),
      };
      setProjects(prev => [project, ...prev]);
      setActiveProject(project);
      setApiKeys([key]);
      setEvents([]);
      setTotal(0);
      setNewProjectName('');
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setCreating(false);
    }
  };

  if (loadingProjects) {
    return (
      <>
        <Header
          wsStatus="disconnected"
          activeProject={null}
          projects={[]}
          onProjectSelect={() => {}}
          onCreateProject={() => setShowCreateModal(true)}
          onLogout={logout}
          userName={user?.name ?? ''}
        />
        <div className="loading-state">Loading…</div>
      </>
    );
  }

  return (
    <>
      <Header
        wsStatus={wsStatus}
        activeProject={activeProject}
        projects={projects}
        onProjectSelect={p => setActiveProject(p)}
        onCreateProject={() => setShowCreateModal(true)}
        onLogout={logout}
        userName={user?.name ?? ''}
      />

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">New Project</h2>
            <form onSubmit={handleCreateProject} className="setup-form">
              <div className="field">
                <label className="field-label">Project name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="my-app"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {createError && <div className="error-msg">{createError}</div>}
              <div className="modal-actions">
                <button className="btn btn-primary" type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create project'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeProject && activeApiKey ? (
        <>
          <Stats events={events} total={total} />
          <div className="layout">
            <Sidebar
              project={activeProject}
              apiKeys={apiKeys}
              activeApiKey={activeApiKey}
              events={events}
              activeChannel={activeChannel}
              onChannelSelect={setActiveChannel}
              token={token!}
              onApiKeysChange={setApiKeys}
            />
            <EventFeed
              events={events}
              channel={activeChannel}
              onClear={() => setEvents([])}
            />
          </div>
        </>
      ) : (
        <div className="setup-page">
          <div className="setup-card">
            <div className="logo-icon logo-icon-lg" style={{ marginBottom: 24 }}>R</div>
            <h2 className="setup-title">
              {projects.length === 0 ? 'Create your first project' : 'No API keys found'}
            </h2>
            <p className="setup-subtitle">
              {projects.length === 0
                ? 'A project holds your events and API keys. Create one to get started.'
                : 'This project has no API keys. Add one from the sidebar.'}
            </p>
            {projects.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                Create project
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AppInner() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}