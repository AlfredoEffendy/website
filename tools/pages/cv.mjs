// C.V. (cv/index.html): the PDF to download, then only the parts of the C.V. no other page shows
// (education, awards, service, employment, references); research and teaching have their own pages.
// Every fact comes from notes/source/cv.md (transcribed from the September 2026 PDF). Kept off the page
// on purpose: the phone number and the referees' email addresses (both are in the PDF).
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { EMAIL, ROOT, ROUTES } from '../shell.mjs';

const CV_PDF = 'files/alfredo-effendy-cv.pdf';
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
const rows = (list) => `<ul class="cv-rows">\n${list.map(([y, what, sub]) => row(y, what, sub)).join('\n')}\n</ul>`;

function body(root) {
  const size = kb(CV_PDF);
  return `<main id="main" class="page cv">
<h1>C.V.</h1>
<p><a href="${root}${CV_PDF}" download="Alfredo-Effendy-CV.pdf" type="application/pdf">Download C.V. (PDF)</a> · ${CV_DATE}${size ? ` · ${size}` : ''}</p>
<p>Research and teaching: see the <a href="${root}${ROUTES.research}">Research</a> and <a href="${root}${ROUTES.teaching}">Teaching</a> pages.</p>
<p class="cv-addr">${ADDRESS} · <a href="mailto:${EMAIL}">${EMAIL}</a></p>
<h2>Education</h2>
${rows(EDUCATION)}
<h2>Fellowships and Awards</h2>
${rows(AWARDS)}
<h2>Professional Service</h2>
${rows(SERVICE)}
<h2>Non-Academic Employment</h2>
${rows(EMPLOYMENT)}
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
