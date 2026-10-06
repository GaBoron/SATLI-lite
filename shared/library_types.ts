import { SteamLibrarySnapshot } from './steam_library_types';

export interface TranslationText { name: string; description: string }
export interface TranslationDocument {
  version: 1;
  app_id: string;
  variant_id: string;
  source_sha256: string;
  languages: string[];
  achievements: Record<string, { translations: Record<string, TranslationText> }>;
}
export interface Variant {
  sha256: string;
  languages: string[];
  achievements: number;
  json?: { version: number; size: number };
  label?: { zh: string; en: string };
  description?: { zh: string; en: string };
}
export interface Game {
  name: string;
  contributors: string[];
  updated_at: string;
  status?: 'current' | 'possibly_ineffective' | 'outdated';
  variants: Record<string, Variant>;
}
export interface CatalogSnapshot {
  catalog: { version: 2; games: Record<string, Game> };
  fetched_at: number;
  base: string;
}
export interface Settings {
  enabled: boolean;
  language: string;
  auto_translation_updates: boolean;
  auto_plugin_updates: boolean;
  catalog_base: string;
}
export interface InstalledTranslation {
  app_id: string;
  variant_id: string;
  language: string;
  enabled: boolean;
  source_sha256: string;
  name: string;
  installed_at: number;
  local_edits: boolean;
  history?: InstalledTranslation[];
}
export interface PluginUpdate {
  current_version: string;
  latest_version?: string;
  release_url?: string;
  available: boolean;
  pending_restart?: boolean;
}
export interface PluginState {
  version: 1;
  settings: Settings;
  apps: Record<string, InstalledTranslation>;
}
export interface ViewState {
  state: PluginState;
  catalog?: CatalogSnapshot;
  steamLibrary?: SteamLibrarySnapshot;
  steamLibraryError?: string;
  libraryAppIds?: string[];
  update: PluginUpdate;
  busy: boolean;
  message: string;
  messageTone: 'quiet' | 'progress' | 'success' | 'error';
}

export function unwrapFfi(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  for (const key of ['returnValue', 'returnJson', 'value']) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return value;
}

export const LANGUAGE_NAMES: Record<string, string> = {
  schinese: '简体中文', tchinese: '繁體中文', english: 'English', japanese: '日本語',
  koreana: '한국어', french: 'Français', german: 'Deutsch', russian: 'Русский',
  spanish: 'Español', brazilian: 'Português do Brasil', portuguese: 'Português',
};
