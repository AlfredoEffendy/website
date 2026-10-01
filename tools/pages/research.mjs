// Research: the overview (research/index.html) and the job market paper as one plain-language
// article (research/when-yield-curves-invert-together/index.html), modelled on the SparseMind
// research pieces: a left rail with a live step list, a reading column, figure cards with an
// inspect/walkthrough viewer (src/ui/viewer.ts, loaded on first use), accessible tables, and one
// small illustration of the signal's rule (src/pages/research.ts).
// Every statement comes from the job market paper (notes/source/jmp.txt) via the article brief; the
// C.V. (notes/source/cv.md) supplies the work-in-progress title. Page references are PDF pages.
// Figures are cut from the PDF by tools/extract-figures.py into static/research/jmp/.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AUTHOR, ROOT, ROUTES } from '../shell.mjs';

const PDF = 'files/when-yield-curves-invert-together.pdf';
const FIG_DIR = 'research/jmp/';
const INTERESTS = ['International Finance', 'Asset Pricing, Risk Management', 'Big Data Analysis'];
const WIP = ['Maintaining Carry Structure in Machine Learning Carry Trade'];

// ---- the paper -------------------------------------------------------------------------------------
const META = {
  title: 'When Yield Curves Invert Together: Currency Crash Risk',
  date: 'September 23, 2026',
  iso: '2026-09-23',
  // The paper's abstract, verbatim (PDF p. 1).
  abstract:
    'A yield-curve inversion is a well-documented leading indicator of domestic slowdown, but a single inversion does not reveal whether the expected slowdown is country-specific or global. This distinction, however, decisively predicts the asset market response to the impending slowdown. In a portfolio of currencies, such as the carry trade, currency-specific risk might be diversified, while systematic risk is affecting every risky currency. I show that a signal constructed from clustered inversions predicts crashes in high-interest and high-beta currencies, and the carry trade. This result plays a role in giving an early warning to avoid the well-known carry trade crashes. Further conditioning on the slope shape of global yield curves refines the signal to distinguish between inversions driven by slowing growth expectations versus inflation-fighting monetary policies. The latter comes with a higher interest rates environment, which provides a higher compensation for the carry trade crash risk.',
  committee: 'Yu-chin Chen (chair), Lukas Kremens, Eric Zivot, Stephan Siegel',
  jel: 'E43, F31, G01, G11, G15',
  keywords: 'Inverted Yield Curve; Disaster Risk; Exchange Rate; Currency Carry Trade',
};
const HEADLINE = 'When many yield curves invert at once, carry-trade currencies tend to crash';
const LEAD =
  'One inverted yield curve warns of a domestic slowdown. Alfredo Effendy’s job market paper shows that when at least two G10 curves invert freshly together, high-interest, high-beta currencies tend to fall and the carry trade loses. The signal is on in about a fifth of months since 1988, yet captures four of the five worst carry months. The curve’s shape then tells whether that risk is paid.';
const SUMMARY =
  'When at least two G10 yield curves invert freshly together, high-interest, high-beta currencies tend to fall and the carry trade loses. The curve’s shape then tells whether that risk is paid.';

const ABBR = [
  ['IYC', 'the paper’s signal: fresh inversions, clustered'],
  ['IRD', 'interest rate differential'],
  ['G10', 'nine currencies plus the U.S. dollar'],
  ['10Y−2Y', '10-year minus 2-year yield'],
  ['UIP', 'uncovered interest parity'],
  ['HML', 'high-minus-low portfolio'],
  ['CLI', 'OECD composite leading indicator'],
];

const GLANCE = [
  { label: 'Signal on', value: '93 / 458', note: 'months, about 20%', page: 4, cls: 'hero' },
  { label: 'Worst carry months caught', value: '4 of 5', note: 'the bottom 1%', page: 40 },
  { label: 'Carry spot, signal on', value: '−8.99%', note: 'per year; +2.64% when off', page: 5 },
  { label: 'Sharpe, unwind on signal', value: '0.73', note: 'from 0.53; before costs', page: 30 },
];

