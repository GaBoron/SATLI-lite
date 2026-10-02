import { useState } from 'react';
import { LANGUAGE_NAMES, Settings } from '../shared/library_types';
import { PLUGIN_VERSION } from '../.generated/version';
import { PluginRuntime } from './plugin_runtime';
import { useRuntime } from './use_runtime';
import { BatchTranslations } from './batch_translations';

export function SettingsContent({ runtime, openTranslations }: { runtime: PluginRuntime; openTranslations: () => void }) {
  const view = useRuntime(runtime);
  const settings = view.state.settings;
  const [mirror, setMirror] = useState(settings.catalog_base);
  const save = (changes: Partial<Settings>): void => { void runtime.configure(changes).catch(() => undefined); };
  const enabledCount = Object.values(view.state.apps).filter(app => app.enabled).length;
  return <div data-satli-lite="settings" className="satli-lite-panel">
    <p>SATLI lite {PLUGIN_VERSION} · 已下载 {Object.keys(view.state.apps).length} 个游戏 · 已启用 {enabledCount} 个</p>
    <button className="primary" onClick={openTranslations}>管理成就翻译</button>
    <p>也可以从库存游戏页的“成就翻译”按钮下载。</p>
    <label className="satli-lite-setting"><input type="checkbox" checked={settings.enabled} disabled={view.busy} onChange={event => save({ enabled: event.target.checked })} />启用成就翻译</label>
    <label className="satli-lite-setting">默认下载语言 <select value={settings.language} disabled={view.busy} onChange={event => save({ language: event.target.value })}>{Object.entries(LANGUAGE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label className="satli-lite-setting"><input type="checkbox" checked={settings.auto_translation_updates} disabled={view.busy} onChange={event => save({ auto_translation_updates: event.target.checked })} />自动更新社区译本（保留本地编辑）</label>
    <label className="satli-lite-setting"><input type="checkbox" checked={settings.auto_plugin_updates} disabled={view.busy} onChange={event => save({ auto_plugin_updates: event.target.checked })} />自动下载并安装插件新版（重启 Steam 生效）</label>
    <div className="satli-lite-toolbar">
      <button disabled={view.busy} onClick={() => { void runtime.checkUpdate().catch(() => undefined); }}>检查插件更新</button>
      {view.update.available && <button disabled={view.busy} onClick={() => { void runtime.installUpdate().catch(() => undefined); }}>安装 {view.update.latest_version}</button>}
      {view.update.pending_restart && <span>插件更新已完成，请重启 Steam。</span>}
      <a href={view.update.release_url || 'https://github.com/GaBoron/SATLI-lite/releases'} target="_blank" rel="noreferrer">发布说明</a>
    </div>
    <label className="satli-lite-setting">翻译库镜像目录（留空使用 GitHub）<input placeholder="https://cdn.jsdelivr.net/gh/GaBoron/steam-achievement-translation-library@main/" value={mirror} disabled={view.busy} onChange={event => setMirror(event.target.value)} /></label>
    <button disabled={view.busy} onClick={() => { void runtime.configure({ catalog_base: mirror.trim() }).then(() => runtime.refresh()).catch(() => undefined); }}>保存并刷新</button>
    <BatchTranslations runtime={runtime} />
    <p role="status">{view.message}</p>
    <p className="satli-lite-muted">下载和错误日志由 Millennium 管理；不记录成就文本、凭据或反馈内容。反馈入口仅打开翻译库表单，由你填写并提交。</p>
  </div>;
}
