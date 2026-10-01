// B BUS 221 (UW Bothell School of Business): course content and the AD–AS interactive's markup.
// Interface: notes/teaching-contract.md. Behaviour: src/pages/courses/bbus-221.ts. Layout: course-bbus-221.css.
// Course facts come only from the sources listed at the bottom; the author's role and years from the C.V.

const ID = 'bbus-221';
const CATALOG = 'https://www.washington.edu/students/crscatb/bbus.html#bbus221';
// UW Bothell School of Business economics pages (hosted on a faculty account), B BUS 221 entry.
const BOTHELL = 'https://faculty.washington.edu/cnedita/index_files/bbus221.htm';
// ECON 201 is the Seattle equivalent of B BUS 221 (stated in the catalogue entry above); Winter 2025 syllabi.
const SYL_A = 'https://econ.washington.edu/sites/econ/files/documents/syllabi/2025/Econ%20201-UW%20Syllabus%20W25.pdf';
const SYL_C = 'https://econ.washington.edu/sites/econ/files/documents/Econ%20201C%20Syllabus%20Winter%202025.pdf';
const SYL_D = 'https://econ.washington.edu/sites/econ/files/documents/syllabi/2025/Syllabus_201D_Wi25.pdf';

// ---- markup helpers (every id carries the course prefix) -------------------------------------------
const v = (sym) => `<i>${sym}</i>`;
const range = (id, label, value, min, max, step, hint = '') =>
  `<div class="field wide b221-range"><span id="${ID}-${id}-l">${label}</span><div class="rangeline"><input type="range" id="${ID}-${id}" aria-labelledby="${ID}-${id}-l"${
    hint ? ` aria-describedby="${ID}-${id}-h"` : ''
  } min="${min}" max="${max}" step="${step}" value="${value}"><output id="${ID}-${id}-v" for="${ID}-${id}">${value}</output></div>${
    hint ? `<small class="b221-hint" id="${ID}-${id}-h">${hint}</small>` : ''
  }</div>`;
const seg = (name, legend, options) =>
  `<fieldset class="seg-set b221-seg-${name}"><legend class="legend">${legend}</legend><div class="seg">${options
    .map(([value, text], i) => `<label><input type="radio" name="${ID}-${name}" value="${value}"${i === 0 ? ' checked' : ''}>${text}</label>`)
    .join('')}</div></fieldset>`;
const stat = (id, label, value, sub, cls = '') =>
  `<div class="stat${cls ? ` ${cls}` : ''}"><span>${label}</span><b id="${ID}-${id}">${value}</b><small id="${ID}-${id}-s">${sub}</small></div>`;
const slot = (k, sym, cls = '') => `<span class="slot${cls ? ` ${cls}` : ''}" data-k="${k}" data-sym="${sym}">${sym}</span>`;
const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;

const tool = () => `<div class="c-split b221" id="${ID}-tool">
<div class="c-panel b221-panel">
${range('demand', 'Demand shock', 0, -6, 6, 0.5)}
${range('supply', 'Supply shock', 0, -6, 6, 0.5)}
${seg('policy', 'Policy response', [['none', 'None'], ['fiscal', 'Fiscal'], ['monetary', 'Monetary']])}
<div class="b221-policy" id="${ID}-policy" hidden>
<div data-for="fiscal" hidden>${range('g', `Government purchases Δ${v('G')}`, 0, -5, 5, 0.1, 'Change in spending, % of potential GDP')}</div>
<div data-for="monetary" hidden>${range('i', `Interest rate Δ${v('i')}`, 0, -5, 5, 0.1, 'Each 1-point cut adds 1% of potential GDP to investment (illustrative)')}</div>
${range('mpc', 'Marginal propensity to consume', 0.6, 0.5, 0.8, 0.05)}
</div>
${seg('run', 'Horizon', [['short', 'Short run'], ['long', 'Long run']])}
<div class="b221-actions"><button class="btn primary" id="${ID}-close" type="button">Close the gap</button><button class="btn quiet" id="${ID}-reset" type="button">Reset</button></div>
</div>
<div class="c-out">
<figure class="figure b221-fig">
<div class="fig-head"><span class="fig-title">Aggregate demand and supply</span><span class="badge b221-ill">Illustrative</span></div>
<div class="fig-body">
<span class="fig-y">Price level</span>
<div class="plot" id="${ID}-plot" role="img" aria-label="Aggregate demand and aggregate supply diagram: real GDP across, price level up. Description below the chart."></div>
<span class="fig-x">Real GDP, % of potential</span>
</div>
<p class="key"><span class="k-acc k-line">Now</span><span class="k-gold k-line">Before the shock</span><span class="k-ink k-line">Potential output (LRAS)</span><span class="k-pop">Output gap</span></p>
</figure>
<div class="stats b221-stats">
${stat('y', `Real GDP ${v('Y')}`, '100.0', 'before 100', 'hero')}
${stat('p', `Price level ${v('P')}`, '100.0', 'before 100')}
${stat('gap', 'Output gap', '0.0%', 'none')}
${stat('mult', 'Multiplier', '×2.5', 'MPC 0.60', 'theory')}
</div>
<div class="eq-block">
<div class="eq-set">
<div class="eq" id="${ID}-eq-m" role="math"><span class="eq-cap">Spending multiplier</span><div class="eq-row" aria-hidden="true">Δ${v('AD')} = Δ${v('A')} × ${frac('1', '1 − MPC')}</div><div class="eq-row eq-num" aria-hidden="true">Δ${v('AD')} = ${slot('a', 'ΔA')} × ${frac('1', `1 − ${slot('mpc', 'MPC')}`)} = ${slot('ad', 'ΔAD', 'res')}</div></div>
<div class="eq" id="${ID}-eq-g" role="math"><span class="eq-cap">Output gap</span><div class="eq-row" aria-hidden="true">gap = ${frac(`${v('Y')} − ${v('Y')}<sup>*</sup>`, `${v('Y')}<sup>*</sup>`)}</div><div class="eq-row eq-num" aria-hidden="true">gap = ${frac(`${slot('y', 'Y')} − 100`, '100')} = ${slot('gap', 'gap', 'res')}</div></div>
</div>
<p class="eq-note" id="${ID}-note" aria-live="polite">At potential output: no gap. Move a shock.</p>
</div>
</div>
</div>`;