// Section bodies follow the brief, split into short paragraphs. {fig:id}, {table:id} and {demo} place
// a figure card, a table or the illustration at that point.
const SECTIONS = [
  {
    id: 'carry-and-crashes',
    heading: 'The carry trade and its crash risk',
    pages: '2, 8–9',
    body: [
      'The currency carry trade borrows in low-interest-rate currencies and invests in high-interest-rate ones. It has paid off on average because the high-rate currencies do not depreciate enough to offset the interest rate differential (IRD), which violates uncovered interest parity (UIP).',
      'The literature reads this premium as compensation for depreciation risk. The premium builds up slowly, but much of it can vanish in crashes when carry positions are unwound, and that gives the trade its negative skewness.',
      'The paper builds the trade in the standard way, from the point of view of a U.S. investor. Each month it ranks the nine G10 currencies on their one-month money-market rates, then goes long the three highest and short the three lowest.',
      'The return splits into two pieces. The <b>income leg</b> is the rate gap, known in advance. The <b>spot leg</b> is the exchange-rate move, realized a month later. In the sample the income leg averages +3.9%/yr and never drops below +0.7%/yr, so every carry crash is an exchange-rate event in which the spot leg overwhelms the differential.',
      '{fig:fig1}',
      'A second portfolio, beta HML, sorts the same currencies on their exposure to the U.S. equity market instead. For a carry investor, the paper argues, the question that matters is whether an impending crash can be predicted.',
    ],
  },
  {
    id: 'why-inversions',
    heading: 'Why a yield-curve inversion matters, and why one is not enough',
    pages: '2, 9–11, 14',
    body: [
      'Government yield curves encode market expectations about economic activity in real time. An inverted curve, with the 10-year yield below the 2-year, has long been read as a recession signal.',
      'Under the expectations hypothesis the slope turns negative when markets expect short rates to fall. That happens either because activity is expected to weaken or because a policy rate well above its normal level is expected to come back down.',
      'Each curve, however, prices only its own economy, so one inversion cannot say whether the expected slowdown is local or global. That distinction matters for a diversified portfolio.',
      'In the paper’s simple model, each currency’s spot move is a common global shock scaled by the currency’s exposure, plus an idiosyncratic piece. Holding three currencies per leg keeps the idiosyncratic piece small, so only the common shock carries a systematic loss. A warning signal for the carry trade therefore has to say something about the common shock, not about any single economy.',
      'The leading-indicator evidence fits this view. A curve that is active on its own predicts nothing for its country’s OECD composite leading indicator (−0.01 pooled). After a signal month, the indicator falls: −0.11 points pooled, and −0.13 in the United States, whose curve is not in the count.',
    ],
  },
  {
    id: 'fresh-clusters',
    heading: 'Clustered and fresh: the IYC signal versus the naive count',
    pages: '3–4, 11–13, 46–49, 53, 59',
    body: [
      'The simplest way to detect a cluster is to count how many curves are inverted each month. The paper calls this the <b>naive count</b>. It captures clustering, but it treats fresh and stale inversions alike, and an inversion can persist for years.',
      'The IYC signal adds freshness. A curve becomes <b>active</b> in the month its 10Y−2Y slope is first seen inverted. It stays active until its slope has steepened for two months in a row, whether or not the slope is back above zero. A curve that is deactivated but still inverted cannot count again until it un-inverts and then inverts afresh.',
      'The signal is on when at least two of the nine curves are active, because two is the smallest count that rules out a single-country event. On this rule the signal is on in 93 of 458 months (about 20%). The naive count of two or more inverted curves is on for 164 months, or 36%.',
      '{demo}',
      '{fig:fig2}',
      'The naive state predicts much less: −4.01%/yr for the carry spot leg, significant only at the 10% level, against −11.63 for the IYC signal.',
      '{fig:fig3}',
      'Months with exactly one active inversion are actually favorable for carry. Exactly two active inversions is the sharpest case, and four or more show no effect. The author’s explanation is that breadth arrives late in an episode, after freshness has gone.',
      '{table:tableB2}',
    ],
  },
  {
    id: 'who-falls',
    heading: 'When the signal is on: which currencies fall',
    pages: '4, 20–25, 27–28, 34',
    body: [
      'When the signal is on, the carry trade’s spot leg loses 8.99% annualized (3.67% after counting the IRD). When it is off, the spot leg gains 2.64% (6.19% with the IRD).',
      'The beta HML portfolio loses 9.24% in spot terms (8.29% with the IRD), against a gain of 3.57% (5.29%) when the signal is off. All four regression gaps are negative and significant, both when months are the unit of inference and when whole episodes are.',
      '{table:table3}',
      'The losses land where the mechanism says they should. Persistently high-rate economies are often commodity exporters and small open economies exposed to the global cycle, and across currencies the IRD and the currency beta are highly correlated (ρ = 0.87).',
      'Currency by currency, the on-signal spot loss lines up with average beta (R² = 0.61) and with the average IRD (R² = 0.66). Outside downcurve months the slope on beta steepens to −80, with R² = 0.81.',
      '{fig:fig6}',
      'In those months the New Zealand dollar is at −18.73%/yr, the Australian dollar at −17.48 and the Canadian dollar at −8.55. The safe havens gain: the yen +5.35, the franc +3.18 and the euro +2.76. The carry trade is long the first group and short the second.',
      'By contrast, a currency whose own curve is active while the signal is off does not depreciate on average (pooled +2.90%/yr, insignificant).',
    ],
  },
  {
    id: 'trading',
    heading: 'Trading the signal',
    pages: '14–15, 28–32',
    body: [
      'What should a carry investor do with the signal? The paper tests simple overlays on the carry trade’s total returns from 1988 to 2026, before transaction costs.',
      'Always invested, the carry trade earns +4.19%/yr with a Sharpe ratio of 0.53, a worst month of −11.61% and skewness of −0.68. Unwinding while the signal is on raises the Sharpe ratio to 0.73 and cuts the worst month to −7.27%.',
      'Two “overwrite” rules, which stay invested in <a href="#downcurve">downcurve months</a>, do better still, with Sharpe ratios of 0.78 and 0.87. The anti-carry overwrite brings skewness to −0.01, which largely removes the negative skewness that defines the carry trade.',
      '{fig:fig7}',
      '{table:table8a}',
      'The author is careful about how strong this is. The gain is economically meaningful, but marginal in statistical terms for the carry portfolio and clearer for the beta HML portfolio.',
      'Hedging also has a cost, which the paper calls carry-premium risk. The IRD is never negative in signal months, so an unwind always gives up income, and the cost is largest when the differential is widest.',
      'The signal raises the odds of a crash without catching every one: a loss beyond 4% in a month hits the carry spot leg in 8.60% of signal months, against 5.68% of all months.',
    ],
  },
  {
    id: 'downcurve',
    heading: 'Growth scare or inflation fight: what the curve’s shape adds',
    pages: '4–5, 14–19, 23–24, 29–31, 56',
    body: [
      'An inversion can arise in two settings. Markets may expect rates to fall because growth is weakening, or because a policy rate raised to fight inflation is expected to normalize.',
      'The paper tells them apart by the shape of the average G10 curve. When the 3-month yield sits above the 2-year and the 2-year above the 10-year, the short rate is the curve’s highest point. That shape fits a policy rate held high and expected to come back down.',
      'This <b>downcurve</b> regime is on in 52 of 458 months, 37 of them inside the signal. Most fall in two blocks, 1988–91 and 2023–24, plus one month in 2007. These are high-rate, high-inflation months. The three-month yield is near 9.4% in downcurve signal months versus about 4% in other signal months, and the carry IRD is wider (+6.35 versus +4.64%/yr).',
      '{fig:fig5}',
      'The split matters. In the 56 non-downcurve signal months, carry total returns are −10.31%/yr; in the 37 downcurve signal months they are +6.37%/yr. In the paper’s framing, the signal flags elevated crash risk, while the IRD and the curve’s shape show whether bearing that risk is paid.',
      'The author does not claim to identify what caused any inversion. The regime was also identified within the sample, so its evidence carries less weight than the signal’s.',
    ],
  },
  {
    id: 'robustness-em',
    heading: 'Robustness checks and emerging markets',
    pages: '6, 13, 30, 32–39, 46–47, 51–52, 57, 64',
    body: [
      'Is the signal just repackaging something familiar? In a horse race, the paper adds the global average slope and its change, the U.S. inversion, and the U.S. slope and its change. None of these rivals is significant, and the signal’s coefficient gets stronger in every leg. Adding the U.S. curve to the count changes none of the results.',
      'The paper then adds financial conditions, dollar and commodity returns, FX volatility and the leading indicator, and no cell falls by more than a sixth. Only adding the VIX, which shortens the sample by 35 months, leaves the carry cells marginal, while the beta HML cells are unmoved.',
      'Dropping any one of the signal’s fourteen runs in turn, the financial crisis and COVID among them, leaves every cell with the same sign and still significant.',
      'One threat partly survives. When each curve is stripped of a common term premium, the beta HML loss holds, but the carry loss shrinks to a third and loses significance.',
      'The G10 signal is then applied, without rebuilding it, to seven floating emerging-market currencies. All seven load negatively on it (pooled −13.87%/yr), though statistical power is weaker. In a sixteen-currency portfolio the beta-sorted version crashes harder. The wide EM differentials, however, keep the carry trade’s total return positive in signal months.',
    ],
  },
  {
    id: 'what-it-means',
    heading: 'What it means',
    pages: '2, 4, 29–30, 39, 56',
    body: [
      'The paper concludes that clusters of fresh G10 yield-curve inversions mark periods of elevated currency downside risk, and that the bond market leads the currency market.',
      '{parts}',
      'The depreciation falls on high-beta currencies, which also tend to pay high interest rates, so the carry trade inherits the exposure through its long leg. In the language of the disaster-risk literature, the author reads the signal as an observable indicator of elevated currency downside risk.',
      'The practical message is not simply to sell when the signal fires. When the curve slopes strictly downward, wide differentials compensate, on average, for most of the depreciation that follows, which makes an unwind unusually expensive.',
      'The paper also states its limits. The signal is on in only a fifth of the sample, so it cannot contain the whole tail. Returns are before transaction costs. The rule was set with knowledge of the full sample, so the split-sample results are a stability check, not a held-out test.',
    ],
  },
];

