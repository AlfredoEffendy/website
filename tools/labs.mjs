// Content and static markup for the six labs. Ids here are the contract with src/labs/*.ts;
// the generator prefixes every id with the lab's slug so all six can live in one document.

// ---- markup helpers ------------------------------------------------------------------------
const field = (id, label, value, { min, max, step = 'any', wide = false } = {}) =>
  `<label class="field${wide ? ' wide' : ''}"><span>${label}</span><input id="${id}" type="number" inputmode="decimal" enterkeyhint="done" value="${value}"${
    min !== undefined ? ` min="${min}"` : ''
  }${max !== undefined ? ` max="${max}"` : ''} step="${step}"></label>`;
const select = (id, label, options, wide = false) =>
  `<label class="field${wide ? ' wide' : ''}"><span>${label}</span><select id="${id}">${options
    .map(([v, t], i) => `<option value="${v}"${i === 0 ? ' selected' : ''}>${t}</option>`)
    .join('')}</select></label>`;
const btn = (id, text, cls = '', extra = '') => `<button class="btn ${cls}" id="${id}" type="button"${extra}>${text}</button>`;
const check = (id, text, on = true) => `<label class="check"><input id="${id}" type="checkbox"${on ? ' checked' : ''}>${text}</label>`;
const seg = (name, legend, options) =>
  `<fieldset class="seg-set"><legend class="legend">${legend}</legend><div class="seg">${options
    .map(([v, t], i) => `<label><input type="radio" name="${name}" value="${v}"${i === 0 ? ' checked' : ''}>${t}</label>`)
    .join('')}</div></fieldset>`;
const stat = (id, label, { cls = '', sub = '' } = {}) =>
  `<div class="stat${cls ? ' ' + cls : ''}"><span id="${id}Label">${label}</span><b id="${id}">—</b>${sub ? `<small id="${sub}"></small>` : ''}</div>`;
const editable = (id, cls, text, label) =>
  `<span class="${cls}" id="${id}" contenteditable="plaintext-only" role="textbox" aria-label="${label} (editable)" spellcheck="false" data-default="${text}">${text}</span>`;

/** Chart frame: click-to-edit title and axis labels, export buttons, the plot, and its key. */
const figure = ({ title, x, y, height = '', aria, key, status = '', overlay = '' }, loader = '') => `
<figure class="figure">
<div class="fig-head">${editable('figTitle', 'fig-title', title, 'Chart title')}
<div class="fig-tools">${btn('png', 'PNG', 'sm', ' title="Download this chart as an image"')}${btn('csv', 'CSV', 'sm', ' title="Download the data behind this chart"')}<button class="btn sm fig-fold" type="button" aria-expanded="true" aria-label="Hide chart" title="Hide or show the chart"></button></div></div>
${status}
<div class="fig-body">
${editable('figY', 'fig-y', y, 'Vertical axis label')}
<div class="plot" id="plot"${height ? ` style="--h:${height}"` : ''} role="img" aria-label="${aria}">${loader}${overlay}</div>
${editable('figX', 'fig-x', x, 'Horizontal axis label')}
</div>
<p class="key">${key}</p>
</figure>`;

// Equation pieces. `s(key, symbol)` is a slot the script fills with that run's number.
const v = (sym) => `<i>${sym}</i>`;
const s = (k, sym = '', cls = '') => `<span class="slot${cls ? ' ' + cls : ''}" data-k="${k}"${sym ? ` data-sym="${sym}"` : ''}>${sym || '…'}</span>`;
const res = (k) => s(k, '', 'res');
const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const sqrt = (x) => `<span class="sqrt"><span>${x}</span></span>`;
const eq = (id, caption, sym, numRow, attrs = '') =>
  `<div class="eq" id="${id}" role="math"${attrs}><span class="eq-cap">${caption}</span><div class="eq-row" aria-hidden="true">${sym}</div><div class="eq-row eq-num" aria-hidden="true">${numRow}</div></div>`;
const equations = (body, single = false) =>
  `<div class="eq-block"><div class="eq-set"${single ? ' id="eqs"' : ''}>${body}</div><p class="eq-note" id="eqNote" aria-live="polite"></p></div>`;
