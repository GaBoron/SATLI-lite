import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { root, version } from './version.mjs';
import { prepareLuaBuild } from './lua_build.mjs';

mkdirSync(join(root, 'dist'), { recursive: true });
// The npm wrapper locates the platform binary; run it through Node without a shell.
const packageInfo = JSON.parse(readFileSync(join(root, 'node_modules/@steambrew/starlight/package.json'), 'utf8'));
const bin = typeof packageInfo.bin === 'string' ? packageInfo.bin : packageInfo.bin.starlight;
const config = prepareLuaBuild(root);
for (const args of [['pack', '--release', '--config', config], ['verify', 'dist/satli-lite.star']]) {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/@steambrew/starlight', bin), ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
const data = readFileSync(join(root, 'dist/satli-lite.star'));
writeFileSync(join(root, 'dist/update.json'), JSON.stringify({
  format: 1, id: 'com.gaboron.satli-lite', version,
  asset: 'satli-lite.star', size: data.length, package_base64: data.toString('base64'),
}, null, 2) + '\n');
console.log(`Built SATLI lite ${version}: dist/satli-lite.star and dist/update.json`);
