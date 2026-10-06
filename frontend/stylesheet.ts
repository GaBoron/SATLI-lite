import { createElement } from 'react';
import { STYLE } from '../.generated/styles';

// Steam can render plugin content in a different document from the entrypoint.
// Render styles with the panel so portals and additional windows keep them.
export function PanelStylesheet() {
  return createElement('style', { 'data-satli-lite': 'stylesheet' }, STYLE);
}

export function attachStylesheet(doc: Document): () => void {
  const style = doc.createElement('style');
  style.dataset.satliLite = 'stylesheet';
  style.textContent = STYLE;
  (doc.head || doc.documentElement).append(style);
  return () => style.remove();
}
