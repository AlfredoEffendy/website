import '../../site';
import { fmt, reducedMotion } from '../../ui/dom';
import { describeEq, fillEq } from '../../ui/eq';
import { FONT, Plot, linear, palette, ticks, tween, xAxis, type Scale } from '../../ui/plot';

// ECON 200 interactive: one market with linear curves and illustrative numbers.
//   demand P = a − bQ, supply P = c + dQ, free market Q* = (a − c)/(b + d)
//   per-unit tax t: Q = (a − c − t)/(b + d); buyers bear b/(b + d) of it, whichever side hands it over
//   price ceiling: Q = min(Q*, supply at the ceiling); price floor: Q = min(Q*, demand at the floor)
//   deadweight loss = ½ [D(Q) − S(Q)] (Q* − Q)
// Every outcome is (Q, price buyers pay, price sellers receive), so the areas are drawn the same way for
// all three policies and the chart can ease from one policy to another. Gold is the free market.
const ID = 'econ-200';
const A = 20;
const C = 2;
const YM = 24;
const MODES = ['tax', 'ceil', 'floor'];
const DEF = { t: '4', pc: '7', b: '0.6', d: '0.4' };

interface V {
  b: number;
  d: number;
  t: number;
  pc: number;
  /** 1 when the tax is collected from buyers. */
  on: number;
  /** Policy weights (tax, ceiling, floor): one-hot, blended while easing. */
  w: number[];
  xm: number;
}
interface Out {
  q: number;
  pb: number;
  ps: number;
}

