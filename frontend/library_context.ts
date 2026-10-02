const PLAYBAR = '[class*="appdetailsplaysection_PlayBar"], [class*="appdetailsplaysection_Container"]';

export function currentLibraryApp(doc: Document): string | undefined {
  const route = `${doc.location.pathname}${doc.location.hash}`;
  const match = route.match(/\/library\/app\/(\d+)/) ?? route.match(/\/app\/(\d+)(?:\/|$|\?)/);
  if (match) return match[1];
  const ids = new Set<string>();
  for (const link of doc.querySelectorAll<HTMLAnchorElement>('[class*="appdetails_"] a[href*="store.steampowered.com/app/"]')) {
    const id = link.href.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1];
    if (id) ids.add(id);
  }
  return ids.size === 1 ? [...ids][0] : undefined;
}

export function attachLibraryButton(doc: Document, open: (appId: string) => void): () => void {
  let button: HTMLButtonElement | undefined;
  let pending: number | undefined;
  const reconcile = (): void => {
    const appId = currentLibraryApp(doc);
    const anchor = doc.querySelector(PLAYBAR);
    if (!anchor || !appId) {
      button?.remove();
      button = undefined;
      return;
    }
    if (!button?.isConnected || button.parentElement !== anchor) {
      button?.remove();
      button = doc.createElement('button');
      button.type = 'button';
      button.className = 'satli-lite-library-button';
      button.dataset.satliLite = 'library-button';
      button.textContent = '成就翻译';
      button.addEventListener('click', () => {
        const current = currentLibraryApp(doc);
        if (current) open(current);
      });
      anchor.append(button);
    }
    button.title = `SATLI lite · App ${appId}`;
  };
  const schedule = (): void => {
    if (pending !== undefined) return;
    pending = window.setTimeout(() => { pending = undefined; reconcile(); }, 150);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(doc, { subtree: true, childList: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  const timer = window.setInterval(schedule, 1500);
  reconcile();
  return () => {
    observer.disconnect();
    window.clearInterval(timer);
    if (pending !== undefined) window.clearTimeout(pending);
    window.removeEventListener('hashchange', schedule);
    window.removeEventListener('popstate', schedule);
    button?.remove();
  };
}
