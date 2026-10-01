import '../site';
import { reducedMotion } from '../ui/dom';
import type { Plot as PlotT, Scale } from '../ui/plot';
import type { ViewerFigure } from '../ui/viewer';

// The job market paper article (research/when-yield-curves-invert-together/).
//   rail: the step list marks the section being read
//   figures: "Inspect figure" / "Play walkthrough" open src/ui/viewer.ts, fetched on first use
//   citation: copy buttons
//   "Nine curves, one alarm": the IYC rule on nine made-up curves. Its markup is in the page; this
//   file keeps the state and, once the illustration nears the viewport, loads src/ui/plot.ts to draw.

// ---- rail -----------------------------------------------------------------------------------------
const steps = new Map<string, HTMLAnchorElement>();
document.querySelectorAll<HTMLAnchorElement>('.a-steps a[data-step]').forEach((a) => steps.set(a.dataset.step!, a));
let here: HTMLAnchorElement | undefined;
const reading = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const a = steps.get(e.target.id);
      if (!e.isIntersecting || !a || a === here) continue;
      here?.removeAttribute('aria-current');
      a.setAttribute('aria-current', 'true');
      here = a;
    }
  },
  // A thin band a third of the way down the viewport: one section covers it at a time.
  { rootMargin: '-34% 0px -65% 0px' },
);
steps.forEach((_, id) => {
  const s = document.getElementById(id);
  if (s) reading.observe(s);
});

// ---- figures ------------------------------------------------------------------------------------------
let viewer: Promise<typeof import('../ui/viewer')> | null = null;
const loadViewer = () => (viewer ??= import('../ui/viewer'));
document.querySelectorAll<HTMLElement>('[data-fig]').forEach((fig) => {
  fig.addEventListener('pointerenter', loadViewer, { once: true });
  fig.addEventListener('focusin', loadViewer, { once: true });
});
document.addEventListener('click', (e) => {
  const trigger = (e.target as Element).closest<HTMLElement>('[data-view]');
  const fig = trigger?.closest<HTMLElement>('[data-fig]');
  if (!trigger || !fig || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  const image = fig.querySelector('img')!;
  const data: ViewerFigure = {
    src: fig.dataset.full!,
    preview: image.currentSrc || image.src,
    w: +fig.dataset.w!,
    h: +fig.dataset.h!,
    alt: image.alt,
    no: fig.querySelector('.a-fig-no')!.textContent!,
    title: fig.querySelector('.a-fig-t')!.textContent!,
    steps: JSON.parse(fig.querySelector('.a-walk')?.textContent || '[]'),
  };
  // A click on the picture itself returns focus to the figure's Inspect button.
  const opener = trigger.tagName === 'A' ? fig.querySelector<HTMLElement>('button[data-view]')! : trigger;
  loadViewer().then((v) => v.openViewer(data, opener, trigger.dataset.view === 'walk'));
});

// ---- citation -----------------------------------------------------------------------------------------
const copied = document.querySelector<HTMLElement>('.a-copied');
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) => {
  const label = b.textContent!;
  let timer = 0;
  b.addEventListener('click', async () => {
    const source = document.getElementById(b.dataset.copy!)!;
    let ok = true;
    try {
      await navigator.clipboard.writeText(source.textContent!);
    } catch {
      // No clipboard access: select the text so the reader can copy it.
      const range = document.createRange();
      range.selectNodeContents(source);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      ok = false;
    }
    b.textContent = ok ? 'Copied' : label;
    if (copied) copied.textContent = ok ? 'Copied to the clipboard.' : 'Selected. Press Ctrl+C (or ⌘C) to copy.';
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      b.textContent = label;
      if (copied) copied.textContent = '';
    }, 1800);
  });
});

