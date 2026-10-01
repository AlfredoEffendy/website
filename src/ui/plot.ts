import { reducedMotion, tidy } from './dom';

export interface Palette {
  ink: string;
  muted: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentSoft: string;
  /** Soft purple used for simulated data. */
  bar: string;
  gold: string;
  pop: string;
  ok: string;
  bad: string;
  surface: string;
  tint: string;
  gridMinor: string;
  gridMajor: string;
}

let cached: Palette | null = null;

/** Chart colours come from the same CSS tokens as the page, so both themes stay in step. */
export function palette(): Palette {
  if (cached) return cached;
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return (cached = {
    ink: v('--ink'),
    muted: v('--muted'),
    line: v('--line'),
    lineStrong: v('--line-strong'),
    accent: v('--accent'),
    accentSoft: v('--accent-soft'),
    bar: v('--bar'),
    gold: v('--gold'),
    pop: v('--pop'),
    ok: v('--ok'),
    bad: v('--bad'),
    surface: v('--surface'),
    tint: v('--tint'),
    gridMinor: v('--grid-minor'),
    gridMajor: v('--grid-major'),
  });
}

const plots = new Set<Plot>();
const redrawAll = () => {
  cached = null;
  plots.forEach((p) => p.request());
};
addEventListener('themechange', redrawAll);
document.fonts?.ready.then(redrawAll);

/** Size and draw every visible plot right now (used inside a tab transition, before the snapshot). */
export const flushPlots = (): void => plots.forEach((p) => p.measure());

/** A canvas that tracks its container's size at device resolution and redraws at most once per frame. */
export class Plot {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  /** Called with the key of the mark that was clicked or tapped (null for empty space). */
  onPick: ((key: number | null) => void) | null = null;
  /** Called while a mark is dragged, with the pointer position in plot coordinates. */
  onDrag: ((key: number, x: number, y: number, done: boolean) => void) | null = null;
  private queued = false;
  private marks: number[] = [];

  constructor(
    readonly host: HTMLElement,
    private readonly draw: (p: Plot) => void,
  ) {
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.setAttribute('aria-hidden', 'true');
    host.prepend(this.canvas);
    new ResizeObserver(() => this.measure()).observe(host);
    plots.add(this);

    const at = (e: PointerEvent): [number, number, number] => {
      const r = host.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top, e.pointerType === 'mouse' ? 5 : 14];
    };
    let dragging: number | null = null;
    let moved = false;
    host.addEventListener('pointerdown', (e) => {
      moved = false;
      // Dragging is for mouse and pen; a finger on the chart must stay free to scroll the page.
      if ((e.target as Element).closest('.handle') || !this.onDrag || e.pointerType === 'touch') return;
      dragging = this.pick(...at(e));
      if (dragging !== null) host.setPointerCapture(e.pointerId);
    });
    host.addEventListener('pointermove', (e) => {
      const [x, y, slop] = at(e);
      if (dragging !== null && this.onDrag) {
        moved = true;
        this.onDrag(dragging, x, y, false);
      } else if (this.onPick && e.pointerType === 'mouse') host.style.cursor = this.pick(x, y, slop) === null ? '' : 'pointer';
    });
    host.addEventListener('pointerup', (e) => {
      if (dragging !== null && moved && this.onDrag) {
        const [x, y] = at(e);
        this.onDrag(dragging, x, y, true);
      }
      dragging = null;
    });
    host.addEventListener('click', (e) => {
      // A click that ends a drag is not a pick.
      if ((e.target as Element).closest('.handle') || !this.onPick || moved) return;
      const r = host.getBoundingClientRect();
      this.onPick(this.pick(e.clientX - r.left, e.clientY - r.top, 10));
    });
  }

  /** Register a clickable region for the thing just drawn. Regions are cleared on every redraw. */
  mark(key: number, x: number, y: number, w: number, h: number): void {
    this.marks.push(key, x, y, w, h);
  }

  /** Key of the mark under (x, y), or the nearest one within `slop` pixels. */
  pick(x: number, y: number, slop: number): number | null {
    const m = this.marks;
    let best: number | null = null;
    let bestD = slop;
    for (let i = 0; i < m.length; i += 5) {
      const dx = Math.max(m[i + 1] - x, 0, x - m[i + 1] - m[i + 3]);
      const dy = Math.max(m[i + 2] - y, 0, y - m[i + 2] - m[i + 4]);
      const d = Math.hypot(dx, dy);
      if (d <= bestD) {
        bestD = d;
        best = m[i];
        if (d === 0 && m[i + 3] * m[i + 4] < 400) break; // inside a small target: take it
      }
    }
    return best;
  }

  measure(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = Math.round(width * dpr);
    const ch = Math.round(height * dpr);
    if (cw !== this.canvas.width || ch !== this.canvas.height || width !== this.w) {
      this.w = width;
      this.h = height;
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.now();
  }

  request(): void {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.now();
    });
  }

  now(): void {
    if (!this.w || !this.h) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.marks.length = 0;
    this.draw(this);
  }
}

/**
 * Eases a set of displayed values toward their targets, so bars glide to a new height instead
 * of jumping. Call `step` from a draw function; while `moving` is true, request another frame.
 */
