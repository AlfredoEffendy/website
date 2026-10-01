// ECON 200 (UW Department of Economics): course content and the market-intervention interactive's markup.
// Interface: notes/teaching-contract.md. Behaviour: src/pages/courses/econ-200.ts. Layout: course-econ-200.css.
// Course facts come only from the sources listed at the bottom; the author's role and year from the C.V.,
// the quarter from the department's course page for his section.

const ID = 'econ-200';
const CATALOG = 'https://www.washington.edu/students/crscat/econ.html#econ200';
// UW Economics course page for section B, Summer 2024: names Alfredo Effendy as the instructor.
const SECTION = 'https://econ.washington.edu/courses/2024/summer/econ/200/b';
// His syllabus for that section (objectives; outline by chapter of Karlan and Morduch, Microeconomics, 3e).
const SYL = 'https://econ.washington.edu/sites/econ/files/documents/ECON%20200%20Effendy%20Summer%202024%20Syllabus.pdf';
// The department's list of Summer 2024 syllabi, which links the one above.
const TERM = 'https://econ.washington.edu/summer-2024';

// ---- markup helpers (every id carries the course prefix) -------------------------------------------
const v = (sym) => `<i>${sym}</i>`;
const range = (id, label, value, min, max, step, shown) =>
  `<div class="field wide e200-range"><span id="${ID}-${id}-l">${label}</span><div class="rangeline"><input type="range" id="${ID}-${id}" aria-labelledby="${ID}-${id}-l" min="${min}" max="${max}" step="${step}" value="${value}"><output id="${ID}-${id}-v" for="${ID}-${id}">${shown}</output></div></div>`;
const seg = (name, legend, opts) =>
  `<fieldset class="seg-set"><legend class="legend">${legend}</legend><div class="seg">${opts
    .map(([val, text], i) => `<label><input type="radio" name="${ID}-${name}" value="${val}"${i === 0 ? ' checked' : ''}>${text}</label>`)
    .join('')}</div></fieldset>`;
const stat = (id, label, cls = '') =>
  `<div class="stat${cls ? ` ${cls}` : ''}"><span id="${ID}-${id}-l">${label}</span><b id="${ID}-${id}">—</b><small id="${ID}-${id}-s"></small></div>`;
const slot = (k, sym, cls = '') => `<span class="slot${cls ? ` ${cls}` : ''}" data-k="${k}" data-sym="${sym}">${sym}</span>`;
const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const QS = `${v('Q')}*`;
const Q = v('Q');
const sub = (s) => `${v('P')}<sub>${s}</sub>`;
/** One row of the quantity equation per policy; the script shows the one in use. */
const qRow = (mode, sym, num) =>
  `<div data-for="${mode}"><div class="eq-row" aria-hidden="true">${Q} = ${sym}</div><div class="eq-row eq-num" aria-hidden="true">${Q} = ${num} = ${slot('q', 'Q', 'res')}</div></div>`;