// ---- Nine curves, one alarm ------------------------------------------------------------------------------
// Each made-up curve is three points: 3M, 2Y and 10Y yields. The reader sets each 10Y−2Y slope month by
// month; the paper's recursion (PDF p. 12) gives each curve's state:
//   c = steepening months in a row (the slope rose this month), reset when it does not rise
//   a turns 1 when the curve inverts this month and was not inverted last month (a fresh inversion)
//   a turns 0 once c reaches 2 (deactivated); a deactivated curve still inverted cannot re-enter
//   N = Σ a, signal on when N ≥ 2; observed at month-end, acted on over the next month.
const N_CURVES = 9;
const START = [0.9, 0.6, 1.1, 0.7, 1.2, 0.8, 1.0, 0.5, 1.3];
const BASE = [2.6, 3.1, 2.2, 3.4, 2.8, 2.4, 3.0, 2.7, 3.3]; // illustrative 2Y levels, %
const SHORT = [-0.5, 0.9]; // 3M − 2Y: normal, or short rates held high
const LIMIT = 1.5;
const MONTHS = 36;
const NAMES = 'ABCDEFGHI';
type Change = [curve: number, slope: number][];
const PRESETS: Record<string, { note: string; months: Change[] }> = {
  lone: {
    note: 'Only A inverts, so N stays at 1 and the signal stays off. The paper finds months with exactly one active inversion favorable for carry.',
    months: [[[0, 0.2]], [[0, -0.3]], [[0, -0.5]], [[0, -0.6]], [[0, -0.6]]],
  },
  two: {
    note: 'A and B invert in the same month. N reaches 2, so the signal turns on at that month-end and is acted on over the next month.',
    months: [[[0, 0.3], [1, 0.2]], [[0, -0.2], [1, -0.3]], [[0, -0.4], [1, -0.5]], [[0, -0.5], [1, -0.6]]],
  },
  stale: {
    note: 'A and B steepen two months in a row while still inverted, so they go stale. The naive light stays on and the IYC light turns off, as with Norway in 1998–99.',
    months: [[[0, 0.2], [1, 0.1]], [[0, -0.3], [1, -0.2]], [[0, -0.6], [1, -0.5]], [[0, -0.4], [1, -0.3]], [[0, -0.2], [1, -0.1]], [[1, -0.2]]],
  },
  late: {
    note: 'More curves join one after another, long after A and B. The paper finds no effect at four or more active inversions; the author’s explanation is that breadth arrives late in an episode, after freshness has gone.',
    months: [
      [[0, -0.2], [1, -0.3]],
      [[0, -0.4], [1, -0.5], [2, 0.2]],
      [[0, -0.5], [1, -0.6], [2, -0.1]],
      [[0, -0.6], [1, -0.7], [2, -0.3], [3, -0.2]],
      [[2, -0.5], [3, -0.5], [4, -0.1]],
      [[4, -0.4], [5, -0.4]],
    ],
  },
};
const HINT = 'Drag a curve’s 10Y end below its 2Y level (dotted), or pick an example, then step through the months.';
const LABEL = { normal: 'Normal', fresh: 'Active ▼', active: 'Active', steep: 'Steep 1/2', stale: 'Stale ×' } as const;
type State = keyof typeof LABEL;

interface Run {
  a: number[];
  c: number[];
  on: number[];
  off: number[];
  naive: number[];
  act: number[];
}

const demo = document.getElementById('signal-demo');
if (demo) {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    near.disconnect();
    import('../ui/plot').then((p) => signal(demo, p));
  };
  // Load the drawing code as the illustration nears the viewport, or as soon as it is touched.
  const near = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: '600px 0px' });
  near.observe(demo);
  demo.addEventListener('pointerdown', start, { once: true });
  demo.addEventListener('focusin', start, { once: true });
}