const seedRow = (seed) =>
  `<div class="seedrow"><label class="field"><span>Seed</span><input id="seed" type="text" inputmode="numeric" value="${seed}" title="The same seed and settings always give the same run. The address bar holds both, so the link is shareable."></label>${btn('newSeed', 'New')}</div>`;
const DISTS4 = [
  ['uniform', 'Uniform'],
  ['normal', 'Normal'],
  ['exp', 'Skewed (exponential)'],
  ['bimodal', 'Bimodal'],
];

// Tab glyphs: 20×20, stroked.
const glyph = (d) => `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

// ---- 01 discrete ---------------------------------------------------------------------------
const discrete = {
  slug: 'discrete',
  no: '01',
  name: 'Discrete',
  full: 'Discrete distributions',
  ask: 'How often does each outcome come up?',
  dataHint: 'Click a bar to pick an outcome.',
  icon: glyph('<path d="M4 16V9M8 16V5M12 16V7M16 16v-4"/>'),
  inputs: `
<div class="fields">
${select('dist', 'Distribution', [['uniform', 'Discrete uniform'], ['binomial', 'Binomial'], ['poisson', 'Poisson']], true)}
<div id="params" style="display:contents">
<div data-for="uniform">${field('uMin', `Smallest ${v('a')}`, 1, { min: -1000, max: 1000, step: 1 })}${field('uMax', `Largest ${v('b')}`, 8, { min: -1000, max: 1000, step: 1 })}</div>
<div data-for="binomial" hidden>${field('bN', `Trials ${v('n')}`, 20, { min: 1, max: 1000, step: 1 })}${field('bP', `Chance ${v('π')}`, 0.2, { min: 0, max: 1, step: 0.05 })}</div>
<div data-for="poisson" hidden>${field('pLam', `Rate ${v('λ')}`, 4, { min: 0.1, max: 200, step: 0.5 })}${select('pUnit', 'Per', [['hour', 'hour'], ['second', 'second'], ['minute', 'minute'], ['day', 'day']])}</div>
</div>
${field('count', 'Batch', 100, { min: 1, max: 50000, step: 1, wide: true })}
</div>
<div class="actions">${btn('one', 'Run one')}${btn('many', 'Run batch', 'primary')}${btn('clear', 'Clear', 'quiet wide')}</div>
<div class="toggles">${check('theory', 'Theory')}</div>
<details class="opts"><summary>Options</summary><div class="fields">${field('delay', 'Reveal delay (ms)', 0, { min: 0, max: 10000, step: 100, wide: true })}</div></details>`,
  figure: {
    title: 'Outcomes so far',
    x: 'Outcome',
    y: 'Count',
    aria: 'Bar chart of how often each outcome has occurred',
    key: '<span>Observed</span><span class="k-acc">Latest outcome</span><span class="k-gold k-line">Expected by the formula</span>',
  },
  stats: `${stat('resValue', 'Outcome', { cls: 'hero' })}${stat('sN', 'Experiments')}${stat('sMean', 'Mean', { sub: 'tMean' })}${stat('sSd', 'SD', { sub: 'tSd' })}`,
  equation: equations(
    `${eq('eqU', 'Discrete uniform', `${v('P')}(${v('X')} = ${v('k')}) = ${frac('1', `${v('b')} − ${v('a')} + 1`)}`, `${v('P')}(${v('X')} = ${s('k', 'k')}) = ${frac('1', `${s('b', 'b')} − ${s('a', 'a')} + 1`)} = ${res('P')}`, ' data-for="uniform"')}