export class Morph {
  private cur = new Float64Array(0);
  private last = 0;
  moving = false;

  step(target: ArrayLike<number>): Float64Array {
    const now = performance.now();
    const n = target.length;
    if (this.cur.length !== n || reducedMotion()) {
      this.cur = Float64Array.from(target);
      this.moving = false;
      this.last = now;
      return this.cur;
    }
    const dt = Math.min(64, now - this.last);
    this.last = now;
    const k = 1 - Math.exp(-dt / 70);
    let scale = 0;
    for (let i = 0; i < n; i++) scale = Math.max(scale, Math.abs(target[i]));
    const done = scale * 0.004;
    this.moving = false;
    for (let i = 0; i < n; i++) {
      const gap = target[i] - this.cur[i];
      if (Math.abs(gap) <= done) this.cur[i] = target[i];
      else {
        this.cur[i] += gap * k;
        this.moving = true;
      }
    }
    return this.cur;
  }

  /** Jump straight to the next target (after a reset, when easing from stale values would mislead). */
  snap(): void {
    this.cur = new Float64Array(0);
  }
}

export type Scale = ((v: number) => number) & { invert(px: number): number };

export function linear(d0: number, d1: number, r0: number, r1: number): Scale {
  const k = (r1 - r0) / (d1 - d0 || 1);
  const f = ((v: number) => r0 + (v - d0) * k) as Scale;
  f.invert = (px) => d0 + (px - r0) / k;
  return f;
}

/** Round tick positions covering [lo, hi]. */
export function ticks(lo: number, hi: number, target = 8): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step)
    out.push(+v.toFixed(10));
  return out;
}

export const FONT = '600 11px "Open Sans", system-ui, sans-serif';

/** Baseline, tick marks and labels. Labels are kept inside [x0, x1] so end values are never clipped. */
export function xAxis(
  p: Plot,
  sx: Scale,
  y: number,
  lo: number,
  hi: number,
  opts: { target?: number; format?: (v: number) => string; values?: number[] } = {},
): void {
  const { ctx } = p;
  const c = palette();
  const x0 = sx(lo);
  const x1 = sx(hi);
  ctx.strokeStyle = c.lineStrong;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y + 0.5);
  ctx.lineTo(x1, y + 0.5);
  ctx.stroke();
  ctx.fillStyle = c.muted;
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  const format = opts.format ?? ((v: number) => tidy(v));
  let lastRight = -Infinity;
  for (const v of opts.values ?? ticks(lo, hi, opts.target ?? Math.max(3, Math.floor((x1 - x0) / 80)))) {
    const x = sx(v);
    ctx.fillRect(Math.round(x), y, 1, 4);
    const text = format(v);
    const half = ctx.measureText(text).width / 2;
    const cx = Math.min(Math.max(x, x0 + half), x1 - half);
    if (cx - half < lastRight + 6) continue;
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, y + 7);
    lastRight = cx + half;
  }
}

/** Count labels down the left edge (the graph-paper background supplies the guide lines). */
export function yLabels(p: Plot, sy: Scale, x0: number, max: number, target = 4): void {
  const { ctx } = p;
  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillStyle = palette().muted;
  for (const v of ticks(0, max, target)) {
    if (v === 0) continue;
    const y = Math.round(sy(v)) + 0.5;
    ctx.fillRect(x0 - 4, y, 4, 1);
    ctx.fillText(tidy(v), x0 - 7, y);
  }
}

/** Stroke y = f(x) across [lo, hi] at one sample per two pixels; with `fillTo`, fill down to that y. */
export function curve(
  p: Plot,
  sx: Scale,
  sy: Scale,
  lo: number,
  hi: number,
  f: (x: number) => number,
  fillTo?: number,
): void {
  const { ctx } = p;
  const a = sx(lo);
  const b = sx(hi);
  const steps = Math.max(2, Math.ceil((b - a) / 2));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    const px = a + ((b - a) * i) / steps;
    const py = sy(f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  if (fillTo !== undefined) {
    ctx.lineTo(b, fillTo);
    ctx.lineTo(a, fillTo);
    ctx.closePath();
    ctx.fill();
  } else ctx.stroke();
}

/** Downward-pointing marker with its tip at (x, y). */
export function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size, y - size * 1.5);
  ctx.lineTo(x + size, y - size * 1.5);
  ctx.closePath();
  ctx.fill();
}

/**
 * Small panel label drawn on the canvas. Titles are set in spaced capitals; pass `plain` for
 * anything containing symbols or values, which must keep their case (μ is not Μ).
 */
export function label(
  p: Plot,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'left',
  plain = false,
): void {
  const { ctx } = p;
  ctx.fillStyle = palette().muted;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (plain) {
    ctx.font = FONT;
    ctx.fillText(text, x, y);
    return;
  }
  ctx.font = '600 11px "Encode Sans Condensed", "Arial Narrow", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

/** Time-based tween: `frame(t)` gets eased progress 0…1. Returns a function that jumps to the end. */
export function tween(ms: number, frame: (t: number) => void, done: () => void): () => void {
  let raf = 0;
  let finished = false;
  const start = performance.now();
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    frame(1);
    done();
  };
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    if (t >= 1) return finish();
    frame(t * t * (3 - 2 * t));
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return finish;
}
