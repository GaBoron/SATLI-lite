import { definePlugin, ModalRoot, showModal } from 'millennium';
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
    const close = (): void => modal.Close();
    const modal = showModal(<ModalRoot className="satli-lite-modal" bAllowFullSize bHideCloseIcon onCancel={close} onEscKeypress={close} closeModal={close}>
      <TranslationPanel runtime={runtime} initialAppId={appId} onClose={close} />
    </ModalRoot>, window, { strTitle: 'SATLI lite', bNeverPopOut: true, bHideActionIcons: true, fnOnClose: () => modals.delete(modal) });
    modals.add(modal);
    console.debug('SATLI lite translation manager opened');
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
