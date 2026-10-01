// Teaching: the overview (teaching/index.html) and one page per course taught as solo instructor of
// record (teaching/<slug>/index.html). Course content and interactives come from
// tools/pages/courses/<slug>.mjs (interface: notes/teaching-contract.md). Facts about the author come
// only from notes/source/cv.md; course descriptions only from the official catalogues linked here.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LAB_LINKS, MARK, ROOT, ROUTES, rootOf } from '../shell.mjs';

const COURSE_DIR = join(ROOT, 'tools/pages/courses');

// ---- the record, from the C.V. -------------------------------------------------------------------
/** Teaching units named on the C.V.; `short` is how the overview names them in a sentence. */
const UNITS = {
  bothell: { name: 'School of Business', place: 'University of Washington Bothell', short: 'UW Bothell School of Business' },
  foster: { name: 'Foster School of Business', place: 'University of Washington', short: 'the Foster School of Business' },
  econ: { name: 'Department of Economics', place: 'University of Washington', short: 'the Department of Economics' },
  stat: { name: 'Department of Statistics', place: 'University of Washington', short: 'the Department of Statistics' },
  acms: {
    name: '<abbr title="Applied and Computational Mathematics and Statistics">ACMS</abbr> Department',
    place: 'University of Notre Dame',
    short: 'the ACMS Department',
  },
};
const unitLine = (key) => `${UNITS[key].name}, ${UNITS[key].place}`;

/** Instructor of record, in the C.V.'s order (most recent first). Course modules add the detail. */
const SOLO = [
  { slug: 'bbus-221', code: 'B BUS 221', title: 'Introduction Macroeconomics', unitKey: 'bothell', when: '2026' },
  { slug: 'qmeth-201', code: 'QMETH 201', title: 'Introduction to Statistical Methods', unitKey: 'foster', when: '2025' },
  { slug: 'econ-301', code: 'ECON 301', title: 'Intermediate Macroeconomics', unitKey: 'econ', when: '2025' },
  { slug: 'econ-200', code: 'ECON 200', title: 'Introduction to Microeconomics', unitKey: 'econ', when: '2024' },
];

const UW = (dept, code) => `https://www.washington.edu/students/crscat/${dept}.html#${dept}${code}`;
const ND = (code) => `https://catalog.nd.edu/search/?P=ACMS%20${code}`;

/**
 * Teaching assistant, in the C.V.'s order. `desc` is a one-line, close paraphrase of the official
 * catalogue entry at `src`; a course whose entry could not be matched to the C.V. has none.
 */
