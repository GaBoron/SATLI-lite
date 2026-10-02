export function installedCatalogApps(appIds: string[]): string[] | undefined {
  const store = window.appStore;
  if (!store || typeof store.GetAppOverviewByAppID !== 'function') return undefined;
  return appIds.filter(appId => {
    try { return store.GetAppOverviewByAppID(Number(appId))?.local_per_client_data?.installed === true; }
    catch { return false; }
  });
}
