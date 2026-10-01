// QMETH 201 (Foster School of Business): course content and the hypothesis-test interactive's markup.
// Interface: notes/teaching-contract.md. Behaviour: src/pages/courses/qmeth-201.ts. Layout: course-qmeth-201.css.
// Course facts come only from the sources listed at the bottom; the author's role and year from the C.V.

const ID = 'qmeth-201';
const CATALOG = 'https://www.washington.edu/students/crscat/qmeth.html#qmeth201';
// UW Time Schedule, Summer 2025: QMETH 201 A lists "Effendy, Alfredo Nicholas" as instructor.
const SCHEDULE = 'https://www.washington.edu/students/timeschd/SUM2025/qmeth.html#qmeth201';
// Topics come from the author's own Summer 2025 syllabus (files/syllabi/qmeth-201-summer-2025.pdf, linked in
// the page header); the sources listed are the catalogue and the time schedule only.

// ---- markup helpers (every id carries the course prefix) -------------------------------------------
const v = (sym) => `<i>${sym}</i>`;
const H = (k) => `${v('H')}<sub>${k}</sub>`;
const range = (id, label, value, min, max, step, unit) =>
  `<div class="field wide"><span id="${ID}-${id}-l">${label}</span><div class="rangeline"><input type="range" id="${ID}-${id}" aria-labelledby="${ID}-${id}-l" min="${min}" max="${max}" step="${step}" value="${value}"><output id="${ID}-${id}-v" for="${ID}-${id}">${value}</output></div><small class="q201-unit">${unit}</small></div>`;
const seg = (name, legend, options, on) =>
  `<fieldset class="seg-set"><legend class="legend">${legend}</legend><div class="seg">${options
    .map(([value, text]) => `<label><input type="radio" name="${ID}-${name}" value="${value}"${value === on ? ' checked' : ''}>${text}</label>`)
    .join('')}</div></fieldset>`;
const stat = (id, label, cls = '') =>
  `<div class="stat${cls ? ` ${cls}` : ''}"><span id="${ID}-${id}-l">${label}</span><b id="${ID}-${id}">—</b><small id="${ID}-${id}-s"></small></div>`;
const slot = (k, sym, cls = '') => `<span class="slot${cls ? ` ${cls}` : ''}" data-k="${k}" data-sym="${sym}">${sym}</span>`;
const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const sqrt = (x) => `<span class="sqrt"><span>${x}</span></span>`;
const btn = (id, text, cls = '') => `<button class="btn${cls ? ` ${cls}` : ''}" id="${ID}-${id}" type="button">${text}</button>`;
/** One form of the p-value per alternative; the script shows the one in use. */
const pRow = (alt, sym, num, hidden) =>
  `<div data-for="${alt}"${hidden ? ' hidden' : ''}><div class="eq-row" aria-hidden="true">${v('p')} = ${sym}</div><div class="eq-row eq-num" aria-hidden="true">${v('p')} = ${num} = ${slot('p', 'p', 'res')}</div></div>`;