const TA = [
  { years: '2026–', code: 'SCM 501', title: 'Probability and Statistics', unitKey: 'foster',
    desc: 'Statistical tools and models for management decisions: probability distributions, sampling and standard errors, hypothesis tests, ANOVA, and multiple and logistic regression.',
    src: UW('scm', 501), from: 'UW course catalogue' },
  { years: '2025–', code: 'BUS AN 510', title: 'Probability and Statistics', unitKey: 'foster',
    desc: 'Statistical tools to present, analyze and interpret data, applied to organizational decision-making.',
    src: UW('busan', 510), from: 'UW course catalogue' },
  { years: '2024–', code: 'QMETH 201', title: 'Introduction to Statistical Methods', unitKey: 'foster',
    desc: 'Principles of data analysis for management problems: classifying, summarizing and displaying data, and probability models for inference and decisions.',
    src: UW('qmeth', 201), from: 'UW course catalogue' },
  { years: '2022–2024', code: 'STAT 311', title: 'Elements of Statistical Methods', unitKey: 'stat',
    desc: 'Study design, descriptive statistics, correlation and regression, probability and sampling, estimation and confidence intervals, t-tests and chi-square tests.',
    src: UW('stat', 311), from: 'UW course catalogue' },
  { years: '2022–2023', code: 'ECON 201', title: 'Introduction to Macroeconomics', unitKey: 'econ',
    desc: 'The aggregate economy: national income, inflation, business fluctuations, unemployment, the monetary system, the federal budget, and international trade and finance.',
    src: UW('econ', 201), from: 'UW course catalogue' },
  { years: '2022', code: 'ECON 345', title: 'Global Health Economics', unitKey: 'econ',
    desc: 'Health economics and the tools economists use to inform global health solutions in low- and middle-income countries.',
    src: UW('econ', 345), from: 'UW course catalogue' },
  { years: '2019', code: 'ACMS 37020', title: 'Projects in Actuarial Science', unitKey: 'acms',
    desc: 'Real-world actuarial science projects with an industry partner, using probability and financial mathematics throughout.',
    src: ND(37020), from: 'Notre Dame course catalogue' },
  { years: '2019', code: 'ACMS 30600', title: 'Statistical Methods and Data Analysis', unitKey: 'acms',
    desc: 'Statistical methods for analyzing data: estimation, parametric and nonparametric tests, categorical data, simple and multiple regression, time series.',
    src: ND(30600), from: 'Notre Dame course catalogue' },
  { years: '2019', code: 'ACMS 30010', title: 'Applied Mathematical Financial Economics', unitKey: 'acms',
    desc: 'Mathematical models of financial assets and of managing risk in an insurance setting.',
    src: ND(30010), from: 'Notre Dame course catalogue' },
  { years: '2019', code: 'ACMS 20620', title: 'Applied Linear Algebra', unitKey: 'acms',
    desc: 'Linear algebra and computational linear algebra for solving matrix problems in applications, with software.',
    src: ND(20620), from: 'Notre Dame course catalogue' },
  { years: '2018', code: 'ACMS 30530', title: 'Introduction to Probability', unitKey: 'acms',
    desc: 'Discrete and continuous random variables, conditional probability and independence, laws of large numbers and the central limit theorem.',
    src: ND(30530), from: 'Notre Dame course catalogue' },
  { years: '2018', code: 'ACMS 10145', title: 'Statistics for Business', unitKey: 'acms',
    desc: 'A conceptual introduction to data for business students: descriptive statistics, probability models, confidence intervals and hypothesis tests.',
    src: ND(10145), from: 'Notre Dame course catalogue' },
];

// ---- helpers ---------------------------------------------------------------------------------------
const attr = (s) => String(s).replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const plain = (html) => String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const NEW_TAB = '<span class="sr"> (opens in a new tab)</span>';
const ext = (href, text, cls = '') =>
  `<a${cls ? ` class="${cls}"` : ''} href="${attr(href)}" target="_blank" rel="noopener">${text}${NEW_TAB}</a>`;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n) => WORDS[n] ?? String(n);
const list = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
/** '2022–2024' → [2022, 2024, false]; '2026–' → [2026, null, true]; '2019' → [2019, 2019, false]. */
const span = (years) => {
  const [a, b] = String(years).match(/\d{4}/g)?.map(Number) ?? [];
  const open = /–\s*$/.test(years);
  return [a, b ?? (open ? null : a), open];
};
const firstYear = (rows, key) => Math.min(...rows.map((r) => span(r[key])[0]).filter(Number.isFinite));
const lastYear = (rows, key) => Math.max(...rows.flatMap((r) => span(r[key]).slice(0, 2)).filter(Number.isFinite));
const route = (slug) => `${ROUTES.teaching}${slug}/`;
const vt = (slug) => `view-transition-name:code-${slug}`;

const INTERACTIVE_ICON = `<svg class="t-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 6h14M3 14h14"/><circle cx="7.5" cy="6" r="2.2"/><circle cx="12.5" cy="14" r="2.2"/></svg>`;

// ---- course modules ----------------------------------------------------------------------------------
/**
 * Every tools/pages/courses/*.mjs that imports cleanly and exports `course`. Files starting with "_"
 * are skipped (set TEACH_STUBS=1 to include them while testing). A broken or half-written module is
 * reported and skipped, so the site builds while course pages are being written.
 */