export const course = {
  slug: ID,
  code: 'B BUS 221',
  // The catalogue's title; the C.V. lists the course as "Introduction Macroeconomics".
  title: 'Introduction to Macroeconomics',
  unit: 'School of Business, University of Washington Bothell',
  role: 'Instructor',
  when: 'Winter and Spring 2026', // quarters confirmed by the author (2026-10-01); the C.V. gives 2026
  whenSource: null, // no public UW page names the quarters
  catalog: {
    text: 'Analysis of the aggregate economy: national income, inflation, business fluctuations, unemployment, monetary system, federal budget, international trade and finance.',
    url: CATALOG,
    credits: 5,
  },
  summary:
    'Measure output, prices and jobs; explain long-run growth and short-run fluctuations; and use aggregate demand and supply to trace how shocks and fiscal or monetary policy move real GDP and the price level.',
  concepts: [
    {
      title: 'Measuring the economy',
      body: 'Gross domestic product, the consumer price index, inflation and unemployment: how each is calculated and how to read it.',
      source: SYL_D,
    },
    {
      title: 'Long-run growth',
      body: 'What determines output in the long run: physical capital, human capital, infrastructure and institutions; and how saving and investment meet in financial markets.',
      source: SYL_C,
    },
    {
      title: 'Spending and the multiplier',
      body: 'The income–expenditure model (the Keynesian cross): extra spending becomes someone’s income, part of which is spent again, so output changes by a multiple of the first change.',
      source: SYL_C,
    },
    {
      title: 'Aggregate demand and supply',
      body: 'Graphs of aggregate demand and aggregate supply, used to analyse how shocks and policy changes affect real GDP and the price level.',
      source: SYL_A,
    },
    {
      title: 'Fiscal and monetary policy',
      body: 'Government spending and taxes, and the central bank: what each can do about unemployment and inflation, and the limits of each.',
      source: BOTHELL,
    },
    {
      title: 'Exchange rates and the balance of payments',
      body: 'How exchange rates are determined and how a country’s trade and financial flows with the rest of the world are recorded.',
      source: SYL_A,
    },
  ],
  interactive: {
    title: 'Shocks and policy in the AD–AS model',
    lead: 'Shift demand or production costs, then let wages and prices adjust, or respond with fiscal or monetary policy. Purple is now, gold is before the shock.',
    html: () => tool(),
    entry: 'src/pages/courses/bbus-221.ts',
    css: ['course-bbus-221'],
  },
  labs: [],
  sources: [
    { label: 'UW course catalogue (Bothell): B BUS 221', url: CATALOG },
    { label: 'UW Bothell School of Business, economics courses: B BUS 221', url: BOTHELL },
    { label: 'ECON 201 A syllabus, Winter 2025 (UW Economics; catalogue equivalent of B BUS 221)', url: SYL_A },
    { label: 'ECON 201 C syllabus, Winter 2025 (UW Economics)', url: SYL_C },
    { label: 'ECON 201 D syllabus, Winter 2025 (UW Economics)', url: SYL_D },
  ],
};
