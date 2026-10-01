// Prints what each page costs to load (compressed) and fails the build if a budget is broken.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
// gzip bytes. `first` is everything a page fetches before it is usable, fonts included
// (images inside articles load lazily and are counted separately).
// The workspace carries all seven tabs' markup inline; the owner allowed it past 20 KB when needed (2026-10-01).
const BUDGET = { html: 24_000, articleHtml: 30_000, entryJs: 20_000, lazyChunk: 8_000, allJs: 70_000, first: 115_000, image: 160_000 };

const gz = (file) => gzipSync(readFileSync(file)).length;
const br = (file) => brotliCompressSync(readFileSync(file)).length;
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** The scripts a page loads up front: its entry plus anything that entry statically imports. */
function entryScripts(htmlFile) {
  const html = readFileSync(htmlFile, 'utf8');
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:from|import)\s*["'](\.[^"']+\.js)["']/g)) visit(resolve(dirname(file), m[1]));
  };
  for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js)"|<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g))
    visit(resolve(dirname(htmlFile), m[1] ?? m[2]));
  return seen;
}

const files = walk(DIST);
const fonts = files.filter((f) => f.endsWith('.woff2'));
const fontBytes = fonts.reduce((s, f) => s + statSync(f).size, 0);
const pages = files.filter((f) => f.endsWith('.html') && basename(f) !== '404.html');
const assets = files.filter((f) => relative(DIST, f).startsWith('assets'));
const entryAll = new Set();
const problems = [];

const rows = pages.map((page) => {
  const name = '/' + relative(DIST, dirname(page)).replaceAll('\\', '/');
  const entry = entryScripts(page);
  entry.forEach((f) => entryAll.add(f));
  const html = gz(page);
  const js = [...entry].reduce((s, f) => s + gz(f), 0);
  const first = html + js + fontBytes;
  const htmlBudget = name === '/' ? BUDGET.html : BUDGET.articleHtml;
  if (html > htmlBudget) problems.push(`${name}: html ${html} > ${htmlBudget}`);
  if (js > BUDGET.entryJs) problems.push(`${name}: entry JS ${js} > ${BUDGET.entryJs}`);
  if (first > BUDGET.first) problems.push(`${name}: first load ${first} > ${BUDGET.first}`);
  // Heavy code must never leak into a first load ("data-bar" only appears in the table module).
  for (const f of entry) if (readFileSync(f, 'utf8').includes('data-bar')) problems.push(`${name}: ${basename(f)} contains the data table`);
  return { page: name, 'html+css gz': html, 'html br': br(page), 'entry js gz': js, 'first load (+fonts)': first, 'html budget': htmlBudget };
});
console.table(rows);

const lazy = assets.filter((f) => !entryAll.has(f) && /\.(js|css)$/.test(f));
console.table(lazy.map((f) => ({ 'loaded on demand': basename(f), gzip: gz(f), budget: BUDGET.lazyChunk })));
for (const f of lazy) if (gz(f) > BUDGET.lazyChunk) problems.push(`${basename(f)} ${gz(f)} > ${BUDGET.lazyChunk}`);

const allJs = assets.filter((f) => f.endsWith('.js')).reduce((s, f) => s + gz(f), 0);
console.log(`all JS ${allJs} gzip (budget ${BUDGET.allJs}); fonts ${fonts.length} files, ${fontBytes} bytes`);
if (allJs > BUDGET.allJs) problems.push(`all JS ${allJs} > ${BUDGET.allJs}`);

const images = files.filter((f) => /\.(webp|png|jpe?g|avif|svg)$/i.test(f) && !relative(DIST, f).startsWith('fonts'));
for (const f of images) if (statSync(f).size > BUDGET.image) problems.push(`${relative(DIST, f)} ${statSync(f).size} bytes > ${BUDGET.image}`);
if (images.length) console.log(`images: ${images.length}, largest ${Math.max(...images.map((f) => statSync(f).size))} bytes (budget ${BUDGET.image} each)`);

if (problems.length) {
  console.error('Size budget exceeded:\n  ' + problems.join('\n  '));
  process.exit(1);
}