${eq('eqB', 'Binomial', `${v('P')}(${v('X')} = ${v('k')}) = <span class="binom"><span>${v('n')}</span><span>${v('k')}</span></span> ${v('π')}<sup>${v('k')}</sup> (1 − ${v('π')})<sup>${v('n')} − ${v('k')}</sup>`, `${v('P')}(${v('X')} = ${s('k', 'k')}) = ${s('C', 'C')} · ${s('p', 'π')}<sup>${s('k', 'k')}</sup> · ${s('q', '1−π')}<sup>${s('nk', 'n−k')}</sup> = ${res('P')}`, ' data-for="binomial" hidden')}
${eq('eqP', 'Poisson', `${v('P')}(${v('X')} = ${v('k')}) = ${frac(`${v('λ')}<sup>${v('k')}</sup> ${v('e')}<sup>−${v('λ')}</sup>`, `${v('k')}!`)}`, `${v('P')}(${v('X')} = ${s('k', 'k')}) = ${frac(`${s('lam', 'λ')}<sup>${s('k', 'k')}</sup> · ${v('e')}<sup>−${s('lam', 'λ')}</sup>`, `${s('k', 'k')}!`)} = ${res('P')}`, ' data-for="poisson" hidden')}`,
    true,
  ),
  seed: 101,
  see: 'Bars count each outcome. Gold marks what the formula expects after the same number of runs.',
  why: 'A probability is a long-run share. The more runs, the closer the bars sit to the gold.',
  steps: [
    '<b>Run one</b> a few times. No single outcome can be predicted.',
    'Run 10,000. The shape settles.',
    '<b>Binomial:</b> move <i>π</i> from 0.2 to 0.8 and watch the pile cross over.',
  ],
  glossary: [
    ['k', 'the outcome in question'],
    ['a, b', 'smallest and largest value'],
    ['n', 'trials per experiment'],
    ['π', 'chance of success per trial'],
    ['λ', 'average events per unit of time'],
  ],
};

// ---- 02 continuous -------------------------------------------------------------------------
const continuous = {
  slug: 'continuous',
  no: '02',
  name: 'Continuous',
  full: 'Continuous distributions',
  ask: 'What share of values falls between two points?',
  dataHint: 'Click a bar to list its values. Edit any value.',
  icon: glyph('<path d="M2 16c4 0 5-12 8-12s4 12 8 12"/>'),
  inputs: `
<div class="fields">
${select('dist', 'Distribution', [['normal', 'Normal'], ['uniform', 'Uniform'], ['exponential', 'Exponential']], true)}
<div id="params" style="display:contents">
<div data-for="normal">${field('nMu', `Mean ${v('μ')}`, 100, { min: -1e6, max: 1e6 })}${field('nSigma', `SD ${v('σ')}`, 15, { min: 0.001, max: 1e6 })}</div>
<div data-for="uniform" hidden>${field('uA', 'Minimum', 0, { min: -1e6, max: 1e6 })}${field('uB', 'Maximum', 100, { min: -1e6, max: 1e6 })}</div>
<div data-for="exponential" hidden>${field('eRate', `Rate ${v('λ')}`, 0.05, { min: 0.0001, max: 1e4, wide: true })}</div>
</div>
${field('count', 'Batch', 1000, { min: 1, max: 50000, step: 1, wide: true })}
${field('lo', `From ${v('a')}`, 85)}${field('hi', `To ${v('b')}`, 115)}
</div>
<div class="actions">${btn('one', 'Add one')}${btn('many', 'Generate', 'primary')}${btn('clear', 'Clear', 'quiet wide')}</div>
<div class="toggles">${check('theory', 'Theory')}${check('markers', 'Markers')}</div>`,
  figure: {
    title: 'Sample and density',
    x: 'Value',
    y: 'Count',
    aria: 'Histogram of the sample with the theoretical density curve',
    key: '<span class="k-acc">Inside the interval</span><span>Outside</span><span class="k-gold k-line">Theoretical density</span>',
    overlay: `<button class="handle" id="hLo" type="button" role="slider" aria-label="Lower marker a" hidden><span>85</span></button><button class="handle" id="hHi" type="button" role="slider" aria-label="Upper marker b" hidden><span>115</span></button>`,
  },
  stats: `${stat('pEmp', 'In your sample', { cls: 'hero', sub: 'pEmpSub' })}${stat('pTheo', 'In theory', { cls: 'theory' })}${stat('sN', 'Sample size')}${stat('sMean', 'Mean', { sub: 'tMean' })}${stat('sSd', 'SD', { sub: 'tSd' })}`,
  equation: equations(
    `${eq('eqN', 'Normal', `${v('P')}(${v('a')} &lt; ${v('X')} &lt; ${v('b')}) = Φ(${frac(`${v('b')} − ${v('μ')}`, v('σ'))}) − Φ(${frac(`${v('a')} − ${v('μ')}`, v('σ'))})`, `= Φ(${frac(`${s('b', 'b')} − ${s('mu', 'μ')}`, s('sigma', 'σ'))}) − Φ(${frac(`${s('a', 'a')} − ${s('mu', 'μ')}`, s('sigma', 'σ'))}) = Φ(${s('zb')}) − Φ(${s('za')}) = ${res('P')}`, ' data-for="normal"')}
