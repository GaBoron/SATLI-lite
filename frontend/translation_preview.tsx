import { useState } from 'react';
import { TranslationDocument } from '../shared/library_types';
import { PluginRuntime } from './plugin_runtime';

export function TranslationPreview({ document, language, editable, runtime, busy, onEdited }: {
  document: TranslationDocument; language: string; editable: boolean;
  runtime: PluginRuntime; busy: boolean; onEdited: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const rows = Object.entries(document.achievements).filter(([apiName, row]) => {
    const target = row.translations[language];
    return `${apiName} ${target?.name} ${target?.description}`.toLowerCase().includes(query.toLowerCase());
  });
  return <div className="satli-lite-preview">
    <input aria-label="搜索成就" placeholder="搜索名称、描述或成就 ID" value={query} onChange={event => setQuery(event.target.value)} />
    <div className="satli-lite-scroll">
      {rows.slice(0, 200).map(([apiName, row]) => {
        const target = row.translations[language];
        const source = row.translations.english;
        return <article key={apiName}>
          <code>{apiName}</code>
          {editing === apiName ? <>
            <input aria-label="成就名称" value={name} onChange={event => setName(event.target.value)} />
            <textarea aria-label="成就描述" value={description} onChange={event => setDescription(event.target.value)} />
            <button disabled={busy} onClick={() => {
              void runtime.edit(document.app_id, apiName, name, description).then(async () => { setEditing(''); await onEdited(); }).catch(() => undefined);
            }}>保存</button>
            <button onClick={() => setEditing('')}>取消</button>
          </> : <>
            <strong>{target?.name || '（名称为空）'}</strong>
            <p>{target?.description || '（描述为空）'}</p>
            {language !== 'english' && source && <div className="satli-lite-original"><span>{source.name}</span><p>{source.description}</p></div>}
            {editable && <button disabled={busy} onClick={() => { setEditing(apiName); setName(target?.name || ''); setDescription(target?.description || ''); }}>编辑</button>}
          </>}
        </article>;
      })}
      {rows.length > 200 && <p>显示前 200 项，请搜索以查看其他成就。</p>}
    </div>
  </div>;
}
