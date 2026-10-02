import { useState } from 'react';
import { PluginRuntime } from './plugin_runtime';
import { useRuntime } from './use_runtime';
import { GameBrowser } from './game_browser';
import { TranslationDetails } from './translation_details';
import { ImportTranslation } from './translation_files';
import { Button, Icon, RuntimeStatus } from './ui_controls';

const ignoreError = (): void => undefined;

export function TranslationPanel({ runtime, initialAppId = '', onClose }: {
  runtime: PluginRuntime; initialAppId?: string; onClose: () => void;
}) {
  const view = useRuntime(runtime);
  const [appId, setAppId] = useState(initialAppId);
  const [importGeneration, setImportGeneration] = useState(0);
  const downloaded = Object.keys(view.state.apps).length;
  return <div data-satli-lite="panel" className="satli-lite-panel satli-workspace">
    <header className="satli-workspace-header">
      <div className="satli-brand"><span className="satli-brand-mark" aria-hidden="true">译</span>
        <div><h1>SATLI <span>lite</span></h1><p>成就翻译{downloaded > 0 ? ` · 已下载 ${downloaded} 个游戏` : ''}</p></div>
      </div>
      <div className="satli-actions">
        <Button variant="text" icon="refresh" disabled={view.busy} onClick={() => { void runtime.refresh().catch(ignoreError); }}>刷新翻译库</Button>
        <Button variant="icon" icon="close" aria-label="关闭成就翻译" onClick={onClose} />
      </div>
    </header>
    <div className="satli-workspace-content">
      <GameBrowser view={view} appId={appId} onSelect={setAppId} />
      {appId ? <TranslationDetails key={`${appId}:${importGeneration}`} appId={appId} runtime={runtime} view={view} />
        : <section className="satli-workspace-empty" aria-label="开始使用">
          <div className="satli-empty-icon"><Icon name="library" /></div>
          <h2>{view.catalog ? '选择一个游戏' : '浏览社区成就翻译'}</h2>
          <p>{view.catalog ? '查看不同译本，选择语言并应用到 Steam。' : '刷新翻译库后即可选择游戏，已下载的译本可离线使用。'}</p>
          {!view.catalog && <Button variant="filled" icon="refresh" disabled={view.busy} onClick={() => { void runtime.refresh().catch(ignoreError); }}>刷新翻译库</Button>}
        </section>}
    </div>
    <footer className="satli-workspace-footer">
      <ImportTranslation runtime={runtime} language={view.state.settings.language} busy={view.busy} onImported={id => {
        setAppId(id);
        setImportGeneration(value => value + 1);
      }} />
      <RuntimeStatus view={view} />
    </footer>
  </div>;
}