/** "Each part of the signal does its own job" (PDF p. 39), as three rows. */
const PARTS = [
  ['Freshness', 'separates inversions that still carry timing information from stale ones.'],
  ['Clustering', 'separates a shared slowdown from a domestic one.'],
  ['The average curve’s shape', 'separates risk that is compensated from risk that is not.'],
];

const FIGURES = {
  fig1: {
    no: 'Figure 1', page: 3, title: 'The carry trade and the IYC signal, 1988–2026',
    caption: 'Top to bottom: the carry portfolio’s cumulative total return, its cumulative spot return, and two counts of inverted G10 curves. The naive count (light) counts curves with the 10-year yield below the 2-year this month; the IYC signal count (dark) counts inversions that entered fresh and are not yet confirmed re-steepened. The dotted line is the cluster threshold of two, and shaded bands mark IYC signal episodes. Triangles mark each series’ bottom-5% (crash) months, of which the two sets share 22 of their 23; black stars mark the bottom-1% months, the five worst of the sample, four of which fall inside the traded state.',
    alt: 'Three stacked panels, 1988 to 2026: the carry trade’s cumulative total return, its cumulative spot return, and the naive and IYC counts of inverted G10 curves against a threshold of two, with signal episodes shaded. Stars mark the five worst carry months; four fall inside the shaded episodes.',
  },
  fig2: {
    no: 'Figure 2', page: 10, title: 'How the signal switches on and off, in event time',
    caption: 'Signal timeline illustration (stylized). Two countries’ 10Y−2Y slopes: each curve becomes active in the month its inversion is first observed (triangle), its slope steepens in two consecutive months (circles), and it is deactivated (×) while still inverted. The active count <i>N</i><sub><i>t</i></sub> across the nine curves is compared with the threshold of two, and the shaded band is the signal state. The bottom panel is the position: unwinding (or going anti-carry) in the shaded months and returning when the signal turns off, while the downcurve overwrite stays invested throughout.',
    alt: 'Stylized timeline in four panels: curve i inverts at month t and curve j at t+1; both are deactivated after two steepening months while still below zero. The active count reaches two at t+1, switching the signal on until t+6. The bottom panel shows the carry position out of the trade during the signal and the downcurve overwrite staying invested.',
    steps: [
      { region: [0, 0, 1, 0.23], note: 'Curve i: its slope first dips below zero at the end of month t (red triangle), so the curve becomes active. After two consecutive steepening months it is deactivated at t+6, even though it is still below zero.' },
      { region: [0, 0.25, 1, 0.24], note: 'Curve j inverts one month later, at the end of t+1. Two curves are now freshly inverted together.' },
      { region: [0, 0.51, 1, 0.2], note: 'The active count reaches the threshold of two at the end of t+1, which switches the signal on (pink band). It falls back to one at the end of t+6, when curve i is deactivated, and the signal switches off.' },
      { region: [0, 0.73, 1, 0.27], note: 'The position: the state is observed at the end of t+1 and acted on over t+2. The unwind is out of the trade during the band and back in from the end of t+6. The downcurve overwrite (dashed) stays invested throughout.' },
    ],
  },
  fig3: {
    no: 'Figure 3', page: 13, title: 'Naive count vs IYC signal in 1998–2000',
    caption: 'The naive count against the IYC signal, 1998:01–2000:07. (a) The Norwegian 10Y−2Y slope: the naive inversion is the grey bar (slope below zero); the active period under the paper’s rule is shaded, from the month the inversion is first observed to the deactivation after two consecutive steepening months. The curve is deactivated in December 1998 while still inverted and stays naively inverted for another four months. (b) Across the nine curves, the naive inversion count and the IYC active count against the cluster threshold of two. (c) The carry trade’s cumulative total return (solid) and spot component (dashed), with the months in which each traded state is on shaded. From November 1998 to April 1999 the naive state is on while the IYC state is off, and the carry trade earns +6.2%.',
    alt: 'Three panels, January 1998 to July 2000: Norway’s 10Y−2Y slope with its short active period and longer naive inversion; the naive and IYC counts across nine curves against a threshold of two; and the carry trade’s cumulative return, which earns 6.2% while the naive state is on and the IYC state is off.',
    steps: [
      { region: [0, 0, 1, 0.37], note: 'Norway’s slope inverts in mid-1998 (triangle) and the curve becomes active (red shading). Two steepening months deactivate it (circles) while the slope is still below zero. The grey bar shows that the naive definition keeps counting it as inverted for months afterward.' },
      { region: [0, 0.37, 1, 0.21], note: 'Across all nine curves, the naive count (blue) stays at or above the threshold of two. The IYC active count (red) falls below two once the fresh inversions are deactivated.' },
      { region: [0.38, 0.58, 0.17, 0.42], note: 'In the window where the naive state is on but the IYC state is off (blue band), the carry trade recovers and earns +6.2%. The naive count would have kept an investor out of a profitable stretch.' },
    ],
  },
  fig5: {
    no: 'Figure 5', page: 19, title: 'Average G10 yield curve by signal state and regime',
    caption: 'Average G10 yield curves by state and regime. Solid lines are downcurve (N=37) and non-downcurve (N=56) signal months; dashed lines are downcurve (N=15) and non-downcurve (N=350) no-signal months. Points are the average 3-month, 2-year, and 10-year yields.',
    alt: 'Average yield against maturity for four groups of months. Downcurve signal months sit highest, near 9.4% at three months, and slope down; non-downcurve signal months rise gently from about 4%; non-downcurve months without the signal sit lowest and slope upward.',
  },
  fig6: {
    no: 'Figure 6', page: 23, title: 'Higher-beta, higher-rate currencies lose more on the signal',
    caption: 'On-signal spot effect against the currency beta (left) and the average IRD (right), one point per currency, on a shared vertical scale. Circles and solid fits are for the full signal (slopes −42 and −2.8, R² = 0.61 and 0.66); squares and dashed fits are for the non-downcurve months (slopes −80 and −4.9, R² = 0.81 and 0.75).',
    alt: 'Two scatter plots of the nine G10 currencies. The on-signal spot effect falls as currency beta (left) and the average rate differential (right) rise: the yen, franc and euro sit top left near zero or above, the New Zealand and Australian dollars bottom right near −17 to −19% a year.',
    steps: [
      { region: [0, 0, 0.53, 1], note: 'Left panel: each point is one G10 currency. The horizontal axis is its average exposure to the U.S. stock market (currency beta), and the vertical axis is how much it moves against the dollar when the signal is on (%/yr).' },
      { region: [0.36, 0.6, 0.17, 0.35], note: 'Bottom right: the high-beta commodity currencies, NZ and AU, lose the most (around −17 to −19%/yr in non-downcurve months).' },
      { region: [0.1, 0.05, 0.27, 0.3], note: 'Top left: the low-beta safe havens, JP, CH and EU, hold steady or gain. The carry trade is short these currencies and long the ones at the bottom right.' },
      { region: [0.53, 0, 0.47, 1], note: 'Right panel: the same pattern against each currency’s average interest rate differential. Dashed lines (non-downcurve months) are steeper than solid ones, so the ordering is sharpest outside the inflation-fighting regime.' },
    ],
  },
  fig7: {
    no: 'Figure 7', page: 32, title: 'Cumulative returns of the five trading strategies',
    caption: 'Cumulative total returns of the strategies in Table 8 (before transaction costs). Pink bands mark the IYC signal episodes, in which the unwind and anti-carry strategies depart from the always-invested line; purple bands mark the downcurve months, in which the overwrite strategies differ from the plain unwind and anti-carry, most visibly in 1988–91 and 2023–24.',
    alt: 'Cumulative total returns, 1988 to 2026, for always in, unwind on signal, anti-carry on signal and the two overwrite strategies. All rise over the sample; the anti-carry overwrite ends highest and always in lowest.',
  },
};

