import { DisplayOverrideController } from '../shared/display_override';
import { createBridgeSnapshotLoader } from '../shared/bridge_transport';

declare global { interface Window { __satliLiteDisplay?: DisplayOverrideController } }

export default async function main() {
  window.__satliLiteDisplay?.stop();
  let lastMetrics = '';
  const loadSnapshot = createBridgeSnapshotLoader(
    () => backend.getBridgeSnapshot(),
    (token, index) => backend.getBridgeSnapshotChunk(token, index),
  );
  const controller = new DisplayOverrideController(document, loadSnapshot, async () => 'satli', metrics => {
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
