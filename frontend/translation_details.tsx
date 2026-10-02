import { useEffect, useRef, useState } from 'react';
import { LANGUAGE_NAMES, TranslationDocument, ViewState } from '../shared/library_types';
import { PluginRuntime } from './plugin_runtime';
import { TranslationPreview } from './translation_preview';
import { exportTranslationFile } from './translation_files';
import { selectedLanguage, selectedVariant, translationLanguages, translationVariants } from './translation_choices';
import { Button, Icon, Notice, SwitchRow } from './ui_controls';

const ignoreError = (): void => undefined;

export function TranslationDetails({ appId, runtime, view }: { appId: string; runtime: PluginRuntime; view: ViewState }) {
  const game = view.catalog?.catalog.games[appId];
  const installed = view.state.apps[appId];
  const [variantId, setVariantId] = useState(installed?.variant_id || 'default');
  const [language, setLanguage] = useState(installed?.language || view.state.settings.language);
  const [preview, setPreview] = useState<TranslationDocument>();
  const [localPreview, setLocalPreview] = useState(false);
  const choices = translationVariants(game, installed);
  const chosenVariant = selectedVariant(variantId, choices);
  const variant = game?.variants[chosenVariant];
  const shownPreview = preview?.variant_id === chosenVariant ? preview : undefined;
  const languages = translationLanguages(variant, shownPreview, localPreview, installed?.language || view.state.settings.language);
  const chosenLanguage = selectedLanguage(language, languages);
  const selection = useRef('');
  selection.current = `${chosenVariant}:${chosenLanguage}`;
  const request = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current++; }; }, []);

  const changeVariant = (id: string): void => {
    request.current++;
    setVariantId(id);
    setPreview(undefined);
    setLocalPreview(false);
  };
  const loadLocal = async (): Promise<void> => {
    if (!mounted.current) return;
    const ticket = ++request.current;
    const data = await runtime.export(appId);
    if (!mounted.current || ticket !== request.current) return;
    setVariantId(data.variant_id);
    setLanguage(runtime.snapshot().state.apps[appId]?.language || language);
    setPreview(data);
    setLocalPreview(true);
  };
  const loadRemote = async (): Promise<void> => {
    const ticket = ++request.current;
    const data = await runtime.preview(appId, chosenVariant);
    if (!mounted.current || ticket !== request.current) return;
    setPreview(data);
    setLocalPreview(false);
  };
  const apply = async (): Promise<void> => {
    const identity = selection.current;
    await runtime.install(appId, chosenVariant, chosenLanguage);
    if (mounted.current && selection.current === identity) await loadLocal();
  };
  const restore = async (): Promise<void> => {
    const identity = selection.current;
    await runtime.restore(appId);
    if (mounted.current && selection.current === identity) await loadLocal();
  };
  const canDownload = Boolean(variant?.json && chosenLanguage);
  const hasUpdate = Boolean(installed && installed.variant_id === chosenVariant && variant && installed.source_sha256 !== variant.sha256);
  const editable = Boolean(localPreview && installed && shownPreview?.app_id === installed.app_id
    && shownPreview.variant_id === installed.variant_id && shownPreview.source_sha256 === installed.source_sha256 && chosenLanguage === installed.language);

  return <section className="satli-detail" aria-label="译本详情">
    <div className="satli-detail-heading">
      <span className="satli-eyebrow">App {appId}</span>
      <h2>{game?.name || installed?.name || `App ${appId}`}</h2>
      <div className="satli-detail-meta">
        <span>{variant?.achievements ?? (shownPreview ? Object.keys(shownPreview.achievements).length : 0)} 项成就</span>
        {game?.updated_at && <span>更新于 {game.updated_at.slice(0, 10)}</span>}
        {hasUpdate && <span className="satli-badge">译本有更新</span>}
      </div>
    </div>
    {game?.status && game.status !== 'current' && <Notice warning>
      {game.status === 'outdated' ? '社区标记此译本可能过期，请留意游戏更新。' : '社区标记此译本可能不生效。'}
    </Notice>}
    {choices.length > 0 && <div className="satli-choice-row">
      <label className="satli-field"><span>译本</span><span className="satli-select">
        <select aria-label="译本版本" value={chosenVariant} disabled={view.busy} onChange={event => changeVariant(event.target.value)}>
          {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
        </select><Icon name="chevron" />
      </span></label>
      <label className="satli-field"><span>语言</span><span className="satli-select">
        <select aria-label="翻译语言" value={chosenLanguage} disabled={view.busy} onChange={event => setLanguage(event.target.value)}>
          {languages.map(item => <option key={item} value={item}>{LANGUAGE_NAMES[item] || item}</option>)}
        </select><Icon name="chevron" />
      </span></label>
    </div>}
    {variant?.description?.zh && <p className="satli-variant-description">{variant.description.zh}</p>}
    {game ? <>
      {!variant?.json && <Notice>所选译本暂未提供下载文件，可以刷新翻译库，或查看已下载的本地译本。</Notice>}
      <div className="satli-actions satli-download-actions">
        <Button variant="filled" icon="download" disabled={view.busy || !canDownload} onClick={() => { void apply().catch(ignoreError); }}>
          {installed ? '应用所选译本' : '下载并应用'}
        </Button>
        <Button variant="outlined" icon="preview" disabled={view.busy || !canDownload} onClick={() => { void loadRemote().catch(ignoreError); }}>预览译本</Button>
      </div>
      <div className="satli-attribution">
        <span>贡献者 · {game.contributors.join('、') || '社区'}</span>
        <a href={`https://github.com/GaBoron/steam-achievement-translation-library/tree/main/files/${appId}/${chosenVariant}`}
          target="_blank" rel="noreferrer">翻译来源<Icon name="link" /></a>
      </div>
    </> : <Notice>翻译库未收录此游戏。可以导入本地译本，或<a href="https://github.com/GaBoron/steam-achievement-translation-library/issues/new?template=translation_petition_zh.yml"
      target="_blank" rel="noreferrer">请求翻译</a>。</Notice>}
    {installed && <div className="satli-local">
      <SwitchRow label={!view.state.settings.enabled ? '全局翻译已暂停' : installed.enabled ? '翻译已启用' : '使用游戏原文'}
        description={`${LANGUAGE_NAMES[installed.language] || installed.language} · ${translationVariants(game, installed).find(choice => choice.id === installed.variant_id)?.label || installed.variant_id}${installed.local_edits ? ' · 含本地编辑' : ''}`}
        checked={installed.enabled} disabled={view.busy} onChange={enabled => { void runtime.toggle(appId, enabled).catch(ignoreError); }} />
      <div className="satli-actions satli-local-actions">
        <Button variant="text" icon="edit" disabled={view.busy} onClick={() => { void loadLocal().catch(ignoreError); }}>查看 / 编辑</Button>
        <Button variant="text" icon="history" disabled={view.busy || !installed.history?.length} onClick={() => { void restore().catch(ignoreError); }}>恢复上一版</Button>
        <Button variant="text" icon="download" disabled={view.busy} onClick={() => { void exportTranslationFile(runtime, appId).catch(ignoreError); }}>导出 JSON</Button>
      </div>
    </div>}
    {shownPreview && <TranslationPreview key={`${shownPreview.app_id}-${shownPreview.variant_id}-${chosenLanguage}`} document={shownPreview}
      language={chosenLanguage} editable={editable} runtime={runtime} busy={view.busy} onEdited={loadLocal} />}
    {installed && <a className="satli-report-link" href="https://github.com/GaBoron/steam-achievement-translation-library/issues/new?template=outdated_report_zh.yml"
      target="_blank" rel="noreferrer">报告译本问题<Icon name="link" /></a>}
  </section>;
}