const TABLES = {
  table3: {
    no: 'Table 3', page: 21,
    title: 'The carry trade and beta HML portfolio in and out of the IYC signal',
    headers: ['State', 'N', 'Mean (%/yr)', 'Sharpe', 'Skew', 'ES5% (%/month)', '<i>γ</i> gap (%/yr)', 'NW12[p]', 'WCB[p]'],
    groups: [
      ['Carry, spot', [
        ['No signal', '365', '+2.64', '0.35', '−0.52', '−5.06', '', '', ''],
        ['IYC signal', '93', '−8.99', '−1.01', '−1.05', '−7.59', '−11.63', '0.003', '0.001'],
        ['non-downcurve', '56', '−14.95', '−1.52', '−1.10', '−8.63', '−17.35', '0.002', '0.002'],
        ['downcurve', '37', '+0.02', '0.00', '0.27', '−3.71', '−0.29', '0.918', '0.905'],
        ['ex bottom decile', '80', '−0.33', '−0.06', '0.76', '−2.50', '−8.38', '0.001', '0.010'],
      ]],
      ['Carry, total', [
        ['No signal', '365', '+6.19', '0.83', '−0.45', '−4.69', '', '', ''],
        ['IYC signal', '93', '−3.67', '−0.41', '−1.04', '−7.24', '−9.86', '0.013', '0.007'],
        ['non-downcurve', '56', '−10.31', '−1.05', '−1.11', '−8.27', '−16.51', '0.003', '0.004'],
        ['downcurve', '37', '+6.37', '0.96', '0.41', '−3.00', '+2.37', '0.351', '0.396'],
        ['ex bottom decile', '80', '+5.09', '0.85', '0.81', '−2.04', '−6.45', '0.009', '0.022'],
      ]],
      ['Beta HML, spot', [
        ['No signal', '365', '+3.57', '0.43', '0.04', '−4.85', '', '', ''],
        ['IYC signal', '93', '−9.24', '−0.95', '−0.98', '−7.97', '−12.82', '0.001', '0.006'],
        ['non-downcurve', '56', '−14.77', '−1.62', '−1.66', '−8.60', '−17.93', '0.000', '0.001'],
        ['downcurve', '37', '−0.88', '−0.09', '−0.58', '−6.83', '−2.01', '0.740', '0.858'],
        ['ex bottom decile', '79', '+1.04', '0.16', '0.83', '−2.73', '−7.69', '0.011', '0.035'],
      ]],
      ['Beta HML, total', [
        ['No signal', '365', '+5.29', '0.63', '0.07', '−4.67', '', '', ''],
        ['IYC signal', '93', '−8.29', '−0.85', '−0.92', '−7.86', '−13.58', '0.000', '0.001'],
        ['non-downcurve', '56', '−13.29', '−1.47', '−1.60', '−8.40', '−18.03', '0.000', '0.001'],
        ['downcurve', '37', '−0.71', '−0.07', '−0.50', '−7.05', '−3.53', '0.567', '0.864'],
        ['ex bottom decile', '79', '+1.99', '0.31', '0.96', '−2.53', '−8.47', '0.003', '0.003'],
      ]],
    ],
    mark: (row) => row[0] === 'IYC signal',
    note: 'Sample 1988:01–2026:02 (N = 458). Mean is annualized (%/yr); Sharpe is annualized; ES5% is the mean of the worst 5% of monthly observations (%/month). <i>γ</i> (gap) is the coefficient on the state dummy in <i>r</i><sub><i>t</i>+1</sub> = <i>α</i> + <i>γ</i> State<sub><i>t</i></sub> + <i>e</i><sub><i>t</i>+1</sub>, a difference from every other month, not a level, so it can have the opposite sign to the row’s mean. NW12[p] is the Newey–West (12 lag) p; WCB[p] is the wild cluster bootstrap p on the state’s episodes (B = 9,999). The No signal mean is the regression intercept. The ex bottom decile rows drop the series’ full-sample bottom-decile months from both states; their intercepts are carry spot +8.05, carry total +11.54, beta HML spot +8.73, beta HML total +10.46.',
  },
  table8a: {
    no: 'Table 8, Panel A', page: 31,
    title: 'Trading the IYC signal on the carry trade (total returns)',
    headers: ['Strategy', 'Mean (%/yr)', 'Sharpe', 'Skew', 'ES5% (%/mo)', 'Max DD (%)', 'Worst month (%/mo)', 'ΔSR vs always in', 'ΔMean vs always in', 'ΔSkew vs always in'],
    rows: [
      ['Always in', '+4.19', '0.53', '-0.68', '-5.30', '-30.1', '-11.61', '', '', ''],
      ['Unwind on signal', '+4.93', '0.73', '-0.34', '-4.48', '-25.9', '-7.27', '+0.20 (Asy p 0.071; Boot p 0.122)', '+0.75 (Asy p 0.293; Boot p 0.292)', '+0.35 (Boot p 0.164)'],
      ['Anti-carry on signal', '+5.68', '0.73', '-0.02', '-4.71', '-25.9', '-7.27', '+0.20 (Asy p 0.287; Boot p 0.318)', '+1.49 (Asy p 0.293; Boot p 0.292)', '+0.66 (Boot p 0.139)'],
      ['Overwrite: unwind unless downcurve', '+5.45', '0.78', '-0.33', '-4.51', '-25.9', '-7.27', '+0.25 (Asy p 0.022; Boot p 0.079)', '+1.26 (Asy p 0.057; Boot p 0.066)', '+0.36 (Boot p 0.115)'],
      ['Overwrite: anti-carry unless downcurve', '+6.71', '0.87', '-0.01', '-4.59', '-25.9', '-7.27', '+0.34 (Asy p 0.051; Boot p 0.094)', '+2.52 (Asy p 0.057; Boot p 0.066)', '+0.68 (Boot p 0.119)'],
    ],
    mark: (row) => row[0] === 'Always in',
    note: '1988:01–2026:02, N = 458 months, no transaction costs. Mean is annualized (%/yr); ES5% and worst month are %/month; Max DD is the largest peak-to-trough cumulative loss (%). Overwrite strategies stay invested when the average G10 curve is in the downcurve configuration. Asy p uses the Ledoit–Wolf (2008) standard error; Boot p is a studentized circular block bootstrap (block length 6, B = 4,999); skewness is tested by bootstrap only. The paper calls the gains economically meaningful but statistically marginal for the carry portfolio. Panel B (beta HML) is not shown here.',
  },
  tableB2: {
    no: 'Table B.2', page: 47,
    title: 'Cluster-size grid: why the threshold is two',
    headers: ['Cluster size', 'ON months', 'Carry spot', 'Carry total', 'Beta HML spot', 'Beta HML total'],
    rows: [
      ['≥1 (any inversion)', '169', '−4.02 (NW 0.125; WCB 0.155)', '−2.65 (NW 0.308; WCB 0.374)', '−9.52 (NW 0.000; WCB 0.003)', '−9.96 (NW 0.000; WCB 0.001)'],
      ['= 1 (exactly one)', '76', '+6.84 (NW 0.003; WCB 0.014)', '+7.08 (NW 0.002; WCB 0.021)', '−1.03 (NW 0.712; WCB 0.762)', '−0.88 (NW 0.751; WCB 0.797)'],
      ['≥2 (baseline)', '93', '−11.63 (NW 0.003; WCB 0.001)', '−9.86 (NW 0.013; WCB 0.007)', '−12.82 (NW 0.001; WCB 0.006)', '−13.58 (NW 0.000; WCB 0.001)'],
      ['= 2 (exactly two)', '41', '−15.16 (NW 0.006; WCB 0.010)', '−14.23 (NW 0.011; WCB 0.018)', '−16.82 (NW 0.002; WCB 0.003)', '−17.16 (NW 0.001; WCB 0.002)'],
      ['≥3', '52', '−6.43 (NW 0.041; WCB 0.116)', '−4.33 (NW 0.184; WCB 0.264)', '−6.99 (NW 0.072; WCB 0.182)', '−7.93 (NW 0.031; WCB 0.081)'],
      ['= 3 (exactly three)', '22', '−11.63 (NW 0.064; WCB 0.197)', '−10.45 (NW 0.089; WCB 0.245)', '−8.98 (NW 0.010; WCB 0.065)', '−9.49 (NW 0.004; WCB 0.032)'],
      ['≥4', '30', '−1.89 (NW 0.548; WCB 0.320)', '+0.68 (NW 0.845; WCB 0.862)', '−4.78 (NW 0.426; WCB 0.465)', '−5.96 (NW 0.300; WCB 0.315)'],
    ],
    mark: (row) => row[0].startsWith('≥2'),
    note: 'Each cell is the state coefficient <i>γ</i> in <i>r</i><sub><i>t</i>+1</sub> = <i>α</i> + <i>γ</i> State<sub><i>t</i></sub> + <i>e</i><sub><i>t</i>+1</sub>, annualized %/yr, 1988:01–2026:02 (a gap relative to all other months, not a level). NW = Newey–West (12 lag) p; WCB = wild cluster bootstrap p on the state’s own runs (B = 9,999). The paper’s baseline is the nested ≥2 rule; the author notes a grid search would have picked exactly two, but ≥2 was chosen on economic grounds and is the one an investor can implement.',
  },
};