async function loadCourses() {
  if (!existsSync(COURSE_DIR)) return [];
  const stubs = process.env.TEACH_STUBS === '1';
  const files = readdirSync(COURSE_DIR)
    .filter((f) => f.endsWith('.mjs') && (stubs || !f.startsWith('_')))
    .sort();
  const found = [];
  for (const f of files) {
    try {
      const mod = await import(pathToFileURL(join(COURSE_DIR, f)).href);
      const c = mod.course;
      if (!c || typeof c !== 'object') throw new Error('no `course` export');
      if (!/^[a-z0-9-]+$/.test(c.slug ?? '')) throw new Error(`bad slug ${JSON.stringify(c.slug)}`);
      found.push(c);
    } catch (err) {
      console.warn(`teaching: skipped courses/${f}: ${err.message}`);
    }
  }
  return found;
}

/** Style groups that exist; a missing file is reported instead of failing the build. */
const styleGroups = (groups, slug) =>
  groups.filter((g) => {
    const ok = existsSync(join(ROOT, 'src/styles', `${g}.css`));
    if (!ok) console.warn(`teaching: ${slug}: style group "${g}" not found (src/styles/${g}.css)`);
    return ok;
  });

const entryFor = (c) => {
  const entry = c.interactive?.entry;
  if (!entry) return undefined;
  if (existsSync(join(ROOT, entry))) return entry;
  console.warn(`teaching: ${c.slug}: entry ${entry} not found; using src/site.ts`);
  return undefined;
};

// ---- course page -----------------------------------------------------------------------------------
function header(c, root, alsoTa) {
  const unit = c.unit ?? unitLine(c.unitKey);
  const when = c.whenSource ? `${c.when} ${ext(c.whenSource, 'source<span class="sr"> for the date</span>', 'c-src arrow')}` : c.when;
  return `<header class="c-head">
<div class="t-wrap">
<nav class="c-crumb" aria-label="Breadcrumb"><a href="${root}${ROUTES.teaching}">Teaching</a></nav>
<h1><span class="c-code" style="${vt(c.slug)}">${c.code}</span> <span class="c-title">${c.title}</span></h1>
<dl class="c-meta">
<div class="c-role"><dt class="sr">Role</dt><dd><span class="badge solo">Solo instructor</span></dd></div>
<div><dt>Unit</dt><dd>${unit}</dd></div>
${c.when ? `<div><dt>When</dt><dd>${when}</dd></div>` : ''}
${alsoTa ? `<div><dt>Also</dt><dd>Teaching assistant, ${alsoTa.years}</dd></div>` : ''}
</dl>
</div>
</header>`;
}

function interactive(c, root) {
  const it = c.interactive;
  if (!it?.html) return '';
  return `<section class="c-tool" aria-labelledby="c-tool-h">
<div class="c-tool-head">
<p class="cap">${INTERACTIVE_ICON}Interactive</p>
<h2 id="c-tool-h">${it.title ?? ''}</h2>
${it.lead ? `<p class="c-lead">${it.lead}</p>` : ''}
</div>
<div class="c-tool-body">
${it.html(root)}
</div>
</section>`;
}

function covers(c) {
  const cat = c.catalog;
  const concepts = c.concepts ?? [];
  if (!cat?.text && !concepts.length) return '';
  return `<section class="c-sec" aria-labelledby="c-covers-h">
<h2 class="t-h2" id="c-covers-h">What the course covers</h2>
${
  cat?.text
    ? `<figure class="c-quote">
<blockquote${cat.url ? ` cite="${attr(cat.url)}"` : ''}><p>${cat.text}</p></blockquote>
${cat.url ? `<figcaption>${ext(cat.url, `Course catalogue <span class="c-host">${host(cat.url)}</span>`, 'arrow')}</figcaption>` : ''}
</figure>`
    : ''
}
${
  concepts.length
    ? `<ol class="c-concepts" style="--cols:${[1, 1, 2, 3, 2, 3, 3, 4][concepts.length] ?? 4}">
${concepts
  .map(
    (k) => `<li><h3>${k.title}</h3><p>${k.body}</p>${k.source ? `<p class="c-k-src">${ext(k.source, host(k.source) || 'Source', 'arrow')}</p>` : ''}</li>`,
  )
  .join('\n')}
</ol>`
    : ''
}
</section>`;
}

