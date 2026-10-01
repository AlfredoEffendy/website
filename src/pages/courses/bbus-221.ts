import '../../site';
import { fmt, reducedMotion } from '../../ui/dom';
import { describeEq, fillEq } from '../../ui/eq';
import { FONT, Plot, curve, label, linear, palette, ticks, tween, xAxis } from '../../ui/plot';

// B BUS 221 interactive: an illustrative, linear AD–AS model.
// Units: real GDP as % of potential (potential = 100), price level as an index (before the shock = 100).
//   AD    Y = 100 + D − A(P − 100)    D = demand shock + policy shift
//   SRAS  Y = 100 + K + S(P − 100)    K = supply shock in the short run; once wages and prices have
//                                     adjusted, K = −S·D/A, which puts output back at potential
//   LRAS  Y = 100
const ID = 'bbus-221';
const A = 0.75;
const S = 1.5;
/** Investment added by a 1-point interest-rate cut, in % of potential GDP (illustrative). */
const INV = 1;
const X0 = 80;
const X1 = 120;
const Y0 = 85;
const Y1 = 115;
const LIMIT = 5;

type Tool = 'none' | 'fiscal' | 'monetary';
/** What the chart shows: AD shift (with and without policy), short-run and adjusted SRAS shifts, and how far the adjustment has run (0…1). */
interface View {
  d: number;
  ds: number;
  k: number;
  klr: number;
  h: number;
}

const eqm = (d: number, k: number) => {
  const p = 100 + (d - k) / (A + S);
  return { y: 100 + d - A * (p - 100), p };
};
const signed = (x: number, digits = 1) => (Math.abs(x) < 0.5 * 10 ** -digits ? '0' : (x > 0 ? '+' : '') + fmt(x, digits));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const moved = (a: number) => Math.abs(a) > 0.01;

const host = document.getElementById(`${ID}-tool`);
if (host) init(host);

