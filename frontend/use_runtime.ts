import { useSyncExternalStore } from 'react';
import { PluginRuntime } from './plugin_runtime';

export function useRuntime(runtime: PluginRuntime) {
  return useSyncExternalStore(runtime.subscribe, runtime.snapshot, runtime.snapshot);
}
