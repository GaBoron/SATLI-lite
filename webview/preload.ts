import { DisplayOverrideController } from '../shared/display_override';

declare global { interface Window { __satliLiteDisplay?: DisplayOverrideController } }

export default async function main() {
  window.__satliLiteDisplay?.stop();
  const controller = new DisplayOverrideController(document, () => backend.getBridgeSnapshot(), async () => 'satli');
  window.__satliLiteDisplay = controller;
  await controller.start();
  window.addEventListener('pagehide', () => controller.stop(), { once: true });
}
