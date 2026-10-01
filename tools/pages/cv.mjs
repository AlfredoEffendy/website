// C.V. (cv/index.html): the academic C.V. as a plain web page, in the PDF's sections, with the PDF to
// download. Every fact comes from notes/source/cv.md (transcribed from the September 2026 PDF). Kept off
// the page on purpose: the phone number and the referees' email addresses (both are in the PDF).
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { EMAIL, ROOT, ROUTES } from '../shell.mjs';
import { syllabusLinks } from '../syllabi.mjs';

const CV_PDF = 'files/alfredo-effendy-cv.pdf';
const JMP_PDF = 'files/when-yield-curves-invert-together.pdf';
const CV_DATE = 'September 2026';

// ---- the record, from notes/source/cv.md -------------------------------------------------------
const UW = 'University of Washington';
const UCI = 'University of California, Irvine';
const ND = 'University of Notre Dame';
const ADDRESS = 'Department of Economics, University of Washington, 319C Savery Hall, Chelan Ln, Seattle, WA 98195';

const EDUCATION = [
  ['2027 (expected)', `Ph.D., Economics, ${UW}`, 'Fields: International Finance, Asset Pricing, Macro-Finance'],
  ['2023', `M.A., Economics, ${UW}`],
  ['2020', `M.S., Statistics, ${ND}`],
  ['2018', `B.S., Mathematics, ${UCI}`, 'Honors in Mathematics, Concentration in Mathematical Finance'],
  ['', `B.A., Quantitative Economics, ${UCI}`, 'Honors in Economics'],
  ['', `B.S., Chemical Engineering, ${UCI}`],
];

const JMP_TITLE = 'When Yield Curves Invert Together: Currency Crash Risk';

/** Title and the C.V.'s description, verbatim. */
export const IN_PROGRESS = [
  ['Maintaining Carry Structure in Machine Learning Carry Trade',
    'Many machine learning carry trade papers focus on returns predictability and at times forgo the carry trade structure. ' +
    'This paper is utilizing time series machine learning methods such as GRU, LSTM and their ensemble to predict carry trade crashes while maintaining the carry structure.'],
  ['Cross-Asset Inversion Clocks',
    'This paper analyzes the individual and clusters of yield curve inversions and their impact on different asset markets, such as the equity, commodity, and credit market. ' +
    'It further asks whether the age of the inversions have different effects across multiple assets.'],
];

/** Instructor of record, grouped by unit as on the C.V.; each course has a page under teaching/. */
const SOLO = [
  { unit: `School of Business, ${UW} Bothell`, rows: [['2026', 'bbus-221', 'B BUS 221: Introduction Macroeconomics']] },
  { unit: `Foster School of Business, ${UW}`, rows: [['2025', 'qmeth-201', 'QMETH 201: Introduction to Statistical Methods']] },
  { unit: `Department of Economics, ${UW}`, rows: [
    ['2025', 'econ-301', 'ECON 301: Intermediate Macroeconomics'],
    ['2024', 'econ-200', 'ECON 200: Introduction to Microeconomics'],
  ] },
];

