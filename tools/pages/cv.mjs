// C.V. (cv/index.html): the academic C.V. as a web page, with the PDF to download.
// Every fact comes from notes/source/cv.md (transcribed from the September 2026 PDF). Kept off the page
// on purpose: the phone number and the referees' email addresses (both are in the PDF).
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { EMAIL, ROOT, ROUTES, SITE } from '../shell.mjs';

const CV_PDF = 'files/alfredo-effendy-cv.pdf';
const JMP_PDF = 'files/when-yield-curves-invert-together.pdf';
const CV_DATE = 'September 2026';

// ---- the record, from notes/source/cv.md -------------------------------------------------------
const UW = 'University of Washington';
const UCI = 'University of California, Irvine';
const ND = 'University of Notre Dame';
const ACMS = '<abbr title="Applied and Computational Mathematics and Statistics">ACMS</abbr> Department';

const INTERESTS = ['International Finance', 'Asset Pricing, Risk Management', 'Big Data Analysis'];
const ADDRESS = 'Department of Economics, University of Washington, 319C Savery Hall, Chelan Ln, Seattle, WA 98195';

const EDUCATION = [
  { year: '2027', expected: true, degree: 'Ph.D., Economics', school: UW, fields: 'International Finance, Asset Pricing, Macro-Finance' },
  { year: '2023', degree: 'M.A., Economics', school: UW },
  { year: '2020', degree: 'M.S., Statistics', school: ND },
  { year: '2018', degree: 'B.S., Mathematics', school: UCI, note: 'Honors in Mathematics, Concentration in Mathematical Finance' },
  { year: '2018', degree: 'B.A., Quantitative Economics', school: UCI, note: 'Honors in Economics' },
  { year: '2018', degree: 'B.S., Chemical Engineering', school: UCI },
];

const JMP = {
  title: 'When Yield Curves Invert Together: Currency Crash Risk',
  // The August 2026 C.V.'s abstract, verbatim (the September C.V. gives the title only).
  abstract:
    'A currency is exposed to risk specific to its own country and to risk that is global. A single country’s yield curve inversion ' +
    'can reflect either kind, but when multiple countries’ curves invert at the same time, the more likely cause is a global shock. ' +
    'I build a state variable from synchronized inversions across the G10 currencies’ yield curves and show that it marks periods of ' +
    'elevated systemic currency crash risk. When the state is on, currencies depreciate in the order of their interest rates and of ' +
    'their sensitivity to global equity markets (“currency betas”). The same interest rate differential that generates carry income ' +
    'therefore also sorts currencies by their crash exposure; high-rate currencies, which carry trades buy, depreciate more than the ' +
    'low-rate currencies used to fund the trade.',
};

/** Title and the C.V.'s description, verbatim. */
export const IN_PROGRESS = [
  ['Maintaining Carry Structure in Machine Learning Carry Trade',
    'Many machine learning carry trade papers focus on returns predictability and at times forgo the carry trade structure. ' +
    'This paper is utilizing time series machine learning methods such as GRU, LSTM and their ensemble to predict carry trade crashes while maintaining the carry structure.'],
  ['Cross-Asset Inversion Clocks',
    'This paper analyzes the individual and clusters of yield curve inversions and their impact on different asset markets, such as the equity, commodity, and credit market. ' +
    'It further asks whether the age of the inversions have different effects across multiple assets.'],
];

/** Instructor of record, in the C.V.'s order; each has a page under teaching/. */
const SOLO = [
  { years: '2026', slug: 'bbus-221', code: 'B BUS 221', title: 'Introduction Macroeconomics', unit: 'School of Business, University of Washington Bothell' },
  { years: '2025', slug: 'qmeth-201', code: 'QMETH 201', title: 'Introduction to Statistical Methods', unit: `Foster School of Business, ${UW}` },
  { years: '2025', slug: 'econ-301', code: 'ECON 301', title: 'Intermediate Macroeconomics', unit: `Department of Economics, ${UW}` },
  { years: '2024', slug: 'econ-200', code: 'ECON 200', title: 'Introduction to Microeconomics', unit: `Department of Economics, ${UW}` },
];

