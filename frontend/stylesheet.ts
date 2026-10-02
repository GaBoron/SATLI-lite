import { STYLE } from '../.generated/styles';

export function attachStylesheet(doc: Document): () => void {
  const style = doc.createElement('style');
  style.dataset.satliLite = 'stylesheet';
  style.textContent = STYLE;
  (doc.head || doc.documentElement).append(style);
  return () => style.remove();
}
