import { CatalogSnapshot } from '../shared/library_types';
import { SteamLibrarySnapshot } from '../shared/steam_library_types';
import { findModuleExport } from 'millennium';

type LibraryStore = Pick<Window['appStore'], 'GetAppOverviewByAppID'>;

export function catalogLibraryApps(appIds: string[]): string[] | undefined {
  try {
    // Plugin globals and Steam's main window need not share the same Window.
    const store = window.appStore ?? findModuleExport(value => value && typeof value.GetAppOverviewByAppID === 'function') as LibraryStore | undefined;
    if (!store || typeof store.GetAppOverviewByAppID !== 'function') return undefined;
    // This is the same membership flag Steam uses for appStore.allApps.
    // Keep games in the local library even when they have not been installed.
    return appIds.filter(id => store.GetAppOverviewByAppID(Number(id))?.visible_in_game_list === true);
  } catch { return undefined; }
}

export function catalogTranslationApps(appIds: string[], catalog: CatalogSnapshot | undefined, language: string) {
  const games = catalog?.catalog.games ?? {};
  const collected = appIds.filter(id => Boolean(games[id]));
  const downloadable = collected.filter(id => {
    const variant = games[id].variants.default;
    return Boolean(variant?.json && variant.languages.includes(language));
  });
  return { collected: collected.length, appIds: downloadable };
}

export function incompleteLibraryScan(inventory: SteamLibrarySnapshot): boolean {
  return inventory.unavailable_libraries > 0 || inventory.unreadable_manifests > 0 || inventory.library_metadata_unreadable;
}