/** Teaching assistant, grouped by unit as on the C.V. */
const TA = [
  { unit: 'Foster School of Business', place: UW, rows: [
    ['2026–', 'SCM 501', 'Probability and Statistics'],
    ['2025–', 'BUS AN 510', 'Probability and Statistics'],
    ['2024–', 'QMETH 201', 'Introduction to Statistical Methods'],
  ] },
  { unit: 'Department of Statistics', place: UW, rows: [['2022–2024', 'STAT 311', 'Elements of Statistical Methods']] },
  { unit: 'Department of Economics', place: UW, rows: [
    ['2022–2023', 'ECON 201', 'Introduction to Macroeconomics'],
    ['2022', 'ECON 345', 'Global Health Economics'],
  ] },
  { unit: ACMS, place: ND, rows: [
    ['2019', 'ACMS 37020', 'Projects in Actuarial Science'],
    ['2019', 'ACMS 30600', 'Statistical Methods and Data Analysis'],
    ['2019', 'ACMS 30010', 'Applied Mathematical Financial Economics'],
    ['2019', 'ACMS 20620', 'Applied Linear Algebra'],
    ['2018', 'ACMS 30530', 'Introduction to Probability'],
    ['2018', 'ACMS 10145', 'Statistics for Business'],
  ] },
];

const AWARDS = [
  ['2021', 'George and Pearl Corkery Scholarship'],
  ['2018', 'Order of Merit Awards'],
];
const SERVICE = [
  ['2024–2026', 'Macroeconomics and International Trade Seminar and Brownbag Organizer'],
  ['2022–2024', '<b>President</b>, Graduate Student Committee, Department of Economics'],
  ['2023', 'Graduate Student Referee for Assistant Teaching Professor Search Committee'],
];
const EMPLOYMENT = [['2021', 'Panin Asset Management', 'Machine Learning Engineer – Market Forecasting']];

/** Names, titles and affiliations only: no email addresses on the web page. */
const REFERENCES = [
  { name: 'Yu-chin Chen', role: 'Chair', title: 'Associate Professor of Economics', org: UW },
  { name: 'Lukas Kremens', title: 'Associate Professor of Finance', org: UW },
  { name: 'Eric Zivot', title: 'Robert R. Richards Professor of Economics', org: UW },
  { name: 'Issariya Sirichakwal', role: 'Teaching', title: 'Associate Teaching Professor of OM', org: UW },
];

// ---- helpers -----------------------------------------------------------------------------------
const kb = (file) => {
  try {
    return `${Math.round(statSync(join(ROOT, 'static', file)).size / 1024)}&nbsp;KB`;
  } catch {
    return '';
  }
};
const nb = (s) => s.replace(/ /g, '&nbsp;');
/** Keeps the last word with the arrow that follows it on the course links. */
const lastWord = (t) => {
  const i = t.lastIndexOf(' ');
  return `${t.slice(0, i + 1)}<span class="cv-nw">${t.slice(i + 1)}</span>`;
};
const NEW_TAB = '<span class="sr"> (opens in a new tab)</span>';

/** A year cell. Open ranges ("2026–") say "present" to screen readers; a repeated year shows once. */
const year = (y, { expected = false, same = false } = {}) => {
  const text = y.endsWith('–') ? `${y}<span class="sr"> present</span>` : y;
  if (same) return `<span class="cv-yr"><span class="sr">${y}</span></span>`;
  return `<span class="cv-yr">${text}${expected ? '<small>expected</small>' : ''}</span>`;
};
const row = (yr, what, cls = '') => `<li${cls ? ` class="${cls}"` : ''}>${yr}<div class="cv-what">${what}</div></li>`;

/** One C.V. section: the heading (sticky in the left rail on wide screens) and its body. */
const section = (id, title, body) => `<section class="cv-sec" id="${id}" aria-labelledby="${id}-h">
<h2 class="cv-h2" id="${id}-h">${title}</h2>
<div class="cv-sec-body">
${body}
</div>
</section>`;

const ICON_DL = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="cv-dl-arrow" d="M10 3v9.5M6.25 8.75 10 12.5l3.75-3.75"/><path d="M3.5 13v3.5h13V13"/></svg>`;

// ---- sections ----------------------------------------------------------------------------------
function header(root) {
  const size = kb(CV_PDF);
  return `<header class="cv-head">
<div class="cv-wrap cv-head-in">
<div class="cv-id">
<p class="cap cv-kicker">Curriculum vitae<span aria-hidden="true"> · </span><span class="sr">, </span>${CV_DATE}</p>
<h1>Alfredo Effendy</h1>
<p class="cv-role">Ph.D. candidate in Economics, University of Washington<span class="cv-exp">, expected 2027</span></p>
<ul class="cv-int" aria-label="Research interests">${INTERESTS.map((t, i) => `<li style="--i:${i}">${t}</li>`).join('')}</ul>
<ul class="cv-contact">
<li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
<li><a class="cv-site arrow" href="${SITE}" target="_blank" rel="noopener">Personal website${NEW_TAB}</a></li>
<li class="cv-addr">${ADDRESS}</li>
</ul>
</div>
<div class="cv-actions">
<a class="btn primary cv-dl" href="${root}${CV_PDF}" download="Alfredo-Effendy-CV.pdf" type="application/pdf" style="--i:3">${ICON_DL}<span>Download C.V. (PDF)</span></a>
<p class="cv-file" style="--i:4">${CV_DATE}${size ? ` · ${size}` : ''}</p>
<p class="cv-market" style="--i:5">On the academic job market, 2026–2027</p>
</div>
</div>
</header>`;
}

const education = () =>
  section(
    'education',
    'Education',
    `<ol class="cv-rows">