${eq('eqU', 'Uniform', `${v('P')}(${v('a')} &lt; ${v('X')} &lt; ${v('b')}) = ${frac(`${v('b')} − ${v('a')}`, 'max − min')}`, `= ${frac(`${s('b', 'b')} − ${s('a', 'a')}`, `${s('max', 'max')} − ${s('min', 'min')}`)} = ${res('P')}`, ' data-for="uniform" hidden')}
${eq('eqE', 'Exponential', `${v('P')}(${v('a')} &lt; ${v('X')} &lt; ${v('b')}) = ${v('e')}<sup>−${v('λ')}${v('a')}</sup> − ${v('e')}<sup>−${v('λ')}${v('b')}</sup>`, `= ${v('e')}<sup>−${s('lam', 'λ')} · ${s('a', 'a')}</sup> − ${v('e')}<sup>−${s('lam', 'λ')} · ${s('b', 'b')}</sup> = ${res('P')}`, ' data-for="exponential" hidden')}`,
    true,
  ),
  seed: 202,
  see: 'Bars are your sample. The gold curve is the true density. The markers pick an interval.',
  why: 'Probability is area under the curve. A bigger sample tracks that area more closely.',
  steps: [
    'Markers at 85 and 115: theory says 68.27%.',
    'Move them to 70 and 130: about 95.45%.',
    'Clear, add points one at a time, then generate 50,000.',
  ],
  glossary: [
    ['a, b', 'the two markers'],
    ['μ, σ', 'mean and standard deviation'],
    ['Φ', 'area to the left of a z-score'],
    ['λ', 'exponential rate; the mean is 1/λ'],
  ],
};

// ---- 03 CLT mean ---------------------------------------------------------------------------
const cltMean = {
  slug: 'clt-mean',
  no: '03',
  name: 'Sample means',
  full: 'Sampling distribution of the mean',
  ask: 'How much does a sample mean vary?',
  dataHint: 'Edit the current sample, or click a bar to list its means.',
  icon: glyph('<path d="M2 16c4 0 5-10 8-10s4 10 8 10M10 3v13"/>'),
  inputs: `
<div class="fields">
${select('dist', 'Population', DISTS4, true)}
${field('n', `Sample size ${v('n')}`, 5, { min: 1, max: 500, step: 1 })}
${field('count', 'Batch', 1000, { min: 1, max: 50000, step: 1 })}
</div>
<div class="actions">${btn('one', 'Draw one')}${btn('many', 'Draw batch', 'primary')}${btn('clear', 'Reset', 'quiet wide')}</div>
<div class="toggles">${check('theory', 'Theory')}</div>
<details class="opts"><summary>Options</summary><div class="fields">${field('xmax', 'Axis maximum', 1000, { min: 100, max: 5000, step: 100, wide: true })}</div></details>`,
  figure: {
    title: 'From population to sample means',
    x: 'Value',
    y: 'Count of sample means',
    height: '31rem',
    aria: 'Three stacked charts: the population, the current sample, and the distribution of sample means',
    key: '<span class="k-pop">Population</span><span class="k-ink">Observations</span><span>Sample means</span><span class="k-gold k-line">Normal curve from the theorem</span>',
  },
  stats: `${stat('sN', 'Samples', { cls: 'hero' })}${stat('sMean', 'Mean of means', { sub: 'tMean' })}${stat('sSe', 'SD of means', { sub: 'tSe' })}`,
  equation: equations(
    `${eq('eqMean', 'This sample', `${v('x̄')} = ${frac(`${v('x')}<sub>1</sub> + ${v('x')}<sub>2</sub> + … + ${v('x')}<sub>${v('n')}</sub>`, v('n'))}`, `${v('x̄')} = ${frac(s('sum', 'Σx'), s('n', 'n'))} = ${res('xbar')}`)}
