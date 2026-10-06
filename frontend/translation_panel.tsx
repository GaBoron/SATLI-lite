import { useEffect, useState } from 'react';
import { PluginRuntime } from './plugin_runtime';
import { useRuntime } from './use_runtime';
import { GameBrowser } from './game_browser';
import { TranslationDetails } from './translation_details';
import { ImportTranslation } from './translation_files';
import { Button, Icon, RuntimeStatus } from './ui_controls';
import { PanelStylesheet } from './stylesheet';

const ignoreError = (): void => undefined;

export function TranslationPanel({ runtime, initialAppId = '', onClose }: {
  runtime: PluginRuntime; initialAppId?: string; onClose: () => void;
}) {
  const view = useRuntime(runtime);
  useEffect(() => { runtime.refreshLibraryMembership(); }, [runtime]);
  const [appId, setAppId] = useState(initialAppId);
  const [browsing, setBrowsing] = useState(!initialAppId);
  const [importGeneration, setImportGeneration] = useState(0);
  const downloaded = Object.keys(view.state.apps).length;
  const enabled = Object.values(view.state.apps).filter(entry => entry.enabled && view.state.settings.enabled).length;
  const selectGame = (id: string): void => { setAppId(id); setBrowsing(false); };
  return <div data-satli-lite="panel" data-browsing={browsing} className="satli-lite-panel satli-workspace">
    <PanelStylesheet />
    <header className="satli-workspace-header">
      <div className="satli-workspace-title">
        <Button className="satli-browser-back" variant="icon" icon="back" aria-label="返回游戏列表" title="返回游戏列表" onClick={() => setBrowsing(true)} />
        <div><h1>管理译本</h1><p>SATLI lite <span>· 已下载 {downloaded} · 已启用 {enabled}</span></p></div>
      </div>
      <div className="satli-actions">
        <Button className="satli-catalog-refresh" variant="text" icon="refresh" title="刷新翻译库" aria-label="刷新翻译库" disabled={view.busy}
          onClick={() => { void runtime.refresh().catch(ignoreError); }}><span>刷新翻译库</span></Button>
        <Button variant="icon" icon="close" aria-label="关闭成就翻译" onClick={onClose} />
      </div>
    </header>
    <div className="satli-workspace-content">
      <GameBrowser view={view} appId={appId} onSelect={selectGame} onRescan={() => { void runtime.scanLibrary().catch(ignoreError); }} />
      {appId ? <TranslationDetails key={`${appId}:${importGeneration}`} appId={appId} runtime={runtime} view={view} />
        : <section className="satli-workspace-empty" aria-label="开始使用">
          <Icon name="library" />
          <h2>{view.catalog ? '选择一个游戏' : '浏览社区成就翻译'}</h2>
          <p>{view.catalog ? '查看不同译本，选择语言并应用到 Steam。' : '刷新翻译库后即可选择游戏，已下载的译本可离线使用。'}</p>
          {!view.catalog && <Button variant="filled" icon="refresh" disabled={view.busy} onClick={() => { void runtime.refresh().catch(ignoreError); }}>刷新翻译库</Button>}
        </section>}
    </div>
    <footer className={`satli-workspace-footer ${view.messageTone === 'error' ? 'has-error' : ''}`}>
      <ImportTranslation runtime={runtime} language={view.state.settings.language} busy={view.busy} onImported={id => {
        selectGame(id);
        setImportGeneration(value => value + 1);
      }} />
      <RuntimeStatus view={view} />
    </footer>
  </div>;
}