${EDUCATION.map((e, i) => {
  const same = i > 0 && EDUCATION[i - 1].year === e.year;
  const extra = e.fields
    ? `<p class="cv-sub"><span class="cv-lab">Fields</span> ${e.fields}</p>`
    : e.note
      ? `<p class="cv-sub">${e.note}</p>`
      : '';
  return row(year(e.year, { expected: e.expected, same }), `<p><b>${e.degree}</b>, ${e.school}</p>${extra}`, same ? 'same' : '');
}).join('\n')}
</ol>`,
  );

const paper = (root) =>
  section(
    'job-market-paper',
    'Job market paper',
    `<article class="cv-paper">
<h3>${JMP.title}</h3>
<p class="cv-abs">${JMP.abstract}</p>
<p class="cv-links"><a class="btn cv-go" href="${root}${ROUTES.jmp}">Read the summary</a><a class="btn" href="${root}${JMP_PDF}" type="application/pdf">PDF${kb(JMP_PDF) ? `<span class="cv-size">${kb(JMP_PDF)}</span>` : ''}</a></p>
</article>`,
  );

const progress = () =>
  section(
    'work-in-progress',
    'Work in progress',
    `<ul class="cv-plain">${IN_PROGRESS.map(([t, d]) => `<li><p>${t}</p><p class="cv-sub">${d}</p></li>`).join('')}</ul>`,
  );

function teaching(root) {
  const solo = SOLO.map((c) =>
    row(
      year(c.years),
      `<a class="cv-course" href="${root}${ROUTES.teaching}${c.slug}/"><b class="cv-code" style="view-transition-name:code-${c.slug}">${nb(c.code)}</b> <span class="cv-ctitle">${lastWord(c.title)}</span></a><p class="cv-sub">${c.unit}</p>`,
    ),
  ).join('\n');
  const ta = TA.map(
    (g) => `<h4 class="cv-h4">${g.unit}<span>, ${g.place}</span></h4>
<ol class="cv-rows cv-compact">
${g.rows.map(([y, code, title]) => row(year(y), `<b>${nb(code)}</b> <span>${title}</span>`)).join('\n')}
</ol>`,
  ).join('\n');
  return section(
    'teaching',
    'Teaching',
    `<div class="cv-block cv-solo">
<h3 class="cv-h3">Instructor of record</h3>
<ol class="cv-rows">
${solo}
</ol>
</div>
<div class="cv-block cv-ta">
<h3 class="cv-h3">Teaching assistant</h3>
${ta}
</div>`,
  );
}

const simple = (id, title, rows) =>
  section(id, title, `<ol class="cv-rows">
${rows.map(([y, text]) => row(year(y), `<p>${text}</p>`)).join('\n')}
</ol>`);

const employment = () =>
  section(
    'employment',
    'Non-academic employment',
    `<ol class="cv-rows">
${EMPLOYMENT.map(([y, org, role]) => row(year(y), `<p><b>${org}</b>, ${role}</p>`)).join('\n')}
</ol>`,
  );

const references = () =>
  section(
    'references',
    'References',
    `<ul class="cv-refs">
${REFERENCES.map(
  (r) => `<li><p class="cv-ref-name"><b>${r.name}</b>${r.role ? ` <span class="cv-role-tag">${r.role}</span>` : ''}</p><p>${r.title}</p><p class="cv-ref-org">${r.org}</p></li>`,
).join('\n')}
</ul>
<p class="cv-aside">Contact details are in the PDF.</p>`,
  );

// ---- page --------------------------------------------------------------------------------------
export const pages = [
  {
    path: `${ROUTES.cv}index.html`,
    title: 'C.V. · Alfredo Effendy',
    description:
      'Curriculum vitae of Alfredo Effendy, Ph.D. candidate in Economics at the University of Washington: education, job market paper, teaching, awards, service and references, with the PDF to download.',
    current: 'cv',
    tagline: 'C.V.',
    css: ['cv'],
    body: (root) => `<main id="main" class="cv">
${header(root)}
<div class="cv-wrap cv-body">
${education()}
${paper(root)}
${progress()}
${teaching(root)}
${simple('awards', 'Fellowships and awards', AWARDS)}
${simple('service', 'Professional service', SERVICE)}
${employment()}
${references()}
</div>
</main>`,
  },
];
