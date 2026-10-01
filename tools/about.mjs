// The one-paragraph "About Me" that closes every page in the About Me menu (Research, Teaching,
// C.V.). One text, shared everywhere; facts only from notes/source/cv.md and the job market paper.
import { EMAIL, PROFILE } from './shell.mjs';

/** Sections whose pages end with the About Me paragraph (matches a page's `current`). */
export const ABOUT_SECTIONS = new Set(['research', 'teaching', 'cv']);

export const ABOUT_TEXT =
  'I am a Ph.D. candidate in Economics at the University of Washington (expected 2027) and on the 2026–2027 academic job market. ' +
  'I work on international finance, asset pricing, risk management and big data analysis. ' +
  'My job market paper shows that when several countries’ yield curves invert at the same time, currencies face elevated crash risk, ' +
  'and the high-interest-rate currencies that carry trades buy depreciate more than the low-rate currencies that fund them. ' +
  'I have taught introductory and intermediate macroeconomics, microeconomics and statistics as the instructor at the University of Washington, ' +
  'and hold degrees in statistics, mathematics, quantitative economics and chemical engineering.';

export function aboutMe() {
  return `<section class="about-me" aria-labelledby="about-me-h">
<div class="about-me-inner">
<h2 id="about-me-h">About Me</h2>
<p>${ABOUT_TEXT}</p>
<p class="about-me-links"><a class="arrow" href="${PROFILE}" target="_blank" rel="noopener">University of Washington Economics profile</a><a href="mailto:${EMAIL}">${EMAIL}</a></p>
</div>
</section>`;
}