function labs(c, root) {
  const rows = (c.labs ?? []).filter(([slug]) => slug);
  if (!rows.length) return '';
  const no = (slug) => {
    const i = LAB_LINKS.findIndex(([s]) => s === slug);
    return i < 0 ? '' : `<small aria-hidden="true">${String(i + 1).padStart(2, '0')}</small>`;
  };
  return `<section class="c-sec c-labs" aria-labelledby="c-labs-h">
<h2 class="t-h2" id="c-labs-h">Related Stats Engine labs</h2>
<ul>${rows.map(([slug, label]) => `<li><a href="${root}?lab=${attr(slug)}">${no(slug)}${label}</a></li>`).join('')}</ul>
</section>`;
}

function sources(c) {
  const rows = (c.sources ?? []).filter((s) => s?.url);
  if (!rows.length) return '';
  return `<section class="c-sec c-sources" aria-labelledby="c-sources-h">
<h2 class="t-h2" id="c-sources-h">Sources</h2>
<ol>${rows.map((s) => `<li>${ext(s.url, `${s.label ?? host(s.url)} <span class="c-host">${host(s.url)}</span>`)}</li>`).join('')}</ol>
</section>`;
}

function pager(prev, next, root) {
  const cell = (c, rel, label) =>
    c
      ? `<a class="c-${rel}" href="${root}${route(c.slug)}" rel="${rel}"><span class="cap">${label}</span><b>${c.code}</b><span class="c-pg-t">${c.title}</span></a>`
      : `<span class="c-${rel} c-none" aria-hidden="true"></span>`;
  return `<nav class="c-pager" aria-label="Courses">
${cell(prev, 'prev', 'Previous')}
<a class="c-all" href="${root}${ROUTES.teaching}">All teaching</a>
${cell(next, 'next', 'Next')}
</nav>`;
}

/**
 * Renders a course page's content now (not when the generator calls `body`), so a module that throws
 * is caught here and skipped instead of stopping the build. The pager is added once the set is known.
 */
function coursePage(c) {
  const path = `${ROUTES.teaching}${c.slug}/index.html`;
  const root = rootOf(path);
  const tool = interactive(c, root);
  if (/<h1[\s>]/i.test(tool)) console.warn(`teaching: ${c.slug}: interactive markup contains an <h1>; the page must have one`);
  const content = `${tool}
${covers(c)}
${labs(c, root)}
${sources(c)}`;
  const head = header(c, root, TA.find((t) => t.code === c.code));
  return {
    path,
    title: `${c.code}: ${plain(c.title)} · Teaching · Alfredo Effendy`,
    description: plain(c.summary ?? `${c.code}: ${c.title}, taught by Alfredo Effendy as solo instructor.`),
    current: 'teaching',
    tagline: `Teaching · <em>${c.code}</em>`,
    css: styleGroups(['teaching', ...(c.interactive?.css ?? [])], c.slug),
    entry: entryFor(c),
    finish: (prev, next) => `<main id="main" class="course">
${head}
<div class="t-wrap c-body">
${content}
${pager(prev, next, root)}
</div>
</main>`,
  };
}

// ---- overview --------------------------------------------------------------------------------------
/**
 * A solo-instructor card. Hovering lifts it and lights it; one click (or tap) opens it in place to show
 * the course's interactive and concepts, with a button to the full course page. Nothing navigates
 * until that button is pressed. Without JavaScript the details are simply shown.
 */
