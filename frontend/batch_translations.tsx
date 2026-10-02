import { useRef, useState } from 'react';
import { PluginRuntime } from './plugin_runtime';
import { useRuntime } from './use_runtime';
import { installedCatalogApps } from './steam_library';

export function BatchTranslations({ runtime }: { runtime: PluginRuntime }) {
  const view = useRuntime(runtime);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [ids, setIds] = useState('');
  const cancelled = useRef(false);

  const apply = async (updateOnly: boolean): Promise<void> => {
    cancelled.current = false;
    setRunning(true);
    const snapshot = runtime.snapshot();
    const targets = updateOnly ? Object.values(snapshot.state.apps).filter(entry => entry.enabled && !entry.local_edits).map(entry => entry.app_id)
      : [...new Set(ids.split(/[\s,，;；]+/).filter(id => /^[1-9]\d*$/.test(id)))];
    let completed = 0, failed = 0, skipped = 0;
    try {
      for (const appId of targets) {
        if (cancelled.current) break;
        const entry = snapshot.state.apps[appId];
        const variantId = updateOnly && entry ? entry.variant_id : 'default';
        const language = updateOnly && entry ? entry.language : snapshot.state.settings.language;
        const variant = snapshot.catalog?.catalog.games[appId]?.variants[variantId];
        if (!variant?.json || !variant.languages.includes(language) || (updateOnly && variant.sha256 === entry?.source_sha256)) { skipped++; continue; }
        setProgress(`正在处理 ${appId} · ${completed + failed + skipped}/${targets.length}`);
        try { await runtime.install(appId, variantId, language); completed++; } catch { failed++; }
      }
    } finally {
      setRunning(false);
      setProgress(`${cancelled.current ? '已停止后续下载 · ' : ''}成功 ${completed} · 失败 ${failed} · 跳过 ${skipped}`);
    }
  };

  return <div className="satli-lite-batch">
    <label>批量下载（App ID，用空格或逗号分隔）<input value={ids} onChange={event => setIds(event.target.value)} placeholder="例如 620 105600" disabled={running} /></label>
    <div className="satli-lite-toolbar">
      <button disabled={view.busy || running} onClick={() => {
        const apps = installedCatalogApps(Object.keys(view.catalog?.catalog.games ?? {}));
        if (!apps) { setProgress('暂时无法读取 Steam 游戏列表，请填写 App ID。'); return; }
        setIds(apps.join(' '));
        setProgress(`已找到 ${apps.length} 个收录且已安装的游戏`);
      }}>识别已安装游戏</button>
      <button disabled={view.busy || running || !ids.trim()} onClick={() => { void apply(false); }}>下载并应用默认译本</button>
      <button disabled={view.busy || running} onClick={() => { void apply(true); }}>更新已下载译本</button>
      {running && <button onClick={() => { cancelled.current = true; }}>停止后续下载</button>}
    </div>
    <p role="status">{progress}</p>
  </div>;
}
