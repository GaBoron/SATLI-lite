import { useEffect, useMemo, useRef, useState } from 'react';
import { ViewState } from '../shared/library_types';
import { incompleteLibraryScan } from './steam_library';
import { Button, Icon, SearchField } from './ui_controls';

export function GameBrowser({ view, appId, onSelect, onRescan }: {
  view: ViewState; appId: string; onSelect: (id: string) => void; onRescan: () => void;
}) {
  const [query, setQuery] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [owned, setOwned] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [limit, setLimit] = useState(80);
  const activeButton = useRef<HTMLButtonElement>(null);
  const entries = useMemo(() => {
    const games = new Map(Object.entries(view.catalog?.catalog.games ?? {}).map(([id, game]) => [id, game.name]));
    for (const entry of Object.values(view.state.apps)) if (!games.has(entry.app_id)) games.set(entry.app_id, entry.name);
    return [...games].sort((a, b) => a[1].localeCompare(b[1], 'zh-CN', { numeric: true }));
  }, [view.catalog, view.state.apps]);
  const inventory = view.steamLibrary;
  const installedSet = useMemo(() => new Set(inventory?.apps.map(app => app.app_id)), [inventory]);
  const librarySet = useMemo(() => new Set(view.libraryAppIds), [view.libraryAppIds]);
  const games = useMemo(() => entries.filter(([id, name]) => (!downloaded || Boolean(view.state.apps[id]))
    && (!owned || librarySet.has(id)) && (!installed || installedSet.has(id))
    && `${id} ${name}`.toLowerCase().includes(query.trim().toLowerCase())), [entries, downloaded, view.state.apps, owned, librarySet, installed, installedSet, query]);
  useEffect(() => { setLimit(80); }, [query, downloaded, owned, installed]);
  useEffect(() => {
    const index = games.findIndex(([id]) => id === appId);
    if (index >= 80) setLimit(value => Math.max(value, Math.ceil((index + 1) / 80) * 80));
  }, [appId, games]);
  useEffect(() => { activeButton.current?.scrollIntoView({ block: 'nearest' }); }, [appId, limit]);

  return <aside className="satli-browser" aria-label="游戏列表">
    <div className="satli-browser-controls">
      <SearchField label="搜索游戏" placeholder="游戏名或 App ID" value={query} onChange={setQuery} />
      <div className="satli-browser-filters" aria-label="筛选游戏">
        <button type="button" className="satli-browser-filter" aria-pressed={!downloaded && !owned && !installed}
          onClick={() => { setDownloaded(false); setOwned(false); setInstalled(false); }}>全部<span>{entries.length}</span></button>
        <button type="button" className="satli-browser-filter" aria-pressed={owned} onClick={() => { setOwned(!owned); if (!owned && !view.busy) onRescan(); }}>
          我的库存{view.libraryAppIds && <span>{entries.filter(([id]) => librarySet.has(id)).length}</span>}
        </button>
        <button type="button" className="satli-browser-filter" aria-pressed={downloaded} onClick={() => setDownloaded(!downloaded)}>
          已下载<span>{Object.keys(view.state.apps).length}</span>
        </button>
      </div>
      <div className="satli-browser-count">
        <span>{games.length} 个游戏{owned && <span> · 已收录译本</span>}</span>
        <div className="satli-browser-tools">
          <button type="button" className="satli-installed-filter" aria-pressed={installed} onClick={() => { setInstalled(!installed); if (!installed && !view.busy) onRescan(); }}>只看已安装</button>
          {(owned || installed) && <Button variant="icon" icon="refresh" title="重新识别库存游戏" aria-label="重新识别库存游戏" disabled={view.busy} onClick={onRescan} />}
        </div>
      </div>
      {installed && (view.steamLibraryError || inventory && incompleteLibraryScan(inventory)) &&
        <p className="satli-library-warning" role="status">{view.steamLibraryError ? '安装清单读取失败，可重新扫描。' : '部分库目录或清单未能读取，当前列表可能不完整。'}</p>}
    </div>
    <nav className="satli-game-list" aria-label="选择游戏">
      {games.slice(0, limit).map(([id, name]) => {
        const entry = view.state.apps[id];
        return <button type="button" key={id} ref={appId === id ? activeButton : undefined} className="satli-game" aria-current={appId === id ? 'true' : undefined} onClick={() => onSelect(id)}>
          <span className="satli-game-copy"><span className="satli-game-name" title={name}>{name}</span><small>App {id}
            {entry ? ` · ${entry.enabled && view.state.settings.enabled ? '翻译已启用' : '译本已下载'}` : !view.catalog?.catalog.games[id] ? ' · 未收录译本' : ''}
          </small></span>
          {entry && <span className={`satli-game-marker ${entry.enabled && view.state.settings.enabled ? 'is-enabled' : ''}`}
            title={entry.enabled && view.state.settings.enabled ? '翻译已启用' : '已下载，当前停用'}><Icon name="check" /></span>}
        </button>;
      })}
      {games.length === 0 && <div className="satli-list-empty"><Icon name="search" />
        <strong>{owned && !view.libraryAppIds ? '暂时无法读取 Steam 库存' : installed && !inventory ? '暂时无法读取已安装游戏' : '没有匹配的游戏'}</strong>
        <p>{!view.catalog ? '刷新翻译库后可浏览社区译本。' : '试试其他关键词，或取消筛选。'}</p>
        {(owned && !view.libraryAppIds || installed && !inventory) && <Button variant="outlined" disabled={view.busy} onClick={onRescan}>重新识别</Button>}
        {(query || downloaded || owned || installed) && <Button variant="text" onClick={() => { setQuery(''); setDownloaded(false); setOwned(false); setInstalled(false); }}>清除筛选</Button>}
      </div>}
      {games.length > limit && <Button variant="text" className="satli-show-more" onClick={() => setLimit(limit + 80)}>显示更多（还有 {games.length - limit} 个）</Button>}
    </nav>
  </aside>;
}
