import '../../site';
import { fmt, reducedMotion, tidy } from '../../ui/dom';
import { describeEq, fillEq } from '../../ui/eq';
import { FONT, Plot, curve, linear, palette, ticks, tween, xAxis } from '../../ui/plot';

// ECON 301 interactive: the Solow growth model with illustrative parameters (one period = one year).
//   output per worker        y = A·k^α
//   capital accumulation     Δk = s·y − (n + δ)·k
//   steady state             k* = (sA / (n + δ))^(1/(1−α)),  y* = A·k*^α,  c* = (1 − s)·y*
//   golden rule              c* is highest when the marginal product of capital equals n + δ, i.e. s = α
// "Start" (gold) is the steady state the economy rests in before the change; "now" (purple) uses the
// sliders' values; the transition path runs from the first to the second.
const ID = 'econ-301';

interface P {
  s: number;
  n: number;
  d: number;
  /** Productivity A. */
  a: number;
  /** Capital share α. */
  al: number;
}
const KEYS = ['s', 'n', 'd', 'a', 'al'] as const;
/** The opening view: an economy at rest with 20% saving (start) that has just raised saving to 30% (now). */
const DEF: P = { s: 0.3, n: 0.01, d: 0.05, a: 1, al: 0.33 };
const START: P = { ...DEF, s: 0.2 };
const HORIZONS = [50, 100, 150, 200, 300, 400];
const VARS = ['y', 'c', 'k'] as const;
const NAMES = ['Output per worker', 'Consumption per worker', 'Capital per worker'];

/** What the charts show; every field eases between states. `w` weights the path's quantity (y, c, k). */
interface View {
  cur: P;
  ref: P;
  kx: number;
  yx: number;
  T: number;
  lo: number;
  hi: number;
  w: number[];
}

const out = (p: P, k: number) => p.a * Math.pow(k, p.al);
const kStar = (p: P, s = p.s) => Math.pow((s * p.a) / (p.n + p.d), 1 / (1 - p.al));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const differs = (p: P, q: P, keys: readonly (keyof P)[] = KEYS) => keys.some((k) => Math.abs(p[k] - q[k]) > 1e-7);
const mixP = (p: P, q: P, t: number): P => ({ s: lerp(p.s, q.s, t), n: lerp(p.n, q.n, t), d: lerp(p.d, q.d, t), a: lerp(p.a, q.a, t), al: lerp(p.al, q.al, t) });
/** Three significant figures, whatever the scale. */
const num = (x: number) => fmt(x, x >= 100 ? 0 : x >= 10 ? 1 : 2);
const pc = (x: number, digits = 0) => `${fmt(100 * x, digits)}%`;
/** Years needed to show most of the transition: about 3.5 times the convergence time 1/((1 − α)(n + δ)). */
const horizon = (p: P) => HORIZONS.find((h) => h >= 3.5 / ((1 - p.al) * (p.n + p.d))) ?? 400;

/** Capital per worker year by year from k0 under p. */
function simulate(p: P, k0: number, T: number): Float64Array {
  const k = new Float64Array(T + 1);
  k[0] = k0;
  for (let t = 0; t < T; t++) k[t + 1] = k[t] + p.s * out(p, k[t]) - (p.n + p.d) * k[t];
  return k;
}
/** y, c and k per worker, weighted by w. */
const level = (p: P, k: number, w: number[]) => {
  const y = out(p, k);
  return w[0] * y + w[1] * (1 - p.s) * y + w[2] * k;
};
/** Years until capital has covered half the distance to its new steady state (null if it does not move). */
function halfLife(p: P, k0: number): number | null {
  const ks = kStar(p);
  const gap = Math.abs(k0 - ks);
  if (gap < 1e-6 * ks) return null;
  const k = simulate(p, k0, 2000);
  for (let t = 1; t < k.length; t++) {
    const g = Math.abs(k[t] - ks);
    if (g <= gap / 2) {
      const g0 = Math.abs(k[t - 1] - ks);
      return t - 1 + (g0 - gap / 2) / (g0 - g || 1);
    }
  }
  return null;
}

const host = document.getElementById(`${ID}-tool`);
if (host) init(host);