const tool = () => `<div class="c-split e200" id="${ID}-tool">
<div class="c-panel e200-panel">
${seg('mode', 'Policy', [
  ['tax', 'Tax'],
  ['ceil', 'Ceiling'],
  ['floor', 'Floor'],
])}
<div class="e200-grp" data-for="tax">
${range('t', `Tax per unit ${v('t')}`, 4, 0, 12, 0.5, '4.0')}
${seg('on', 'Collected from', [
  ['s', 'Sellers'],
  ['b', 'Buyers'],
])}
</div>
<div class="e200-grp" data-for="ceil floor" hidden>
${range('pc', `Price ceiling ${sub('max')}`, 7, 2, 20, 0.25, '7.00')}
</div>
${range('b', `Demand slope ${v('b')}`, 0.6, 0.25, 2, 0.05, '0.60')}
${range('d', `Supply slope ${v('d')}`, 0.4, 0.25, 2, 0.05, '0.40')}
<div class="e200-actions"><button class="btn quiet" id="${ID}-reset" type="button">Reset</button></div>
<p class="e200-ill">Illustrative curves: demand ${v('P')} = 20 − ${v('bQ')}, supply ${v('P')} = 2 + ${v('dQ')}. Steeper means less elastic.</p>
</div>
<div class="c-out e200-out">
<figure class="figure e200-fig">
<div class="fig-head"><span class="fig-title">One market</span><span class="badge e200-badge">Illustrative</span></div>
<div class="fig-body">
<span class="fig-y">Price, ${v('P')}</span>
<div class="plot" id="${ID}-plot" role="img" aria-label="Supply and demand diagram: quantity across, price up. Shaded areas show consumer surplus, producer surplus, tax revenue and deadweight loss; values are in the read-outs below."></div>
<span class="fig-x">Quantity, ${Q}</span>
</div>
<p class="key"><span class="e200-k-cs">Consumer surplus</span><span class="e200-k-ps">Producer surplus</span><span class="e200-k-rev" data-for="tax">Tax revenue</span><span class="e200-k-dwl">Deadweight loss</span><span class="k-acc k-line">With policy</span><span class="k-gold k-line">Free market</span></p>
</figure>
<div class="stats e200-stats">
${stat('q', 'Quantity', 'hero')}
${stat('pb', 'Buyers pay')}
${stat('ps', 'Sellers receive')}
${stat('x', 'Buyers’ share', 'e200-x')}
${stat('cs', 'Consumer surplus')}
${stat('pr', 'Producer surplus')}
${stat('y', 'Tax revenue')}
${stat('dwl', 'Deadweight loss', 'loss')}
</div>
<div class="eq-block">
<div class="eq-set">
<div class="eq" id="${ID}-eq-q" role="math"><span class="eq-cap">Quantity traded</span>
${qRow(
  'tax',
  frac(`${v('a')} − ${v('c')} − ${v('t')}`, `${v('b')} + ${v('d')}`),
  frac(`${slot('a', 'a')} − ${slot('c', 'c')} − ${slot('t', 't')}`, `${slot('b', 'b')} + ${slot('d', 'd')}`),
)}
${qRow(
  'ceil',
  `min(${QS}, ${frac(`${sub('max')} − ${v('c')}`, v('d'))})`,
  `min(${slot('qs', 'Q*')}, ${frac(`${slot('pc', 'P')} − ${slot('c', 'c')}`, slot('d', 'd'))})`,
)}
${qRow(
  'floor',
  `min(${QS}, ${frac(`${v('a')} − ${sub('min')}`, v('b'))})`,
  `min(${slot('qs', 'Q*')}, ${frac(`${slot('a', 'a')} − ${slot('pc', 'P')}`, slot('b', 'b'))})`,
)}
</div>
<div class="eq" id="${ID}-eq-dwl" role="math"><span class="eq-cap">Deadweight loss</span><div class="eq-row" aria-hidden="true">DWL = ${frac(1, 2)} [${v('D')}(${Q}) − ${v('S')}(${Q})] (${QS} − ${Q})</div><div class="eq-row eq-num" aria-hidden="true">DWL = ${frac(1, 2)} × ${slot('gap', 'w')} × (${slot('qs', 'Q*')} − ${slot('q', 'Q')}) = ${slot('dwl', 'DWL', 'res')}</div></div>
</div>
<p class="eq-note" id="${ID}-note" aria-live="polite"></p>
</div>
</div>
</div>`;

export const course = {
  slug: ID,
  code: 'ECON 200',
  title: 'Introduction to Microeconomics',
  unit: 'Department of Economics, University of Washington',
  role: 'Instructor',
  when: 'Summer 2024',
  whenSource: SECTION,
  catalog: {
    text: 'Analysis of markets: consumer demand, production, exchange, the price system, resource allocation, government intervention.',
    url: CATALOG,
    credits: 5,
  },
  summary:
    'Use supply and demand to analyse markets: measure the gains from trade, and predict how taxes, price controls, international trade, externalities and market power change prices, quantities and welfare.',
  concepts: [
    {
      title: 'Opportunity cost and gains from trade',
      body: 'Scarcity forces choices, and the cost of a choice is the best alternative given up. Differences in opportunity cost create comparative advantage, so specialisation and exchange can leave both sides better off.',
      source: SYL,
    },
    {
      title: 'Supply and demand',
      body: 'How buyers and sellers respond to prices, what shifts each curve, and how a competitive market settles where the quantity demanded equals the quantity supplied.',
      source: SYL,
    },
    {
      title: 'Elasticity',
      body: 'How strongly the quantity demanded or supplied responds to a change in price, and why that response decides how far a market moves after a shock.',
      source: SYL,
    },
    {
      title: 'Efficiency and government intervention',
      body: 'Consumer and producer surplus measure the gains from trade. Taxes, subsidies and price controls move prices and quantities away from equilibrium; the trades that no longer happen are a deadweight loss.',
      source: SYL,
    },
    {
      title: 'International trade and externalities',
      body: 'Who gains and who loses when a market opens to trade, and why costs or benefits that fall on people outside a transaction lead markets to produce too much or too little.',
      source: SYL,
    },
    {
      title: 'Firms and market structure',
      body: 'How firms decide what to produce, then how price and output differ under perfect competition, monopoly, monopolistic competition and oligopoly.',
      source: SYL,
    },
  ],
  interactive: {
    title: 'Taxes and price controls in a market',
    lead: 'Set a per-unit tax, a price ceiling or a price floor and change how steep demand and supply are. Purple is the market with the policy, gold the free market.',
    html: () => tool(),
    entry: 'src/pages/courses/econ-200.ts',
    css: ['course-econ-200'],
  },
  labs: [],
  sources: [
    { label: 'UW course catalogue: ECON 200', url: CATALOG },
    { label: 'UW Economics: ECON 200 B, Summer 2024', url: SECTION },
    { label: 'ECON 200 B syllabus, Summer 2024 (UW Economics)', url: SYL },
    { label: 'UW Economics: Summer 2024 course syllabi', url: TERM },
  ],
};
