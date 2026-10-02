import { definePlugin, DialogBody, DialogHeader, ModalRoot, showModal } from 'millennium';
import { DisplayOverrideController } from '../shared/display_override';
import { installSteamApiOverrides } from './steam_api_override';
import { PluginRuntime } from './plugin_runtime';
import { attachLibraryButton } from './library_context';
import { TranslationPanel } from './translation_panel';
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
  const modals = new Set<{ Close: () => void }>();
  const openTranslations = (appId?: string): void => {
    const modal = showModal(<ModalRoot><DialogHeader>SATLI lite · 成就翻译</DialogHeader><DialogBody>
      <TranslationPanel runtime={runtime} initialAppId={appId} />
    </DialogBody></ModalRoot>, window, { strTitle: 'SATLI lite' });
    modals.add(modal);
  };
  const removeButton = attachLibraryButton(document, openTranslations);
  runtime.startBackground(async () => { await controller?.refreshNow(); });
  console.log('SATLI lite loaded inside Steam');
  return {
    title: 'SATLI lite', icon: <span>译</span>,
    content: <SettingsContent runtime={runtime} openTranslations={() => openTranslations()} />,
    onDismount: () => {
      runtime.dispose();
      removeButton();
      removeStylesheet();
      removeOverrides();
      controller?.stop();
      for (const modal of modals) modal.Close();
      modals.clear();
      controller = undefined;
    },
  };
});
