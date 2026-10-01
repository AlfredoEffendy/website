// Generates every HTML page. Each page is complete markup with its CSS inlined, so the first
// response alone paints it; scripts then attach to what is already there.
//   stats-engine/index.html    the lab workspace (tools/labs.mjs)
//   <path>/index.html          one per entry exported by tools/pages/*.mjs
//   public/404.html            self-contained, from src/404.html
// Also copies fonts and everything in static/ into public/, and writes .pages.json for Vite.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LABS, figure, seedRow } from './labs.mjs';
import { LOADER, ROOT, THEME_BOOT, css, footer, head, rootOf, topbar } from './shell.mjs';

const DEFAULT = LABS[0].slug;

// ---- assets --------------------------------------------------------------------------------
const FONTS = [
  ['@fontsource/encode-sans-condensed/files/encode-sans-condensed-latin-600-normal.woff2', 'encode-sans-condensed-600.woff2'],
  ['@fontsource/open-sans/files/open-sans-latin-400-normal.woff2', 'open-sans-400.woff2'],
  ['@fontsource/open-sans/files/open-sans-latin-600-normal.woff2', 'open-sans-600.woff2'],
];
mkdirSync(join(ROOT, 'public/fonts'), { recursive: true });
for (const [from, to] of FONTS) copyFileSync(join(ROOT, 'node_modules', from), join(ROOT, 'public/fonts', to));
// static/ holds committed files served as-is (PDFs, figures): copied verbatim.
if (existsSync(join(ROOT, 'static'))) cpSync(join(ROOT, 'static'), join(ROOT, 'public'), { recursive: true });

// Hashed build output and fonts never change at a given URL; HTML must always revalidate.
writeFileSync(
  join(ROOT, 'public/_headers'),
  `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`,
);

const write = (path, html) => {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};
const written = [];

// ---- the lab workspace ---------------------------------------------------------------------
// One rule set shows the active lab; the attribute is set before first paint by the boot script.
const on = (prefix) => LABS.map((l) => `html[data-lab="${l.slug}"] #${prefix}-${l.slug}`).join(',');
const tabRules = `${on('panel')},${on('notes')}{display:grid}${on('tab')}{color:var(--ink);background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent)}`;
const labCss = css(['lab'], '../', (s) => s.replace('/*TABS*/', tabRules));

// Phone only: opens the full settings sheet from the dock. θ is the usual symbol for "the parameters".
const MORE = `<button class="btn dock-more" type="button" aria-label="All settings" aria-expanded="false"><i>θ</i></button>`;
// Runs before first paint: theme, the active lab, and whether the tab rail shows labels.
const BOOT = `(function(){${THEME_BOOT}var l=q.get('lab'),r=null;e.dataset.lab=${JSON.stringify(LABS.map((l) => l.slug))}.indexOf(l)<0?'${DEFAULT}':l;try{r=localStorage.getItem('rail')}catch(x){}e.dataset.rail=r==='open'||r==='mini'?r:innerWidth>=1152?'open':'mini';e.classList.add('js')})()`;

const prefixIds = (slug, html) =>
  html.replace(/(?<=\s)(id|for|name|aria-describedby)="([^"]+)"/g, (_, attr, value) => `${attr}="${slug}-${value}"`);

const tab = (lab) =>
  `<button class="tab${lab.heavy ? ' heavy' : ''}" role="tab" type="button" id="tab-${lab.slug}" data-lab="${lab.slug}" data-name="${lab.full}" aria-controls="panel-${lab.slug}" aria-selected="${lab.slug === DEFAULT}" tabindex="${lab.slug === DEFAULT ? 0 : -1}" title="${lab.full}">${lab.icon}<span><small>${lab.no}</small>${lab.name}</span></button>`;

const panel = (lab) => `<section class="panel" id="panel-${lab.slug}" role="tabpanel" aria-labelledby="tab-${lab.slug}">
${prefixIds(
  lab.slug,
  `<div class="inputs">