const GLOSSARY = [
  ['IYC signal', 'On when at least two of the nine G10 (non-U.S.) curves are freshly inverted and not yet confirmed re-steepened; observed at month-end, acted on over the next month.'],
  ['Fresh (active) inversion', 'From the month a curve’s slope is first seen below zero until it has steepened two months in a row, whether or not it is back above zero.'],
  ['Naive count', 'Curves with the 10-year yield below the 2-year this month, however long they have been inverted.'],
  ['Yield-curve slope', 'Long-tenor minus short-tenor yield: 10-year minus 2-year in the baseline, 10-year minus 3-month as a check.'],
  ['Interest rate differential (IRD)', 'A currency’s one-month money-market rate minus the U.S. rate; the carry portfolio’s income leg, known in advance.'],
  ['Uncovered interest parity (UIP)', 'The benchmark under which a high-interest currency is expected to depreciate by exactly the differential; its failure is the source of the carry premium.'],
  ['Fama regression', 'Currency appreciation on the lagged rate differential. UIP implies a slope of −1; the paper finds −1.27 inside the signal.'],
  ['Currency beta', 'The slope of a currency’s daily appreciation on the daily U.S. equity market return, over a rolling 90 trading days.'],
  ['Beta HML', 'High-minus-low: long the three highest-beta currencies and short the three lowest.'],
  ['G10', 'AUD, NZD, CAD, NOK, SEK, GBP, EUR, CHF and JPY, with the U.S. dollar as numeraire; the DEM stands in for the EUR before 1999.'],
  ['CLI', 'The OECD composite leading indicator, built to signal business-cycle turning points six to nine months ahead.'],
  ['Downcurve regime', 'Months in which the average G10 curve slopes strictly downward (3-month &gt; 2-year &gt; 10-year): 52 of 458, 37 inside the signal.'],
  ['Carry overwrite', 'Unwinding (or going anti-carry) on the signal unless the downcurve regime is on.'],
  ['Anti-carry', 'Long the low-rate and short the high-rate currencies: it earns the crash if one comes, but costs about twice the differential if one does not.'],
  ['Carry-premium risk', 'The cost of hedging: an unwind gives up the differential that compensates the crash risk, most when it is widest.'],
  ['Risk compensation ratio (<i>κ</i>)', 'Income leg over expected crash loss; unwinding or going anti-carry raises expected return only if <i>κ</i> &lt; 1.'],
  ['Safe-haven currencies', 'Low-rate, low-beta currencies (yen, Swiss franc, euro) that gain when global growth fears rise.'],
  ['ES5%', 'Expected shortfall: the average of the worst 5% of monthly returns, in %/month.'],
  ['WCB[p]', 'Wild cluster bootstrap p-value: it resamples whole signal runs rather than months, and is usually stricter than Newey–West (NW12[p]).'],
  ['Expectations hypothesis', 'Long yields average expected future short rates plus a slow-moving term premium, so an inversion means markets expect short rates to fall.'],
  ['EM extension', 'Seven floating currencies (BRL, CLP, IDR, INR, MXN, KRW, ZAR) from 1996:02, using the G10 signal without re-estimation.'],
];

