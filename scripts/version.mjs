import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = readFileSync(join(root, 'millennium.toml'), 'utf8');
export const version = manifest.match(/^version\s*=\s*"(\d+\.\d+\.\d+)"\s*$/m)?.[1];
if (!version) throw new Error('millennium.toml must contain a three-part version');
mkdirSync(join(root, '.generated'), { recursive: true });
writeFileSync(join(root, '.generated/version.ts'), `export const PLUGIN_VERSION = '${version}';\n`);
writeFileSync(join(root, 'backend/generated_version.lua'), `return "${version}"\n`);
const styles = ['styles.css', 'game_browser.css', 'translation_workspace.css', 'translation_preview.css', 'settings.css']
  .map(file => readFileSync(join(root, 'frontend', file), 'utf8')).join('\n');
writeFileSync(join(root, '.generated/styles.ts'), `export const STYLE = ${JSON.stringify(styles)};\n`);