<div><h2>${lab.full}</h2><p class="ask">${lab.ask}</p></div>
${lab.inputs}
${lab.seed ? seedRow(lab.seed) : ''}
${MORE}
</div>
<div class="output">
${figure(lab.figure, LOADER)}
${lab.between ?? ''}
<div class="stats">${lab.stats}</div>
${lab.equation}
${lab.after ?? ''}
<details class="data" id="data"><summary><span class="cap">Data</span><span class="data-hint">${lab.dataHint}</span></summary><div class="data-body" id="dataBody"></div></details>
</div>`,
)}
</section>`;

const notes = (lab) => `<section class="notes" id="notes-${lab.slug}" aria-label="About ${lab.full}">
<div><h3>See</h3><p>${lab.see}</p></div>
<div><h3>Why</h3><p>${lab.why}</p></div>
<div><h3>Try</h3><ol>${lab.steps.map((s) => `<li><span>${s}</span></li>`).join('')}</ol></div>
<div><h3>Symbols</h3><dl>${lab.glossary.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></div>
${lab.fine ? `<p class="fine">${lab.fine}</p>` : ''}</section>`;

const index = `${head({
  title: 'Stats Engine',
  description:
    'Six statistics simulations in one fast tool: distributions, sampling distributions, confidence intervals and regression, each with a live equation and exact theory. Bring your own data too.',
  style: labCss,
  boot: BOOT,
  root: '../',
})}
<noscript><style>#panel-${DEFAULT},#notes-${DEFAULT}{display:grid}</style></noscript>
</head>
<body>
<a class="skip" href="#main">Skip to the tool</a>
${topbar({ root: '../', current: 'labs', lab: true })}
<main id="main" class="app">
<div class="tabs" id="tabs" role="tablist" aria-label="Simulations" aria-orientation="vertical">
${LABS.map(tab).join('\n')}
</div>
${LABS.map(panel).join('\n')}
</main>
<div class="below">
${LABS.map(notes).join('\n')}
<noscript><p>The simulations need JavaScript.</p></noscript>
</div>
${footer()}
<script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
write('stats-engine/index.html', index);
written.push('stats-engine/index.html');

// ---- registered pages ----------------------------------------------------------------------
// Each module in tools/pages/ exports `pages`: an array (or a function returning one) of
//   { path, title, description, current, css: [...groups], body(root), entry?, extraHead? }
// `body` receives the relative path to the site root. `entry` is a module under src/ that must
// import '../site' (or the right relative path) itself; without one the page gets src/site.ts.
const pageDir = join(ROOT, 'tools/pages');
const modules = existsSync(pageDir)
  ? readdirSync(pageDir, { recursive: true }).filter((f) => String(f).endsWith('.mjs')).sort()
  : [];
for (const file of modules) {
  const mod = await import(pathToFileURL(join(pageDir, String(file))).href);
  if (!mod.pages) continue;
  const list = typeof mod.pages === 'function' ? await mod.pages() : mod.pages;
  for (const p of list) {
    const root = rootOf(p.path);
    const html = `${head({ title: p.title, description: p.description, style: css(p.css ?? [], root), root, extra: p.extraHead ?? '' })}
</head>
<body${p.bodyClass ? ` class="${p.bodyClass}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
${topbar({ root, current: p.current })}
${p.body(root)}
${footer()}
<script type="module" src="/${p.entry ?? 'src/site.ts'}"></script>
</body>
</html>
`;
    write(p.path, html);
    written.push(p.path);
  }
}

// ---- 404 -----------------------------------------------------------------------------------
// Self-contained (no external requests) because hosts serve it at any path depth.
writeFileSync(join(ROOT, 'public/404.html'), readFileSync(join(ROOT, 'src/404.html'), 'utf8'));

writeFileSync(join(ROOT, '.pages.json'), JSON.stringify(written, null, 1));
console.log(`pages: ${written.join(', ')}`);