// ---- the illustration: nine made-up curves -----------------------------------------------------------
// Starting 10Y−2Y slopes (percentage points) for curves A–I. research.ts holds the same numbers.
const DEMO_START = [0.9, 0.6, 1.1, 0.7, 1.2, 0.8, 1.0, 0.5, 1.3];
const PRESETS = [
  ['lone', 'Lone inversion'],
  ['two', 'Two fresh at once'],
  ['stale', 'Gone stale'],
  ['late', 'Late breadth'],
];

// ---- helpers ------------------------------------------------------------------------------------------
const attr = (s) => String(s).replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const plain = (html) => String(html).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const minus = (s) => String(s).replace(/(^|[\s(])-(?=\d)/g, '$1−');
const kb = (file) => {
  try {
    return `${Math.round(statSync(join(ROOT, 'static', file)).size / 1024)}&nbsp;KB`;
  } catch {
    return '';
  }
};
const pdfAt = (root, page) => `${root}${PDF}#page=${String(page).match(/\d+/)[0]}`;
const ref = (root, pages) =>
  `<a class="a-ref" href="${pdfAt(root, pages)}" data-pages="${attr(pages)}" title="PDF page${/[,–]/.test(pages) ? 's' : ''} ${attr(pages)}"><span class="sr">Paper, PDF </span>p.&nbsp;${pages}</a>`;
const NEW_TAB = '<span class="sr"> (opens in a new tab)</span>';
const pad = (n) => String(n).padStart(2, '0');

/** Pixel size of a WebP (VP8, VP8L or VP8X); null if the file is missing or unreadable. */
function webpSize(file) {
  try {
    const b = readFileSync(file);
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
    }
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  } catch {
    /* not extracted yet: fall back below */
  }
  return null;
}
const imgSize = (id, suffix = '') => webpSize(join(ROOT, 'static', FIG_DIR, `${id}${suffix}.webp`)) ?? [suffix ? 900 : 1800, suffix ? 600 : 1200];

const ICON_PDF = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5h6.5L15 6v11.5H5z"/><path d="M11.5 2.5V6H15"/><path class="a-dl" d="M10 8.5v6M7.6 12.2 10 14.6l2.4-2.4"/></svg>`;

// ---- figure, table and illustration blocks -----------------------------------------------------------
function figure(id, root, { eager = false } = {}) {
  const f = FIGURES[id];
  const [w, h] = imgSize(id);
  const [w9, h9] = imgSize(id, '-900');
  const src = `${root}${FIG_DIR}${id}`;
  const steps = f.steps ?? [];
  return `<figure class="a-fig" id="${id}" data-fig data-full="${src}.webp" data-w="${w}" data-h="${h}" aria-labelledby="${id}-t">
<div class="a-fig-head"><p class="a-fig-no">${f.no}</p><h3 class="a-fig-t" id="${id}-t">${f.title}</h3></div>
<div class="a-fig-tools"><button class="btn sm" type="button" data-view="inspect">Inspect figure</button>${steps.length ? `<button class="btn sm" type="button" data-view="walk">Play walkthrough<span class="a-steps-n">${steps.length} steps</span></button>` : ''}</div>
<a class="a-plate" href="${src}.webp" data-view="inspect" tabindex="-1"><img src="${src}-900.webp" srcset="${src}-900.webp ${w9}w, ${src}.webp ${w}w" sizes="(min-width: 64rem) 46rem, calc(100vw - 2rem)" width="${w9}" height="${h9}"${eager ? '' : ' loading="lazy"'} decoding="async" alt="${attr(f.alt)}"></a>
<figcaption>${f.caption} ${ref(root, f.page)}</figcaption>
${steps.length ? `<script type="application/json" class="a-walk">${JSON.stringify(steps).replace(/</g, '\\u003c')}</script>` : ''}
</figure>`;
}

/** "−4.02 (NW 0.125; WCB 0.155)" → value over a small line of p-values. */
const cell = (v) => {
  const m = minus(v).match(/^(\S+)\s+\((.+)\)$/);
  return m ? `<b>${m[1]}</b><small>${m[2].replace(/;\s*/g, ' · ')}</small>` : minus(v);
};

