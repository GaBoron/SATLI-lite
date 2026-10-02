import { useEffect, useState } from 'react';
import { LANGUAGE_NAMES, Settings } from '../shared/library_types';
import { PLUGIN_VERSION } from '../.generated/version';
import { PluginRuntime } from './plugin_runtime';
import { useRuntime } from './use_runtime';
import { BatchTranslations } from './batch_translations';
import { Button, Icon, Notice, RuntimeStatus, SwitchRow } from './ui_controls';

export function SettingsContent({ runtime, openTranslations }: { runtime: PluginRuntime; openTranslations: () => void }) {
  const view = useRuntime(runtime);
  const settings = view.state.settings;
  const [mirror, setMirror] = useState(settings.catalog_base);
  useEffect(() => { setMirror(settings.catalog_base); }, [settings.catalog_base]);
  const save = (changes: Partial<Settings>): void => { void runtime.configure(changes).catch(() => undefined); };
  const enabledCount = Object.values(view.state.apps).filter(app => app.enabled).length;
  return <div data-satli-lite="settings" className="satli-lite-panel satli-settings">
    <div className="satli-settings-heading">
      <div><span className="satli-eyebrow">SATLI lite · {PLUGIN_VERSION}</span><h2>成就翻译</h2>
        <p>已下载 {Object.keys(view.state.apps).length} 个游戏 · {settings.enabled ? `已启用 ${enabledCount} 个` : '全局已暂停'}</p></div>
      <Button variant="filled" icon="arrow" onClick={openTranslations}>管理译本</Button>
    </div>
    <p className="satli-muted">也可以从库存游戏页的“成就翻译”按钮进入。</p>
    <section className="satli-settings-section" aria-label="翻译设置">
      <h3>翻译</h3>
      <SwitchRow label="启用成就翻译" description="在库存、活动、成就通知和 Steam 内嵌网页中显示译文。"
        checked={settings.enabled} disabled={view.busy} onChange={enabled => save({ enabled })} />
      <div className="satli-setting-select"><span>默认下载语言</span><label className="satli-select">
        <select aria-label="默认下载语言" value={settings.language} disabled={view.busy} onChange={event => save({ language: event.target.value })}>
          {Object.entries(LANGUAGE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select><Icon name="chevron" />
      </label></div>
      <SwitchRow label="自动更新社区译本" description="更新已启用的译本，保留本地编辑。" checked={settings.auto_translation_updates}
        disabled={view.busy} onChange={value => save({ auto_translation_updates: value })} />
    </section>
    <section className="satli-settings-section" aria-label="插件更新">
      <h3>插件更新</h3>
      <SwitchRow label="自动更新 SATLI lite" description="自动下载并安装新版，重启 Steam 后生效。" checked={settings.auto_plugin_updates}
        disabled={view.busy} onChange={value => save({ auto_plugin_updates: value })} />
      <div className="satli-actions">
        <Button variant="outlined" icon="refresh" disabled={view.busy} onClick={() => { void runtime.checkUpdate().catch(() => undefined); }}>检查更新</Button>
        {view.update.available && <Button variant="filled" icon="download" disabled={view.busy} onClick={() => { void runtime.installUpdate().catch(() => undefined); }}>安装 {view.update.latest_version}</Button>}
        <a href={view.update.release_url || 'https://github.com/GaBoron/SATLI-lite/releases'} target="_blank" rel="noreferrer">发布说明<Icon name="link" /></a>
      </div>
      {view.update.pending_restart && <Notice>新版插件已安装，重启 Steam 后生效。</Notice>}
    </section>
    <section className="satli-settings-section" aria-label="翻译库来源">
      <h3>翻译库来源</h3>
      <label className="satli-field"><span>HTTPS 镜像目录</span><input type="url" placeholder="留空使用 GitHub" value={mirror}
        disabled={view.busy} onChange={event => setMirror(event.target.value)} /></label>
      <p className="satli-muted">可填写翻译库镜像的根目录，网络代理沿用 Millennium 设置。</p>
      <Button variant="tonal" icon="refresh" disabled={view.busy} onClick={() => {
        void runtime.configure({ catalog_base: mirror.trim() }).then(() => runtime.refresh()).catch(() => undefined);
      }}>保存并刷新</Button>
    </section>
    <BatchTranslations runtime={runtime} />
    <RuntimeStatus view={view} />
    <p className="satli-privacy">Millennium 日志记录操作起止与错误，不包含成就文本、凭据或反馈内容。反馈入口打开表单，由你填写并提交。</p>
  </div>;
}