function signal(root: HTMLElement, P: typeof import('../ui/plot')): void {
  const { Plot, linear, palette, triangle, FONT } = P;
  let hist: number[][] = [START.slice()];
  let m = 0;
  let high = false;
  let preset = '';
  let timer = 0;
  let now: Run;
  let all: Run;
  const states: State[] = Array(N_CURVES).fill('normal');

  const q = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const out = (k: string) => q(`[data-out="${k}"]`);
  const cards = [...root.querySelectorAll<HTMLElement>('.sig-c')];
  const inputs = cards.map((c) => c.querySelector('input')!);
  const prevB = q<HTMLButtonElement>('[data-month="-1"]');
  const nextB = q<HTMLButtonElement>('[data-month="1"]');
  const cells = [...root.querySelectorAll<HTMLElement>('.sig-cells > span')];
  const avgBox = q('.sig-avg-body');
  const presetBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-preset]')];
  const sign = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
  const round = (v: number) => Math.round(clamp(v, -LIMIT, LIMIT) * 10) / 10;
  const names = (list: number[]) => list.map((i) => NAMES[i]).join(', ');

  function run(upto: number): Run {
    const r: Run = { a: Array(N_CURVES).fill(0), c: Array(N_CURVES).fill(0), on: Array(N_CURVES).fill(-1), off: Array(N_CURVES).fill(-1), naive: [], act: [] };
    for (let t = 0; t <= upto; t++) {
      const v = hist[t];
      const p = hist[t - 1];
      for (let i = 0; i < N_CURVES; i++) {
        r.c[i] = p && v[i] > p[i] + 1e-9 ? r.c[i] + 1 : 0;
        if (!r.a[i] && v[i] < 0 && !(p && p[i] < 0)) {
          r.a[i] = 1;
          r.on[i] = t;
        } else if (r.a[i] && r.c[i] >= 2) {
          r.a[i] = 0;
          r.off[i] = t;
        }
      }
      r.naive.push(v.filter((s) => s < 0).length);
      r.act.push(r.a.reduce((s, a) => s + a, 0));
    }
    return r;
  }

  // ---- drawing ----
  const sizeOf = (i: number) => {
    const b = BASE[i];
    return { lo: b - 1.9, hi: b + 1.9 };
  };
  const minis = cards.map((card, i) => {
    let sy: Scale = linear(0, 1, 0, 1);
    const plot = new Plot(card.querySelector<HTMLElement>('.sig-mini')!, (p) => {
      const c = palette();
      const { ctx, w, h } = p;
      const { lo, hi } = sizeOf(i);
      sy = linear(lo, hi, h - 5, 5);
      const xs = [7, w * 0.36, w - 9];
      const b = BASE[i];
      const v = hist[m][i];
      const ys = [sy(b + SHORT[+high]), sy(b), sy(b + v)];
      const st = states[i];
      // Gold reference: the 2Y level carried out to 10Y. Below it, the curve is inverted.
      ctx.strokeStyle = c.gold;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(xs[1], Math.round(ys[1]) + 0.5);
      ctx.lineTo(w - 2, Math.round(ys[1]) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      const ink = st === 'stale' ? c.muted : st === 'normal' ? c.bar : c.accent;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      xs.forEach((x, k) => (k ? ctx.lineTo(x, ys[k]) : ctx.moveTo(x, ys[k])));
      ctx.stroke();
      ctx.fillStyle = ink;
      for (const k of [0, 1]) {
        ctx.beginPath();
        ctx.arc(xs[k], ys[k], 2.2, 0, 7);
        ctx.fill();
      }
      // The 10Y end is the handle.
      ctx.beginPath();
      ctx.arc(xs[2], ys[2], 4.5, 0, 7);
      ctx.fillStyle = c.surface;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      if (st === 'fresh') {
        ctx.fillStyle = c.accent;
        triangle(ctx, xs[2], ys[2] - 8, 4);
      } else if (st === 'stale') {
        ctx.strokeStyle = c.muted;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(xs[2] - 9, ys[2] - 9);
        ctx.lineTo(xs[2] - 3, ys[2] - 3);
        ctx.moveTo(xs[2] - 3, ys[2] - 9);
        ctx.lineTo(xs[2] - 9, ys[2] - 3);
        ctx.stroke();
      }
      p.mark(0, xs[1] + 4, 0, w - xs[1] - 4, h);
    });
    plot.onDrag = (_k, _x, y, done) => {
      setSlope(i, round(sy.invert(y) - BASE[i]));
      if (done) inputs[i].focus({ preventScroll: true });
    };
    return plot;
  });

  const strip = new Plot(q('.sig-strip'), (p) => {
    const c = palette();
    const { ctx, w, h } = p;
    const span = Math.max(8, hist.length);
    const sx = linear(0, span, 24, w - 8);
    const sy = linear(0, 9, h - 18, 8);
    // Signal months, shaded.
    ctx.fillStyle = c.accentSoft;
    all.act.forEach((n, t) => n >= 2 && ctx.fillRect(sx(t), sy(9), sx(t + 1) - sx(t), sy(0) - sy(9)));
    ctx.font = FONT;
    ctx.fillStyle = c.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of [0, 2, 9]) ctx.fillText(String(v), 18, sy(v));
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, Math.round(sy(0)) + 0.5);
    ctx.lineTo(w - 8, Math.round(sy(0)) + 0.5);
    ctx.stroke();
    ctx.strokeStyle = c.gold;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(24, Math.round(sy(2)) + 0.5);
    ctx.lineTo(w - 8, Math.round(sy(2)) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    const steps = (series: number[], colour: string, width: number, lift: number) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      series.forEach((n, t) => {
        const yy = sy(n) - lift;
        if (t) ctx.lineTo(sx(t), yy);
        else ctx.moveTo(sx(t), yy);
        ctx.lineTo(sx(t + 1), yy);
      });
      ctx.stroke();
    };
    steps(all.naive, c.bar, 2, -1);
    steps(all.act, c.accent, 2.5, 1);
    // The month on screen; later months (already scripted or stepped) are faded.
    if (m < hist.length - 1) {
      ctx.fillStyle = c.surface;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(sx(m + 1), 0, w - sx(m + 1), h - 17);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = c.pop;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(sx(m), 4, sx(m + 1) - sx(m), h - 21);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const every = Math.ceil(28 / (sx(1) - sx(0)));
    for (let t = 0; t < span; t += every) {
      ctx.fillStyle = t === m ? c.ink : c.muted;
      ctx.fillText(String(t), (sx(t) + sx(t + 1)) / 2, h - 14);
    }
  });

  let avg: PlotT | null = null;
  const drawAvg = (p: PlotT) => {
    const c = palette();
    const { ctx, w, h } = p;
    const b = BASE.reduce((s, x) => s + x, 0) / N_CURVES;
    const v = hist[m].reduce((s, x) => s + x, 0) / N_CURVES;
    const ys = [b + SHORT[+high], b, b + v];
    const sx = linear(0, 10, 16, w - 16);
    const sy = linear(b - 1.9, b + 1.9, h - 20, 8);
    const xs = [0.25, 2, 10].map(sx);
    ctx.strokeStyle = c.gold;
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, Math.round(sy(b)) + 0.5);
    ctx.lineTo(w - 16, Math.round(sy(b)) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = ctx.fillStyle = c.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    xs.forEach((x, k) => (k ? ctx.lineTo(x, sy(ys[k])) : ctx.moveTo(x, sy(ys[k]))));
    ctx.stroke();
    xs.forEach((x, k) => {
      ctx.beginPath();
      ctx.arc(x, sy(ys[k]), 3.5, 0, 7);
      ctx.fill();
    });
    ctx.fillStyle = c.muted;
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ['3M', '2Y', '10Y'].forEach((t, k) => {
      ctx.textAlign = k ? (k === 2 ? 'right' : 'center') : 'left';
      ctx.fillText(t, k === 2 ? xs[k] + 6 : k ? xs[k] : xs[k] - 6, h - 14);
    });
  };

  // ---- state → page ----
  function render(): void {
    now = run(m);
    all = run(hist.length - 1);
    const v = hist[m];
    cards.forEach((card, i) => {
      const st: State = now.a[i] ? (now.on[i] === m ? 'fresh' : now.c[i] === 1 ? 'steep' : 'active') : v[i] < 0 ? 'stale' : 'normal';
      states[i] = st;
      card.dataset.s = st;
      card.querySelector('.sig-chip')!.textContent = LABEL[st];
      const input = inputs[i];
      if (input.value !== String(v[i])) input.value = String(v[i]);
      input.setAttribute('aria-valuetext', `${sign(v[i])} points, ${LABEL[st].replace(/ [▼×]/, '')}`);
      card.querySelector('output')!.textContent = sign(v[i]);
    });
    const n = now.act[m];
    const naive = now.naive[m];
    out('naive').textContent = String(naive);
    out('n').textContent = String(n);
    cells.forEach((cell, k) => cell.classList.toggle('on', k < n));
    light('iyc', n >= 2);
    light('naive', naive >= 2);
    q('.sig-m').textContent = `Month ${m}`;
    prevB.disabled = m === 0;
    nextB.disabled = m >= MONTHS - 1;
    // What changed this month.
    const ev: string[] = [];
    const fresh = [...Array(N_CURVES).keys()].filter((i) => now.on[i] === m);
    const done = [...Array(N_CURVES).keys()].filter((i) => now.off[i] === m);
    if (fresh.length) ev.push(`${names(fresh)} inverted: active.`);
    if (done.length) ev.push(`${names(done)} steepened twice: deactivated${done.some((i) => v[i] < 0) ? ', still inverted (stale)' : ''}.`);
    const before = m ? all.act[m - 1] : 0;
    if (n >= 2 && before < 2) ev.push(`N = ${n}: signal on, acted on next month.`);
    else if (n < 2 && before >= 2) ev.push(`N = ${n}: signal off.`);
    out('event').textContent = ev.length ? `Month ${m}: ${ev.join(' ')}` : '';
    out('note').textContent = preset ? PRESETS[preset].note : HINT;
    presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === preset)));
    const mean = v.reduce((s, x) => s + x, 0) / N_CURVES;
    const down = SHORT[+high] > 0 && mean < 0;
    const badge = out('down');
    badge.textContent = down ? 'Downcurve' : 'Not downcurve';
    badge.classList.toggle('on', down);
    minis.forEach((p) => p.request());
    strip.request();
    avg?.request();
  }
  function light(k: string, on: boolean): void {
    const el = q(`[data-light="${k}"]`);
    el.classList.toggle('on', on);
    el.querySelector('b')!.textContent = on ? 'on' : 'off';
  }

  function stop(): void {
    clearTimeout(timer);
    timer = 0;
  }
  function setSlope(i: number, v: number): void {
    stop();
    if (hist[m][i] === v) return;
    hist = hist.slice(0, m + 1);
    hist[m] = hist[m].slice();
    hist[m][i] = v;
    preset = '';
    render();
  }
  function move(d: number): void {
    if (d > 0 && m + 1 >= hist.length) {
      if (hist.length >= MONTHS) return;
      hist.push(hist[m].slice());
    }
    m = clamp(m + d, 0, hist.length - 1);
    render();
  }
  function load(key: string): void {
    stop();
    hist = [START.slice()];
    for (const change of PRESETS[key].months) {
      const v = hist[hist.length - 1].slice();
      for (const [i, s] of change) v[i] = s;
      hist.push(v);
    }
    preset = key;
    m = 0;
    if (reducedMotion()) m = hist.length - 1;
    render();
    // Play through the scripted months, one every 1.1 s; any control stops it.
    const tick = () => {
      if (m >= hist.length - 1) return stop();
      move(1);
      timer = window.setTimeout(tick, 1100);
    };
    if (m < hist.length - 1) timer = window.setTimeout(tick, 700);
  }

  inputs.forEach((input, i) => input.addEventListener('input', () => setSlope(i, round(parseFloat(input.value)))));
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.dataset.preset) return load(b.dataset.preset);
    stop();
    if (b.dataset.month) move(+b.dataset.month);
    else if (b.hasAttribute('data-reset')) {
      hist = [START.slice()];
      m = 0;
      preset = '';
      render();
    }
  });
  q<HTMLInputElement>('[data-avg]').addEventListener('change', (e) => {
    avgBox.hidden = !(e.target as HTMLInputElement).checked;
    if (!avgBox.hidden) avg ??= new Plot(q('.sig-avg-plot'), drawAvg);
    avg?.request();
  });
  q<HTMLInputElement>('[data-high]').addEventListener('change', (e) => {
    high = (e.target as HTMLInputElement).checked;
    render();
  });
  root.classList.add('ready');
  render();
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
