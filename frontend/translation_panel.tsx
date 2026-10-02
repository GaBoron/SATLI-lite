import { useEffect, useRef, useState } from 'react';
import { Game, LANGUAGE_NAMES, TranslationDocument } from '../shared/library_types';
import { PluginRuntime } from './plugin_runtime';
import { TranslationPreview } from './translation_preview';
import { useRuntime } from './use_runtime';
import { installedCatalogApps } from './steam_library';

const ignoreError = (): void => undefined;

export function TranslationPanel({ runtime, initialAppId = '' }: { runtime: PluginRuntime; initialAppId?: string }) {
  const view = useRuntime(runtime);
  const [appId, setAppId] = useState(initialAppId);
  const [query, setQuery] = useState('');
  const [variantId, setVariantId] = useState('default');
  const [language, setLanguage] = useState(view.state.settings.language);
  const [preview, setPreview] = useState<TranslationDocument>();
  const [localPreview, setLocalPreview] = useState(false);
  const activeSelection = useRef({ appId, variantId });
  activeSelection.current = { appId, variantId };
  const [onlyManaged, setOnlyManaged] = useState(false);
  const [onlyInstalled, setOnlyInstalled] = useState(false);
  const game = view.catalog?.catalog.games[appId];
  const installed = view.state.apps[appId];
  const variant = game?.variants[variantId];
  const languages = (localPreview && preview ? preview.languages : variant?.languages) ?? preview?.languages ?? [installed?.language || view.state.settings.language];
  const selectedLanguage = languages.includes(language) ? language : languages[0];
  const [fileMessage, setFileMessage] = useState('');
  const entries: [string, Game][] = Object.entries(view.catalog?.catalog.games ?? {});
  if (onlyManaged) {
    for (const entry of Object.values(view.state.apps)) {
      if (!entries.some(([id]) => id === entry.app_id)) entries.push([entry.app_id, {
        name: entry.name, contributors: [], updated_at: '', variants: {},
      }]);
    }
  }
  const installedApps = onlyInstalled ? new Set(installedCatalogApps(entries.map(([id]) => id)) ?? []) : undefined;
  const games = entries.filter(([id, item]) => (!onlyManaged || view.state.apps[id]) && (!installedApps || installedApps.has(id))
    && `${id} ${item.name}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setPreview(undefined);
    setLocalPreview(false);
    const current = runtime.snapshot().state.apps[appId];
    setVariantId(current?.variant_id || 'default');
    setLanguage(current?.language || runtime.snapshot().state.settings.language);
  }, [appId, runtime]);

  const loadInstalled = async (): Promise<void> => {
    const data = await runtime.export(appId);
    if (activeSelection.current.appId === data.app_id) { setPreview(data); setLocalPreview(true); }
  };
  const exportFile = async (): Promise<void> => {
    const data = await runtime.export(appId);
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `UserGameStatsSchema_${appId}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div data-satli-lite="panel" className="satli-lite-panel">
    <div className="satli-lite-toolbar">
      <input placeholder="搜索游戏名或 App ID" aria-label="搜索游戏" value={query} onChange={event => setQuery(event.target.value)} />
      <label><input type="checkbox" checked={onlyManaged} onChange={event => setOnlyManaged(event.target.checked)} />已下载</label>
      <label><input type="checkbox" checked={onlyInstalled} onChange={event => setOnlyInstalled(event.target.checked)} />已安装</label>
      <button disabled={view.busy} onClick={() => { void runtime.refresh().catch(ignoreError); }}>刷新翻译库</button>
    </div>
    {!view.catalog && <p>首次使用请刷新翻译库。已下载的翻译可离线使用。</p>}
    <div className="satli-lite-columns">
      <nav aria-label="游戏列表" className="satli-lite-game-list">
        {games.slice(0, 300).map(([id, item]) => <button key={id} className={appId === id ? 'selected' : ''} onClick={() => setAppId(id)}>
          <span>{item.name}</span><small>{id}{view.state.apps[id] ? ' · 已下载' : ''}</small>
        </button>)}
        {games.length > 300 && <p>请搜索以缩小列表。</p>}
      </nav>
      <section className="satli-lite-detail">
        {appId ? <>
          <h3>{game?.name || installed?.name || `App ${appId}`}</h3>
          {game?.status && game.status !== 'current' && <p className="satli-lite-warning">{game.status === 'outdated' ? '社区标记此译本可能过期。' : '社区标记此译本可能不生效。'}</p>}
          {game ? <>
            <div className="satli-lite-toolbar">
              <select aria-label="译本版本" value={variantId} onChange={event => { setVariantId(event.target.value); setPreview(undefined); setLocalPreview(false); }}>
                {Object.entries(game.variants).map(([id, item]) => <option key={id} value={id}>{item.label?.zh || (id === 'default' ? '默认译本' : id)}</option>)}
                {installed && !game.variants[installed.variant_id] && <option value={installed.variant_id}>本地译本（{installed.variant_id}）</option>}
              </select>
              <select aria-label="翻译语言" value={selectedLanguage} onChange={event => setLanguage(event.target.value)}>
                {languages.map(item => <option key={item} value={item}>{LANGUAGE_NAMES[item] || item}</option>)}
              </select>
              <span>{variant?.achievements ?? 0} 项成就</span>
            </div>
            {variant?.description?.zh && <p>{variant.description.zh}</p>}
            {!variant?.json && <p className="satli-lite-warning">当前数据源尚未发布 JSON 文件，请更新翻译库。</p>}
            <div className="satli-lite-toolbar">
              <button disabled={view.busy || !variant?.json} onClick={() => { void runtime.preview(appId, variantId).then(data => {
                if (activeSelection.current.appId === data.app_id && activeSelection.current.variantId === data.variant_id) { setPreview(data); setLocalPreview(false); }
              }).catch(ignoreError); }}>预览译本</button>
              <button className="primary" disabled={view.busy || !variant?.json || !selectedLanguage} onClick={() => { void runtime.install(appId, variantId, selectedLanguage).then(loadInstalled).catch(ignoreError); }}>{installed ? '应用所选译本' : '下载并应用'}</button>
              {installed && variant && installed.source_sha256 !== variant.sha256 && <span>有新版译本</span>}
            </div>
            <p className="satli-lite-attribution">贡献者：{Array.isArray(game.contributors) ? game.contributors.join('、') : ''} · <a href={`https://github.com/GaBoron/steam-achievement-translation-library/tree/main/files/${appId}/${variantId}`} target="_blank" rel="noreferrer">翻译来源</a></p>
          </> : <p>翻译库未收录此游戏。可以导入已制作好的 JSON，或<a href="https://github.com/GaBoron/steam-achievement-translation-library/issues/new?template=translation_petition_zh.yml" target="_blank" rel="noreferrer">请求翻译</a>。</p>}
          {installed && <>
            <p>{installed.enabled ? '翻译已启用' : '已恢复原文'} · {LANGUAGE_NAMES[installed.language] || installed.language}{installed.local_edits ? ' · 含本地编辑' : ''}</p>
            <div className="satli-lite-toolbar">
              <button disabled={view.busy} onClick={() => { void runtime.toggle(appId, !installed.enabled).catch(ignoreError); }}>{installed.enabled ? '恢复原文' : '启用翻译'}</button>
              <button disabled={view.busy || !(installed.history?.length)} onClick={() => { void runtime.restore(appId).then(loadInstalled).catch(ignoreError); }}>恢复上一版</button>
              <button disabled={view.busy} onClick={() => { void loadInstalled().catch(ignoreError); }}>查看/编辑本地译本</button>
              <button disabled={view.busy} onClick={() => { void exportFile().catch(ignoreError); }}>导出 JSON</button>
              <a href="https://github.com/GaBoron/steam-achievement-translation-library/issues/new?template=outdated_report_zh.yml" target="_blank" rel="noreferrer">报告译本问题</a>
            </div>
          </>}
          {preview && <TranslationPreview key={`${preview.app_id}-${preview.variant_id}-${preview.source_sha256}`} document={preview} language={selectedLanguage}
            editable={Boolean(localPreview && installed && preview.app_id === installed.app_id && preview.variant_id === installed.variant_id && preview.source_sha256 === installed.source_sha256 && selectedLanguage === installed.language)}
            runtime={runtime} busy={view.busy} onEdited={loadInstalled} />}
        </> : <p>选择游戏以预览或下载翻译。</p>}
      </section>
    </div>
    <div className="satli-lite-toolbar">
      <label>导入翻译 JSON <input type="file" accept=".json,application/json" disabled={view.busy} onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 32 * 1024 * 1024) { setFileMessage('文件超过 32 MiB'); return; }
        void file.text().then(async text => {
          await runtime.import(text, selectedLanguage || view.state.settings.language);
          setAppId((JSON.parse(text) as TranslationDocument).app_id);
          setFileMessage('导入完成');
        }).catch(() => setFileMessage('导入失败，请检查文件格式和所选语言。'));
      }} /></label>
      <span>{fileMessage}</span>
    </div>
    <p role="status">{view.message}</p>
    <p className="satli-lite-muted">停用翻译后，已有成就卡片可能需要切换页面才能重新显示原文。Steam 更新后的覆盖范围仍需实际客户端验收。</p>
  </div>;
}
