import { DisplayOverrideController } from '../shared/display_override';

declare global { interface Window { __satliLiteDisplay?: DisplayOverrideController } }

export default async function main() {
  window.__satliLiteDisplay?.stop();
  let lastMetrics = '';
  const controller = new DisplayOverrideController(document, () => backend.getBridgeSnapshot(), async () => 'satli', metrics => {
    const summary = `apps=${metrics.appCount} sources=${metrics.sourceCount} replaced=${metrics.replacedCount}`;
    if (summary !== lastMetrics) {
      console.debug('SATLI lite web display scan', window.location.hostname, summary);
      lastMetrics = summary;
    }
  });
  window.__satliLiteDisplay = controller;
  await controller.start();
  console.debug('SATLI lite web display attached', window.location.hostname);
  window.addEventListener('pagehide', () => controller.stop(), { once: true });
}
