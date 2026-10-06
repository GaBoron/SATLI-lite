import { ModalRoot, showModal } from 'millennium';
import { PluginRuntime } from './plugin_runtime';
import { TranslationPanel } from './translation_panel';

type ModalHandle = { Close: () => void; ClosedPromise?: Promise<void> };

function screenExtent(available: number, full: number, minimum: number, fallback: number): number {
  return [available, full].find(value => Number.isFinite(value) && value >= minimum) ?? fallback;
}

/** Adapt Steam's inline and popup dialogs to one owned, idempotent lifetime. */
export function createTranslationModal(runtime: PluginRuntime) {
  let activeClose: (() => boolean) | undefined;
  let disposed = false;

  const open = (appId?: string): void => {
    if (disposed) return;
    activeClose?.();
    // The plugin's entry window owns Millennium's registered popup manager.
    // findSP can return another render target whose modal overlay is not visible.
    const parent = window;
    const screen = parent.screen;
    // Millennium may expose a synthetic 1x1 Screen in the plugin context.
    // Ignore invalid extents rather than shrinking a native popup to one pixel.
    const popupWidth = Math.min(1120, screenExtent(screen.availWidth, screen.width, 320, 1168) - 48);
    const popupHeight = Math.min(780, screenExtent(screen.availHeight, screen.height, 240, 844) - 64);
    let handle: ModalHandle | undefined;
    let released = false;
    let closeRequested = false;
    const release = (): void => {
      if (released) return;
      released = true;
      if (activeClose === close) activeClose = undefined;
      console.log('SATLI lite translation manager closed');
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
      console.log(`SATLI lite translation manager opened host=entry size=${popupWidth}x${popupHeight}`);
    } catch (error) {
      release();
      console.error('SATLI lite translation manager open failed', error instanceof Error ? error.message : 'Steam dialog unavailable');
      throw error;
    }
  };

  return { open, dispose: (): void => { disposed = true; activeClose?.(); } };
}