${eq('eqSe', 'All samples', `SE(${v('x̄')}) = ${frac(v('σ'), sqrt(v('n')))}`, `SE(${v('x̄')}) = ${frac(s('sigma', 'σ'), sqrt(s('n', 'n')))} = ${res('se')}`)}`,
  ),
  seed: 303,
  see: 'Top: the population. Middle: one sample and its mean. Bottom: every mean so far.',
  why: 'Highs and lows cancel inside a sample, so means spread by only <i>σ</i>/√<i>n</i> and pile into a bell.',
  steps: [
    '<b>Draw one</b> and follow the triangle down.',
    'Compare <i>n</i> = 5 with <i>n</i> = 30: the pile narrows about 2.4 times.',
    'Pick the skewed population. By <i>n</i> = 30 the means are still a bell.',
  ],
  glossary: [
    ['x̄', 'mean of one sample'],
    ['n', 'observations per sample'],
    ['μ, σ', 'population mean and SD'],
    ['SE', 'standard deviation of the sample means'],
  ],
};

// ---- 04 CLT proportion ---------------------------------------------------------------------
const cltProp = {
  slug: 'clt-proportion',
  no: '04',
  name: 'Proportions',
  full: 'Sampling distribution of the proportion',
  ask: 'When is a bell curve fair for a proportion?',
  dataHint: 'Click a bar to pick a proportion.',
  icon: glyph('<circle cx="5" cy="6" r="1.6" fill="currentColor"/><circle cx="10" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><path d="M3 16h14M5 16v-3M10 16v-5M15 16v-2"/>'),
  inputs: `
<div class="fields">
<label class="field wide"><span>Population proportion ${v('p')}</span><span class="rangeline"><input id="p" type="range" min="0.01" max="0.99" step="0.01" value="0.05"><output id="pOut" for="p">0.05</output></span></label>
${field('n', `Sample size ${v('n')}`, 20, { min: 1, max: 1000, step: 1 })}
${field('count', 'Batch', 1000, { min: 1, max: 50000, step: 1 })}
</div>
<div class="actions">${btn('one', 'Draw one')}${btn('many', 'Draw batch', 'primary')}${btn('clear', 'Clear', 'quiet wide')}</div>
<div class="toggles">${check('theory', 'Theory')}</div>`,
  figure: {
    title: 'Sample proportions so far',
    x: 'Sample proportion p̂',
    y: 'Count of samples',
    aria: 'Bar chart of sample proportions with the binomial expectation and normal curve',
    key: '<span>Observed</span><span class="k-acc">Latest sample</span><span class="k-gold">Exact binomial</span><span class="k-gold k-line">Normal approximation</span>',
    status: `<div class="status"><span class="legend">Latest sample</span><div class="plot plain" id="dots" style="--h:2.75rem" role="img" aria-label="One dot per trial; filled dots are successes"></div><span>${v('p̂')} = <b id="phat">—</b></span><span id="raw"></span></div>`,
  },
  between: `<p class="notice" id="cond" aria-live="polite"></p>`,
  stats: `${stat('sN', 'Samples', { cls: 'hero' })}${stat('sMean', `Mean of ${v('p̂')}`, { sub: 'tMean' })}${stat('sSe', `SD of ${v('p̂')}`, { sub: 'tSe' })}`,
  equation: equations(
    `${eq('eqPhat', 'This sample', `${v('p̂')} = ${frac(v('x'), v('n'))}`, `${v('p̂')} = ${frac(s('x', 'x'), s('n', 'n'))} = ${res('phat')}`)}
${eq('eqSe', 'All samples', `SE(${v('p̂')}) = ${sqrt(frac(`${v('p')}(1 − ${v('p')})`, v('n')))}`, `SE(${v('p̂')}) = ${sqrt(frac(`${s('p', 'p')} · ${s('q', '1−p')}`, s('n', 'n')))} = ${res('se')}`)}`,
  ),
  seed: 404,
  see: 'Each bar is a possible <i>p̂</i> = <i>k</i>/<i>n</i>. Gold dots: exact binomial. Gold curve: the normal approximation.',
  why: 'The curve only fits once <i>np</i> and <i>n</i>(1 − <i>p</i>) both reach about 10.',
  steps: [
    'Defaults: the curve spills below zero.',
    'Set <i>n</i> = 200. Now it fits.',
    'Quadruple <i>n</i>: the standard error halves.',
  ],
  glossary: [
    ['p̂', 'proportion of successes in one sample'],
    ['x', 'successes in that sample'],
    ['p', 'true proportion in the population'],
    ['SE', 'standard deviation of p̂ across samples'],
  ],
};

// ---- 05 confidence intervals ---------------------------------------------------------------
const ci = {
  slug: 'confidence-intervals',
  no: '05',
  name: 'Intervals',
  full: 'Confidence intervals',
  ask: 'How often does an interval catch the true mean?',
  dataHint: 'Edit the current sample, or click an interval.',
  icon: glyph('<path d="M3 6h9M3 4v4M12 4v4M7 10h10M7 8v4M17 8v4M4 14h8M4 12v4M12 12v4M10 2v16" /><path d="M10 2v16" stroke-dasharray="1.5 2.5"/>'),
  inputs: `
