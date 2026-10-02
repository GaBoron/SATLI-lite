import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// Starlight 1.1.6 re-encodes non-ASCII bytes while minifying Lua strings.
// Escape only string literals; leave the maintained source files untouched.
export function escapeLuaStrings(source) {
  const tokens = /--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g;
  const escapedBytes = value => Array.from(Buffer.from(value, 'utf8'), byte => `\\${String(byte).padStart(3, '0')}`).join('');
  return source.replace(tokens, token => {
    if (token.startsWith('--') || !/[^\x00-\x7f]/u.test(token)) return token;
    if (token.startsWith('[')) {
      const delimiter = token.match(/^\[(=*)\[/)[0];
      const content = token.slice(delimiter.length, -delimiter.length).replace(/\r\n|\n\r|\r/g, '\n').replace(/^\n/, '');
      return `"${escapedBytes(content)}"`;
    }
    return token.replace(/[^\x00-\x7f]/gu, escapedBytes);
  });
}

export function prepareLuaBuild(root) {
  const backendRoot = join(root, 'backend');
  const generatedRoot = join(root, '.generated', 'backend');
  const files = [];
  function collect(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) collect(path);
      else if (item.isFile() && item.name.endsWith('.lua')) files.push(path);
    }
  }
  collect(backendRoot);
  files.sort();
  const sources = files.map(path => {
    const name = relative(backendRoot, path);
    const output = join(generatedRoot, name);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, escapeLuaStrings(readFileSync(path, 'utf8')));
    return relative(root, output).replaceAll('\\', '/');
  });

  const config = readFileSync(join(root, 'millennium.toml'), 'utf8');
  const start = config.indexOf('[backend]');
  if (start < 0) throw new Error('Missing Lua backend configuration');
  const remainder = config.slice(start + '[backend]'.length);
  const next = remainder.search(/^\[/m);
  const end = next < 0 ? config.length : start + '[backend]'.length + next;
  const section = config.slice(start, end);
  const entry = section.match(/^entry\s*=\s*"(backend\/[^"\r\n]+\.lua)"/m)?.[1];
  if (!entry || !files.some(path => relative(root, path).replaceAll('\\', '/') === entry)) throw new Error('Missing Lua backend entry');
  const prepared = section
    .replace(/^entry\s*=\s*"[^"\r\n]+"/m, `entry = ".generated/${entry}"`)
    .replace(/^sources\s*=\s*\[[^\]]*\]/m, `sources = ${JSON.stringify(sources)}`);
  const filename = '.millennium-build.toml';
  writeFileSync(join(root, filename), config.slice(0, start) + prepared + config.slice(end));
  return filename;
}
