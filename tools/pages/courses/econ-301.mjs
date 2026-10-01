// ECON 301 (UW Department of Economics): course content and the Solow-model interactive's markup.
// Interface: notes/teaching-contract.md. Behaviour: src/pages/courses/econ-301.ts. Layout: course-econ-301.css.
// Course facts come only from the sources listed at the bottom; the author's role and year from the C.V.,
// the quarter from the department's course page for his section.

const ID = 'econ-301';
const CATALOG = 'https://www.washington.edu/students/crscat/econ.html#econ301';
// UW Time Schedule, Winter 2025: ECON 301 C lists "Effendy, Alfredo Nicholas" as instructor.
const SCHEDULE = 'https://www.washington.edu/students/timeschd/WIN2025/econ.html#econ301';
// Topics come from the author's own Winter 2025 syllabus (files/syllabi/econ-301-winter-2025.pdf, linked in
// the page header; textbook: Mankiw, Macroeconomics, 11th ed.). Sources listed: catalogue and time schedule.

// ---- markup helpers (every id carries the course prefix) -------------------------------------------
const v = (sym) => `<i>${sym}</i>`;
const range = (id, label, value, min, max, step, shown) =>
  `<div class="field wide e301-range"><span id="${ID}-${id}-l">${label}</span><div class="rangeline"><input type="range" id="${ID}-${id}" aria-labelledby="${ID}-${id}-l" min="${min}" max="${max}" step="${step}" value="${value}"><output id="${ID}-${id}-v" for="${ID}-${id}">${shown}</output></div></div>`;
const stat = (id, label, value, sub, cls = '') =>
  `<div class="stat${cls ? ` ${cls}` : ''}"><span>${label}</span><b id="${ID}-${id}">${value}</b><small id="${ID}-${id}-s">${sub}</small></div>`;
const slot = (k, sym, cls = '') => `<span class="slot${cls ? ` ${cls}` : ''}" data-k="${k}" data-sym="${sym}">${sym}</span>`;
const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const paren = (inner, pow) => `<span class="e301-p">(</span>${inner}<span class="e301-p">)</span><sup class="e301-pow">${pow}</sup>`;
const K = `${v('k')}<sup>*</sup>`;

const tool = () => `<div class="c-split e301" id="${ID}-tool">
<div class="c-panel e301-panel">
${range('s', `Saving rate ${v('s')}`, 0.3, 0.05, 0.6, 0.01, '30%')}
${range('n', `Population growth ${v('n')}`, 0.01, 0, 0.04, 0.005, '1.0%')}
${range('d', `Depreciation ${v('δ')}`, 0.05, 0.02, 0.1, 0.005, '5.0%')}
${range('a', `Productivity ${v('A')}`, 1, 0.5, 2, 0.05, '1.00')}
${range('al', `Capital share ${v('α')}`, 0.33, 0.2, 0.5, 0.01, '0.33')}
<div class="e301-actions"><button class="btn" id="${ID}-gold" type="button">Golden rule</button><button class="btn primary" id="${ID}-start" type="button">Set as start</button><button class="btn quiet" id="${ID}-reset" type="button">Reset</button></div>
<p class="e301-ill">Illustrative parameters; one period is a year.</p>
</div>
<div class="c-out e301-out">
<div class="e301-figs">
<figure class="figure e301-fig e301-fig-k">
<div class="fig-head"><span class="fig-title">Solow diagram</span><span class="badge e301-badge">Illustrative</span></div>
<div class="fig-body">
<span class="fig-y">Per worker</span>
<div class="plot" id="${ID}-plot" role="img" aria-label="Solow diagram: capital per worker across; output, investment and break-even investment per worker up. Values in the read-outs below."></div>
<span class="fig-x">Capital per worker, ${v('k')}</span>
</div>
<p class="key"><span class="k-acc k-line">Now</span><span class="k-gold k-line">Start</span><span class="k-ink k-line e301-k-gr">Golden rule</span></p>
</figure>
<figure class="figure e301-fig e301-fig-t">
<div class="fig-head"><span class="fig-title">Transition path</span>
<fieldset class="seg-set e301-var"><legend class="sr">Path shows</legend><div class="seg">${[
  ['y', 'Output'],
  ['c', 'Consumption'],
  ['k', 'Capital'],
]
  .map(([val, name], i) => `<label title="${name} per worker"><input type="radio" name="${ID}-var" value="${val}"${i === 0 ? ' checked' : ''}><i>${val}</i><span class="sr"> ${name} per worker</span></label>`)
  .join('')}</div></fieldset>
<button class="btn sm e301-play" id="${ID}-play" type="button" aria-label="Play the transition">Play</button></div>
<div class="fig-body">
<span class="fig-y" id="${ID}-ylab">Output per worker</span>
<div class="plot" id="${ID}-path" role="img" aria-label="Transition path: years after the change across; the chosen quantity per worker up, from the starting steady state to the new one."></div>
<span class="fig-x">Years after the change</span>
</div>
<p class="key"><span class="k-acc k-line">Path</span><span class="k-gold k-line">Start</span></p>
</figure>
</div>
<div class="stats e301-stats">
${stat('k', `Capital ${K}`, '11.0', 'start 6.03', 'hero')}
${stat('y', `Output ${v('y')}<sup>*</sup>`, '2.21', 'start 1.81')}
${stat('c', `Consumption ${v('c')}<sup>*</sup>`, '1.55', 'start 1.45')}
${stat('g', `Golden rule ${v('s')}`, '33%', 'highest c* 1.55', 'theory')}
</div>
<div class="eq-block">
<div class="eq-set">
<div class="eq" id="${ID}-eq-k" role="math"><span class="eq-cap">Steady-state capital per worker</span><div class="eq-row" aria-hidden="true">${K} = ${paren(frac(`${v('s')}${v('A')}`, `${v('n')} + ${v('δ')}`), `1/(1 − ${v('α')})`)}</div><div class="eq-row eq-num" aria-hidden="true">${K} = ${paren(
  frac(`${slot('s', 's')} × ${slot('a', 'A')}`, `${slot('n', 'n')} + ${slot('d', 'δ')}`),
  `1/(1 − ${slot('al', 'α')})`,
)} = ${slot('k', 'k*', 'res')}</div></div>
<div class="eq" id="${ID}-eq-y" role="math"><span class="eq-cap">Steady-state output per worker</span><div class="eq-row" aria-hidden="true">${v('y')}<sup>*</sup> = ${v('A')}${K}<sup>${v('α')}</sup></div><div class="eq-row eq-num" aria-hidden="true">${v('y')}<sup>*</sup> = ${slot('a', 'A')} × ${slot('k', 'k*')}<sup>${slot('al', 'α')}</sup> = ${slot('y', 'y*', 'res')}</div></div>
</div>
<p class="eq-note" id="${ID}-note" aria-live="polite">Saving has risen from 20% to 30%: capital per worker moves from <b>6.03</b> to <b>11.0</b>.</p>
</div>
</div>
</div>`;