<div class="fields">
${select('dist', 'Population', DISTS4, true)}
${seg('type', 'Interval', [['t', `${v('t')}, uses ${v('s')}`], ['z', `${v('z')}, uses ${v('σ')}`]])}
${field('n', `Sample size ${v('n')}`, 10, { min: 2, max: 999, step: 1 })}
${select('level', 'Confidence', [['0.95', '95%'], ['0.80', '80%'], ['0.90', '90%'], ['0.99', '99%']])}
${field('count', 'Batch', 100, { min: 1, max: 10000, step: 1, wide: true })}
</div>
<div class="actions">${btn('one', 'Draw one')}${btn('many', 'Draw batch', 'primary')}${btn('clear', 'Clear', 'quiet wide')}</div>`,
  figure: {
    title: 'Intervals against the true mean',
    x: 'Value',
    y: 'Newest interval on top',
    height: '38rem',
    aria: 'Population, current sample, and a stack of the most recent 100 confidence intervals',
    key: '<span class="k-pop">Population</span><span class="k-ok k-line">Captures the mean</span><span class="k-bad k-line">Misses it (heavier, marked ×)</span>',
    status: `<div class="status" aria-live="polite"><span class="num" id="ciText">Draw a sample to build an interval.</span><span class="badge ok" id="hit" hidden></span></div>`,
  },
  stats: `${stat('sRate', 'Capture rate', { cls: 'hero', sub: 'verdict' })}${stat('tRate', 'Nominal', { cls: 'theory' })}${stat('sN', 'Intervals')}${stat('sHits', 'Captured')}${stat('tMean', `True mean ${v('μ')}`, { sub: 'tSd' })}`,
  equation: equations(
    `${eq('eqT', 't interval', `${v('x̄')} ± ${v('t')}<sup>*</sup> · ${frac(v('s'), sqrt(v('n')))}`, `${s('xbar', 'x̄')} ± ${s('crit', 't*')} · ${frac(s('sd', 's'), sqrt(s('n', 'n')))} = ${s('xbar', 'x̄')} ± ${res('m')}`, ' data-for="t"')}
${eq('eqZ', 'z interval', `${v('x̄')} ± ${v('z')}<sup>*</sup> · ${frac(v('σ'), sqrt(v('n')))}`, `${s('xbar', 'x̄')} ± ${s('crit', 'z*')} · ${frac(s('sd', 'σ'), sqrt(s('n', 'n')))} = ${s('xbar', 'x̄')} ± ${res('m')}`, ' data-for="z" hidden')}`,
    true,
  ),
  seed: 505,
  see: 'Each line is one sample\'s interval. Thin green lines caught <i>μ</i>; heavy red lines marked × missed.',
  why: 'The true mean stays put and the intervals move. At 95%, about 95 in 100 catch it.',
  steps: [
    'Draw batches to a few thousand: the rate nears 95%.',
    'Switch to 80%, then 99%: width trades against misses.',
    'Skewed population, <i>n</i> = 5: coverage drops below the label.',
  ],
  glossary: [
    ['x̄, s', 'sample mean and SD'],
    ['σ', 'population SD (z interval only)'],
    ['t*', 't multiplier with n − 1 degrees of freedom'],
    ['z*', 'standard normal multiplier'],
  ],
};

// ---- 06 regression -------------------------------------------------------------------------
const regression = {
  slug: 'regression',
  no: '06',
  name: 'Regression',
  full: 'Regression inference',
  ask: 'Could this slope be chance?',
  dataHint: 'Drag a point or edit its row: the line follows.',
  icon: glyph('<path d="M3 15L17 5"/><circle cx="5" cy="11" r="1"/><circle cx="8" cy="13" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="14" cy="9" r="1"/><circle cx="16" cy="4" r="1"/>'),
  inputs: `
