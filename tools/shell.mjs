// Shared page chrome for every generated page: <head>, top bar, footer, and inlined CSS.
// Page modules in tools/pages/*.mjs describe their own content; tools/gen-pages.mjs assembles them.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const AUTHOR = 'Alfredo Effendy';
export const PROFILE = 'https://econ.washington.edu/people/alfredo-effendy';
export const SITE = 'https://sites.google.com/view/alfredoeffendy';
export const EMAIL = 'aeffendy@uw.edu';

/** Internal destinations, as paths from the site root (each is a folder with an index.html). */
export const ROUTES = {
  home: '',
  research: 'research/',
  jmp: 'research/when-yield-curves-invert-together/',
  teaching: 'teaching/',
  cv: 'cv/',
};

/** The labs, in tab order, for menus on pages other than the workspace. */
export const LAB_LINKS = [
  ['discrete', 'Discrete distributions'],
  ['continuous', 'Continuous distributions'],
  ['clt-mean', 'Sampling distribution of the mean'],
  ['clt-proportion', 'Sampling distribution of the proportion'],
  ['confidence-intervals', 'Confidence intervals'],
  ['regression', 'Regression inference'],
  ['data', 'Your data'],
];

/** The logo: a bell over five bars. Bars are separate so the logo can animate (see topbar.css). */
export const MARK = `<svg class="bmark" viewBox="0 0 32 32" aria-hidden="true"><path class="bm-curve" d="M2 26c6 0 8-20 14-20s8 20 14 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" pathLength="1"/><g class="bm-bars" stroke="#85754d" stroke-width="2.4" stroke-linecap="round"><path d="M9 26v-7" style="--i:0;--lo:.45"/><path d="M13 26V13" style="--i:1;--lo:.7"/><path d="M16 26V9" style="--i:2;--lo:.38"/><path d="M19 26V13" style="--i:3;--lo:.8"/><path d="M23 26v-7" style="--i:4;--lo:.55"/></g></svg>`;
export const ICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#4b2e83"/><path d="M4 24c5 0 7-16 12-16s7 16 12 16" fill="none" stroke="#e8e3d3" stroke-width="2.6" stroke-linecap="round"/></svg>`,
)}`;
/** The menu mark is a summation sign; it becomes a cross when its menu is open. */
export const SIGMA = `<svg class="sigma" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path class="s-bar" d="M6 6h12"/><path class="s-bar" d="M6 18h12"/><path class="s-arm" pathLength="1" d="M6 6l12 12"/><path class="s-arm" pathLength="1" d="M6 18 18 6"/></svg>`;
/** Loading mark: bars rise, then the bell draws over them. */
export const LOADER = `<svg class="loader" viewBox="0 0 32 32" aria-hidden="true"><g><path d="M9 26v-7" style="--i:3"/><path d="M13 26V13" style="--i:1"/><path d="M16 26V9" style="--i:0"/><path d="M19 26V13" style="--i:2"/><path d="M23 26v-7" style="--i:4"/></g><path class="bell" pathLength="1" d="M2 26c6 0 8-20 14-20s8 20 14 20"/></svg>`;
export const THEME_ICONS = `<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>`;
/** Theme before first paint: ?theme= in the link, then the saved choice, then the system setting. */
export const THEME_BOOT = `var e=document.documentElement,q=new URLSearchParams(location.search);try{var t=q.get('theme'),s=t==='light'||t==='dark'?t:localStorage.getItem('theme');e.dataset.theme=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(x){}`;
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

export function head({ title, description, style, boot = PAGE_BOOT, root = './', extra = '' }) {
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
<link rel="icon" href="${ICON}">
<script>${boot}</script>
<link rel="preload" as="font" type="font/woff2" href="${root}fonts/encode-sans-condensed-600.woff2" crossorigin>
${extra}<style>${style}</style>`;
}

/**
 * The top bar, identical on every page: Σ menu · Stats Engine · theme · tagline · author menu.
 * `current` names the section ('labs' | 'research' | 'teaching' | 'cv') for aria-current.
 * On the workspace (`lab: true`) the Σ button controls the tab rail and the tagline is the page's <h1>;
 * elsewhere Σ opens a menu of the labs, and the tagline defaults to the section's name.
 */