function table(id, root) {
  const t = TABLES[id];
  const head = `<thead><tr>${t.headers.map((h, i) => `<th scope="col"${i ? '' : ' class="a-rowh"'}>${h}</th>`).join('')}</tr></thead>`;
  const row = (r) =>
    `<tr${t.mark(r) ? ' class="a-mark"' : ''}><th scope="row" class="a-rowh">${r[0]}</th>${r.slice(1).map((v) => `<td${v ? '' : ' class="empty"'}>${v ? cell(v) : '<span class="sr">none</span>'}</td>`).join('')}</tr>`;
  const body = t.groups
    ? t.groups.map(([name, rows]) => `<tbody><tr class="a-grp"><th scope="rowgroup" colspan="${t.headers.length}">${name}</th></tr>${rows.map(row).join('')}</tbody>`).join('')
    : `<tbody>${t.rows.map(row).join('')}</tbody>`;
  return `<figure class="a-tab" id="${id}" aria-labelledby="${id}-t">
<div class="a-fig-head"><p class="a-fig-no">${t.no}</p><h3 class="a-fig-t" id="${id}-t">${t.title}</h3></div>
<div class="table-wrap a-scroll" tabindex="0" role="region" aria-labelledby="${id}-t"><table>${head}${body}</table></div>
<figcaption><details class="a-how"><summary>How to read this table</summary><p>${t.note}</p></details>${ref(root, t.page)}</figcaption>
</figure>`;
}

function demo(root) {
  const curve = (s, i) => {
    const L = String.fromCharCode(65 + i);
    const v = `${s >= 0 ? '+' : '−'}${Math.abs(s).toFixed(1)}`;
    return `<li class="sig-c" data-i="${i}" data-s="normal">
<p class="sig-top"><b>${L}</b><span class="sig-chip">Normal</span></p>
<div class="plot sig-mini"></div>
<p class="sig-in"><input type="range" min="-1.5" max="1.5" step="0.1" value="${s}" aria-label="Curve ${L}, 10Y minus 2Y slope" aria-valuetext="${v} points, normal"><output>${v}</output></p>
</li>`;
  };
  return `<figure class="a-card sig" id="signal-demo" aria-labelledby="sig-t">
<div class="a-fig-head"><p class="a-fig-no"><span class="sig-tag">Illustration</span>Made-up curves, not data</p><h3 class="a-fig-t" id="sig-t">Nine curves, one alarm</h3></div>
<div class="sig-body">
<div class="sig-presets" role="group" aria-label="Examples">${PRESETS.map(([k, t]) => `<button class="btn sm" type="button" data-preset="${k}" aria-pressed="false">${t}</button>`).join('')}<button class="btn sm quiet sig-reset" type="button" data-reset>Reset</button></div>
<ol class="sig-curves" aria-label="Nine yield curves, A to I">${DEMO_START.map(curve).join('')}</ol>
<div class="sig-time" role="group" aria-label="Month">
<button class="btn" type="button" data-month="-1" aria-label="Previous month" disabled><span aria-hidden="true">←</span>Previous<span class="sig-wide">month</span></button>
<output class="sig-m">Month 0</output>
<button class="btn primary" type="button" data-month="1" aria-label="Next month">Next<span class="sig-wide">month</span><span aria-hidden="true">→</span></button>
</div>
<div class="sig-read">
<div class="sig-counts">
<p class="sig-n naive"><span>Naive count</span><b data-out="naive">0</b><small>slope &lt; 0</small></p>
<p class="sig-n"><span>Active <i>N</i></span><b data-out="n">0</b><small>fresh, not yet re-steepened</small></p>
</div>
<div class="sig-gauge" aria-hidden="true"><span class="sig-cells">${'<span></span>'.repeat(9)}</span><span class="sig-th">2</span></div>
<p class="sig-light" data-light="iyc"><span class="sig-dot"></span><span>IYC signal <b>off</b></span></p>
<p class="sig-light naive" data-light="naive"><span class="sig-dot"></span><span>Naive ≥ 2 <b>off</b></span></p>
</div>
<div class="plot sig-strip"><span class="sr">Strip chart of the naive count and the active count for each month stepped so far, with the threshold of two.</span></div>
<p class="key sig-key"><span class="k-line k-acc">Active <i>N</i></span><span class="k-line">Naive count</span><span class="k-line k-gold">Threshold 2</span></p>
<div class="sig-notes"><p class="sig-ev" data-out="event" aria-live="polite"></p><p class="sig-note" data-out="note">Drag a curve’s 10Y end below its 2Y level (dotted), or pick an example, then step through the months.</p></div>
<div class="sig-avg">
<label class="check"><input type="checkbox" data-avg> Show average curve shape</label>
<div class="sig-avg-body" hidden>
<div class="plot sig-avg-plot"></div>
<div class="sig-avg-side">
<label class="check"><input type="checkbox" data-high> Short rates held high (3M above 2Y)</label>
<p><span class="badge sig-down" data-out="down">Not downcurve</span></p>
<p class="sig-small">In the paper, a strictly downward average curve (3M &gt; 2Y &gt; 10Y) marks inflation-fighting inversions, where the wider interest differential compensated much of the risk.</p>
</div>
</div>
</div>
</div>
<figcaption>The paper’s rule: a curve turns active the month its 10Y−2Y slope is first below zero, and is deactivated after two months of steepening in a row. The signal is on when at least two curves are active; it is observed at month-end and acted on over the next month. No returns are simulated. ${ref(root, '4, 12')}</figcaption>
</figure>`;
}

function prose(block, root) {
  if (block === '{demo}') return demo(root);
  if (block === '{parts}')
    return `<dl class="a-parts">${PARTS.map(([k, v], i) => `<div style="--i:${i}"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const f = block.match(/^\{fig:(\w+)\}$/);
  if (f) return figure(f[1], root);
  const t = block.match(/^\{table:(\w+)\}$/);
  if (t) return table(t[1], root);
  return `<p>${block}</p>`;
}

const words = (s) => plain(s).split(/\s+/).filter(Boolean).length;
const READ_MIN = Math.max(
  1,
  Math.round(
    (words(LEAD) + SECTIONS.flatMap((s) => s.body.filter((b) => !b.startsWith('{'))).reduce((n, b) => n + words(b), 0)) / 220,
  ),
);

