// Teaching: the overview (teaching/index.html), laid out like the author's Google Site, and one page per
// course taught as instructor of record (teaching/<slug>/index.html), each with its interactive.
// Course content and interactives come from tools/pages/courses/<slug>.mjs (interface:
// notes/teaching-contract.md). Facts about the author come only from notes/source/cv.md (the TA
// quarters are the author's, from the Google Site).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, ROUTES, labHref, rootOf } from '../shell.mjs';
import { SYLLABI, syllabusLinks } from '../syllabi.mjs';

const COURSE_DIR = join(ROOT, 'tools/pages/courses');

// ---- the record ------------------------------------------------------------------------------------
/** Teaching units, named as on the Google Site. */
const UNITS = {
  bothell: 'University of Washington Bothell, School of Business',
  foster: 'University of Washington, Foster School of Business',
  econ: 'University of Washington, Department of Economics',
  stat: 'University of Washington, Department of Statistics',
  acms: 'University of Notre Dame, Department of Applied and Computational Mathematics and Statistics',
};

/** Instructor of record, in the C.V.'s order (most recent first). Course modules add the detail. */
const SOLO = [
  { slug: 'bbus-221', code: 'B BUS 221', title: 'Introduction Macroeconomics', unitKey: 'bothell' },
  { slug: 'qmeth-201', code: 'QMETH 201', title: 'Introduction to Statistical Methods', unitKey: 'foster' },
  { slug: 'econ-301', code: 'ECON 301', title: 'Intermediate Macroeconomics', unitKey: 'econ' },
  { slug: 'econ-200', code: 'ECON 200', title: 'Introduction to Microeconomics', unitKey: 'econ' },
];

