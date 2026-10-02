import { CatalogSnapshot, PluginUpdate, Settings, TranslationDocument, ViewState, unwrapFfi } from '../shared/library_types';
import { PLUGIN_VERSION } from '../.generated/version';

type BackendSnapshot = Pick<ViewState, 'state' | 'catalog' | 'update'>;

export async function rpc<T>(operation: Promise<unknown>): Promise<T> {
  const raw = unwrapFfi(await operation);
  const result = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { ok: boolean; data: T; error?: string };
  if (!result?.ok) throw new Error(result?.error || '插件请求失败');
  return result.data;
}

export class PluginRuntime {
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private timer?: number;
  private onApplied?: () => Promise<void>;
  private view: ViewState = {
    state: { version: 1, apps: {}, settings: { enabled: true, language: 'schinese', auto_translation_updates: false, auto_plugin_updates: true, catalog_base: '' } },
    update: { current_version: PLUGIN_VERSION, available: false }, busy: false, message: '', messageTone: 'quiet',
  };

  snapshot = (): ViewState => this.view;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(changes: Partial<ViewState>): void {
    if (this.disposed) return;
    this.view = { ...this.view, ...changes };
    for (const listener of this.listeners) listener();
  }

  async initialize(): Promise<void> {
    try { this.publish(await rpc<BackendSnapshot>(backend.getState())); }
    catch (error) {
      this.publish({ message: error instanceof Error ? error.message : '读取本地数据失败', messageTone: 'error' });
      console.warn('SATLI lite read state failed');
    }
  }

  startBackground(onApplied: () => Promise<void>): void {
    this.onApplied = onApplied;
    void this.synchronize();
    this.timer = window.setInterval(() => { void this.synchronize(); }, 6 * 60 * 60 * 1000);
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.listeners.clear();
  }

  private async perform<T>(workflow: string, label: string, operation: () => Promise<T>, applied = false): Promise<T> {
    const work = this.queue.then(async () => {
      if (this.disposed) throw new Error('插件已停用');
      this.publish({ busy: true, message: label, messageTone: 'progress' });
      try {
        const result = await operation();
        const snapshot = await rpc<BackendSnapshot>(backend.getState());
        this.publish({ ...snapshot, message: `${label}完成`, messageTone: 'success' });
        if (applied) await this.onApplied?.();
        return result;
      } catch (error) {
        this.publish({ message: error instanceof Error ? error.message : '操作失败', messageTone: 'error' });
        console.warn(`SATLI lite ${workflow} failed`);
        throw error;
      } finally {
        this.publish({ busy: false });
      }
    });
    this.queue = work.catch(() => undefined);
    return work;
  }

  refresh = (): Promise<CatalogSnapshot> => this.perform('refresh catalog', '刷新翻译库', () => rpc(backend.refreshCatalog()));
  preview = (appId: string, variantId: string): Promise<TranslationDocument> => this.perform('preview translation', '下载预览', () => rpc(backend.previewTranslation(appId, variantId)));
  install = (appId: string, variantId: string, language: string): Promise<unknown> => this.perform('apply translation', '应用翻译', () => rpc(backend.installTranslation(appId, variantId, language)), true);
  toggle = (appId: string, enabled: boolean): Promise<unknown> => this.perform('toggle translation', enabled ? '启用翻译' : '恢复原文', () => rpc(backend.toggleTranslation(appId, enabled)), true);
  restore = (appId: string): Promise<unknown> => this.perform('restore previous translation', '恢复上一版', () => rpc(backend.restoreTranslation(appId)), true);
  configure = (settings: Partial<Settings>): Promise<unknown> => this.perform('save settings', '保存设置', () => rpc(backend.configure(JSON.stringify(settings))), true);
  import = (text: string, language: string): Promise<unknown> => this.perform('import translation', '导入翻译', () => rpc(backend.importTranslation(text, language)), true);
  export = (appId: string): Promise<TranslationDocument> => this.perform('export translation', '导出翻译', () => rpc(backend.exportTranslation(appId)));
  edit = (appId: string, apiName: string, name: string, description: string): Promise<unknown> => this.perform('edit translation', '保存编辑', () => rpc(backend.editTranslation(appId, apiName, name, description)), true);
  checkUpdate = (): Promise<PluginUpdate> => this.perform('check plugin update', '检查插件更新', () => rpc(backend.checkPluginUpdate()));
  installUpdate = (): Promise<PluginUpdate> => this.perform('install plugin update', '安装插件更新', () => rpc(backend.installPluginUpdate()));

  private async synchronize(): Promise<void> {
    try { await this.refresh(); } catch { /* Cached translations remain usable. */ }
    if (this.disposed) return;
    if (this.view.state.settings.auto_translation_updates && this.view.catalog) {
      for (const entry of Object.values(this.view.state.apps)) {
        if (this.disposed) return;
        const variant = this.view.catalog.catalog.games[entry.app_id]?.variants[entry.variant_id];
        if (entry.enabled && !entry.local_edits && variant?.json && variant.sha256 !== entry.source_sha256) {
          try { await this.install(entry.app_id, entry.variant_id, entry.language); } catch { /* Keep previous translation. */ }
        }
      }
    }
    if (this.view.state.settings.auto_plugin_updates && !this.view.update.pending_restart) {
      try {
        const update = await this.checkUpdate();
        if (update.available && !this.disposed) await this.installUpdate();
      } catch { /* Update request failures remain visible without breaking translation. */ }
    }
  }
}
