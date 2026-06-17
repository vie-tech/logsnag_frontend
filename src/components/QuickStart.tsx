import { useState } from 'react';

interface Props {
  apiKey: string;
  projectName: string;
}

export function QuickStart({ apiKey, projectName }: Props) {
  const [copied, setCopied] = useState(false);

  const slug = projectName.toLowerCase().replace(/\s+/g, '-');

  const snippet = `import LogSnag from '@favourativie/logsnag';

const logsnag = new LogSnag({
  apiKey: '${apiKey}',
  project: '${slug}',
  baseUrl: 'http://localhost:3000', // your backend URL
});

// Track an event
await logsnag.track({
  channel: 'payments',
  event: 'New Subscription',
  user: 'user_123',
  metadata: { plan: 'pro', amount: 29 },
});`;

  const copy = () => {
    navigator.clipboard.writeText(snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="quickstart">
      <div className="quickstart-header">
        <span className="sidebar-label" style={{ margin: 0 }}>Quick Start</span>
        <button className="copy-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <pre className="quickstart-code">{snippet}</pre>
    </div>
  );
}