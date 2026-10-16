import { findModuleExport } from 'millennium';
import { AchievementTranslator, translateAchievementSchema } from './achievement_payload';

interface SchemaTranslator extends AchievementTranslator {
  subscribeTranslations(listener: () => void): () => void;
}

interface SchemaQuery {
  queryKey: readonly unknown[];
  state: { data: unknown; dataUpdatedAt: number };
}

interface SchemaQueryCache {
  getAll(): SchemaQuery[];
  subscribe(listener: (event: { type: string; query: SchemaQuery }) => void): () => void;
}

interface SchemaQueryClient {
  getQueryCache(): SchemaQueryCache;
  setQueryData(key: readonly unknown[], data: unknown, options: { updatedAt: number }): unknown;
}

export function installAchievementSchemaCache(translator: SchemaTranslator): () => void {
  const client = findModuleExport(value => value
    && typeof value.getQueryCache === 'function'
    && typeof value.setQueryData === 'function') as SchemaQueryClient | undefined;
  if (!client) {
    console.debug('SATLI lite Steam achievement schema cache unavailable');
    return () => undefined;
  }

  const cache = client.getQueryCache();
  const applied = new Map<SchemaQuery, { original: unknown; translated: unknown }>();
  let writing = false;
  const write = (query: SchemaQuery, data: unknown): unknown => {
    writing = true;
    try {
      return client.setQueryData(query.queryKey, data, { updatedAt: query.state.dataUpdatedAt });
    } finally {
      writing = false;
    }
  };
  const reconcile = (query: SchemaQuery, refresh = false): void => {
    if (writing || query.queryKey[0] !== 'achievements' || query.queryKey[2] !== 'schema') return;
    const previous = applied.get(query);
    const current = query.state.data;
    if (!refresh && previous?.translated === current) return;
    const original = previous && previous.translated === current ? previous.original : current;
    const translated = translateAchievementSchema(translator, original);
    if (translated === original) {
      applied.delete(query);
      if (current !== original) write(query, original);
    } else {
      applied.set(query, { original, translated: write(query, translated) });
    }
  };
  const safelyReconcile = (query: SchemaQuery, refresh = false): void => {
    try { reconcile(query, refresh); }
    catch { console.warn('SATLI lite could not translate Steam achievement schema'); }
  };
  const unsubscribeCache = cache.subscribe(event => {
    if (event.type === 'removed') applied.delete(event.query);
    else if (event.type === 'added' || event.type === 'updated') safelyReconcile(event.query);
  });
  const unsubscribeTranslations = translator.subscribeTranslations(() => {
    for (const query of cache.getAll()) safelyReconcile(query, true);
  });
  for (const query of cache.getAll()) safelyReconcile(query);
  console.debug('SATLI lite attached to Steam grouped achievement schemas');

  return () => {
    unsubscribeCache();
    unsubscribeTranslations();
    for (const [query, entry] of applied) {
      if (query.state.data === entry.translated) write(query, entry.original);
    }
    applied.clear();
  };
}
