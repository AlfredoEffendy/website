// Shared page chrome for every generated page: <head> (with link-preview tags), the top bar, and inlined CSS.
// Page modules in tools/pages/*.mjs describe their own content; tools/gen-pages.mjs assembles them.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const AUTHOR = 'Alfredo Effendy';
export const EMAIL = 'aeffendy@uw.edu';
/** The site's public address, for link previews (og:url, og:image) and canonical links. */
export const SITE_URL = 'https://alfredoeffendy.github.io/website/';

/** Internal destinations, as paths from the site root (each is a folder with an index.html). */
export const ROUTES = {
  home: '',
  labs: 'stats-engine/',
  research: 'research/',
  teaching: 'teaching/',
  cv: 'cv/',
};

/** Link to a lab in Stats Engine; the default lab is the workspace's bare address. */
export const labHref = (root, slug = 'discrete') => `${root}${ROUTES.labs}${slug === 'discrete' ? '' : `?lab=${slug}`}`;

/** Browser-tab and bookmark icon: the author's initials on UW purple. */
export const ICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#4b2e83"/><text x="16" y="21.5" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="14.5" font-weight="700" fill="#fff">AE</text></svg>`,
)}`;
/** The menu mark is a summation sign; it becomes a cross when its menu is open. */
export const SIGMA = `<svg class="sigma" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path class="s-bar" d="M6 6h12"/><path class="s-bar" d="M6 18h12"/><path class="s-arm" pathLength="1" d="M6 6l12 12"/><path class="s-arm" pathLength="1" d="M6 18 18 6"/></svg>`;
/** Loading mark: bars rise, then the bell draws over them. */
export const LOADER = `<svg class="loader" viewBox="0 0 32 32" aria-hidden="true"><g><path d="M9 26v-7" style="--i:3"/><path d="M13 26V13" style="--i:1"/><path d="M16 26V9" style="--i:0"/><path d="M19 26V13" style="--i:2"/><path d="M23 26v-7" style="--i:4"/></g><path class="bell" pathLength="1" d="M2 26c6 0 8-20 14-20s8 20 14 20"/></svg>`;
/** Theme before first paint: ?theme= in the link (for testing), otherwise the system setting. */
export const THEME_BOOT = `var e=document.documentElement,q=new URLSearchParams(location.search),t=q.get('theme');e.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';`;
/** Boot script for pages other than the workspace. */
export const PAGE_BOOT = `(function(){${THEME_BOOT}e.classList.add('js')})()`;

export const minify = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?([{};,]) ?/g, '$1')
    .replace(/: /g, ':')
    .replace(/;}/g, '}')
    .trim();

/** Shared style groups, in cascade order, inlined into every page. */
export const SHARED_CSS = ['base', 'topbar', 'scroll'];

/**
 * Minified CSS for a page: the shared groups, then the named extra groups (src/styles/<name>.css).
 * `root` is the relative path from the page to the site root ('' or '../' or '../../').
 */
export function css(extra = [], root = './', transform = (s) => s) {
  const text = [...SHARED_CSS, ...extra].map((g) => readFileSync(join(ROOT, 'src/styles', `${g}.css`), 'utf8')).join('\n');
  return minify(transform(text)).replaceAll('__ROOT__', root || './');
}

/** Relative prefix from a page at `path` (e.g. 'research/index.html') back to the site root. */
export const rootOf = (path) => '../'.repeat(path.split('/').length - 1) || './';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** `path` is where the page is written (e.g. 'cv/index.html'); it gives link previews the page's public address. */
export function head({ title, description, style, boot = PAGE_BOOT, root = './', extra = '', path = 'index.html' }) {
  const url = SITE_URL + path.replace(/index\.html$/, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#4b2e83">
<meta name="author" content="${AUTHOR}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${AUTHOR}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}img/alfredo-effendy-og.jpg">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${url}">
<link rel="icon" href="${ICON}">
<script>${boot}</script>
<link rel="preload" as="font" type="font/woff2" href="${root}fonts/encode-sans-condensed-600.woff2" crossorigin>
${extra}<style>${style}</style>`;
}

/** The menu, in order: [current key, route, label]. */
const NAV = [
  ['home', ROUTES.home, 'Home'],
  ['cv', ROUTES.cv, 'C.V.'],
  ['research', ROUTES.research, 'Research'],
  ['teaching', ROUTES.teaching, 'Teaching'],
  ['labs', ROUTES.labs, 'Stats Engine'],
];

/**
 * The top bar on every page: the name (home) and five plain links; the current page's link is marked.
 * `current` is 'home' | 'cv' | 'research' | 'teaching' | 'labs'. On the workspace (`lab: true`) the Σ
 * button that opens the tab rail comes first, and a visually hidden <h1> names the page.
 */
export function topbar({ root = './', current = 'home', lab = false } = {}) {
  const here = (key) => (current === key ? ' aria-current="page"' : '');
  const sigma = lab
    ? `<button class="icon-btn nav-toggle" id="nav" type="button" aria-label="Labs" aria-expanded="false" aria-controls="tabs">${SIGMA}</button>\n`
    : '';
  return `<header class="topbar">
${sigma}<a class="brand" href="${root}${ROUTES.home}">${AUTHOR}</a>
${lab ? '<h1 class="sr">Stats Engine</h1>\n' : ''}<nav class="site-nav" aria-label="Main"><ul>${NAV.map(([key, route, label]) => `<li><a href="${root}${route}"${here(key)}>${label}</a></li>`).join('')}</ul></nav>
</header>`;
}
