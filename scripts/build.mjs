// Offline self-contained build script. Uses only Node.js built-in modules.
// Compile editable CommonJS sources into a single Obsidian-loadable main.js.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = 'src/main.js';
const cssFiles = [
  "src/styles/00-foundation.css",
    "src/styles/15-swatches.css",
  "src/styles/10-editor.css",
  "src/styles/20-modal-calendar.css",
  "src/styles/21-calendar.css",
  "src/styles/30-sidebar.css",
  "src/styles/40-task-cards.css",
  "src/styles/50-dashboard.css",
  "src/styles/60-responsive.css",
  "src/styles/70-theme.css",
  "src/styles/75-material-clock.css",
  "src/styles/80-readability.css",
  "src/styles/85-badges.css"  
];
const modules = new Map();
const importRE = /\brequire\s*\(\s*(['"])(\.[^'"\n]+)\1\s*\)/g;

async function collect(id) {
  if (modules.has(id)) return;
  const source = await readFile(path.join(root, id), 'utf8');
  modules.set(id, ''); // prevent infinite loops for circular module dependencies
  let transformed = '';
  let cursor = 0;
  importRE.lastIndex = 0;
  const references = [...source.matchAll(importRE)];
  for (const match of references) {
    const relative = match[2];
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(id), relative + (relative.endsWith('.js') ? '' : '.js')));
    if (!dependency.startsWith('src/')) throw new Error(`Disallowed source import: ${relative}`);
    transformed += source.slice(cursor, match.index) + `require(${JSON.stringify(dependency)})`;
    cursor = match.index + match[0].length;
    await collect(dependency);
  }
  transformed += source.slice(cursor);
  modules.set(id, transformed);
}

await collect(entry);
const functions = [...modules.entries()].map(([id, content]) => {
  return `${JSON.stringify(id)}: function(module, exports, require) {\n${content}\n}`;
}).join(',\n');
const output = `/* Generated Persian Reminder bundle. Edit files in src/, not this file. */
'use strict';
const __prNativeRequire = require;
const __prModules = {\n${functions}\n};
const __prCache = Object.create(null);
function __prRequire(id) {
  if (!Object.prototype.hasOwnProperty.call(__prModules, id)) return __prNativeRequire(id);
  if (__prCache[id]) return __prCache[id].exports;
  const record = { exports: {} };
  __prCache[id] = record;
  __prModules[id](record, record.exports, __prRequire);
  return record.exports;
}
module.exports = __prRequire(${JSON.stringify(entry)});
`;
// مسیر خروجی: اگه env var ست شده بود، برو اونجا؛ وگرنه پیش‌فرض ریشه پروژه
const outDir = process.env.PR_OUT_DIR || root;
await mkdir(outDir, { recursive: true });

await writeFile(path.join(outDir, 'main.js'), output, 'utf8');
const styles = await Promise.all(cssFiles.map(async f => `/* SOURCE: ${f} */\n${await readFile(path.join(root, f), 'utf8')}`));
await writeFile(path.join(outDir, 'styles.css'), styles.join('\n'), 'utf8');
console.log(`Built main.js from ${modules.size} source files and styles.css from ${cssFiles.length} style files.`);
console.log(`Output → ${outDir}`);
// کپی manifest.json به پوشهٔ خروجی
const manifest = await readFile(path.join(root, 'manifest.json'), 'utf8');
await writeFile(path.join(outDir, 'manifest.json'), manifest, 'utf8');
console.log(`manifest.json → ${outDir}`);