<div class="fields">
${seg('preset', 'Scenario', [['a', 'No relationship'], ['b', 'Real']])}
${field('rho', `Correlation ${v('ρ')}`, 0, { min: -1, max: 1, step: 0.1 })}
${field('N', 'Population', 500, { min: 10, max: 50000, step: 1 })}
${field('n', `Sample ${v('n')}`, 50, { min: 3, max: 500, step: 1 })}
${field('alpha', `Significance ${v('α')}`, 0.05, { min: 0.001, max: 0.5, step: 0.01 })}
${field('level', 'Band level %', 95, { min: 50, max: 99.9, step: 0.1, wide: true })}
</div>
<div class="actions">${btn('gen', 'New population')}${btn('collect', 'New sample', '', ' disabled')}${btn('analyze', 'Analyze sample', 'primary wide', ' disabled')}${btn('many', 'Analyze 1,000', 'wide', ' disabled')}${btn('clearSample', 'Clear sample', 'quiet', ' disabled')}${btn('clear', 'Clear all', 'quiet')}</div>
<div class="toggles">${check('ci', 'Confidence band', true)}${check('pi', 'Prediction band', false)}${check('popLine', 'Population line', false)}</div>`,
  figure: {
    title: 'Population, sample and fitted line',
    x: 'x',
    y: 'y',
    height: 'clamp(19rem, calc(100svh - 27rem), 34rem)',
    aria: 'Scatter plot of the population and the sample with the fitted regression line',
    key: '<span class="k-pop">Population</span><span class="k-acc">Sample and fit</span><span class="k-acc k-line">Confidence band</span><span class="k-gold k-line">Prediction band</span>',
  },
  between: `<p class="notice" id="tally" aria-live="polite"></p>`,
  stats: `${stat('sP', `${v('p')}-value`, { cls: 'hero', sub: 'sSig' })}${stat('sB1', `Slope ${v('b')}<sub>1</sub>`, { sub: 'tB1' })}${stat('sB0', `Intercept ${v('b')}<sub>0</sub>`, { sub: 'tB0' })}${stat('sT', `${v('t')} statistic`, { sub: 'sDf' })}${stat('sR', `Correlation ${v('r')}`)}`,
  equation: equations(
    `${eq('eqSlope', 'Slope', `${v('b')}<sub>1</sub> = ${frac(`${v('S')}<sub>${v('xy')}</sub>`, `${v('S')}<sub>${v('xx')}</sub>`)}`, `${v('b')}<sub>1</sub> = ${frac(s('sxy', 'Sxy'), s('sxx', 'Sxx'))} = ${res('b1')}`)}
${eq('eqT', 'Test', `${v('t')} = ${frac(`${v('b')}<sub>1</sub>`, `SE(${v('b')}<sub>1</sub>)`)}`, `${v('t')} = ${frac(s('b1', 'b₁'), s('se', 'SE'))} = ${res('t')}`)}`,
  ),
  after: `<div class="table-wrap"><table><thead><tr><th>Time</th><th><i>n</i></th><th>Slope <i>b</i><sub>1</sub></th><th>Intercept <i>b</i><sub>0</sub></th><th><i>p</i>-value</th><th>At <i>α</i></th></tr></thead><tbody id="history"><tr><td class="empty" colspan="6">No estimates yet.</td></tr></tbody></table></div>`,
  seed: 606,
  see: 'Pale dots: the population. Purple: your sample, its fitted line, and the bands around it.',
  why: 'Even with no relationship, about 5% of samples reach <i>p</i> ≤ 0.05. That rate is what <i>α</i> means.',
  steps: [
    '<b>Analyze 1,000</b>: the tally lands near 5%.',
    'Set <i>α</i> = 0.01: the tally falls to about 1%.',
    '<b>Real</b> scenario: compare <i>n</i> = 20 with <i>n</i> = 200.',
  ],
  glossary: [
    ['b₁, b₀', 'slope and intercept from your sample'],
    ['β₁, β₀', 'the population\'s own slope and intercept'],
    ['S<sub>xy</sub>, S<sub>xx</sub>', 'sums of cross-products and squares about the means'],
    ['p', 'chance of a slope this far from zero if the true slope were zero'],
  ],
};

// ---- 07 your data --------------------------------------------------------------------------
// Heavier than the simulations (parser, table, two analyses), so its code loads only when opened.
const yourData = {
  slug: 'data',
  no: '07',
  name: 'Your data',
  full: 'Your data',
  ask: 'Paste numbers. Nothing leaves your browser.',
  dataHint: 'Click a bar or point. Edit any value.',
  heavy: true,
  icon: glyph('<rect x="3" y="4" width="14" height="12" rx="1"/><path d="M3 8h14M3 12h14M8 4v12"/>'),
  inputs: `
