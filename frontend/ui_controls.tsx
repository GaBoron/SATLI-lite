import { ButtonHTMLAttributes, ReactNode } from 'react';
import { ViewState } from '../shared/library_types';
import { StatusMessage } from './status_message';

const ICON_PATHS = {
  search: 'm21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  chevron: 'm6 9 6 6 6-6',
  preview: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  edit: 'm15 4 5 5M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z',
  history: 'M3 11a9 9 0 1 1 2.5 7M3 4v7h7m2-4v5l3 2',
  library: 'M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1',
  info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  alert: 'M12 8v5m0 3v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  spinner: 'M21 12a9 9 0 1 1-9-9',
  link: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`satli-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICON_PATHS[name]} />
  </svg>;
}

export function Button({ children, icon, variant = 'tonal', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName; variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'icon';
}) {
  return <button type="button" className={`satli-button satli-button--${variant} ${className}`} {...props}>
    {icon && <Icon name={icon} />}{children}
  </button>;
}

export function SearchField({ value, onChange, label, placeholder }: {
  value: string; onChange: (value: string) => void; label: string; placeholder: string;
}) {
  return <div className="satli-search">
    <Icon name="search" />
    <input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
    {value && <Button variant="icon" icon="close" aria-label={`清除${label}`} onClick={() => onChange('')} />}
  </div>;
}

export function SwitchRow({ label, description, checked, disabled, onChange }: {
  label: string; description?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className={`satli-switch-row ${disabled ? 'is-disabled' : ''}`}>
    <span className="satli-switch-copy"><span>{label}</span>{description && <small>{description}</small>}</span>
    <span className="satli-switch">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span className="satli-switch-track"><span className="satli-switch-thumb" /></span>
    </span>
  </label>;
}

export function Notice({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <div className={`satli-notice ${warning ? 'satli-notice--warning' : ''}`}><Icon name="info" /><span>{children}</span></div>;
}

export function RuntimeStatus({ view }: { view: ViewState }) {
  return <StatusMessage message={view.message} tone={view.messageTone} busy={view.busy}
    icon={<Icon name={view.busy ? 'spinner' : view.messageTone === 'error' ? 'alert' : view.messageTone === 'success' ? 'check' : 'info'} className={view.busy ? 'satli-spinning' : ''} />} />;
}
