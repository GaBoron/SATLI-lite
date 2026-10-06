import { definePlugin } from 'millennium';
import { DisplayOverrideController } from '../shared/display_override';
import { installSteamApiOverrides } from './steam_api_override';
import { PluginRuntime } from './plugin_runtime';
import { attachLibraryButton } from './library_context';
import { createTranslationModal } from './translation_modal';
import { SettingsContent } from './settings_content';
import { attachStylesheet } from './stylesheet';

let controller: DisplayOverrideController | undefined;

/** @ffi */
export function getTranslationLanguage(): string { return 'satli'; }

/** @ffi */
export const achievementToast = {
  translate(appId: number, achievement: Record<string, unknown>): Record<string, unknown> {
    try { return controller?.translateAchievement(appId, achievement) ?? achievement; }
    catch { console.warn('SATLI lite achievement notification transform failed'); return achievement; }
  },
};

export default definePlugin(async () => {
  const runtime = new PluginRuntime();
  await runtime.initialize();
  const removeStylesheet = attachStylesheet(document);
  controller = new DisplayOverrideController(document, () => backend.getBridgeSnapshot(), async () => 'satli');
  await controller.start();
  const removeOverrides = installSteamApiOverrides(controller);
  const translations = createTranslationModal(runtime);
  const removeButton = attachLibraryButton(document, translations.open);
  runtime.startBackground(async () => { await controller?.refreshNow(); });
  console.log('SATLI lite loaded inside Steam');
  return {
    title: 'SATLI lite', icon: <span>译</span>,
    content: <SettingsContent runtime={runtime} openTranslations={() => translations.open()} />,
    onDismount: () => {
      runtime.dispose();
      removeButton();
      removeStylesheet();
      removeOverrides();
      controller?.stop();
      translations.dispose();
      controller = undefined;
    },
  };
});