<div class="fields">
<label class="field wide"><span>Values or CSV</span><textarea id="paste" rows="4" spellcheck="false" placeholder="height,weight&#10;170,65&#10;180,80"></textarea></label>
${select('x', 'Variable', [['-1', '—']])}${select('y', 'Against', [['-1', 'None']])}
${select('level', 'Confidence', [['0.95', '95%'], ['0.90', '90%'], ['0.99', '99%'], ['0.80', '80%']], true)}
</div>
<div class="actions"><label class="btn" for="file">Open file</label><input class="sr" id="file" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain">${btn('sample', 'Try a sample', 'primary')}${btn('clear', 'Clear', 'quiet wide')}</div>
<div class="toggles" id="toggles" hidden>${check('ci', 'Confidence band')}${check('pi', 'Prediction band', false)}</div>`,
  figure: {
    title: 'Your data',
    x: 'Value',
    y: 'Count',
    aria: 'Chart of your data',
    key: '<span>Your data</span><span class="k-acc k-line">Mean with interval, or fitted line</span><span class="k-gold k-line">Prediction band</span>',
  },
  between: `<p class="notice" id="note" aria-live="polite"></p>`,
  stats: `${stat('s1', 'Mean', { cls: 'hero' })}${stat('s2', 'SD')}${stat('s3', 'Interval')}${stat('s4', 'Values')}${stat('s5', 'Range')}`,
  equation: equations(
    `${eq('eqOne', 't interval for the mean', `${v('x̄')} ± ${v('t')}<sup>*</sup> · ${frac(v('s'), sqrt(v('n')))}`, `${s('xbar', 'x̄')} ± ${s('crit', 't*')} · ${frac(s('sd', 's'), sqrt(s('n', 'n')))} = ${s('xbar', 'x̄')} ± ${res('m')}`, ' data-for="one"')}
${eq('eqSlope', 'Slope', `${v('b')}<sub>1</sub> = ${frac(`${v('S')}<sub>${v('xy')}</sub>`, `${v('S')}<sub>${v('xx')}</sub>`)}`, `${v('b')}<sub>1</sub> = ${frac(s('sxy', 'Sxy'), s('sxx', 'Sxx'))} = ${res('b1')}`, ' data-for="two" hidden')}
${eq('eqTest', 'Test', `${v('t')} = ${frac(`${v('b')}<sub>1</sub>`, `SE(${v('b')}<sub>1</sub>)`)}`, `${v('t')} = ${frac(s('b1', 'b₁'), s('se', 'SE'))} = ${res('t')}`, ' data-for="two" hidden')}`,
    true,
  ),
  see: 'One variable: a histogram with its mean and interval. Two: a scatter plot with a fitted line.',
  why: 'The same formulas as the simulations, now on real numbers. They assume a random sample.',
  steps: ['<b>Try a sample</b>, then switch <b>Against</b> to None.', 'Click a bar to list its rows.', 'Edit one value into an outlier and watch the result move.'],
  glossary: [
    ['x̄, s', 'mean and standard deviation of your values'],
    ['t*', 't multiplier with n − 1 degrees of freedom'],
    ['b₁', 'slope of the fitted line'],
    ['p', 'chance of a slope this large if the true slope were zero'],
  ],
  // Keep in step with MAX_ROWS in src/core/limits.ts.
  fine: 'Data limit: 711,996 rows.',
};

export const LABS = [discrete, continuous, cltMean, cltProp, ci, regression, yourData];
export { seedRow, figure };