const tool = () => `<div class="c-split q201" id="${ID}-tool">
<div class="c-panel q201-panel">
${seg('alt', `Alternative ${H(1)}`, [['two', `${v('μ')} ≠ 500`], ['right', `${v('μ')} > 500`], ['left', `${v('μ')} &lt; 500`]], 'two')}
${seg('alpha', `Significance ${v('α')}`, [['0.1', '0.10'], ['0.05', '0.05'], ['0.01', '0.01']], '0.05')}
${range('mu', `True mean ${v('μ')}`, 503, 490, 510, 0.5, 'grams; unknown in practice')}
${range('n', `Sample size ${v('n')}`, 25, 4, 100, 1, 'boxes per sample')}
<div class="q201-actions">${btn('draw', 'Draw a sample', 'primary')}${btn('many', 'Draw 100')}${btn('reset', 'Reset', 'quiet')}</div>
${seg('show', 'Shade', [['p', 'p-value'], ['err', 'Errors and power']], 'p')}
<p class="q201-ill">Illustrative numbers: a line fills boxes to a 500 g target; ${v('σ')} = 10 g is taken as known, so the test uses ${v('z')}.</p>
</div>
<div class="c-out">
<figure class="figure q201-fig">
<div class="fig-head"><span class="fig-title">Sampling distribution of ${v('x̄')}</span><span class="badge">Illustrative</span></div>
<div class="fig-body">
<span class="fig-y">Density</span>
<div class="plot" id="${ID}-plot" role="img" aria-label="Two normal curves for the sample mean in grams: gold if the null hypothesis is true, purple at the true mean. Shaded areas and the observed sample mean are described in the read-outs below."></div>
<span class="fig-x">Sample mean ${v('x̄')}, grams</span>
</div>
<p class="key" id="${ID}-key"><span class="k-gold k-line">${H(0)}: ${v('μ')} = 500</span><span class="k-acc k-line">True ${v('μ')}</span><span class="q201-k-x">Your ${v('x̄')}</span><span data-for="p" class="q201-k-p">${v('p')}-value</span><span data-for="p" class="q201-k-rej">Reject ${H(0)}</span><span data-for="err" class="q201-k-a" hidden>Type I ${v('α')}</span><span data-for="err1" class="q201-k-pow" hidden>Power</span><span data-for="err1" class="q201-k-b" hidden>Type II ${v('β')}</span></p>
</figure>
<div class="stats q201-stats">
${stat('z', `Test statistic ${v('z')}`, 'hero')}
${stat('p', `${v('p')}-value`)}
${stat('pow', `Power 1 − ${v('β')}`)}
${stat('a', `Type I error ${v('α')}`, 'theory')}
${stat('rate', 'Draws rejected')}
</div>
<div class="eq-block">
<div class="eq-set">
<div class="eq" id="${ID}-eq-z" role="math"><span class="eq-cap">Test statistic</span><div class="eq-row" aria-hidden="true">${v('z')} = ${frac(`${v('x̄')} − ${v('μ')}<sub>0</sub>`, `${v('σ')} / ${sqrt(v('n'))}`)}</div><div class="eq-row eq-num" aria-hidden="true">${v('z')} = ${frac(`${slot('xbar', 'x̄')} − 500`, `10 / ${sqrt(slot('n', 'n'))}`)} = ${slot('z', 'z', 'res')}</div></div>
<div class="eq" id="${ID}-eq-p" role="math"><span class="eq-cap">${v('p')}-value</span>
${pRow('two', `2 · P(${v('Z')} ≥ |${v('z')}|)`, `2 · P(${v('Z')} ≥ ${slot('az', '|z|')})`, false)}
${pRow('right', `P(${v('Z')} ≥ ${v('z')})`, `P(${v('Z')} ≥ ${slot('az', 'z')})`, true)}
${pRow('left', `P(${v('Z')} ≤ ${v('z')})`, `P(${v('Z')} ≤ ${slot('az', 'z')})`, true)}
</div>
</div>
<p class="eq-note" id="${ID}-note" aria-live="polite"></p>
</div>
</div>
</div>`;

export const course = {
  slug: ID,
  code: 'QMETH 201',
  title: 'Introduction to Statistical Methods',
  unit: 'Foster School of Business, University of Washington',
  role: 'Instructor',
  when: 'Summer 2025',
  whenSource: SCHEDULE,
  catalog: {
    text: 'Survey of principles of data analysis and their applications for management problems. Elementary techniques of classification, summarization, and visual display of data. Applications of probability models for inference and decision making are illustrated through examples.',
    url: CATALOG,
    credits: 4,
  },
  summary:
    'Classify, summarize and display data; reason with probability models; and use samples to estimate population values, test hypotheses and fit regression lines, with management problems as the examples.',
  concepts: [
    // Topics as the author's Summer 2025 syllabus lists them (weekly overview, lectures 1–15).
    {
      title: 'Describing data',
      body: 'Basic ideas and types of data; distributions in tables and graphs, and their shape; central tendency, standard deviation and variance.',
    },
    {
      title: 'Probability',
      body: 'Probability relationships between events, and statistical independence.',
    },
    {
      title: 'Probability distributions',
      body: 'Discrete distributions (general discrete, binomial, Poisson and hypergeometric) and continuous ones (normal, uniform and exponential).',
    },
    {
      title: 'Sampling and confidence intervals',
      body: 'Sampling and sampling distributions; confidence intervals for a population proportion and for a population mean.',
    },
    {
      title: 'Hypothesis testing',
      body: 'Hypothesis tests for one population mean and for one population proportion.',
    },
    {
      title: 'Correlation and regression',
      body: 'Covariance and correlation, then simple linear regression.',
    },
  ],
  interactive: {
    title: 'Testing a mean: p-values, errors and power',
    lead: 'Is a filling line on target? Set the true mean, the sample size and α, then draw samples. Gold assumes the null hypothesis; purple is the truth.',
    html: () => tool(),
    entry: 'src/pages/courses/qmeth-201.ts',
    css: ['course-qmeth-201'],
  },
  labs: [
    ['clt-mean', 'Sampling distribution of the mean'],
    ['clt-proportion', 'Sampling distribution of the proportion'],
    ['confidence-intervals', 'Confidence intervals'],
    ['regression', 'Regression inference'],
  ],
  sources: [
    { label: 'UW course catalogue: QMETH 201', url: CATALOG },
    { label: 'UW Time Schedule, Summer 2025: QMETH 201 A', url: SCHEDULE },
  ],
};
