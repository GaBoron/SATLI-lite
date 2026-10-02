import { useRef, useState } from 'react';
import { PluginRuntime } from './plugin_runtime';
import { Button } from './ui_controls';

export async function exportTranslationFile(runtime: PluginRuntime, appId: string): Promise<void> {
  const data = await runtime.export(appId);
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `UserGameStatsSchema_${appId}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportTranslation({ runtime, language, busy, onImported }: {
  runtime: PluginRuntime; language: string; busy: boolean; onImported: (appId: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  return <div className="satli-import">
    <Button variant="text" icon="upload" disabled={busy || reading} onClick={() => input.current?.click()}>导入本地译本</Button>
    <input ref={input} type="file" accept=".json,application/json" className="satli-file-input" aria-label="导入翻译 JSON" tabIndex={-1}
      onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 32 * 1024 * 1024) { setMessage('文件超过 32 MiB'); return; }
        setMessage('');
        setReading(true);
        void file.text().then(async text => {
          const metadata = JSON.parse(text) as { app_id: string; languages?: string[] };
          const targetLanguage = Array.isArray(metadata.languages) && !metadata.languages.includes(language) ? metadata.languages[0] || language : language;
          await runtime.import(text, targetLanguage);
          onImported(metadata.app_id);
        }).catch(() => {
          setMessage('导入失败，请检查 JSON 格式');
          console.warn('SATLI lite import file failed');
        }).finally(() => setReading(false));
      }} />
    {message && <span className="satli-field-error" role="status">{message}</span>}
  </div>;
}
