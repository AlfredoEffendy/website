// Home (index.html): a short introduction in the wording of the author's Google Site, the photo, and
// contact details. Facts only from notes/source/cv.md (which records the Google Site wording).
import { AUTHOR, EMAIL, ROUTES } from '../shell.mjs';

const CV_PDF = 'files/alfredo-effendy-cv.pdf';
const JMP_PDF = 'files/when-yield-curves-invert-together.pdf';

/** Old shared lab runs (/?lab=…) move to Stats Engine; runs in <head> before first paint. */
export const LAB_REDIRECT = `if(/(?:^\\?|&)lab=/.test(location.search))location.replace(${JSON.stringify(ROUTES.labs)}+location.search+location.hash)`;

const body = (root) => `<main id="main" class="page home">
<h1>${AUTHOR}</h1>
<div class="h-grid">
<div class="h-text">
<p>I am an Economics Ph.D. candidate at the University of Washington.</p>
<p>My research interests are in International Finance, Asset Pricing, Risk Management, and Big Data Analysis.</p>
<p class="h-market">I am on the 2026–2027 academic job market.</p>
<p><a href="${root}${CV_PDF}" type="application/pdf">C.V. (PDF)</a> · <a href="${root}${JMP_PDF}" type="application/pdf">Job market paper (PDF)</a></p>
<h2>Contact</h2>
<address>Department of Economics<br>University of Washington<br>319C Savery Hall, Seattle, WA 98195<br><a href="mailto:${EMAIL}">${EMAIL}</a></address>
</div>
<img class="h-photo" src="${root}img/alfredo-effendy-200.webp" srcset="${root}img/alfredo-effendy-200.webp 1x, ${root}img/alfredo-effendy-400.webp 2x" width="200" height="200" alt="${AUTHOR}">
</div>
</main>`;

export const pages = async () => [
  {
    path: 'index.html',
    title: `${AUTHOR} · Economics, University of Washington`,
    description: `${AUTHOR}, Economics Ph.D. candidate at the University of Washington, on the 2026–2027 academic job market: C.V., research and teaching.`,
    current: 'home',
    css: ['page', 'home'],
    extraHead: `<script>${LAB_REDIRECT}</script>\n`,
    body,
  },
];
