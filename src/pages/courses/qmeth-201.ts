import '../../site';
import { normCdf, normInv, normPdf } from '../../core/dist';
import { Rng } from '../../core/rng';
import { fmt, pct, reducedMotion, showFor, tidy } from '../../ui/dom';
import { describeEq, fillEq } from '../../ui/eq';
import { FONT, Plot, curve, label, linear, palette, tween, xAxis } from '../../ui/plot';

// QMETH 201 interactive: a one-sample z test for a mean, with illustrative numbers.
// A filling line targets μ0 = 500 g; σ = 10 g is taken as known. A sample mean of n boxes is
// x̄ ~ N(μ, σ²/n) exactly, so each draw is stored as its standard normal deviate u and shown as
// x̄ = μ + u·σ/√n: changing μ or n moves every past draw with the same luck, and the share of
// draws that reject settles near the power.
const ID = 'qmeth-201';
const MU0 = 500;
const SIGMA = 10;
const X0 = 478;
const X1 = 522;
/** Where a cut-off that does not exist (one-sided tests) sits: far off the chart, so it slides away. */
const OFF = 80;
const KEEP = 2000;
/** First sample: p a little above 0.05, so the default test just misses (a Type II error). */
const SEED = 25;

type Alt = 'two' | 'right' | 'left';
/**
 * What the chart shows; every field eases between states. mode: 0 = p-value, 1 = errors and power;
 * h1: 1 when the alternative is true (only then are there power and Type II areas to shade).
 */
interface View {
  mu: number;
  se: number;
  xbar: number;
  lo: number;
  hi: number;
  plo: number;
  phi: number;
  mode: number;
  h1: number;
}

const host = document.getElementById(`${ID}-tool`);
if (host) init(host);