export function topbar({ root = './', current = 'labs', lab = false, tagline } = {}) {
  const line =
    tagline ?? (lab ? 'Watch your formula <em>come true</em>' : { research: 'Research', teaching: 'Teaching', cv: 'C.V.' }[current] ?? '');
  const sigma = lab
    ? `<button class="icon-btn nav-toggle" id="nav" type="button" aria-label="Labs" aria-expanded="false" aria-controls="tabs">${SIGMA}</button>`
    : `<button class="icon-btn nav-toggle" id="nav" type="button" aria-label="Labs" aria-expanded="false" aria-controls="labmenu">${SIGMA}</button>
<nav class="bar-menu labmenu" id="labmenu" aria-label="Labs" hidden><ul>${LAB_LINKS.map(
        ([slug, name], i) =>
          `<li${slug === 'data' ? ' class="apart"' : ''}><a href="${root}${slug === 'discrete' ? '' : `?lab=${slug}`}"><small aria-hidden="true">${String(i + 1).padStart(2, '0')}</small>${name}</a></li>`,
      ).join('')}</ul></nav>`;
  const tag = lab ? 'h1' : 'p';
  return `<header class="topbar">
${sigma}
<a class="brand" href="${root}"${current === 'labs' ? ' aria-current="page"' : ''}>${MARK}<span>Stats Engine</span></a>
<button class="icon-btn theme-btn" id="theme" type="button" aria-label="Dark theme" aria-pressed="false">${THEME_ICONS}</button>
${line ? `<${tag} class="tagline">${line}</${tag}>` : ''}
<div class="tools">
${authorMenu(root, current)}
</div>
</header>`;
}

/**
 * "Alfredo Effendy" opens the About Me menu and folds to "A.E" while it is open: the letters after
 * each initial fold away as a period drops in. Screen readers always hear the full name.
 */
export function authorMenu(root, current) {
  const link = (key, href, text) => `<li><a href="${href}"${current === key ? ' aria-current="page"' : ''}>${text}</a></li>`;
  const [first, last] = AUTHOR.split(' ');
  const fold = (text) => `<span class="an-fold"><span>${text}</span></span>`;
  return `<div class="author">
<button class="author-btn" id="authorBtn" type="button" aria-expanded="false" aria-controls="authorMenu"><span class="sr">${AUTHOR}</span><span class="an" aria-hidden="true">${first[0]}<span class="an-dot"><span>.</span></span>${fold(`${first.slice(1)}&nbsp;`)}${last[0]}${fold(last.slice(1))}</span></button>
<nav class="bar-menu author-menu" id="authorMenu" aria-label="About me" hidden>
<div class="author-tag"><ul aria-label="Research interests"><li>International Finance</li><li>Asset Pricing, Risk Management</li><li>Big Data Analysis</li></ul></div>
<p class="bar-cap" id="aboutMe">About Me</p>
<ul class="bar-links" aria-labelledby="aboutMe">
${link('research', `${root}${ROUTES.research}`, 'Research')}
${link('teaching', `${root}${ROUTES.teaching}`, 'Teaching')}
${link('cv', `${root}${ROUTES.cv}`, 'C.V.')}
<li><a class="arrow" href="${PROFILE}" target="_blank" rel="noopener">UW Economics profile<span class="sr"> (opens in a new tab)</span></a></li>
</ul>
<p class="author-note">Looking for an academic position, 2026–&#8288;2027</p>
</nav>
</div>`;
}

export function footer(root = './') {
  const link = (href, text) => `<li><a href="${root}${href}">${text}</a></li>`;
  return `<footer class="site-footer">
<p><a href="${root}${ROUTES.cv}">${AUTHOR}</a>, Department of Economics, University of Washington.<span class="foot-note">Independent site for teaching; not an official University site.</span></p>
<nav class="foot-nav" aria-label="Site"><ul>${link(ROUTES.research, 'Research')}${link(ROUTES.teaching, 'Teaching')}${link(ROUTES.cv, 'C.V.')}${link(ROUTES.home, 'Stats Engine')}</ul></nav>
</footer>`;
}