function init(tool: HTMLElement): void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(`${ID}-${id}`) as T;
  const inputs = Object.fromEntries(KEYS.map((k) => [k, $<HTMLInputElement>(k)])) as Record<keyof P, HTMLInputElement>;
  const eqK = $('eq-k');
  const eqY = $('eq-y');
  const playBtn = $<HTMLButtonElement>('play');
  const params = (): P => ({ s: +inputs.s.value, n: +inputs.n.value, d: +inputs.d.value, a: +inputs.a.value, al: +inputs.al.value });
  const varIndex = () => Math.max(0, VARS.indexOf(tool.querySelector<HTMLInputElement>(`input[name="${ID}-var"]:checked`)!.value as (typeof VARS)[number]));
  let ref: P = { ...START };

  function target(cur: P): View {
    const ks = kStar(cur);
    const kr = kStar(ref);
    const kg = kStar(cur, cur.al);
    const m = Math.max(ks, kr);
    let kx = m * 1.4;
    if (kg < m * 2.2) kx = Math.max(kx, kg * 1.15);
    const yx = Math.max(out(cur, kx), out(ref, kx)) * 1.1;
    const T = horizon(cur);
    const w = [0, 0, 0];
    w[varIndex()] = 1;
    const k = simulate(cur, kr, T);
    let lo = level(ref, kr, w);
    let hi = lo;
    for (const x of k) {
      const v = level(cur, x, w);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const pad = Math.max((hi - lo) * 0.18, hi * 0.05);
    return { cur, ref: { ...ref }, kx, yx, T, lo: Math.max(0, lo - pad), hi: hi + pad, w };
  }

  // ---- drawing helpers ----------------------------------------------------------------------------
  const MATH = 'italic 14px Cambria, "STIX Two Text", Georgia, serif';
  function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ring: string): void {
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  /** A filled value tag. */
  function pill(p: Plot, text: string, x: number, y: number, fill: string, align: 'center' | 'right' = 'center'): void {
    const { ctx } = p;
    ctx.font = FONT;
    const pw = ctx.measureText(text).width + 10;
    const x0 = align === 'center' ? clamp(x - pw / 2, 0, p.w - pw) : Math.max(0, x - pw);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x0, y - 8, pw, 16, 3);
    ctx.fill();
    ctx.fillStyle = palette().surface;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + pw / 2, y + 0.5);
  }
  /** Value labels down the left edge for [lo, hi], skipping any too close to `avoid` (pixels). */
  function yTicks(p: Plot, sy: (v: number) => number, x0: number, lo: number, hi: number, avoid: number[] = []): void {
    const { ctx } = p;
    const c = palette();
    ctx.font = FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.muted;
    for (const v of ticks(lo, hi, Math.max(3, Math.floor(p.h / 55)))) {
      const y = Math.round(sy(v)) + 0.5;
      if (v <= 0 || y < 6 || avoid.some((a) => Math.abs(a - y) < 13)) continue;
      ctx.fillRect(x0 - 4, y, 4, 1);
      ctx.fillText(tidy(v), x0 - 7, y);
    }
    ctx.fillStyle = c.lineStrong;
    ctx.fillRect(x0, 8, 1, p.h - 32);
  }
  /** Names in the gutter beside the right ends of curves, nudged apart so they never overlap. */
  function names(p: Plot, rows: { text: string; y: number; color: string }[], x: number, top: number, base: number): void {
    const { ctx } = p;
    rows.sort((a, b) => a.y - b.y);
    for (let i = 1; i < rows.length; i++) rows[i].y = Math.max(rows[i].y, rows[i - 1].y + 15);
    const over = rows.length ? rows[rows.length - 1].y - (base - 8) : 0;
    if (over > 0) rows.forEach((r) => (r.y -= over));
    ctx.font = MATH;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const r of rows) {
      ctx.fillStyle = r.color;
      ctx.fillText(r.text, x, Math.max(top + 7, r.y));
    }
  }

  // ---- state ----------------------------------------------------------------------------------------
  let view: View = target(params());
  let turn = 0;
  /** Playback: years elapsed on the path, or null when the whole path is shown. */
  let playT: number | null = null;
  let playRaf = 0;

  // ---- the Solow diagram ---------------------------------------------------------------------------
  const diagram = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const left = 40;
    const right = w - 50;
    const top = 10;
    const base = h - 24;
    const { cur, ref: r, kx, yx } = view;
    const sx = linear(0, kx, left, right);
    const sy = linear(0, yx, base, top);
    const f = (q: P) => (k: number) => out(q, k);
    const inv = (q: P) => (k: number) => q.s * out(q, k);
    const brk = (q: P) => (k: number) => (q.n + q.d) * k;
    const ks = kStar(cur);
    const kr = kStar(r);
    const kg = kStar(cur, cur.al);
    const ex = sx(ks);

    xAxis(p, sx, base, 0, kx, { values: ticks(0, kx, Math.max(3, Math.floor((right - left) / 75))).filter((v) => Math.abs(sx(v) - ex) > 34) });
    yTicks(p, sy, left, 0, yx);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 1, 0, right - left + 12, base);
    ctx.clip();

    // Start (gold): only the curves that differ from now.
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = c.gold;
    if (differs(cur, r, ['a', 'al'])) curve(p, sx, sy, 0, kx, f(r));
    if (differs(cur, r, ['n', 'd'])) {
      ctx.setLineDash([5, 4]);
      curve(p, sx, sy, 0, kx, brk(r));
      ctx.setLineDash([]);
    }
    if (differs(cur, r, ['s', 'a', 'al'])) curve(p, sx, sy, 0, kx, inv(r));

    // Golden rule: the capital stock where the slope of y = f(k) equals n + δ.
    if (kg <= kx) {
      const gx = Math.round(sx(kg)) + 0.5;
      const gy = sy(out(cur, kg));
      ctx.strokeStyle = c.ink;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(gx, base);
      ctx.lineTo(gx, gy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Now (purple): output, break-even investment (dashed), investment.
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.bar;
    curve(p, sx, sy, 0, kx, f(cur));
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = c.accent;
    ctx.setLineDash([6, 4]);
    curve(p, sx, sy, 0, kx, brk(cur));
    ctx.setLineDash([]);
    ctx.lineWidth = 2.5;
    curve(p, sx, sy, 0, kx, inv(cur));

    // Steady-state consumption: the distance between output and investment at k*.
    const yI = sy(inv(cur)(ks));
    const yF = sy(f(cur)(ks));
    ctx.strokeStyle = c.accentSoft;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(ex, yI - 6);
    ctx.lineTo(ex, yF + 2);
    ctx.stroke();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(ex, yF);
    ctx.lineTo(ex, base);
    ctx.stroke();
    ctx.setLineDash([]);
    if (yI - yF > 22) {
      ctx.font = MATH;
      ctx.fillStyle = c.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('c*', ex + 7, (yI + yF) / 2);
    }

    // Playback: where capital is now, and the net investment that is still moving it.
    if (playT !== null) {
      const sim = simulate(cur, kr, Math.ceil(playT) + 1);
      const i = Math.floor(playT);
      const kt = lerp(sim[i], sim[i + 1], playT - i);
      const px = sx(kt);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, sy(inv(cur)(kt)));
      ctx.lineTo(px, sy(brk(cur)(kt)));
      ctx.stroke();
      dot(ctx, px, sy(inv(cur)(kt)), 4.5, c.surface, c.accent);
      dot(ctx, px, base, 3.5, c.accent, c.surface);
    }

    dot(ctx, sx(kr), sy(inv(r)(kr)), 4, c.gold, c.surface);
    dot(ctx, ex, yI, 5, c.accent, c.surface);
    ctx.restore();

    // Curve names beside their right ends (or where the break-even line leaves the top).
    const rows: { text: string; y: number; color: string }[] = [];
    rows.push({ text: 'y', y: sy(out(cur, kx)), color: c.muted });
    rows.push({ text: 'sy', y: sy(inv(cur)(kx)), color: c.accent });
    const bk = brk(cur)(kx);
    if (bk <= yx) rows.push({ text: '(n+δ)k', y: sy(bk), color: c.accent });
    names(p, rows, right + 5, top, base);
    if (bk > yx) {
      ctx.font = MATH;
      ctx.fillStyle = c.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('(n+δ)k', sx(yx / (cur.n + cur.d)) + 5, top);
    }

    // Golden rule label, set along its line, or a pointer when it lies beyond the chart.
    ctx.font = FONT;
    ctx.fillStyle = c.muted;
    ctx.textAlign = 'left';
    if (kg <= kx) {
      // On the side away from k*, unless that runs into an edge.
      const gx = sx(kg);
      const after = (kg >= ks || gx < left + 16) && gx < right - 14;
      ctx.save();
      ctx.translate(gx + (after ? 4 : -4), base - 6);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = after ? 'top' : 'bottom';
      // A halo in the surface colour keeps the label legible where it crosses a curve.
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText('golden rule', 0, 0);
      ctx.fillText('golden rule', 0, 0);
      ctx.restore();
    } else {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('golden rule →', right, base - 16);
    }

    pill(p, `k* ${num(ks)}`, ex, base + 11, c.accent);
  });

  // ---- the transition path ------------------------------------------------------------------------
  const path = new Plot($('path'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const left = 40;
    const right = w - 12;
    const top = 10;
    const base = h - 24;
    const { cur, ref: r, T, lo, hi, w: wt } = view;
    const t0 = -0.08 * T;
    const sx = linear(t0, T, left, right);
    const sy = linear(lo, hi, base, top);
    const n = Math.ceil(T);
    const kr = kStar(r);
    const sim = simulate(cur, kr, n);
    const start = level(r, kr, wt);
    const end = level(cur, kStar(cur), wt);
    const moved = Math.abs(end - start) > 1e-6 * Math.max(1, Math.abs(end)) || differs(cur, r);
    const ys = sy(start);
    const ye = sy(end);

    xAxis(p, sx, base, 0, T, { target: Math.max(3, Math.floor((right - sx(0)) / 70)) });
    ctx.fillStyle = c.lineStrong;
    ctx.fillRect(left, base, sx(0) - left, 1);
    yTicks(p, sy, left, lo, hi, [ys, ye]);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 1, 0, right - left + 12, base);
    ctx.clip();

    // The moment of the change.
    const x0 = Math.round(sx(0)) + 0.5;
    ctx.fillStyle = c.tint;
    ctx.fillRect(left + 1, top, x0 - left - 1, base - top);
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x0, base);
    ctx.stroke();

    // Start level: solid before the change, dashed after.
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, ys);
    ctx.lineTo(x0, ys);
    ctx.stroke();
    if (moved) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, ys);
      ctx.lineTo(right, ys);
      ctx.stroke();
      // New steady state.
      ctx.strokeStyle = c.accent;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, ye);
      ctx.lineTo(right, ye);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // The path. During playback the years still to come are drawn faint.
    const pt = (t: number) => sy(level(cur, sim[Math.min(t, n)], wt));
    const upto = playT === null ? T : playT;
    const trace = (from: number, to: number) => {
      ctx.beginPath();
      ctx.moveTo(sx(from), pt(from));
      for (let t = from + 1; t <= Math.floor(to); t++) ctx.lineTo(sx(t), pt(t));
      if (to % 1) {
        const i = Math.floor(to);
        ctx.lineTo(sx(to), lerp(pt(i), pt(i + 1), to - i));
      }
      ctx.stroke();
    };
    // A jump at the change (consumption moves at once when saving changes).
    const y0 = pt(0);
    if (Math.abs(y0 - ys) > 1) {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, ys);
      ctx.lineTo(x0, y0);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineJoin = 'round';
    if (playT !== null) {
      ctx.strokeStyle = c.bar;
      ctx.lineWidth = 1.5;
      trace(0, T);
    }
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5;
    if (upto > 0) trace(0, Math.min(upto, T));

    // Halfway: the year the path has covered half the distance from where it begins to where it ends.
    const v = (t: number) => level(cur, sim[Math.min(t, n)], wt);
    const gap = Math.abs(v(0) - end);
    let half: number | null = null;
    if (moved && gap > 1e-9 * Math.max(1, Math.abs(end)))
      for (let t = 1; t <= n; t++) {
        const g = Math.abs(v(t) - end);
        if (g <= gap / 2) {
          const g0 = Math.abs(v(t - 1) - end);
          half = t - 1 + (g0 - gap / 2) / (g0 - g || 1);
          break;
        }
      }
    if (half !== null && half < T && playT === null) {
      const i = Math.floor(half);
      const hx = sx(half);
      const hy = lerp(pt(i), pt(i + 1), half - i);
      const rising = end > v(0);
      dot(ctx, hx, hy, 3.5, c.accent, c.surface);
      ctx.font = FONT;
      ctx.fillStyle = c.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = rising ? 'top' : 'bottom';
      ctx.fillText(`${VARS[varIndex()]} halfway: ${Math.round(half)} yrs`, hx + 7, hy + (rising ? 5 : -5));
    }
    if (playT !== null) {
      const i = Math.floor(playT);
      const py = lerp(pt(i), pt(i + 1), playT - i);
      const px = sx(playT);
      ctx.strokeStyle = c.accent;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, base);
      ctx.stroke();
      ctx.globalAlpha = 1;
      dot(ctx, px, py, 4.5, c.accent, c.surface);
    }
    ctx.restore();

    // Levels at the right edge: the upper one above its line, the lower one below, unless that leaves the plot.
    if (moved) {
      const [a, b] = [
        { text: `start ${num(start)}`, y: ys, color: c.gold },
        { text: `new ${num(end)}`, y: ye, color: c.accent },
      ].sort((p0, p1) => p0.y - p1.y);
      let ya = a.y - 9;
      let yb = b.y + 9;
      if (yb > base - 8) {
        yb = b.y - 9;
        ya = Math.min(ya, yb - 14);
      }
      if (ya < top + 6) {
        ya = a.y + 9;
        yb = Math.max(yb, ya + 14);
      }
      ctx.font = FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = a.color;
      ctx.fillText(a.text, right - 2, ya);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, right - 2, yb);
    }
  });

  const drawNow = () => {
    diagram.now();
    path.now();
  };
  const request = () => {
    diagram.request();
    path.request();
  };

  /** Glide both charts from what they show now to `to`. Reduced motion jumps straight there. */
  function show(to: View, ms: number): void {
    const from = view;
    const mine = ++turn;
    if (ms <= 0 || reducedMotion()) {
      view = to;
      request();
      return;
    }
    tween(
      ms,
      (t) => {
        if (mine !== turn) return;
        view = {
          cur: mixP(from.cur, to.cur, t),
          ref: mixP(from.ref, to.ref, t),
          kx: lerp(from.kx, to.kx, t),
          yx: lerp(from.yx, to.yx, t),
          T: lerp(from.T, to.T, t),
          lo: lerp(from.lo, to.lo, t),
          hi: lerp(from.hi, to.hi, t),
          w: from.w.map((x, i) => lerp(x, to.w[i], t)),
        };
        drawNow();
      },
      () => {},
    );
  }

  // ---- playback -------------------------------------------------------------------------------------
  function stop(): void {
    cancelAnimationFrame(playRaf);
    if (playT === null) return;
    playT = null;
    request();
  }
  /** Run the transition in time: two and a half seconds for the whole horizon. */
  function play(): void {
    stop();
    const m = params();
    if (reducedMotion() || !differs(m, ref)) return;
    const T = horizon(m);
    const begin = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - begin) / 2500);
      playT = u * T;
      drawNow();
      if (u < 1) playRaf = requestAnimationFrame(step);
      else {
        playT = null;
        request();
      }
    };
    playRaf = requestAnimationFrame(step);
  }

  // ---- read-outs ------------------------------------------------------------------------------------
  const setText = (id: string, text: string) => {
    const el = $(id);
    if (el.textContent !== text) el.textContent = text;
  };

  function readouts(m: P, animate: boolean): void {
    const ks = kStar(m);
    const ys = out(m, ks);
    const kr = kStar(ref);
    const yr = out(ref, kr);
    const kg = kStar(m, m.al);
    setText('s-v', pc(m.s));
    setText('n-v', pc(m.n, 1));
    setText('d-v', pc(m.d, 1));
    setText('a-v', fmt(m.a, 2));
    setText('al-v', fmt(m.al, 2));
    inputs.s.setAttribute('aria-valuetext', `${pc(m.s)} of output saved`);
    inputs.n.setAttribute('aria-valuetext', `${pc(m.n, 1)} a year`);
    inputs.d.setAttribute('aria-valuetext', `${pc(m.d, 1)} of capital a year`);
    setText('k', num(ks));
    setText('k-s', `start ${num(kr)}`);
    setText('y', num(ys));
    setText('y-s', `start ${num(yr)}`);
    setText('c', num((1 - m.s) * ys));
    setText('c-s', `start ${num((1 - ref.s) * yr)}`);
    setText('g', pc(m.al));
    setText('g-s', `highest c* ${num((1 - m.al) * out(m, kg))}`);
    const tid = (x: number) => tidy(x, 3);
    fillEq(eqK, { s: fmt(m.s, 2), a: fmt(m.a, 2), n: tid(m.n), d: tid(m.d), al: fmt(m.al, 2), k: num(ks) }, animate);
    fillEq(eqY, { a: fmt(m.a, 2), k: num(ks), al: fmt(m.al, 2), y: num(ys) }, animate);
  }

  function describe(m: P): void {
    const ks = kStar(m);
    const ys = out(m, ks);
    describeEq(eqK, `Steady-state capital per worker: ${fmt(m.s, 2)} times ${fmt(m.a, 2)}, over ${tidy(m.n, 3)} plus ${tidy(m.d, 3)}, to the power 1 over 1 minus ${fmt(m.al, 2)}, is ${num(ks)}.`);
    describeEq(eqY, `Steady-state output per worker: ${fmt(m.a, 2)} times ${num(ks)} to the power ${fmt(m.al, 2)} is ${num(ys)}.`);
    const kr = kStar(ref);
    const yr = out(ref, kr);
    const cs = (1 - m.s) * ys;
    const cr = (1 - ref.s) * yr;
    const golden =
      Math.abs(m.s - m.al) < 0.005
        ? 'Saving is at the golden rule: steady-state consumption is as high as it can be.'
        : m.s < m.al
          ? `Saving is below the golden rule (${pc(m.al)}): more saving would raise steady-state consumption.`
          : `Saving is above the golden rule (${pc(m.al)}): saving less would raise consumption now and later.`;
    let text: string;
    if (!differs(m, ref)) text = `At the steady state: saving just covers depreciation and new workers. ${golden}`;
    else {
      const half = halfLife(m, kr);
      text =
        Math.abs(ks - kr) < 1e-6 * kr
          ? `The steady state does not move: capital per worker stays at <b>${num(ks)}</b>. ${golden}`
          : `Capital per worker moves from <b>${num(kr)}</b> to <b>${num(ks)}</b>, output from <b>${num(yr)}</b> to <b>${num(ys)}</b> and consumption from <b>${num(cr)}</b> to <b>${num(cs)}</b>${
              half === null ? '' : `; capital closes half the gap in about <b>${Math.round(half)}</b> years`
            }. ${golden}`;
    }
    $('note').innerHTML = text;
  }

  /** `drag`: a slider is moving; `step`: a settled change; `now`: first paint. */
  function update(kind: 'drag' | 'step' | 'slow' | 'now'): void {
    stop();
    const m = params();
    readouts(m, kind === 'step' || kind === 'slow');
    if (kind !== 'drag') describe(m);
    show(target(m), kind === 'now' ? 0 : kind === 'drag' ? 180 : kind === 'slow' ? 650 : 420);
  }

  // ---- controls -------------------------------------------------------------------------------------
  /** A change made with the pointer plays the transition when the slider is let go. */
  let pointer = false;
  tool.addEventListener('pointerdown', () => (pointer = true));
  tool.addEventListener('keydown', () => (pointer = false));
  for (const el of Object.values(inputs)) {
    el.addEventListener('input', () => update('drag'));
    el.addEventListener('change', () => {
      update('step');
      if (pointer) play();
    });
  }
  tool.querySelectorAll<HTMLInputElement>(`input[name="${ID}-var"]`).forEach((r) =>
    r.addEventListener('change', () => {
      setText('ylab', NAMES[varIndex()]);
      show(target(params()), 420);
    }),
  );
  playBtn.addEventListener('click', play);

  $('gold').addEventListener('click', () => {
    inputs.s.value = inputs.al.value;
    update('step');
    play();
  });
  $('start').addEventListener('click', () => {
    ref = params();
    update('slow');
  });
  $('reset').addEventListener('click', () => {
    for (const k of KEYS) inputs[k].value = String(DEF[k]);
    ref = { ...START };
    update('slow');
  });

  // Back/forward cache and form restoration can bring back earlier control values: start from them.
  addEventListener('pageshow', () => {
    setText('ylab', NAMES[varIndex()]);
    update('now');
  });
  setText('ylab', NAMES[varIndex()]);
  update('now');
}
