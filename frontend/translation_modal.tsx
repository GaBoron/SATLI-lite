import { findSP, ModalRoot, showModal } from 'millennium';
import { PluginRuntime } from './plugin_runtime';
import { TranslationPanel } from './translation_panel';

type ModalHandle = { Close: () => void; ClosedPromise?: Promise<void> };

/** Adapt Steam's inline and popup dialogs to one owned, idempotent lifetime. */
export function createTranslationModal(runtime: PluginRuntime) {
  let activeClose: (() => boolean) | undefined;
  let disposed = false;

  const open = (appId?: string): void => {
    if (disposed) return;
    activeClose?.();
    let parent: Window = window;
    try { parent = findSP() || window; } catch { /* Use the current Steam context during startup. */ }
    const screen = parent.screen;
    const popupWidth = Math.max(1, Math.min(1120, (screen.availWidth || screen.width || 1200) - 48));
    const popupHeight = Math.max(1, Math.min(780, (screen.availHeight || screen.height || 860) - 64));
    let handle: ModalHandle | undefined;
    let released = false;
    let closeRequested = false;
    const release = (): void => {
      if (released) return;
      released = true;
      if (activeClose === close) activeClose = undefined;
      console.debug('SATLI lite translation manager closed');
    };
    const close = (): boolean => {
      if (!released) {
        closeRequested = true;
        release();
        handle?.Close();
      }
      // Steam GenericDialog calls its injected closeModal when onCancel is falsy.
      return true;
    };
    activeClose = close;
    try {
      // Do not supply closeModal: Steam calls the original prop again in fnOnClose.
      handle = showModal(<ModalRoot className="satli-lite-modal" modalClassName="satli-lite-modal-host"
        bAllowFullSize bHideCloseIcon onCancel={close} aria-label="管理译本">
        <TranslationPanel runtime={runtime} initialAppId={appId} onClose={close} />
      </ModalRoot>, parent, {
        strTitle: 'SATLI lite · 管理译本', bNeverPopOut: true, bHideActionIcons: true,
        popupWidth, popupHeight, fnOnClose: release,
      });
      if (closeRequested) handle.Close();
      // Native handles expose this for inline dismissals too; the SDK type omits it.
      void handle.ClosedPromise?.then(release);
      console.debug(`SATLI lite translation manager opened size=${popupWidth}x${popupHeight}`);
    } catch (error) {
      release();
      throw error;
    }
  };

  return { open, dispose: (): void => { disposed = true; activeClose?.(); } };
}
