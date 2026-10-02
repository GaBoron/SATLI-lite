import { useState } from 'react';
import { TranslationDocument } from '../shared/library_types';
import { PluginRuntime } from './plugin_runtime';
import { Button, Icon, SearchField } from './ui_controls';

export function TranslationPreview({ document, language, editable, runtime, busy, onEdited }: {
  document: TranslationDocument; language: string; editable: boolean;
  runtime: PluginRuntime; busy: boolean; onEdited: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showEnglish, setShowEnglish] = useState(true);
  const [limit, setLimit] = useState(60);
  const rows = Object.entries(document.achievements).filter(([apiName, row]) => {
    const target = row.translations[language];
    const source = row.translations.english;
    return `${apiName} ${target?.name} ${target?.description} ${source?.name} ${source?.description}`.toLowerCase().includes(query.toLowerCase());
  });
  return <div className="satli-preview">
    <div className="satli-section-heading"><h3>{editable ? '本地译本' : '成就预览'}</h3><span>{rows.length} 项{editable ? ' · 可编辑' : ''}</span></div>
    <div className="satli-preview-toolbar">
      <SearchField label="搜索成就" placeholder="名称、描述或成就 ID" value={query} onChange={value => { setQuery(value); setLimit(60); }} />
      {language !== 'english' && <button type="button" className="satli-filter" aria-pressed={showEnglish} onClick={() => setShowEnglish(!showEnglish)}>
        {showEnglish && <Icon name="check" />}英文参考
      </button>}
    </div>
    <div className="satli-achievements">
      {rows.slice(0, limit).map(([apiName, row]) => {
        const target = row.translations[language];
        const source = row.translations.english;
        return <article key={apiName} className={`satli-achievement ${editing === apiName ? 'is-editing' : ''}`}>
          <div className="satli-achievement-id"><code>{apiName}</code>
            {editable && editing !== apiName && <Button variant="icon" icon="edit" aria-label={`编辑 ${target?.name || apiName}`} disabled={busy}
              onClick={() => { setEditing(apiName); setName(target?.name || ''); setDescription(target?.description || ''); }} />}
          </div>
          {editing === apiName ? <>
            <label className="satli-field"><span>成就名称</span><input value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
            <label className="satli-field"><span>成就描述</span><textarea value={description} onChange={event => setDescription(event.target.value)} disabled={busy} /></label>
            <div className="satli-actions">
              <Button variant="filled" icon="check" disabled={busy} onClick={() => {
                void runtime.edit(document.app_id, apiName, name, description).then(async () => { setEditing(''); await onEdited(); }).catch(() => undefined);
              }}>保存修改</Button>
              <Button variant="text" disabled={busy} onClick={() => setEditing('')}>取消</Button>
            </div>
          </> : <div className={`satli-achievement-text ${showEnglish && language !== 'english' && source ? 'has-reference' : ''}`}>
            <div><strong>{target?.name || '（名称为空）'}</strong><p>{target?.description || '（描述为空）'}</p></div>
            {showEnglish && language !== 'english' && source && <div className="satli-reference"><span>ENGLISH</span><strong>{source.name}</strong><p>{source.description}</p></div>}
          </div>}
        </article>;
      })}
      {rows.length === 0 && <p className="satli-muted satli-preview-empty">没有匹配的成就，试试其他关键词。</p>}
      {rows.length > limit && <Button variant="text" className="satli-show-more" onClick={() => setLimit(limit + 60)}>显示更多（还有 {rows.length - limit} 项）</Button>}
    </div>
  </div>;
}
