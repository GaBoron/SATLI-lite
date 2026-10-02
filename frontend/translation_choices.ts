import { Game, InstalledTranslation, TranslationDocument, Variant } from '../shared/library_types';

export function translationVariants(game?: Game, installed?: InstalledTranslation): Array<{ id: string; label: string }> {
  const variants = Object.entries(game?.variants ?? {}).sort(([a], [b]) =>
    a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b));
  const choices = variants.map(([id, value]) => ({ id, label: value.label?.zh || value.label?.en || (id === 'default' ? '默认译本' : id) }));
  if (installed && !choices.some(choice => choice.id === installed.variant_id)) {
    choices.push({ id: installed.variant_id, label: `本地译本（${installed.variant_id}）` });
  }
  return choices;
}

export function selectedVariant(requested: string, choices: Array<{ id: string }>): string {
  return choices.some(choice => choice.id === requested) ? requested : choices[0]?.id || 'default';
}

export function translationLanguages(variant?: Variant, preview?: TranslationDocument, localPreview = false, fallback = 'schinese'): string[] {
  return (localPreview ? preview?.languages : variant?.languages) ?? preview?.languages ?? [fallback];
}

export function selectedLanguage(preferred: string, languages: string[]): string {
  return languages.includes(preferred) ? preferred : languages[0] || '';
}