/** Teaching assistant, grouped by unit as on the C.V. */
const TA = [
  { unit: `Foster School of Business, ${UW}`, rows: [
    ['2026–', 'SCM 501: Probability and Statistics'],
    ['2025–', 'BUS AN 510: Probability and Statistics'],
    ['2024–', 'QMETH 201: Introduction to Statistical Methods'],
  ] },
  { unit: `Department of Statistics, ${UW}`, rows: [['2022–2024', 'STAT 311: Elements of Statistical Methods']] },
  { unit: `Department of Economics, ${UW}`, rows: [
    ['2022–2023', 'ECON 201: Introduction to Macroeconomics'],
    ['2022', 'ECON 345: Global Health Economics'],
  ] },
  { unit: `ACMS Department, ${ND}`, rows: [
    ['2019', 'ACMS 37020: Projects in Actuarial Science'],
    ['2019', 'ACMS 30600: Statistical Methods and Data Analysis'],
    ['2019', 'ACMS 30010: Applied Mathematical Financial Economics'],
    ['2019', 'ACMS 20620: Applied Linear Algebra'],
    ['2018', 'ACMS 30530: Introduction to Probability'],
    ['2018', 'ACMS 10145: Statistics for Business'],
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
const EMPLOYMENT = [['2021', '<b>Panin Asset Management</b>, Machine Learning Engineer – Market Forecasting']];

/** Names, titles and affiliations only: no email addresses on the web page. */
const REFERENCES = [
  ['Yu-chin Chen (Chair)', 'Associate Professor of Economics'],
  ['Lukas Kremens', 'Associate Professor of Finance'],
  ['Eric Zivot', 'Robert R. Richards Professor of Economics'],
  ['Issariya Sirichakwal (Teaching)', 'Associate Teaching Professor of OM'],
];

// ---- markup ------------------------------------------------------------------------------------
const kb = (file) => {
  try {
    return `${Math.round(statSync(join(ROOT, 'static', file)).size / 1024)}&nbsp;KB`;
  } catch {
    return '';
  }
};
/** One C.V. line: the year column, then the entry (and an optional second line). */
const row = (year, what, sub = '') => `<li><span class="cv-yr">${year}</span><span>${what}${sub ? `<br><span class="cv-sub">${sub}</span>` : ''}</span></li>`;
const rows = (list) => `<ul class="cv-rows">\n${list.join('\n')}\n</ul>`;
const grouped = (groups, render) => groups.map((g) => `<h3>${g.unit}</h3>\n${rows(g.rows.map(render))}`).join('\n');

function body(root) {
  const size = kb(CV_PDF);
  return `<main id="main" class="page cv">
<h1>C.V.</h1>
<p><a href="${root}${CV_PDF}" download="Alfredo-Effendy-CV.pdf" type="application/pdf">Download C.V. (PDF)</a> · ${CV_DATE}${size ? ` · ${size}` : ''}</p>
<p class="cv-addr">${ADDRESS} · <a href="mailto:${EMAIL}">${EMAIL}</a></p>
<h2>Education</h2>
${rows(EDUCATION.map(([y, what, sub]) => row(y, what, sub)))}
<h2>Working Papers</h2>
<p><a href="${root}${JMP_PDF}" type="application/pdf">${JMP_TITLE}</a> (Job Market Paper)</p>
<h2>Selected Work in Progress</h2>
<ul class="cv-plain">
${IN_PROGRESS.map(([title, description]) => `<li>${title}<br><span class="cv-sub">${description}</span></li>`).join('\n')}
</ul>
<h2>Instructor of Record</h2>
${grouped(SOLO, ([y, slug, name]) => {
  const syllabus = syllabusLinks(slug, root);
  return row(y, `<a href="${root}${ROUTES.teaching}${slug}/">${name}</a>`, syllabus ? `Syllabus: ${syllabus}` : '');
})}
<h2>Teaching Assistant</h2>
${grouped(TA, ([y, name]) => row(y, name))}
<h2>Fellowships and Awards</h2>
${rows(AWARDS.map(([y, what]) => row(y, what)))}
<h2>Professional Service</h2>
${rows(SERVICE.map(([y, what]) => row(y, what)))}
<h2>Non-Academic Employment</h2>
${rows(EMPLOYMENT.map(([y, what]) => row(y, what)))}
<h2>References</h2>
<ul class="cv-refs">
${REFERENCES.map(([name, title]) => `<li><b>${name}</b><br>${title}<br>${UW}</li>`).join('\n')}
</ul>
<p class="cv-sub">Contact details are in the PDF.</p>
</main>`;
}

// ---- page --------------------------------------------------------------------------------------
export const pages = [
  {
    path: `${ROUTES.cv}index.html`,
    title: 'C.V. · Alfredo Effendy',
    description: 'Curriculum vitae of Alfredo Effendy, Economics Ph.D. candidate at the University of Washington, with the PDF to download.',
    current: 'cv',
    css: ['page', 'cv'],
    body,
  },
];
