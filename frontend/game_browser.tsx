import { useEffect, useMemo, useRef, useState } from 'react';
import { ViewState } from '../shared/library_types';
import { installedCatalogApps } from './steam_library';
import { Button, Icon, SearchField } from './ui_controls';

export function GameBrowser({ view, appId, onSelect }: { view: ViewState; appId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [limit, setLimit] = useState(80);
  const activeButton = useRef<HTMLButtonElement>(null);
  const entries = useMemo(() => {
    const games = new Map(Object.entries(view.catalog?.catalog.games ?? {}).map(([id, game]) => [id, game.name]));
    for (const entry of Object.values(view.state.apps)) if (!games.has(entry.app_id)) games.set(entry.app_id, entry.name);
    return [...games].sort((a, b) => a[1].localeCompare(b[1], 'zh-CN', { numeric: true }));
  }, [view.catalog, view.state.apps]);
  const installedApps = installed ? installedCatalogApps(entries.map(([id]) => id)) : undefined;
  const installedSet = new Set(installedApps);
  const games = entries.filter(([id, name]) => (!downloaded || Boolean(view.state.apps[id]))
    && (!installed || installedSet.has(id)) && `${id} ${name}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => { setLimit(80); }, [query, downloaded, installed]);
  useEffect(() => {
    const index = entries.findIndex(([id]) => id === appId);
    if (index >= 80) setLimit(value => Math.max(value, Math.ceil((index + 1) / 80) * 80));
  }, [appId, entries]);
  useEffect(() => { activeButton.current?.scrollIntoView({ block: 'nearest' }); }, [appId, limit]);

  return <aside className="satli-browser" aria-label="游戏列表">
    <div className="satli-browser-controls">
      <SearchField label="搜索游戏" placeholder="游戏名或 App ID" value={query} onChange={setQuery} />
      <div className="satli-filters" aria-label="筛选游戏">
        <button type="button" className="satli-filter" aria-pressed={downloaded} onClick={() => setDownloaded(!downloaded)}>
          {downloaded && <Icon name="check" />}已下载
        </button>
        <button type="button" className="satli-filter" aria-pressed={installed} onClick={() => setInstalled(!installed)}>
          {installed && <Icon name="check" />}已安装
        </button>
      </div>
      <div className="satli-browser-count"><span>{games.length} 个游戏</span>{!view.catalog && <span>本地译本</span>}</div>
    </div>
    <nav className="satli-game-list" aria-label="选择游戏">
      {games.slice(0, limit).map(([id, name]) => {
        const entry = view.state.apps[id];
        return <button type="button" key={id} ref={appId === id ? activeButton : undefined} className="satli-game" aria-current={appId === id ? 'true' : undefined} onClick={() => onSelect(id)}>
          <span className="satli-game-monogram" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>
          <span className="satli-game-copy"><span className="satli-game-name">{name}</span><small>App {id}</small></span>
          {entry && <span className={`satli-game-marker ${entry.enabled && view.state.settings.enabled ? 'is-enabled' : ''}`}
            title={entry.enabled && view.state.settings.enabled ? '翻译已启用' : '已下载，当前停用'}><Icon name="check" /></span>}
        </button>;
      })}
      {games.length === 0 && <div className="satli-list-empty"><Icon name="search" />
        <strong>{installed && !installedApps ? '暂时无法读取已安装游戏' : '没有匹配的游戏'}</strong>
        <p>{!view.catalog ? '刷新翻译库后可浏览社区译本。' : '试试其他关键词，或取消筛选。'}</p>
        {(query || downloaded || installed) && <Button variant="text" onClick={() => { setQuery(''); setDownloaded(false); setInstalled(false); }}>清除筛选</Button>}
      </div>}
      {games.length > limit && <Button variant="text" className="satli-show-more" onClick={() => setLimit(limit + 80)}>显示更多（还有 {games.length - limit} 个）</Button>}
    </nav>
  </aside>;
}