// ---- pages ----------------------------------------------------------------------------------------------
function articleBody(root) {
  const pdf = `${root}${PDF}`;
  const size = kb(PDF);
  const back = `${root}${ROUTES.research}`;
  const cite = `${AUTHOR.split(' ').reverse().join(', ')}. 2026. “${META.title}.” Job market paper, University of Washington, ${META.date}.`;
  const bib = `@unpublished{effendy2026invert,
  author = {Effendy, Alfredo},
  title  = {${META.title}},
  note   = {Job market paper, University of Washington},
  month  = sep,
  year   = {2026}
}`;
  const rail = SECTIONS.map(
    (s, i) => `<li><a href="#${s.id}" data-step="${s.id}"><span class="a-n">${pad(i + 1)}</span><span>${s.heading}</span></a></li>`,
  ).join('');
  return `<main id="main" class="art">
<article aria-labelledby="art-h">
<header class="a-head">
<div class="a-wrap a-grid">
<div class="a-meta">
<a class="a-back" href="${back}">Research</a>
<p class="a-kind cap">Job market paper</p>
<p class="a-date"><time datetime="${META.iso}">${META.date}</time></p>
<p class="a-time">${READ_MIN} min read</p>
</div>
<div class="a-intro">
<p class="a-kicker"><a href="${pdf}" target="_blank" rel="noopener" type="application/pdf">${META.title}<span class="a-ext" aria-hidden="true">↗</span>${NEW_TAB}</a></p>
<h1 id="art-h">${HEADLINE}</h1>
<p class="a-by">${AUTHOR}<span aria-hidden="true"> · </span><span class="sr">, </span>University of Washington</p>
<p class="a-lead">${LEAD}</p>
<dl class="a-abbr" aria-label="Abbreviations">${ABBR.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<div class="stats a-glance">${GLANCE.map(
    (g) => `<div class="stat${g.cls ? ` ${g.cls}` : ''}" data-page="${g.page}"><span>${g.label}</span><b>${g.value}</b><small>${g.note}</small></div>`,
  ).join('')}</div>
</div>
</div>
</header>
<div class="a-wrap a-grid a-main">
<nav class="a-rail" aria-label="Sections">
<p class="cap">In this article</p>
<ol class="a-steps">${rail}<li><a href="#paper" data-step="paper"><span class="a-n">→</span><span>The paper</span></a></li></ol>
</nav>
<div class="a-col">
${SECTIONS.map(
  (s, i) => `<section class="a-sec" id="${s.id}" aria-labelledby="${s.id}-h">
<div class="a-sec-head"><span class="a-n" aria-hidden="true">${pad(i + 1)}</span><h2 id="${s.id}-h">${s.heading}</h2>${ref(root, s.pages)}</div>
${s.body.map((b) => prose(b, root)).join('\n')}
</section>`,
).join('\n')}
<section class="a-sec a-paper" id="paper" aria-labelledby="paper-h">
<div class="a-sec-head"><span class="a-n" aria-hidden="true">→</span><h2 id="paper-h">The paper</h2></div>
<a class="btn primary a-cta" href="${pdf}" target="_blank" rel="noopener" type="application/pdf">${ICON_PDF}<span>Read the full paper (PDF)</span>${size ? `<small>${size}</small>` : ''}${NEW_TAB}</a>
<dl class="a-facts">
<div><dt>Title</dt><dd>${META.title}</dd></div>
<div><dt>Date</dt><dd>${META.date}</dd></div>
<div><dt>Committee</dt><dd>${META.committee}</dd></div>
<div><dt>JEL</dt><dd>${META.jel}</dd></div>
<div><dt>Keywords</dt><dd>${META.keywords}</dd></div>
</dl>
<details class="a-more"><summary>Abstract</summary><p>${META.abstract}</p></details>
<details class="a-more a-gloss"><summary>Glossary<span class="a-count">${GLOSSARY.length} terms</span></summary><dl>${GLOSSARY.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></details>
<div class="a-cite">
<h3 class="cap">Cite</h3>
<div class="a-cite-box"><pre id="cite-text">${cite}</pre><button class="btn sm a-copy" type="button" data-copy="cite-text">Copy</button></div>
<div class="a-cite-box"><pre id="cite-bib">${bib}</pre><button class="btn sm a-copy" type="button" data-copy="cite-bib">Copy BibTeX</button></div>
<p class="a-copied" aria-live="polite"></p>
</div>
</section>
<nav class="a-end" aria-label="More">
<a class="a-end-back" href="${back}"><small>Back to</small>Research</a>
<a class="a-end-next" href="${root}${ROUTES.home}"><small>Try the labs</small>Stats Engine</a>
</nav>
</div>
</div>
</article>
</main>`;
}

function indexBody(root) {
  const article = `${root}${ROUTES.jmp}`;
  const pdf = `${root}${PDF}`;
  const size = kb(PDF);
  const [w, h] = imgSize('fig1', '-900');
  const facts = [
    ['93 of 458', 'months with the signal on'],
    ['4 of 5', 'worst carry months inside it'],
    ['−8.99%/yr', 'carry spot return, signal on'],
  ];
  return `<main id="main" class="res">
<header class="r-head">
<div class="r-wrap">
<h1>Research</h1>
<ul class="r-int" aria-label="Research interests">${INTERESTS.map((t, i) => `<li style="--i:${i}">${t}</li>`).join('')}</ul>
</div>
</header>
<div class="r-wrap r-body">
<article class="r-lead" aria-labelledby="jmp-h">
<a class="r-thumb" href="${article}" tabindex="-1" aria-hidden="true"><img src="${root}${FIG_DIR}fig1-900.webp" width="${w}" height="${h}" decoding="async" fetchpriority="high" alt=""></a>
<div class="r-lead-body">
<p class="r-kind"><span class="cap">Job market paper</span><time datetime="${META.iso}">${META.date}</time></p>
<h2 id="jmp-h"><a href="${article}">${HEADLINE}</a></h2>
<p class="r-title">${META.title}</p>
<p class="r-sum">${SUMMARY}</p>
<dl class="r-facts">${facts.map(([v, k]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<p class="r-actions"><a class="btn primary r-go" href="${article}">Read the summary<span aria-hidden="true">→</span></a><a class="btn" href="${pdf}" type="application/pdf" target="_blank" rel="noopener">PDF${size ? `<span class="r-size">${size}</span>` : ''}${NEW_TAB}</a></p>
</div>
</article>
<section class="r-wip" aria-labelledby="wip-h">
<h2 class="r-h2" id="wip-h">Work in progress</h2>
<ul>${WIP.map((t) => `<li>${t}</li>`).join('')}</ul>
</section>
</div>
</main>`;
}

export const pages = [
  {
    path: 'research/index.html',
    title: `Research · ${AUTHOR}`,
    description: `${AUTHOR}’s research in international finance, asset pricing and risk management: the job market paper “${META.title}” and work in progress.`,
    current: 'research',
    tagline: 'Research',
    css: ['research-index'],
    body: indexBody,
  },
  {
    path: `${ROUTES.jmp}index.html`,
    title: `When yield curves invert together · ${AUTHOR}`,
    description: plain(SUMMARY),
    current: 'research',
    tagline: 'Research',
    css: ['article'],
    entry: 'src/pages/research.ts',
    body: articleBody,
  },
];
