// Research (research/index.html): working papers and work in progress, as on a typical faculty page:
// the job market paper's title linking to its PDF, with the abstract; then the work in progress with its
// C.V. descriptions. Text from the paper (notes/source/jmp.txt) and notes/source/cv.md. The C.V. page
// does not repeat any of this; it points here.
import { AUTHOR } from '../shell.mjs';

const PDF = 'files/when-yield-curves-invert-together.pdf';

/** Work in progress: title and the C.V.'s description, verbatim. */
const IN_PROGRESS = [
  ['Maintaining Carry Structure in Machine Learning Carry Trade',
    'Many machine learning carry trade papers focus on returns predictability and at times forgo the carry trade structure. ' +
    'This paper is utilizing time series machine learning methods such as GRU, LSTM and their ensemble to predict carry trade crashes while maintaining the carry structure.'],
  ['Cross-Asset Inversion Clocks',
    'This paper analyzes the individual and clusters of yield curve inversions and their impact on different asset markets, such as the equity, commodity, and credit market. ' +
    'It further asks whether the age of the inversions have different effects across multiple assets.'],
];

const PAPER = {
  title: 'When Yield Curves Invert Together: Currency Crash Risk',
  // The paper's abstract, verbatim (PDF p. 1; notes/source/jmp.txt).
  abstract:
    'A yield-curve inversion is a well-documented leading indicator of domestic slowdown, but a single inversion does not reveal whether the expected slowdown is country-specific or global. This distinction, however, decisively predicts the asset market response to the impending slowdown. In a portfolio of currencies, such as the carry trade, currency-specific risk might be diversified, while systematic risk is affecting every risky currency. I show that a signal constructed from clustered inversions predicts crashes in high-interest and high-beta currencies, and the carry trade. This result plays a role in giving an early warning to avoid the well-known carry trade crashes. Further conditioning on the slope shape of global yield curves refines the signal to distinguish between inversions driven by slowing growth expectations versus inflation-fighting monetary policies. The latter comes with a higher interest rates environment, which provides a higher compensation for the carry trade crash risk.',
};

export const pages = [
  {
    path: 'research/index.html',
    title: `Research · ${AUTHOR}`,
    description: `${AUTHOR}'s research: the job market paper "${PAPER.title}" and work in progress.`,
    current: 'research',
    css: ['page', 'research'],
    body: (root) => `<main id="main" class="page research">
<h1>Research</h1>
<h2>Working Papers</h2>
<article class="r-paper">
<h3><a href="${root}${PDF}" type="application/pdf">${PAPER.title}</a> <span class="r-tag">(Job Market Paper)</span></h3>
<p class="r-abstract">${PAPER.abstract}</p>
</article>
<h2>Work in Progress</h2>
${IN_PROGRESS.map(([title, description]) => `<article class="r-paper">
<h3>${title}</h3>
<p class="r-abstract">${description}</p>
</article>`).join('\n')}
</main>`,
  },
];
