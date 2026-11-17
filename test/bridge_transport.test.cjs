const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { createBridgeSnapshotLoader } = require('../shared/bridge_transport.ts');

function manifest(token, chunks, bytes = Buffer.byteLength(chunks.join(''))) {
  return { transport: 'satli-bridge-chunks-v1', token, count: chunks.length, bytes };
}

test('reassembles UTF-8 snapshots and caches a token', async () => {
  const chunks = ['{"title":"', '成就"}'];
  let reads = 0;
  const load = createBridgeSnapshotLoader(async () => manifest('one', chunks), async (_, index) => {
    reads++;
    return chunks[index - 1];
  });
  assert.equal(await load(), chunks.join(''));
  assert.equal(await load(), chunks.join(''));
  assert.equal(reads, 2);
});

test('rejects incomplete snapshots and invalid manifests', async () => {
  const chunks = ['{}'];
  const incomplete = createBridgeSnapshotLoader(async () => manifest('one', chunks, 3), async () => chunks[0]);
  await assert.rejects(incomplete(), /Incomplete/);
  const invalid = createBridgeSnapshotLoader(async () => ({ transport: 'satli-bridge-chunks-v1', token: '', count: 1, bytes: 2 }), async () => '{}');
  await assert.rejects(invalid(), /manifest/);
});

test('direct snapshots clear the cache before the same token returns', async () => {
  const chunks = ['{}'];
  let current = manifest('one', chunks);
  let reads = 0;
  const load = createBridgeSnapshotLoader(async () => current, async () => { reads++; return chunks[0]; });
  await load();
  current = { games: [] };
  assert.deepEqual(await load(), current);
  current = manifest('one', chunks);
  await load();
  assert.equal(reads, 2);
});