function card(c, root) {
  const unit = c.unit ?? unitLine(c.unitKey);
  const name = c.interactive?.title;
  const link = c.page;
  const top = `<p class="t-card-top"><span class="t-code"${link ? ` style="${vt(c.slug)}"` : ''}>${c.code}</span><span class="t-when">${c.when}</span></p>`;
  if (!link) {
    return `<li class="t-card pending">
${top}
<h3>${c.title}</h3>
<p class="t-unit">${unit}</p>
</li>`;
  }
  const id = `tc-${c.slug}`;
  const concepts = (c.concepts ?? []).map((k) => `<li>${k.title}</li>`).join('');
  const lead = c.interactive?.lead ? `<p class="t-lead2">${c.interactive.lead}</p>` : '';
  return `<li class="t-card" data-card>
${top}
<h3><button class="t-card-btn" type="button" aria-expanded="false" aria-controls="${id}">${c.title}</button></h3>
<p class="t-unit">${unit}</p>
${c.summary ? `<p class="t-sum">${c.summary}</p>` : ''}
<span class="t-more" aria-hidden="true"></span>
<div class="t-detail" id="${id}"><div class="t-detail-in">
${name ? `<p class="t-int">${INTERACTIVE_ICON}<span><span class="sr">Interactive: </span>${name}</span></p>${lead}` : ''}
${concepts ? `<p class="cap">Concepts covered</p><ul class="t-kc">${concepts}</ul>` : ''}
<a class="btn primary t-open" href="${root}${route(c.slug)}">Open course page</a>
</div></div>
</li>`;
}

function taTable(root, solo) {
  const from = firstYear(TA, 'years');
  const to = Math.max(lastYear(TA, 'years'), lastYear(solo, 'when'));
  const n = to - from + 1;
  const pct = (x) => `${+((x / n) * 100).toFixed(3)}%`;
  const bar = (years) => {
    const [a, b, open] = span(years);
    if (!Number.isFinite(a)) return '';
    const end = b ?? to;
    return `<span class="ta-bar${open ? ' open' : ''}" style="--a:${pct(a - from)};--w:${pct(end - a + 1)}"></span>`;
  };
  const order = [...new Set(TA.map((t) => t.unitKey))];
  const taught = new Map(solo.map((c) => [c.code, c]));
  const row = (t) => {
    const also = taught.get(t.code);
    const tag = also ? (also.page ? `<a class="t-also" href="${root}${route(also.slug)}">Also solo instructor</a>` : '<span class="t-also">Also solo instructor</span>') : '';
    return `<tr>
<td class="ta-course"><b>${t.code}</b> <span>${t.title}</span>${tag ? ` ${tag}` : ''}${
      t.desc ? `<p class="ta-desc">${t.desc} ${ext(t.src, `<span class="sr">${t.from}: ${t.code}</span><span aria-hidden="true">catalogue</span>`, 'arrow')}</p>` : ''
    }</td>
<td class="ta-yr">${t.years}</td>
<td class="ta-span" aria-hidden="true"><span class="ta-track">${bar(t.years)}</span></td>
</tr>`;
  };
  return `<div class="table-wrap ta" style="--years:${n}">
<table>
<caption class="sr">Teaching assistant record by unit, with the years and a ${from}–${to} timeline</caption>
<thead><tr><th scope="col">Course</th><th scope="col" class="ta-yr">Years</th><th scope="col" class="ta-span"><span class="sr">Timeline</span><span class="ta-axis" aria-hidden="true"><span>${from}</span><span>${to}</span></span></th></tr></thead>
${order
  .map((key) => {
    const rows = TA.filter((t) => t.unitKey === key);
    return `<tbody>
<tr class="ta-unit"><th scope="rowgroup" colspan="3">${UNITS[key].name}<span>${UNITS[key].place} · ${rows.length}</span></th></tr>
${rows.map(row).join('\n')}
</tbody>`;
  })
  .join('\n')}
</table>
</div>`;
}