function init(tool: HTMLElement): void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(`${ID}-${id}`) as T;
  const input = (id: string) => $<HTMLInputElement>(id);
  const demand = input('demand');
  const supply = input('supply');
  const gIn = input('g');
  const iIn = input('i');
  const mpcIn = input('mpc');
  const policyBox = $('policy');
  const eqM = $('eq-m');
  const eqG = $('eq-g');
  const picked = (name: string) => tool.querySelector<HTMLInputElement>(`input[name="${ID}-${name}"]:checked`)!.value;
  const pick = (name: string, value: string) => {
    tool.querySelector<HTMLInputElement>(`input[name="${ID}-${name}"][value="${value}"]`)!.checked = true;
  };
  /** Exact policy sizes set by "Close the gap"; a range input would round them to its step. */
  const exact: { g?: number; i?: number } = {};

  function model() {
    const dShock = +demand.value;
    const sShock = +supply.value;
    const kind = picked('policy') as Tool;
    const mpc = +mpcIn.value;
    const mult = 1 / (1 - mpc);
    const g = exact.g ?? +gIn.value;
    const di = exact.i ?? +iIn.value;
    const dA = kind === 'fiscal' ? g : kind === 'monetary' ? -INV * di : 0;
    const d = dShock + dA * mult;
    const long = picked('run') === 'long';
    const sr = eqm(d, sShock);
    const lr = eqm(d, (-S * d) / A);
    return { dShock, sShock, kind, mpc, mult, g, di, dA, shift: dA * mult, d, long, sr, lr, now: long ? lr : sr };
  }
  type Model = ReturnType<typeof model>;

  // ---- chart --------------------------------------------------------------------------------------
  let view: View = { d: 0, ds: 0, k: 0, klr: 0, h: 0 };
  let turn = 0;

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const left = 44;
    const right = w - 10;
    const top = 10;
    const base = h - 24;
    const sx = linear(X0, X1, left, right);
    const sy = linear(Y0, Y1, base, top);

    const { d, ds, k: kSr, klr, h: run } = view;
    const k = lerp(kSr, klr, run);
    const now = eqm(d, k);
    const sr = eqm(d, kSr);
    const ex = sx(now.y);
    const ey = sy(now.p);
    const inside = now.y >= X0 && now.y <= X1 && now.p >= Y0 && now.p <= Y1;
    /** Price level on AD and on SRAS at output y. */
    const ad = (dd: number) => (y: number) => 100 + (100 + dd - y) / A;
    const as = (kk: number) => (y: number) => 100 + (y - 100 - kk) / S;

    // Axes. Tick labels give way to the value tags drawn at the equilibrium.
    xAxis(p, sx, base, X0, X1, { values: ticks(X0, X1, 4).filter((v) => !inside || Math.abs(sx(v) - ex) > 36) });
    ctx.font = FONT;
    ctx.fillStyle = c.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of ticks(Y0, Y1, 3)) {
      const y = Math.round(sy(v)) + 0.5;
      if (inside && Math.abs(y - ey) < 13) continue;
      ctx.fillRect(left - 4, y, 4, 1);
      ctx.fillText(String(v), left - 7, y);
    }
    ctx.fillStyle = c.lineStrong;
    ctx.fillRect(left, top, 1, base - top);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 1, top, right - left - 1, base - top);
    ctx.clip();

    // Output gap: the distance between today's output and potential.
    const gx0 = sx(100);
    const gx1 = sx(clamp(now.y, X0, X1));
    if (Math.abs(gx1 - gx0) > 0.5) {
      ctx.fillStyle = c.accentSoft;
      ctx.fillRect(Math.min(gx0, gx1), top, Math.abs(gx1 - gx0), base - top);
      ctx.fillRect(Math.min(gx0, gx1), top, Math.abs(gx1 - gx0), base - top);
    }

    // Potential output (LRAS).
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.round(gx0) + 0.5, top);
    ctx.lineTo(Math.round(gx0) + 0.5, base);
    ctx.stroke();

    // Before the shock (gold).
    ctx.strokeStyle = c.gold;
    curve(p, sx, sy, X0, X1, ad(0));
    curve(p, sx, sy, X0, X1, as(0));

    // Intermediate states, dashed: the short-run SRAS while wages and prices adjust, and AD before policy.
    ctx.strokeStyle = c.accent;
    ctx.setLineDash([5, 4]);
    if (run > 0.01 && moved(klr - kSr) && moved(kSr)) {
      ctx.globalAlpha = run;
      curve(p, sx, sy, X0, X1, as(kSr));
    }
    const policy = moved(d - ds);
    if (policy) {
      ctx.globalAlpha = 0.75;
      curve(p, sx, sy, X0, X1, ad(ds));
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Now (purple).
    ctx.lineWidth = 2.5;
    curve(p, sx, sy, X0, X1, ad(d));
    curve(p, sx, sy, X0, X1, as(k));

    // Guides from the equilibrium to both axes.
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex, base);
    ctx.moveTo(ex, ey);
    ctx.lineTo(left, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Policy: an arrow from AD before policy to AD after it, low in the plot where it is out of the way.
    if (policy) {
      const pa = Y0 + 0.22 * (Y1 - Y0);
      const xa = sx(100 + ds - A * (pa - 100));
      const xb = sx(100 + d - A * (pa - 100));
      const ya = sy(pa);
      if (Math.abs(xb - xa) > 18) {
        arrow(xa, ya, xb, ya, 1);
        ctx.font = FONT;
        ctx.fillStyle = c.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('policy', clamp((xa + xb) / 2, left + 24, right - 24), ya - 4);
      }
    }

    // The path taken while wages and prices adjust: from the short-run point along AD.
    const rx = sx(sr.y);
    const ry = sy(sr.p);
    if (run > 0.01 && Math.hypot(ex - rx, ey - ry) > 4) {
      ctx.globalAlpha = run;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = c.accent;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      const len = Math.hypot(ex - rx, ey - ry);
      if (len > 24) arrow(rx + ((ex - rx) / len) * 8, ry + ((ey - ry) / len) * 8, ex - ((ex - rx) / len) * 8, ey - ((ey - ry) / len) * 8, run);
      ctx.globalAlpha = 1;
    }

    // Equilibria: before (gold) and now (purple).
    const dot = (x: number, y: number, r: number, fill: string) => {
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = c.surface;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    };
    dot(sx(100), sy(100), 4, c.gold);
    dot(ex, ey, 5, c.accent);
    ctx.restore();

    // Curve names. Before-the-shock curves are named at their left ends and today's at their right
    // ends, so the two never collide; a name is dropped when its curve is hidden or off the plot.
    const name = (text: string, sub: string, yAtP: number, f: (y: number) => number, dy: number, color: string) => {
      const y = clamp(yAtP, X0 + 0.6, X1 - 0.6);
      const pv = f(y);
      if (pv < Y0 - 0.01 || pv > Y1 + 0.01) return;
      const px = sx(y);
      tag(text, sub, px + 6, clamp(sy(pv), top + 8, base - 8) + dy, color, px > right - 50 ? 'right' : 'left');
    };
    const pLow = Y0 + 1.5;
    const pHigh = Y1 - 1.5;
    // AD at price level P: Y = 100 + d − A(P − 100);  SRAS: Y = 100 + k + S(P − 100).
    if (moved(d)) name('AD', '0', 100 - A * (pHigh - 100), ad(0), 0, c.gold);
    name('AD', moved(d) || policy ? (policy ? '2' : '1') : '', 100 + d - A * (pLow - 100), ad(d), 0, c.accent);
    if (moved(k)) name('SRAS', '0', 100 + S * (pLow - 100), as(0), 10, c.gold);
    name('SRAS', moved(k) ? (run > 0.5 && moved(klr - kSr) ? '2' : '1') : '', 100 + k + S * (pHigh - 100), as(k), 0, c.accent);
    ctx.font = FONT;
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('LRAS', gx0 + 5, top + 4);

    // The gap, written into its band (or beside it when the band is narrow).
    const gap = now.y - 100;
    if (Math.abs(gap) >= 0.05 && Math.abs(gx1 - gx0) > 2) {
      const text = `gap ${signed(gap)}%`;
      const tw = ctx.measureText(text).width;
      const fits = Math.abs(gx1 - gx0) > tw + 8;
      ctx.textAlign = fits ? 'center' : gap < 0 ? 'right' : 'left';
      ctx.fillStyle = c.accent;
      ctx.fillText(text, fits ? (gx0 + gx1) / 2 : gap < 0 ? Math.min(gx0, gx1) - 6 : Math.max(gx0, gx1) + 6, top + 22);
    }

    // Value tags on the axes, or an arrow at the edge when the equilibrium has left the plot.
    if (inside) {
      pill(fmt(now.y, 1), ex, base + 10, 'center');
      pill(fmt(now.p, 1), left - 2, ey, 'right');
    } else {
      const cx = clamp(ex, left + 10, right - 10);
      const cy = clamp(ey, top + 10, base - 10);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(ey - cy, ex - cx));
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const edge = ey < top || ey > base;
      if (edge) label(p, `off the chart: P ${fmt(now.p, 1)}`, cx - 14, cy - 6, 'right', true);
      else label(p, `off the chart: Y ${fmt(now.y, 1)}`, ex > right ? cx - 4 : cx + 4, cy + 12, ex > right ? 'right' : 'left', true);
    }

    /** Line with an arrowhead at (x1, y1). */
    function arrow(x0: number, y0: number, x1: number, y1: number, alpha: number): void {
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 1) return;
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = c.accent;
      ctx.fillStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 - ux * 6, y1 - uy * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - ux * 8 - uy * 4, y1 - uy * 8 + ux * 4);
      ctx.lineTo(x1 - ux * 8 + uy * 4, y1 - uy * 8 - ux * 4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /** A curve name with a subscript (drawn, so no reliance on subscript glyphs in the web font). */
    function tag(text: string, sub: string, x: number, y: number, color: string, align: CanvasTextAlign): void {
      const big = '600 12px "Open Sans", system-ui, sans-serif';
      const small = '600 9px "Open Sans", system-ui, sans-serif';
      ctx.font = big;
      const tw = ctx.measureText(text).width;
      ctx.font = small;
      const sw = sub ? ctx.measureText(sub).width + 1 : 0;
      const x0 = align === 'right' ? x - 12 - tw - sw : x;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = big;
      ctx.fillText(text, x0, y);
      if (sub) {
        ctx.font = small;
        ctx.fillText(sub, x0 + tw + 1, y + 4);
      }
    }

    /** A filled value tag on an axis. */
    function pill(text: string, x: number, y: number, align: 'center' | 'right'): void {
      ctx.font = FONT;
      const pw = ctx.measureText(text).width + 8;
      const x0 = align === 'center' ? clamp(x - pw / 2, 0, w - pw) : Math.max(0, x - pw);
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(x0, y - 8, pw, 16, 3);
      ctx.fill();
      ctx.fillStyle = c.surface;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x0 + pw / 2, y + 0.5);
    }
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
        view = { d: lerp(from.d, to.d, t), ds: lerp(from.ds, to.ds, t), k: lerp(from.k, to.k, t), klr: lerp(from.klr, to.klr, t), h: lerp(from.h, to.h, t) };
        plot.now();
      },
      () => {},
    );
  }

  // ---- read-outs ----------------------------------------------------------------------------------
  const setText = (id: string, text: string) => {
    const el = $(id);
    if (el.textContent !== text) el.textContent = text;
  };

  function story(m: Model): string {
    const gap = m.sr.y - 100;
    const pr = fmt(m.sr.p, 1);
    if (!moved(m.d) && !moved(m.dShock) && !moved(m.sShock)) return 'At potential output: no gap. Move a shock.';
    let s =
      gap < -0.05 && m.sr.p > 100.05
        ? `Stagflation: output <b>${fmt(-gap, 1)}%</b> below potential while the price level rises to <b>${pr}</b>.`
        : gap < -0.05
          ? `Recessionary gap: output <b>${fmt(-gap, 1)}%</b> below potential; price level <b>${pr}</b>.`
          : gap > 0.05
            ? `Inflationary gap: output <b>${fmt(gap, 1)}%</b> above potential; price level <b>${pr}</b>.`
            : `No output gap; price level <b>${pr}</b>.`;
    s = `Short run. ${s}`;
    if (m.long)
      s +=
        Math.abs(gap) > 0.05
          ? ` Long run: wages and prices ${gap < 0 ? 'fall' : 'rise'} until output is back at potential; price level <b>${fmt(m.lr.p, 1)}</b>.`
          : ' Long run: nothing left to adjust.';
    return s;
  }

  function sync(m: Model): void {
    const shiftText = (curve: string, x: number) =>
      moved(x) ? `${curve} shifts ${x < 0 ? 'left' : 'right'} by ${fmt(Math.abs(x), 1)}% of potential GDP` : 'no shift';
    demand.setAttribute('aria-valuetext', shiftText('AD', m.dShock));
    supply.setAttribute('aria-valuetext', shiftText('SRAS', m.sShock));
    gIn.setAttribute('aria-valuetext', `${signed(m.g)}% of potential GDP`);
    iIn.setAttribute('aria-valuetext', `${signed(m.di)} percentage points`);
    setText('demand-v', signed(m.dShock));
    setText('supply-v', signed(m.sShock));
    setText('g-v', signed(m.g));
    setText('i-v', signed(m.di));
    setText('mpc-v', fmt(m.mpc, 2));
    policyBox.hidden = m.kind === 'none';
    policyBox.querySelectorAll<HTMLElement>('[data-for]').forEach((el) => (el.hidden = el.dataset.for !== m.kind));
  }

  function readouts(m: Model, animate: boolean): void {
    const gap = m.now.y - 100;
    setText('y', fmt(m.now.y, 1));
    setText('p', fmt(m.now.p, 1));
    setText('gap', `${signed(gap)}%`);
    setText('gap-s', gap < -0.05 ? 'recessionary' : gap > 0.05 ? 'inflationary' : 'none');
    setText('mult', `×${fmt(m.mult, 1)}`);
    setText('mult-s', `MPC ${fmt(m.mpc, 2)}`);
    fillEq(eqM, { a: signed(m.dA), mpc: fmt(m.mpc, 2), ad: signed(m.shift) }, animate);
    fillEq(eqG, { y: fmt(m.now.y, 1), gap: `${signed(gap)}%` }, animate);
  }

  function describe(m: Model): void {
    const gap = m.now.y - 100;
    const source = m.kind === 'fiscal' ? 'government purchases' : m.kind === 'monetary' ? 'investment, after the interest-rate change' : 'policy spending';
    describeEq(eqM, `Spending multiplier: the shift in aggregate demand equals the change in ${source}, ${fmt(m.dA, 1)}, times 1 over 1 minus ${fmt(m.mpc, 2)}, which is ${fmt(m.shift, 1)}.`);
    describeEq(eqG, `Output gap: real GDP ${fmt(m.now.y, 1)} minus potential 100, over 100, is ${fmt(gap, 1)} percent.`);
    $('note').innerHTML = story(m);
  }

  /** `drag`: a slider is moving (follow closely, no number animation); `step`: a settled change; `run`: the horizon flipped. */
  function update(kind: 'drag' | 'step' | 'run' | 'now'): void {
    const m = model();
    sync(m);
    readouts(m, kind === 'step' || kind === 'run');
    if (kind !== 'drag') describe(m);
    const to: View = { d: m.d, ds: m.dShock, k: m.sShock, klr: (-S * m.d) / A, h: m.long ? 1 : 0 };
    show(to, kind === 'now' ? 0 : kind === 'drag' ? 200 : kind === 'run' ? 900 : 480);
  }

  // ---- controls -----------------------------------------------------------------------------------
  for (const el of [demand, supply, gIn, iIn, mpcIn]) {
    el.addEventListener('input', () => {
      if (el === gIn) delete exact.g;
      if (el === iIn) delete exact.i;
      update('drag');
    });
    el.addEventListener('change', () => update('step'));
  }
  tool.querySelectorAll<HTMLInputElement>(`input[name="${ID}-policy"]`).forEach((r) => r.addEventListener('change', () => update('step')));
  tool.querySelectorAll<HTMLInputElement>(`input[name="${ID}-run"]`).forEach((r) => r.addEventListener('change', () => update('run')));

  // Close the gap: the policy shift that puts short-run output back at potential, D = −A·K/S.
  $('close').addEventListener('click', () => {
    const m = model();
    if (m.kind === 'none') pick('policy', 'fiscal');
    const need = (-A * m.sShock) / S - m.dShock;
    const dA = clamp(need * (1 - m.mpc), -LIMIT, LIMIT);
    if (picked('policy') === 'fiscal') {
      exact.g = dA;
      gIn.value = String(dA);
    } else {
      exact.i = clamp(-dA / INV, -LIMIT, LIMIT);
      iIn.value = String(exact.i);
    }
    const wasLong = m.long;
    pick('run', 'short');
    update(wasLong ? 'run' : 'step');
  });

  $('reset').addEventListener('click', () => {
    demand.value = supply.value = gIn.value = iIn.value = '0';
    mpcIn.value = '0.6';
    delete exact.g;
    delete exact.i;
    pick('policy', 'none');
    pick('run', 'short');
    update('step');
  });

  // Back/forward cache and form restoration can bring back earlier control values: start from them.
  addEventListener('pageshow', () => update('now'));
  update('now');
}