const qStar = (v: V) => (A - C) / (v.b + v.d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const p2 = (x: number) => fmt(x, 2);
const q1 = (x: number) => fmt(x, 1);

function outcome(v: V, m: number): Out {
  const qs = qStar(v);
  const p = A - v.b * qs;
  if (m === 0) {
    const q = Math.max(0, qs - v.t / (v.b + v.d));
    return { q, pb: A - v.b * q, ps: A - v.b * q - v.t };
  }
  const bind = m === 1 ? v.pc < p : v.pc > p;
  if (!bind) return { q: qs, pb: p, ps: p };
  return { q: m === 1 ? (v.pc - C) / v.d : (A - v.pc) / v.b, pb: v.pc, ps: v.pc };
}
function blend(v: V): Out {
  const o = { q: 0, pb: 0, ps: 0 };
  v.w.forEach((w, m) => {
    if (!w) return;
    const r = outcome(v, m);
    o.q += w * r.q;
    o.pb += w * r.pb;
    o.ps += w * r.ps;
  });
  return o;
}
/** Quantity axis: room past the free market, and for a shortage or surplus; steps of 5 or 10. */
function xmax(v: V, m: number): number {
  const qs = qStar(v);
  const p = A - v.b * qs;
  let e = qs * 1.5;
  if (m === 1 && v.pc < p) e = Math.max(e, Math.min(((A - v.pc) / v.b) * 1.08, qs * 2.4));
  if (m === 2 && v.pc > p) e = Math.max(e, Math.min(((v.pc - C) / v.d) * 1.08, qs * 2.4));
  const step = e > 30 ? 10 : 5;
  return Math.ceil(e / step) * step;
}

const host = document.getElementById(`${ID}-tool`);
if (host) init(host);

function init(tool: HTMLElement): void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(`${ID}-${id}`) as T;
  const ins = { t: $<HTMLInputElement>('t'), pc: $<HTMLInputElement>('pc'), b: $<HTMLInputElement>('b'), d: $<HTMLInputElement>('d') };
  const checked = (name: string) => tool.querySelector<HTMLInputElement>(`input[name="${ID}-${name}"]:checked`)!;
  const mode = () => Math.max(0, MODES.indexOf(checked('mode').value));
  const setText = (id: string, text: string) => {
    const el = $(id);
    if (el.textContent !== text) el.textContent = text;
  };
  function read(): V {
    const m = mode();
    const v: V = { b: +ins.b.value, d: +ins.d.value, t: +ins.t.value, pc: +ins.pc.value, on: +(checked('on').value === 'b'), w: MODES.map((_, i) => +(i === m)), xm: 0 };
    v.xm = xmax(v, m);
    return v;
  }

  let view = read();
  let turn = 0;
  let sx: Scale = linear(0, 1, 0, 1);
  let sy: Scale = sx;

  // ---- drawing --------------------------------------------------------------------------------------
  let hatch: CanvasPattern | null = null;
  let hatchFor = '';
  function stripes(ctx: CanvasRenderingContext2D, col: string): CanvasPattern {
    if (hatchFor !== col || !hatch) {
      const k = document.createElement('canvas');
      k.width = k.height = 6;
      const g = k.getContext('2d')!;
      g.strokeStyle = col;
      g.lineWidth = 1.3;
      g.beginPath();
      for (const o of [-6, 0, 6]) {
        g.moveTo(o, 6);
        g.lineTo(o + 6, 0);
      }
      g.stroke();
      hatch = ctx.createPattern(k, 'repeat');
      hatchFor = col;
    }
    return hatch!;
  }
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
  function pill(p: Plot, text: string, x: number, y: number, fill: string, align: 'center' | 'right'): void {
    const { ctx } = p;
    ctx.font = FONT;
    const w = ctx.measureText(text).width + 10;
    const x0 = align === 'right' ? x - w : clamp(x - w / 2, 0, p.w - w);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x0, y - 8, w, 16, 3);
    ctx.fill();
    ctx.fillStyle = palette().surface;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + w / 2, y + 0.5);
  }
  const line = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, align: CanvasTextAlign, base: CanvasTextBaseline, font = FONT) => {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillText(s, x, y);
  };
  const MATH = 'italic 15px Cambria, "STIX Two Text", Georgia, serif';

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const L = 46;
    const R = w - 12;
    const T = 8;
    const B = h - 26;
    const v = view;
    const { b, d } = v;
    sx = linear(0, v.xm, L, R);
    sy = linear(0, YM, B, T);
    const X = sx;
    const Y = sy;
    const D = (q: number) => A - b * q;
    const S = (q: number) => C + d * q;
    const qs = qStar(v);
    const p0 = D(qs);
    const o = blend(v);
    const wt = v.w[0];
    const wc = v.w[1] + v.w[2];

    // Axes: skip tick labels the value tags would cover.
    const qx = X(o.q);
    xAxis(p, sx, B, 0, v.xm, { values: ticks(0, v.xm, Math.max(3, Math.floor((R - L) / 70))).filter((q) => Math.abs(X(q) - qx) > 30 && Math.abs(X(q) - X(qs)) > 24) });
    ctx.fillStyle = c.lineStrong;
    ctx.fillRect(L, T, 1, B - T);
    ctx.font = FONT;
    ctx.fillStyle = c.muted;
    for (const pr of ticks(0, YM, Math.max(3, Math.floor(h / 70)))) {
      const y = Math.round(Y(pr)) + 0.5;
      if (pr === 0 || [o.pb, o.ps, p0].some((u) => Math.abs(Y(u) - y) < 14)) continue;
      ctx.fillRect(L - 4, y, 4, 1);
      text(ctx, String(pr), L - 7, y, 'right', 'middle');
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(L + 1, T, R - L, B - T);
    ctx.clip();

    // Areas: consumer surplus, producer surplus, tax revenue, deadweight loss.
    const area = (pts: number[][], fill: string | CanvasPattern, alpha: number) => {
      ctx.beginPath();
      pts.forEach(([q, pr], i) => (i ? ctx.lineTo(X(q), Y(pr)) : ctx.moveTo(X(q), Y(pr))));
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    const cs = [[0, A], [o.q, D(o.q)], [o.q, o.pb], [0, o.pb]];
    const ps = [[0, C], [o.q, S(o.q)], [o.q, o.ps], [0, o.ps]];
    area(cs, c.accent, 0.22);
    area(ps, c.accent, 0.07);
    area(ps, stripes(ctx, c.accent), 0.5);
    area([[0, o.ps], [o.q, o.ps], [o.q, o.pb], [0, o.pb]], c.ink, 0.11);
    area([[o.q, D(o.q)], [qs, p0], [o.q, S(o.q)]], c.bad, 0.36);

    // Free market (gold).
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    line(ctx, L, Y(p0), X(qs), Y(p0));
    line(ctx, X(qs), B, X(qs), Y(p0));
    ctx.setLineDash([]);

    // Shifted curve: supply plus the tax, or demand minus it.
    if (wt > 0.01 && v.t > 0) {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = wt * (1 - v.on);
      line(ctx, X(0), Y(S(0) + v.t), X(v.xm), Y(S(v.xm) + v.t));
      ctx.globalAlpha = wt * v.on;
      line(ctx, X(0), Y(D(0) - v.t), X(v.xm), Y(D(v.xm) - v.t));
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Demand and supply (the model: purple).
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    line(ctx, X(0), Y(A), X(v.xm), Y(D(v.xm)));
    line(ctx, X(0), Y(C), X(v.xm), Y(S(v.xm)));

    // Controlled price, with the shortage or surplus it leaves.
    if (wc > 0.01) {
      const y = Y(v.pc);
      ctx.globalAlpha = wc;
      ctx.lineWidth = 1.5;
      line(ctx, L, y, R, y);
      const qd = (A - v.pc) / b;
      const qsp = (v.pc - C) / d;
      const gapQ = v.w[1] * (qd - qsp) + v.w[2] * (qsp - qd);
      if (gapQ > 0.05) {
        const up = v.w[2] > v.w[1];
        const yy = y + (up ? -9 : 9);
        const x0 = X(Math.min(qd, qsp));
        const x1 = Math.min(X(Math.max(qd, qsp)), R - 2);
        ctx.lineWidth = 1;
        line(ctx, x0, yy, x1, yy);
        line(ctx, x0, yy - 4, x0, yy + 4);
        if (x1 < R - 2) line(ctx, x1, yy - 4, x1, yy + 4);
        // On a paper-coloured backing, so guide lines behind it do not cut through the words.
        const s = up ? 'excess supply' : 'shortage';
        ctx.font = FONT;
        const tw = ctx.measureText(s).width + 6;
        const ty = yy + (up ? -17 : 3);
        ctx.fillStyle = c.surface;
        ctx.fillRect((x0 + x1 - tw) / 2, ty, tw, 14);
        ctx.fillStyle = c.accent;
        text(ctx, s, (x0 + x1) / 2, ty + 7.5, 'center', 'middle');
      }
      ctx.fillStyle = c.muted;
      const fl = v.w[2] > v.w[1];
      text(ctx, fl ? 'floor' : 'ceiling', R - 4, y + (fl ? 4 : -4), 'right', fl ? 'top' : 'bottom');
      ctx.globalAlpha = 1;
    }

    // The outcome: what buyers pay and sellers receive at the quantity traded.
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    line(ctx, qx, B, qx, Y(o.pb));
    line(ctx, L, Y(o.pb), qx, Y(o.pb));
    line(ctx, L, Y(o.ps), qx, Y(o.ps));
    ctx.setLineDash([]);
    const wedge = Y(o.ps) - Y(o.pb);
    if (wedge > 1) {
      ctx.lineWidth = 3;
      line(ctx, qx, Y(o.pb), qx, Y(o.ps));
      if (wedge > 18 && wt > 0.5) {
        ctx.fillStyle = c.accent;
        text(ctx, 't', qx - 7, (Y(o.pb) + Y(o.ps)) / 2, 'right', 'middle', MATH);
      }
    }
    dot(ctx, X(qs), Y(p0), 4, c.gold, c.surface);
    dot(ctx, qx, Y(o.pb), 4.5, c.accent, c.surface);
    if (wedge > 1) dot(ctx, qx, Y(o.ps), 4.5, c.accent, c.surface);
    // Drag handles: the controlled price line, or the price buyers pay under a tax.
    if (wc > 0.5) p.mark(1, L, Y(v.pc) - 7, R - L, 14);
    else if (wt > 0.5) p.mark(2, qx - 10, Y(o.pb) - 10, 20, 20);

    // Curve names at the visible end of each line, on the side away from it.
    const name = (s: string, y0: number, k: number) => {
      let q = v.xm;
      if (y0 + k * q > YM) q = (YM - y0) / k;
      if (y0 + k * q < 0) q = -y0 / k;
      const x = X(q);
      const y = Y(y0 + k * q);
      const edge = q < v.xm - 1e-9;
      if (k > 0) edge ? text(ctx, s, x + 6, T + 2, 'left', 'top', MATH) : text(ctx, s, x - 4, y - 6, 'right', 'bottom', MATH);
      else edge ? text(ctx, s, x + 6, y - 4, 'left', 'bottom', MATH) : text(ctx, s, x - 4, y + 6, 'right', 'top', MATH);
    };
    ctx.fillStyle = c.accent;
    name('D', A, -b);
    name('S', C, d);
    if (wt > 0.01 && v.t > 0) {
      ctx.globalAlpha = wt;
      if (v.on > 0.5) name('D − t', A - v.t, -b);
      else name('S + t', C + v.t, d);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Value tags on the axes: purple for the outcome, gold for the free market.
    const rows: { s: string; y: number; gold?: boolean }[] = [{ s: p2(o.pb), y: Y(o.pb) }];
    if (wedge > 1) rows.push({ s: p2(o.ps), y: Y(o.ps) });
    if (Math.abs(p0 - o.pb) > 0.005 && Math.abs(p0 - o.ps) > 0.005) rows.push({ s: p2(p0), y: Y(p0), gold: true });
    rows.sort((a, z) => a.y - z.y);
    for (let i = 1; i < rows.length; i++) rows[i].y = Math.max(rows[i].y, rows[i - 1].y + 17);
    for (const r of rows) {
      if (r.gold) {
        ctx.fillStyle = c.gold;
        text(ctx, r.s, L - 5, r.y, 'right', 'middle');
      } else pill(p, r.s, L - 3, r.y, c.accent, 'right');
    }
    if (Math.abs(X(qs) - qx) > 34) {
      ctx.fillStyle = c.gold;
      text(ctx, q1(qs), X(qs), B + 7, 'center', 'top');
    }
    pill(p, q1(o.q), qx, B + 12, c.accent, 'center');
  });

  // Drag the controlled price, or the price buyers pay (which sets the tax), with a mouse or pen.
  plot.onDrag = (key, _x, y, done) => {
    const pr = sy.invert(y);
    const v = read();
    if (key === 1) ins.pc.value = String(clamp(Math.round(pr * 4) / 4, 2, 20));
    else {
      const p0 = A - v.b * qStar(v);
      ins.t.value = String(clamp(Math.round((((pr - p0) * (v.b + v.d)) / v.b) * 2) / 2, 0, 12));
    }
    update(done ? 'step' : 'drag');
  };
  const area = $('plot');
  area.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = area.getBoundingClientRect();
    area.style.cursor = plot.pick(e.clientX - r.left, e.clientY - r.top, 5) === null ? '' : 'ns-resize';
  });

  /** Ease the chart from what it shows to `to`. Reduced motion jumps straight there. */
  function show(to: V, ms: number): void {
    const from = view;
    const mine = ++turn;
    if (ms <= 0 || reducedMotion()) {
      view = to;
      plot.request();
      return;
    }
    tween(
      ms,
      (k) => {
        if (mine !== turn) return;
        view = {
          b: lerp(from.b, to.b, k),
          d: lerp(from.d, to.d, k),
          t: lerp(from.t, to.t, k),
          pc: lerp(from.pc, to.pc, k),
          on: lerp(from.on, to.on, k),
          w: from.w.map((x, i) => lerp(x, to.w[i], k)),
          xm: lerp(from.xm, to.xm, k),
        };
        plot.now();
      },
      () => {},
    );
  }

  // ---- read-outs ------------------------------------------------------------------------------------
  const eqQ = $('eq-q');
  const eqD = $('eq-dwl');
  function readouts(v: V, m: number, animate: boolean, say: boolean): void {
    const qs = qStar(v);
    const p0 = A - v.b * qs;
    const o = outcome(v, m);
    const cs = (A - o.pb) * o.q - (v.b * o.q * o.q) / 2;
    const pr = (o.ps - C) * o.q - (v.d * o.q * o.q) / 2;
    const rev = (o.pb - o.ps) * o.q;
    const gap = (v.b + v.d) * (qs - o.q);
    const dwl = (gap * (qs - o.q)) / 2;
    const tot0 = ((A - C) * qs) / 2;
    const fm = (s: string) => `free market ${s}`;
    const share = v.b / (v.b + v.d);
    const qd = (A - v.pc) / v.b;
    const qsp = (v.pc - C) / v.d;
    const bind = o.q < qs - 1e-9;

    setText('t-v', q1(v.t));
    setText('pc-v', p2(v.pc));
    setText('b-v', p2(v.b));
    setText('d-v', p2(v.d));
    setText('pc-l', m === 2 ? 'Price floor' : 'Price ceiling');
    setText('q', q1(o.q));
    setText('q-s', fm(q1(qs)));
    setText('pb', p2(o.pb));
    setText('pb-s', fm(p2(p0)));
    setText('ps', p2(o.ps));
    setText('ps-s', fm(p2(p0)));
    setText('x-l', ['Buyers’ share', 'Shortage', 'Excess supply'][m]);
    setText('x', m === 0 ? `${fmt(100 * share, 0)}%` : bind ? q1(Math.abs(qd - qsp)) : '0.0');
    setText('x-s', m === 0 ? `of the tax; sellers ${fmt(100 - 100 * share, 0)}%` : !bind ? 'not binding' : m === 1 ? `wanted ${q1(qd)}` : `offered ${q1(qsp)}`);
    setText('cs', q1(cs));
    setText('cs-s', fm(q1(((A - p0) * qs) / 2)));
    setText('pr', q1(pr));
    setText('pr-s', fm(q1(((p0 - C) * qs) / 2)));
    setText('y-l', m === 0 ? 'Tax revenue' : 'Total surplus');
    setText('y', q1(m === 0 ? rev : cs + pr));
    setText('y-s', m === 0 ? `${q1(v.t)} × ${q1(o.q)}` : fm(q1(tot0)));
    setText('dwl', q1(dwl));
    setText('dwl-s', `${fmt((100 * dwl) / tot0, 0)}% of the free-market total`);

    fillEq(eqQ, { a: String(A), c: String(C), t: q1(v.t), b: p2(v.b), d: p2(v.d), pc: p2(v.pc), qs: q1(qs), q: q1(o.q) }, animate);
    fillEq(eqD, { gap: p2(gap), qs: q1(qs), q: q1(o.q), dwl: q1(dwl) }, animate);
    if (!say) return;
    describeEq(
      eqQ,
      m === 0
        ? `Quantity traded: ${A} minus ${C} minus ${q1(v.t)}, over ${p2(v.b)} plus ${p2(v.d)}, is ${q1(o.q)}.`
        : `Quantity traded: the smaller of the free-market ${q1(qs)} and the quantity ${m === 1 ? 'supplied' : 'demanded'} at ${p2(v.pc)}, which is ${q1(o.q)}.`,
    );
    describeEq(eqD, `Deadweight loss: one half times ${p2(gap)} times ${q1(qs)} minus ${q1(o.q)} is ${q1(dwl)}.`);

    const eD = -(p0 / qs) / v.b;
    const eS = p0 / qs / v.d;
    const lost = `<b>${q1(dwl)}</b> of surplus is lost`;
    let note: string;
    if (m === 0)
      note =
        v.t === 0
          ? `No tax: the market clears at <b>${p2(p0)}</b> with <b>${q1(qs)}</b> traded.`
          : `Buyers pay <b>${p2(o.pb - p0)}</b> more and sellers receive <b>${p2(p0 - o.ps)}</b> less; ${lost}. At the free-market point demand elasticity is <b>${p2(eD)}</b> and supply elasticity <b>${p2(eS)}</b>: ${
              Math.abs(v.b - v.d) < 1e-9 ? 'equally elastic, so the tax splits evenly' : `the less elastic side, ${v.b > v.d ? 'buyers' : 'sellers'}, bears more`
            }, whoever hands the tax over.`;
    else if (!bind) note = `A ${m === 1 ? 'ceiling at or above' : 'floor at or below'} the free-market price, <b>${p2(p0)}</b>, does not bind: nothing changes.`;
    else
      note =
        m === 1
          ? `The ceiling holds the price at <b>${p2(v.pc)}</b>. Buyers want <b>${q1(qd)}</b> but sellers offer <b>${q1(qsp)}</b>: a shortage, and ${lost}.`
          : `The floor holds the price at <b>${p2(v.pc)}</b>. Sellers offer <b>${q1(qsp)}</b> but buyers want <b>${q1(qd)}</b>: an excess supply, and ${lost}.`;
    $('note').innerHTML = note;
  }

  /** `drag`: a control is moving; `step`: a settled change; `slow`: policy switch or reset; `now`: first paint. */
  function update(kind: 'drag' | 'step' | 'slow' | 'now'): void {
    const v = read();
    const m = mode();
    tool.querySelectorAll<HTMLElement>('[data-for]').forEach((el) => (el.hidden = !el.dataset.for!.split(' ').includes(MODES[m])));
    readouts(v, m, kind === 'step' || kind === 'slow', kind !== 'drag');
    show(v, kind === 'now' ? 0 : kind === 'drag' ? 140 : kind === 'slow' ? 560 : 380);
  }

  // ---- controls -------------------------------------------------------------------------------------
  for (const el of Object.values(ins)) {
    el.addEventListener('input', () => update('drag'));
    el.addEventListener('change', () => update('step'));
  }
  tool.querySelectorAll<HTMLInputElement>(`input[name="${ID}-on"]`).forEach((r) => r.addEventListener('change', () => update('step')));
  tool.querySelectorAll<HTMLInputElement>(`input[name="${ID}-mode"]`).forEach((r) =>
    r.addEventListener('change', () => {
      // A new ceiling or floor starts where it binds.
      const v = read();
      const m = mode();
      const p0 = A - v.b * qStar(v);
      if (m === 1 && v.pc >= p0) ins.pc.value = String(Math.max(2, Math.floor((p0 - 2.5) * 4) / 4));
      if (m === 2 && v.pc <= p0) ins.pc.value = String(Math.min(20, Math.ceil((p0 + 2.5) * 4) / 4));
      update('slow');
    }),
  );
  $('reset').addEventListener('click', () => {
    for (const [k, val] of Object.entries(DEF)) ins[k as keyof typeof ins].value = val;
    tool.querySelector<HTMLInputElement>(`input[name="${ID}-mode"][value="tax"]`)!.checked = true;
    tool.querySelector<HTMLInputElement>(`input[name="${ID}-on"][value="s"]`)!.checked = true;
    update('slow');
  });

  // Back/forward cache and form restoration can bring back earlier control values: start from them.
  addEventListener('pageshow', () => update('now'));
  update('now');
}