function overview(solo) {
  const units = [...new Set(solo.map((c) => c.unitKey))];
  const since = firstYear(solo, 'when');
  const taSince = firstYear(TA, 'years');
  const universities = new Set(TA.map((t) => UNITS[t.unitKey].place.replace(/ Bothell$/, ''))).size;
  return {
    path: `${ROUTES.teaching}index.html`,
    title: 'Teaching · Alfredo Effendy',
    description: `Alfredo Effendy's teaching: the University of Washington courses he has taught as solo instructor of record, and his teaching-assistant record.`,
    current: 'teaching',
    tagline: 'Teaching',
    css: ['teaching'],
    entry: 'src/pages/teaching.ts',
    body: (root) => `<main id="main" class="teach">
<header class="c-head t-head">
<div class="t-wrap">
<p class="cap t-from"><a href="${root}${ROUTES.cv}">From the C.V.</a></p>
<h1>Teaching</h1>
<p class="t-lead">Solo instructor of record for ${count(solo.length)} University of Washington courses across ${list(units.map((k) => UNITS[k].short))}.</p>
<div class="stats t-stats">
<div class="stat hero"><span>Solo instructor</span><b>${solo.length}</b><small>courses since ${since}</small></div>
<div class="stat"><span>Units</span><b>${units.length}</b><small>University of Washington</small></div>
<div class="stat theory"><span>Teaching assistant</span><b>${TA.length}</b><small>courses since ${taSince}</small></div>
</div>
</div>
</header>
<div class="t-wrap t-body">
<section class="t-sec" aria-labelledby="t-solo-h">
<div class="t-sec-head"><h2 class="t-h2" id="t-solo-h">Solo instructor</h2><p class="cap">Most recent first</p></div>
<ol class="t-cards">
${solo.map((c) => card(c, root)).join('\n')}
</ol>
</section>
<aside class="t-engine" aria-label="Stats Engine">
${MARK}
<p><a href="${root}">Stats Engine</a> is a statistics tool built for teaching: six simulations, from distributions to regression, and your own data.</p>
<a class="btn" href="${root}">Open the labs</a>
</aside>
<section class="t-sec" aria-labelledby="t-ta-h">
<div class="t-sec-head"><h2 class="t-h2" id="t-ta-h">Teaching assistant</h2><p class="cap">${TA.length} courses · ${universities} universities</p></div>
${taTable(root, solo)}
<p class="t-note">Course descriptions paraphrase the official catalogues, linked on each line.</p>
</section>
</div>
</main>`,
  };
}

// ---- pages -------------------------------------------------------------------------------------------
/**
 * Merges the C.V. list with the course modules: modules give the detail, the C.V. gives the list and
 * its order. A course without a working module still gets its overview card, without a link.
 */
export function assemble(modules) {
  const bySlug = new Map(modules.map((c) => [c.slug, c]));
  for (const c of modules) {
    if (!SOLO.some((s) => s.slug === c.slug)) console.warn(`teaching: courses/${c.slug} is not on the C.V. list; not published`);
  }
  const solo = SOLO.map((s) => {
    const mod = bySlug.get(s.slug);
    if (!mod) return { ...s, page: null };
    const c = { ...s, ...mod, slug: s.slug, unitKey: s.unitKey };
    try {
      return { ...c, page: coursePage(c) };
    } catch (err) {
      console.warn(`teaching: ${s.slug}: page not written: ${err.message}`);
      return { ...s, page: null };
    }
  });
  const live = solo.filter((c) => c.page);
  const coursePages = live.map((c, i) => {
    const { finish, ...page } = c.page;
    const html = finish(live[i - 1], live[i + 1]);
    return { ...page, body: () => html };
  });
  return [overview(solo), ...coursePages];
}

export const pages = async () => assemble(await loadCourses());
