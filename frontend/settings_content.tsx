import { PLUGIN_VERSION } from '../.generated/version';
import { PluginRuntime } from './plugin_runtime';
import { useRuntime } from './use_runtime';
import { BatchTranslations } from './batch_translations';
import { CatalogSource, PluginUpdates, TranslationSettings } from './settings_sections';
import { Button, Icon, RuntimeStatus } from './ui_controls';

export function SettingsContent({ runtime, openTranslations }: { runtime: PluginRuntime; openTranslations: () => void }) {
  const view = useRuntime(runtime);
  const settings = view.state.settings;
  const enabledCount = Object.values(view.state.apps).filter(app => app.enabled).length;
  return <div data-satli-lite="settings" className="satli-lite-panel satli-settings">
    <header className="satli-settings-heading">
      <div className="satli-settings-context">
        <div className="satli-settings-title"><h2>成就翻译</h2><span className="satli-settings-version">v{PLUGIN_VERSION}</span></div>
        <p className="satli-settings-count">已下载 {Object.keys(view.state.apps).length} 个游戏 · {settings.enabled ? `已启用 ${enabledCount} 个` : '全局已暂停'}</p>
      </div>
      <div className="satli-settings-entry">
        <Button variant="filled" icon="library" onClick={openTranslations}>管理译本</Button>
        <span>也可从库存游戏页进入</span>
      </div>
    </header>
    <div className="satli-settings-body">
      <TranslationSettings runtime={runtime} view={view} />
      <PluginUpdates runtime={runtime} view={view} />
      <CatalogSource runtime={runtime} view={view} />
      <BatchTranslations runtime={runtime} />
    </div>
    <RuntimeStatus view={view} />
    <footer className="satli-settings-footer">
      <p>Millennium 日志记录操作起止与错误，不包含成就文本、凭据或反馈内容。</p>
      <a href="https://github.com/GaBoron/SATLI-lite/issues/new" target="_blank" rel="noreferrer" title="打开 GitHub 表单，由你填写并提交">反馈入口<Icon name="link" /></a>
    </footer>
  </div>;
}
