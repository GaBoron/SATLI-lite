import { ReactNode } from 'react';
import { ViewState } from '../shared/library_types';

function messageParts(message: string, error: boolean): { summary: string; details: string } {
  const lines = message.trim().split(/\r?\n/).filter(line => line.trim());
  let summary = (lines.shift() || '').replace(/^Error:\s*/i, '');
  const locations: string[] = [];
  // Lua errors prefix the human message with the packed source location.
  for (;;) {
    const location = summary.match(/^(\(?[^\n]*?\.(?:lua|tsx?|js)\)?:\d+(?::\d+)?):\s*/i);
    if (!location) break;
    locations.push(location[1]);
    summary = summary.slice(location[0].length);
  }
  if (error && (!summary || /^module .+ not found|^stack traceback:|^attempt to /i.test(summary))) {
    return { summary: '插件操作失败，请查看技术详情。', details: message.trim() };
  }
  return { summary, details: [...locations, ...lines].join('\n') };
}

export function StatusMessage({ message, tone = 'quiet', busy = false, icon }: {
  message: string; tone?: ViewState['messageTone']; busy?: boolean; icon: ReactNode;
}) {
  if (!message) return null;
  const { summary, details } = messageParts(message, tone === 'error');
  return <div className={`satli-status satli-status--${tone}`} role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true" data-busy={busy || undefined}>
    {icon}
    <div className="satli-status-content">
      <p className="satli-status-summary">{summary}</p>
      {details && <details className="satli-status-details">
        <summary><span className="satli-disclosure-marker" aria-hidden="true" />技术详情</summary>
        <p>{details}</p>
      </details>}
    </div>
  </div>;
}