/** Teaching assistant, grouped as on the Google Site; quarters oldest first. */
const TA = [
  { code: 'BUS AN 510', title: 'Probability and Statistics', unitKey: 'foster', quarters: ['Summer 2025', 'Summer 2026'] },
  { code: 'SCM 501', title: 'Probability and Statistics', unitKey: 'foster', quarters: ['Summer 2026'] },
  { code: 'QMETH 201', title: 'Introduction to Statistical Methods', unitKey: 'foster', quarters: ['Spring 2024', 'Fall 2024', 'Fall 2025'] },
  { code: 'STAT 311', title: 'Elements of Statistical Methods', unitKey: 'stat',
    quarters: ['Summer 2022', 'Spring 2023', 'Summer 2023', 'Fall 2023', 'Winter 2024', 'Spring 2024'] },
  { code: 'ECON 201', title: 'Introduction to Macroeconomics', unitKey: 'econ', quarters: ['Winter 2022', 'Fall 2022', 'Winter 2023'] },
  { code: 'ECON 345', title: 'Global Health Economics', unitKey: 'econ', quarters: ['Spring 2022'] },
  { code: 'ACMS 37020', title: 'Projects in Actuarial Science', unitKey: 'acms', quarters: ['Spring 2019', 'Fall 2019'] },
  { code: 'ACMS 30600', title: 'Statistical Methods and Data Analysis', unitKey: 'acms', quarters: ['Fall 2019'] },
  { code: 'ACMS 30010', title: 'Applied Mathematical Financial Economics', unitKey: 'acms', quarters: ['Spring 2019'] },
  { code: 'ACMS 20620', title: 'Applied Linear Algebra', unitKey: 'acms', quarters: ['Spring 2019'] },
  { code: 'ACMS 30530', title: 'Introduction to Probability', unitKey: 'acms', quarters: ['Fall 2018'] },
  { code: 'ACMS 10145', title: 'Statistics for Business', unitKey: 'acms', quarters: ['Fall 2018'] },
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
const route = (slug) => `${ROUTES.teaching}${slug}/`;
/** Items grouped by unit, in first-appearance order: [[unitKey, items], …]. */
const byUnit = (items) => [...Map.groupBy(items, (i) => i.unitKey)];
/** "Winter 2026 (Syllabus), Spring 2026 (Syllabus)": each quarter with its syllabus PDF. */
const quarters = (slug, root) =>
  (SYLLABI[slug] ?? []).map((s) => `${s.term} (<a href="${root}${s.file}" type="application/pdf">Syllabus</a>)`).join(', ');

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
function header(c, root) {
  const syllabus = syllabusLinks(c.slug, root);
  const parts = ['Instructor of record', c.unit ?? UNITS[c.unitKey], c.when, syllabus ? `Syllabus: ${syllabus}` : ''].filter(Boolean);
  return `<p class="c-back"><a href="${root}${ROUTES.teaching}">Teaching</a></p>
<h1>${c.code}: ${c.title}</h1>
<p class="c-meta">${parts.join(' · ')}</p>`;
}

function interactive(c, root) {
  const it = c.interactive;
  if (!it?.html) return '';
  return `<section class="c-tool" aria-labelledby="c-tool-h">
<h2 id="c-tool-h">${it.title ?? 'Interactive'}</h2>
${it.lead ? `<p class="c-lead">${it.lead}</p>` : ''}
<div class="c-tool-body">
${it.html(root)}
</div>
</section>`;
}

function covers(c) {
  const cat = c.catalog;
  const concepts = c.concepts ?? [];
  if (!cat?.text && !concepts.length) return '';
  return `<section aria-labelledby="c-covers-h">
<h2 id="c-covers-h">What the course covers</h2>
${cat?.text ? `<blockquote class="c-quote"${cat.url ? ` cite="${attr(cat.url)}"` : ''}><p>${cat.text}</p>${cat.url ? `<p class="c-cite">Course catalogue, <a href="${attr(cat.url)}">${host(cat.url)}</a></p>` : ''}</blockquote>` : ''}
${concepts.length ? `<dl class="c-concepts">${concepts.map((k) => `<dt>${k.title}</dt><dd>${k.body}${k.source ? ` <a class="c-src" href="${attr(k.source)}">(${host(k.source) || 'source'})</a>` : ''}</dd>`).join('\n')}</dl>` : ''}
</section>`;
}

function labs(c, root) {
  const rows = (c.labs ?? []).filter(([slug]) => slug);
  if (!rows.length) return '';
  return `<section aria-labelledby="c-labs-h">
<h2 id="c-labs-h">Related Stats Engine labs</h2>
<ul class="c-list">${rows.map(([slug, label]) => `<li><a href="${labHref(root, attr(slug))}">${label}</a></li>`).join('')}</ul>
</section>`;
}

/** A source's link: web addresses as they are; files on this site (e.g. a syllabus PDF) from the site root. */
const sourceHref = (url, root) => (/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `${root}${url}`);

function sources(c, root) {
  const rows = (c.sources ?? []).filter((s) => s?.url);
  if (!rows.length) return '';
  return `<section aria-labelledby="c-sources-h">
<h2 id="c-sources-h">Sources</h2>
<ol class="c-sources">${rows.map((s) => `<li><a href="${attr(sourceHref(s.url, root))}">${s.label ?? host(s.url)}</a></li>`).join('')}</ol>
</section>`;
}

function pager(prev, next, root) {
  const cell = (c, label) => (c ? `<a href="${root}${route(c.slug)}">${label}: ${c.code}</a>` : '');
  return `<p class="c-pager">${[cell(prev, 'Previous'), `<a href="${root}${ROUTES.teaching}">All teaching</a>`, cell(next, 'Next')].filter(Boolean).join(' · ')}</p>`;
}

/**
 * Renders a course page's content now (not when the generator calls `body`), so a module that throws
 * is caught here and skipped instead of stopping the build. The pager is added once the set is known.
 */
function coursePage(c) {
  const path = `${ROUTES.teaching}${c.slug}/index.html`;
  const root = rootOf(path);
  const content = `${header(c, root)}
${interactive(c, root)}
${covers(c)}
${labs(c, root)}
${sources(c, root)}`;
  return {
    path,
    title: `${c.code}: ${plain(c.title)} · Teaching · Alfredo Effendy`,
    description: plain(c.summary ?? `${c.code}: ${c.title}, taught by Alfredo Effendy as instructor of record.`),
    current: 'teaching',
    css: styleGroups(['page', 'teaching', ...(c.interactive?.css ?? [])], c.slug),
    entry: entryFor(c),
    finish: (prev, next) => `<main id="main" class="page course">
${content}
${pager(prev, next, root)}
</main>`,
  };
}

// ---- overview --------------------------------------------------------------------------------------
function overview(solo) {
  return {
    path: `${ROUTES.teaching}index.html`,
    title: 'Teaching · Alfredo Effendy',
    description: "Alfredo Effendy's teaching: courses taught as instructor of record, each with an interactive illustration and its syllabus, and courses as teaching assistant.",
    current: 'teaching',
    css: ['page', 'teaching'],
    body: (root) => `<main id="main" class="page teach">
<h1>Teaching</h1>
<p>Each course below has a page with an interactive illustration helpful for the course, the topics it covers and its syllabus. <a href="${labHref(root)}">Stats Engine</a> has more statistics simulations.</p>
<h2>Instructor of Record</h2>
${byUnit(solo)
  .map(
    ([key, courses]) => `<h3>${UNITS[key]}</h3>
<ul class="t-list">
${courses
  .map((c) => {
    const name = `${c.code}: ${c.title}`;
    const link = c.page ? `<a href="${root}${route(c.slug)}">${name}</a>` : name;
    const q = quarters(c.slug, root);
    return `<li>${link}${q ? `<br>${q}` : ''}</li>`;
  })
  .join('\n')}
</ul>`,
  )
  .join('\n')}
<h2>Teaching Assistant</h2>
${byUnit(TA)
  .map(
    ([key, courses]) => `<h3>${UNITS[key]}</h3>
<ul class="t-list">
${courses.map((t) => `<li>${t.code}: ${t.title}<br>${t.quarters.join(', ')}</li>`).join('\n')}
</ul>`,
  )
  .join('\n')}
</main>`,
  };
}

// ---- pages -------------------------------------------------------------------------------------------
/**
 * Merges the C.V. list with the course modules: modules give the detail, the C.V. gives the list and
 * its order. A course without a working module is still listed, without a link.
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
