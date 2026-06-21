import { useState, useRef, useEffect } from 'react';
import rippleLogo from '../../public/ripple-badge.svg';
import type { WsStatus, Project } from '../types';

interface Props {
  wsStatus: WsStatus;
  activeProject: Project | null;
  projects: Project[];
  onProjectSelect: (p: Project) => void;
  onCreateProject: () => void;
  onLogout: () => void;
  userName: string;
}

export function Header({
  wsStatus,
  activeProject,
  projects,
  onProjectSelect,
  onCreateProject,
  onLogout,
  userName,
}: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const wsLabel =
    wsStatus === 'connected' ? 'Live' :
    wsStatus === 'connecting' ? 'Connecting…' :
    'Offline';

  return (
    <header className="header">
      <div className="logo">
        <img src={rippleLogo} alt="Ripple" className="logo-img" />
      </div>

      <div className="header-center" ref={dropdownRef}>
        {projects.length > 0 && (
          <button className="project-selector" onClick={() => setOpen(o => !o)}>
            <span>{activeProject?.name ?? 'Select project'}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L1 3h10L6 8z" />
            </svg>
          </button>
        )}
        {open && (
          <div className="project-dropdown">
            {projects.map(p => (
              <button
                key={p._id}
                className={`project-dropdown-item${p._id === activeProject?._id ? ' active' : ''}`}
                onClick={() => { onProjectSelect(p); setOpen(false); }}
              >
                {p.name}
              </button>
            ))}
            <div className="project-dropdown-divider" />
            <button
              className="project-dropdown-item project-dropdown-create"
              onClick={() => { onCreateProject(); setOpen(false); }}
            >
              + New project
            </button>
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="status-badge">
          <div className={`status-dot ${wsStatus}`} />
          {wsLabel}
        </div>
        <span className="header-user">{userName}</span>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}