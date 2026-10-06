import { useEffect, useState } from 'react';
import { LANGUAGE_NAMES, Settings, ViewState } from '../shared/library_types';
import { PluginRuntime } from './plugin_runtime';
import { SettingRow, SettingsDisclosure, SettingsSection } from './settings_layout';
import { Button, Icon, Notice, SwitchRow } from './ui_controls';

type SectionProps = { runtime: PluginRuntime; view: ViewState };
const ignoreError = (): void => undefined;

export function TranslationSettings({ runtime, view }: SectionProps) {
  const settings = view.state.settings;
  const save = (changes: Partial<Settings>): void => { void runtime.configure(changes).catch(ignoreError); };
  return <SettingsSection title="翻译">
    <SwitchRow label="启用成就翻译" description="在库存、活动、成就通知和 Steam 网页显示译文。"
      checked={settings.enabled} disabled={view.busy} onChange={enabled => save({ enabled })} />
    <SettingRow label="默认下载语言" description="下载译本时使用的默认语言。" controlId="satli-default-language">
      <div className="satli-select">
        <select id="satli-default-language" aria-describedby="satli-default-language-help" value={settings.language}
          disabled={view.busy} onChange={event => save({ language: event.target.value })}>
          {Object.entries(LANGUAGE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select><Icon name="chevron" />
      </div>
    </SettingRow>
    <SwitchRow label="自动更新社区译本" description="更新已启用译本，保留本地编辑。" checked={settings.auto_translation_updates}
      disabled={view.busy} onChange={value => save({ auto_translation_updates: value })} />
  </SettingsSection>;
}

export function PluginUpdates({ runtime, view }: SectionProps) {
  return <SettingsSection title="插件更新">
    <SwitchRow label="自动更新 SATLI lite" description="下载安装新版，重启 Steam 后生效。" checked={view.state.settings.auto_plugin_updates}
      disabled={view.busy} onChange={value => { void runtime.configure({ auto_plugin_updates: value }).catch(ignoreError); }} />
    <div className="satli-actions satli-update-actions">
      <Button variant="outlined" icon="refresh" disabled={view.busy} onClick={() => { void runtime.checkUpdate().catch(ignoreError); }}>检查更新</Button>
      {view.update.available && <Button variant="tonal" icon="download" disabled={view.busy} onClick={() => { void runtime.installUpdate().catch(ignoreError); }}>
        安装 {view.update.latest_version}
      </Button>}
      <a href={view.update.release_url || 'https://github.com/GaBoron/SATLI-lite/releases'} target="_blank" rel="noreferrer">发布说明<Icon name="link" /></a>
    </div>
    {view.update.pending_restart && <Notice>新版插件已安装，重启 Steam 后生效。</Notice>}
  </SettingsSection>;
}

export function CatalogSource({ runtime, view }: SectionProps) {
  const [mirror, setMirror] = useState(view.state.settings.catalog_base);
  useEffect(() => { setMirror(view.state.settings.catalog_base); }, [view.state.settings.catalog_base]);
  return <SettingsDisclosure title="翻译库来源" summary={view.state.settings.catalog_base ? '自定义镜像' : 'GitHub · 默认'}>
    <div className="satli-input-action">
      <label className="satli-field"><span>HTTPS 镜像目录</span>
        <input type="url" aria-describedby="satli-catalog-help" placeholder="留空使用 GitHub" value={mirror}
          disabled={view.busy} onChange={event => setMirror(event.target.value)} />
      </label>
      <Button variant="outlined" disabled={view.busy} onClick={() => {
        void runtime.configure({ catalog_base: mirror.trim() }).then(() => runtime.refresh()).catch(ignoreError);
      }}>保存并刷新</Button>
    </div>
    <p id="satli-catalog-help" className="satli-field-help">留空使用 GitHub；镜像填写根目录。网络代理沿用 Millennium 设置。</p>
  </SettingsDisclosure>;
}