function init(tool: HTMLElement): void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(`${ID}-${id}`) as T;
  const muIn = $<HTMLInputElement>('mu');
  const nIn = $<HTMLInputElement>('n');
  const eqZ = $('eq-z');
  const eqP = $('eq-p');
  const picked = (name: string) => tool.querySelector<HTMLInputElement>(`input[name="${ID}-${name}"]:checked`)!.value;
  const pick = (name: string, value: string) => {
    tool.querySelector<HTMLInputElement>(`input[name="${ID}-${name}"][value="${value}"]`)!.checked = true;
  };
  let rng = new Rng(SEED);
  let draws: number[] = [rng.normal()];

  function model() {
    const alt = picked('alt') as Alt;
    const alpha = +picked('alpha');
    const mu = +muIn.value;
    const n = +nIn.value;
    const se = SIGMA / Math.sqrt(n);
    const crit = normInv(1 - (alt === 'two' ? alpha / 2 : alpha));
    const d = (mu - MU0) / se;
    const xbar = mu + se * draws[draws.length - 1];
    const z = (xbar - MU0) / se;
    const p = alt === 'two' ? 2 * normCdf(-Math.abs(z)) : alt === 'right' ? normCdf(-z) : normCdf(z);
    const rejects = (zz: number) => (alt === 'two' ? Math.abs(zz) >= crit : alt === 'right' ? zz >= crit : zz <= -crit);
    let rej = 0;
    for (const u of draws) if (rejects(u + d)) rej++;
    const gap = Math.abs(xbar - MU0);
    const h1 = alt === 'two' ? mu !== MU0 : alt === 'right' ? mu > MU0 : mu < MU0;
    return {
      alt, alpha, mu, n, se, crit, xbar, z, p, rej, h1,
      reject: rejects(z),
      power: (alt === 'left' ? 0 : normCdf(d - crit)) + (alt === 'right' ? 0 : normCdf(-crit - d)),
      view: {
        h1: h1 ? 1 : 0,
        mu, se, xbar,
        lo: alt === 'right' ? MU0 - OFF : MU0 - crit * se,
        hi: alt === 'left' ? MU0 + OFF : MU0 + crit * se,
        plo: alt === 'two' ? MU0 - gap : alt === 'left' ? xbar : MU0 - OFF,
        phi: alt === 'two' ? MU0 + gap : alt === 'right' ? xbar : MU0 + OFF,
        mode: picked('show') === 'err' ? 1 : 0,
      } as View,
    };
  }
  type Model = ReturnType<typeof model>;

  // ---- chart --------------------------------------------------------------------------------------
  let view = model().view;
  let turn = 0;
  let hatch: CanvasPattern | null = null;
  let hatchFor = '';

  const plot = new Plot($('plot'), (pl) => {
    const { ctx, w, h } = pl;
    const c = palette();
    const L = 4;
    const R = w - 4;
    const T = 44;
    const B = h - 22;
    const sx = linear(X0, X1, L, R);
    const v = view;
    const peak = 1 / (v.se * Math.sqrt(2 * Math.PI));
    const sy = linear(0, peak / 0.82, B, T);
    const f0 = (x: number) => normPdf(x, MU0, v.se);
    const f1 = (x: number) => normPdf(x, v.mu, v.se);
    const cl = (x: number) => Math.min(X1, Math.max(X0, x));
    const lo = cl(v.lo);
    const hi = cl(v.hi);
    const m = v.mode;
    if (hatchFor !== c.accent) {
      const t = document.createElement('canvas');
      t.width = t.height = 6;
      const g = t.getContext('2d')!;
      g.strokeStyle = c.accent;
      g.globalAlpha = 0.55;
      g.beginPath();
      g.moveTo(-1, 7);
      g.lineTo(7, -1);
      g.stroke();
      hatch = ctx.createPattern(t, 'repeat');
      hatchFor = c.accent;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(L, 0, R - L, B);
    ctx.clip();
    // Rejection region, as columns behind the curves (p-value view).
    ctx.fillStyle = c.pop;
    ctx.globalAlpha = 0.5 * (1 - m);
    ctx.fillRect(L, 0, sx(lo) - L, B);
    ctx.fillRect(sx(hi), 0, R - sx(hi), B);
    const area = (style: string | CanvasPattern | null, alpha: number, f: (x: number) => number, a: number, b: number) => {
      a = cl(a);
      b = cl(b);
      if (b - a < 1e-6 || alpha <= 0.01 || !style) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = style;
      curve(pl, sx, sy, a, b, f, B);
    };
    area(c.gold, 0.55 * (1 - m), f0, X0, v.plo);
    area(c.gold, 0.55 * (1 - m), f0, v.phi, X1);
    area(hatch, m * v.h1, f1, lo, hi);
    area(c.accent, 0.3 * m * v.h1, f1, X0, lo);
    area(c.accent, 0.3 * m * v.h1, f1, hi, X1);
    area(c.gold, 0.5 * m, f0, X0, lo);
    area(c.gold, 0.5 * m, f0, hi, X1);
    ctx.globalAlpha = 1;

    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.gold;
    curve(pl, sx, sy, X0, X1, f0);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = c.accent;
    curve(pl, sx, sy, X0, X1, f1);

    // Cut-offs.
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (const x of [lo, hi]) {
      if (x <= X0 || x >= X1) continue;
      const px = Math.round(sx(x)) + 0.5;
      ctx.moveTo(px, 18);
      ctx.lineTo(px, B);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Every draw so far: a tick on the axis, purple where it rejects the null.
    for (const u of draws) {
      const x = v.mu + v.se * u;
      if (x < X0 || x > X1) continue;
      const out = x <= v.lo || x >= v.hi;
      ctx.fillStyle = out ? c.accent : c.muted;
      ctx.globalAlpha = out ? 0.7 : 0.45;
      ctx.fillRect(sx(x) - 0.75, B - 7, 1.5, 7);
    }
    ctx.globalAlpha = 1;

    // The observed sample mean.
    const ox = sx(cl(v.xbar));
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, 34);
    ctx.lineTo(ox, B);
    ctx.stroke();
    ctx.restore();

    // Region names along the top, where there is room.
    const name = (text: string, a: number, b: number) => {
      ctx.font = FONT;
      if (sx(b) - sx(a) > ctx.measureText(text).width * 1.25 + 12) label(pl, text, (sx(a) + sx(b)) / 2, 3, 'center');
    };
    if (lo > X0) name('Reject', X0, lo);
    if (hi < X1) name('Reject', hi, X1);
    name('Do not reject', lo, hi);

    // Curve names beside their peaks, pushed apart when they would meet.
    const apart = Math.abs(sx(v.mu) - sx(MU0)) > 3;
    const right = v.mu >= MU0;
    const py = sy(peak) - 15;
    const say = (text: string, x: number, align: CanvasTextAlign, color: string) => {
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      ctx.textAlign = align;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = c.surface;
      ctx.strokeText(text, x, py);
      ctx.fillStyle = color;
      ctx.fillText(text, x, py);
    };
    say(apart ? 'null 500' : 'null = true', sx(MU0) + (apart ? (right ? -6 : 6) : 0), apart ? (right ? 'right' : 'left') : 'center', c.gold);
    if (apart) say(`true ${tidy(v.mu, 1)}`, sx(v.mu) + (right ? 6 : -6), right ? 'left' : 'right', c.accent);

    xAxis(pl, sx, B, X0, X1);

    // Value tag for x̄, kept inside the chart.
    const text = `x̄ ${fmt(v.xbar, 2)}`;
    ctx.font = FONT;
    const tw = ctx.measureText(text).width + 10;
    const tx = Math.min(Math.max(ox - tw / 2, L), R - tw);
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.roundRect(tx, 18, tw, 17, 3);
    ctx.fill();
    ctx.fillStyle = c.surface;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + tw / 2, 27);
  });

  /** Glide the chart from what it shows now to `to`. Reduced motion jumps straight there. */
  function show(to: View, ms: number): void {
    const from = view;
    const mine = ++turn;
    if (ms <= 0 || reducedMotion()) {
      view = to;
      plot.request();
      return;
    }
    tween(
      ms,
      (t) => {
        if (mine !== turn) return;
        const mix = {} as View;
        for (const k in to) mix[k as keyof View] = from[k as keyof View] + (to[k as keyof View] - from[k as keyof View]) * t;
        view = mix;
        plot.now();
      },
      () => {},
    );
  }

  // ---- read-outs ----------------------------------------------------------------------------------
  const setHTML = (id: string, html: string) => {
    const el = $(id);
    if (el.innerHTML !== html) el.innerHTML = html;
  };
  const H0 = '<i>H</i><sub>0</sub>';
  const pText = (p: number) => (p < 0.001 ? '< 0.001' : fmt(p, 3));

  function readouts(m: Model, animate: boolean): void {
    const a = fmt(m.alpha, 2);
    const k = draws.length;
    setHTML('mu-v', tidy(m.mu, 1));
    setHTML('n-v', String(m.n));
    muIn.setAttribute('aria-valuetext', `${tidy(m.mu, 1)} grams`);
    nIn.setAttribute('aria-valuetext', `${m.n} boxes`);
    setHTML('z', fmt(m.z, 2));
    setHTML('z-s', `<i>x̄</i> = ${fmt(m.xbar, 2)} g`);
    setHTML('p', pText(m.p).replace('<', '&lt;'));
    setHTML('p-s', m.reject ? `≤ <i>α</i>: reject ${H0}` : '&gt; <i>α</i>: do not reject');
    setHTML('pow-l', m.h1 ? 'Power 1 − <i>β</i>' : `P(reject ${H0})`);
    setHTML('pow', fmt(m.power, 3));
    setHTML('pow-s', m.h1 ? `Type II <i>β</i> = ${fmt(1 - m.power, 3)}` : `${H0} is true here`);
    setHTML('a', a);
    setHTML('a-s', `cut-off <i>z</i> = ${m.alt === 'two' ? '±' : m.alt === 'left' ? '−' : ''}${fmt(m.crit, 3)}`);
    setHTML('rate', pct(m.rej / k, 0));
    setHTML('rate-s', `${m.rej} of ${k} · long run ${pct(m.power, 0)}`);

    showFor(eqP, m.alt);
    // Key: power and Type II items exist only while the alternative is true.
    $('key')
      .querySelectorAll<HTMLElement>('[data-for]')
      .forEach((el) => {
        const f = el.dataset.for;
        el.hidden = m.view.mode ? !(f === 'err' || (f === 'err1' && m.h1)) : f !== 'p';
      });
    const az = m.alt === 'two' ? Math.abs(m.z) : m.z;
    fillEq(eqZ, { xbar: fmt(m.xbar, 2), n: String(m.n), z: fmt(m.z, 2) }, animate);
    fillEq(eqP, { az: fmt(az, 2), p: pText(m.p) }, animate);
  }

  function describe(m: Model): void {
    const az = fmt(m.alt === 'two' ? Math.abs(m.z) : m.z, 2);
    describeEq(eqZ, `Test statistic: z equals x-bar ${fmt(m.xbar, 2)} minus 500, over 10 divided by the square root of ${m.n}, which is ${fmt(m.z, 2)}.`);
    describeEq(
      eqP,
      `p-value: ${m.alt === 'two' ? `twice the chance that a standard normal is at least ${az}` : `the chance that a standard normal is ${m.alt === 'right' ? 'at least' : 'at most'} ${az}`}, which is ${pText(m.p)}.`,
    );
    const p = m.p < 0.001 ? '<i>p</i> &lt; <b>0.001</b>' : `<i>p</i> = <b>${fmt(m.p, 3)}</b>`;
    const truth = `${tidy(m.mu, 1)} g`;
    const verdict = m.reject ? `${p} ≤ <i>α</i> = ${fmt(m.alpha, 2)}: <b>reject ${H0}</b>.` : `${p} &gt; <i>α</i> = ${fmt(m.alpha, 2)}: <b>do not reject ${H0}</b>.`;
    const outcome = m.h1
      ? m.reject
        ? `Correct: the true mean is ${truth}, so ${H0} is false.`
        : `The true mean is ${truth}, so ${H0} is false: a <b>Type II error</b>.`
      : m.reject
        ? `The true mean is ${truth}, so ${H0} holds: a <b>Type I error</b>.`
        : `Correct: the true mean is ${truth}, so ${H0} holds.`;
    $('note').innerHTML = `${verdict} ${outcome}`;
  }

  /** `drag`: a slider is moving; `step`: a settled change; `draw`: new samples; `now`: no motion. */
  function update(kind: 'drag' | 'step' | 'draw' | 'now'): void {
    const m = model();
    readouts(m, kind === 'step' || kind === 'draw');
    if (kind !== 'drag') describe(m);
    show(m.view, kind === 'now' ? 0 : kind === 'drag' ? 160 : kind === 'draw' ? 420 : 380);
  }

  // ---- controls -----------------------------------------------------------------------------------
  for (const el of [muIn, nIn]) {
    el.addEventListener('input', () => update('drag'));
    el.addEventListener('change', () => update('step'));
  }
  tool.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => r.addEventListener('change', () => update('step')));
  const add = (count: number) => {
    for (let i = 0; i < count; i++) draws.push(rng.normal());
    if (draws.length > KEEP) draws = draws.slice(-KEEP);
    update('draw');
  };
  $('draw').addEventListener('click', () => add(1));
  $('many').addEventListener('click', () => add(100));
  $('reset').addEventListener('click', () => {
    muIn.value = '503';
    nIn.value = '25';
    pick('alt', 'two');
    pick('alpha', '0.05');
    pick('show', 'p');
    rng = new Rng(SEED);
    draws = [rng.normal()];
    update('step');
  });

  // Back/forward cache and form restoration can bring back old control values: start from them.
  addEventListener('pageshow', () => update('now'));
  update('now');
}
