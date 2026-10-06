import { ReactNode } from 'react';
import { Icon } from './ui_controls';

export function SettingsSection({ title, caption, children, className = '' }: {
  title: string; caption?: string; children: ReactNode; className?: string;
}) {
  return <section className={`satli-settings-section ${className}`} aria-label={title}>
    <div className="satli-section-heading"><h3>{title}</h3>{caption && <span>{caption}</span>}</div>
    <div className="satli-section-content">{children}</div>
  </section>;
}

export function SettingRow({ label, description, controlId, children }: {
  label: string; description: string; controlId: string; children: ReactNode;
}) {
  return <div className="satli-setting-row">
    <div className="satli-setting-copy">
      <label htmlFor={controlId}>{label}</label><p id={`${controlId}-help`}>{description}</p>
    </div>
    <div className="satli-setting-control">{children}</div>
  </div>;
}

export function SettingsDisclosure({ title, summary, children }: {
  title: string; summary: string; children: ReactNode;
}) {
  return <details className="satli-settings-section satli-settings-disclosure" aria-label={title}>
    <summary>
      <span className="satli-disclosure-title">{title}</span>
      <span className="satli-disclosure-context">{summary}</span>
      <Icon name="chevron" />
    </summary>
    <div className="satli-section-content">{children}</div>
  </details>;
}