export const course = {
  slug: ID,
  code: 'ECON 301',
  title: 'Intermediate Macroeconomics',
  unit: 'Department of Economics, University of Washington',
  role: 'Instructor',
  when: 'Winter 2025',
  whenSource: SCHEDULE,
  catalog: {
    text: 'Analysis of the determinants of the aggregate level of employment, output, prices, and income of an economy. Policy issues and applications with special reference to current monetary and fiscal policy.',
    url: CATALOG,
    credits: 5,
  },
  summary:
    'Build and use the core models of intermediate macroeconomics, from long-run classical theory and Solow growth to IS–LM, Mundell–Fleming and aggregate supply, to analyse output, employment, inflation and monetary and fiscal policy.',
  // Topics from the author's Winter 2025 syllabus (schedule); the textbook's contents where noted.
  concepts: [
    {
      title: 'National income',
      body: 'The economy in the long run: where output comes from, how it is paid out to labour and capital, and where it goes as consumption, investment and government purchases.',
    },
    {
      title: 'Money, inflation and unemployment',
      body: 'What the monetary system is and how it works; the causes, effects and social costs of inflation; and how the labour market shapes unemployment.',
    },
    {
      title: 'Long-run growth',
      body: 'Economic growth through capital accumulation, population growth and technological progress (Growth I and II in the syllabus).',
    },
    {
      title: 'Aggregate demand: IS–LM',
      body: 'The IS–LM model of the short run: the goods and money markets together set output and the interest rate, and fiscal and monetary policy shift them.',
    },
    {
      title: 'The open economy: Mundell–Fleming',
      body: 'Trade, capital flows and exchange rates; then the Mundell–Fleming model, which shows how the exchange-rate regime changes what fiscal and monetary policy can do.',
    },
    {
      title: 'The business cycle and aggregate supply',
      body: 'Economic fluctuations: the business cycle, and aggregate supply.',
    },
  ],
  interactive: {
    title: 'The Solow growth model',
    lead: 'Change saving, population growth, depreciation or productivity and watch capital per worker move to its new steady state. Purple is now, gold is where the economy started.',
    html: () => tool(),
    entry: 'src/pages/courses/econ-301.ts',
    css: ['course-econ-301'],
  },
  labs: [],
  sources: [
    { label: 'UW course catalogue: ECON 301', url: CATALOG },
    { label: 'UW Time Schedule, Winter 2025: ECON 301 C', url: SCHEDULE },
  ],
};
