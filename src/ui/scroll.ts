// Scroll marker in place of the browser's scrollbar: the site's mark (a bell over bars) turned on its
// side, drawn on a canvas strip over the left edge so it takes no layout space. The bell rides the
// scroll position. While the page moves it trails a long fading tail behind it, its bars ripple, and
// its broken outline slides faster than the bars. When the page settles it halves, then flattens and
// fades. A narrow grip under the bell drags the page (mouse and pen; touch scrolls natively).
import { reducedMotion } from './dom';

const W = 48; // strip width, CSS px
const EDGE = 2; // the outline's resting x
const GAP = 4; // bar pitch
const N = 72; // bars each side of the centre
const MARGIN = 14; // the bell's travel stops this close to either end of the strip (the strip runs to the bottom edge)
const REACH = 300; // longest head or tail
const CLEAR = 'rgba(0,0,0,0)';
const HALF = 'rgba(0,0,0,.4)';
const SOLID = '#000';

// A fixed, seeded, irregular dash pattern: long strokes, short gaps, now and then a wider gap.
const DASH: number[] = [];
let span = 0;
for (let s = 20261001, i = 0; i < 40; i++) {
  s = (s * 16807) % 2147483647;
  const r = s / 2147483647;
  span += DASH[i] = i % 2 ? (r < 0.16 ? 10 + r * 50 : 2 + (r - 0.16) * 6) : 14 + r * 46;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const approach = (from: number, to: number, k: number) => (to < from ? to : from + (to - from) * k);

export function scrollMark(): void {
  const root = document.documentElement;
  const cv = document.createElement('canvas');
  const grip = document.createElement('div');
  cv.className = 'scroll-bell';
  grip.className = 'scroll-grip';
  cv.setAttribute('aria-hidden', 'true');
  grip.setAttribute('aria-hidden', 'true');
  document.body.append(cv, grip);
  const ctx = cv.getContext('2d')!;
  const bars = new Float32Array(2 * N + 1);

  let H = 0, top = 0, max = 0, dpr = 1, peak = 14, accent = '', gold = '';
  // active: last scroll, drag or hover (drives the fade); moved: last time anything visible changed.
  let raf = 0, last = 0, active = 0, moved = 0, sy = 0, c = 0, v = 0, dir = 1, still = false, fresh = true;
  let amp = 0, alpha = 0, dash = 0, flow = 0, held = false, dragY = NaN, dragTop = 0, gy = NaN;
  // Profile: a narrow core plus a broad, low skirt; each side has its own widths.
  let w = 0, cu = 11, cd = 11, bu = 30, bd = 30;
  const profile = (d: number) => {
    const sc = d < 0 ? cu : cd, sb = d < 0 ? bu : bd;
    return (1 - w) * Math.exp((-d * d) / (2 * sc * sc)) + w * Math.exp((-d * d) / (2 * sb * sb));
  };

  function measure(): void {
    max = root.scrollHeight - innerHeight;
    cv.hidden = grip.hidden = max < 40;
    if (cv.hidden) return;
    const r = cv.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    top = r.top;
    peak = innerWidth < 640 ? 12 : 14; // the bell's height: a phone's gutter is narrower
    if (r.height !== H || d !== dpr) {
      H = r.height;
      dpr = d;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
  }
  function colours(): void {
    const s = getComputedStyle(root);
    accent = s.getPropertyValue('--accent').trim();
    gold = s.getPropertyValue('--gold').trim();
  }
  function wake(user?: boolean): void {
    if (user) active = performance.now();
    if (raf || document.hidden || cv.hidden) return;
    still = reducedMotion();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now: number): void {
    const dt = Math.min(Math.max(now - last, 1), 64);
    last = now;
    const y = scrollY;
    const goal = MARGIN + (H - 2 * MARGIN) * Math.min(1, Math.max(0, y / max));
    if (fresh) {
      // Starting from nothing (first run, or after a full fade): appear in place.
      sy = y;
      c = goal;
      v = 0;
      bars.fill(0);
      fresh = false;
    }
    const was = c;
    const ds = y - sy;
    sy = y;
    if (ds) moved = now;
    if (held || dragY === dragY) active = now;
    c += (goal - c) * (1 - Math.exp(-dt / 45));
    v += (ds / dt - v) * (1 - Math.exp(-dt / 120));
    if (Math.abs(v) > 0.05) dir = v > 0 ? 1 : -1;

    // Strength: full, then half height at half opacity after 0.5 s, then flat and gone a second later.
    const idle = now - active;
    const k = 1 - Math.exp(-dt / 45);
    const env = 1 - 0.5 * ease((idle - 500) / 350) - 0.5 * ease((idle - 1500) / 550);
    amp = still ? 1 : approach(amp, env, k);
    alpha = approach(alpha, still ? 1 - ease((idle - 500) / 450) : env, k);
    if (amp < 0.999 || alpha < 0.999) moved = now;

    const p = Math.round(top + c - 32);
    if (p !== gy) grip.style.transform = `translateY(${(gy = p)}px)`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (alpha < 0.004 && idle > 950) {
      raf = 0; // faded out: rest until the page moves again
      fresh = true;
      return;
    }

    // Shape follows a smoothed speed: a short front, and a long tail stretching behind the direction of travel.
    const t = still ? 0 : 1 - Math.exp(-Math.abs(v) / 1.6);
    const ca = 10 - 3 * t, cb = 10 + 8 * t, ba = 18 - 6 * t, bb = 18 + 127 * t;
    w = still ? 0 : 0.22 + 0.14 * t;
    const up = dir > 0;
    cu = up ? cb : ca;
    cd = up ? ca : cb;
    bu = up ? bb : ba;
    bd = up ? ba : bb;
    if (!still) {
      // Parallax: the outline's dashes flow against the bell's travel (backwards along the line) plus a
      // share of the page's own motion, so they slide against the bars; the ripple runs at its own pace.
      dash = (dash + 0.8 * (c - was) + Math.max(-9, Math.min(9, ds * 0.12))) % span;
      flow += Math.max(-24, Math.min(24, ds));
    }

    const A = peak * amp;
    const cs = Math.round(c * dpr) / dpr;
    const bh = Math.round(1.25 * dpr) / dpr;
    const kb = still ? 1 : 1 - Math.exp(-dt / 70);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gold;
    ctx.beginPath();
    for (let i = -N; i <= N; i++) {
      const d = i * GAP;
      const rip = still ? 0.85 : 0.86 + 0.16 * Math.sin(flow * 0.011 - i * 0.8);
      const j = i + N;
      bars[j] += (Math.max(0, (EDGE + A * profile(d)) * 0.85 * rip - 1.4) - bars[j]) * kb;
      if (bars[j] > 0.2) ctx.rect(0, cs + d, bars[j], bh);
    }
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.setLineDash(DASH);
    ctx.lineDashOffset = dash;
    ctx.beginPath();
    ctx.moveTo(EDGE, c - REACH);
    for (let d = 2 - REACH; d <= REACH; d += 2) ctx.lineTo(EDGE + A * profile(d), c + d);
    ctx.stroke();

    // Fade the head and tail along their length (alpha mask over everything just drawn).
    const cu2 = 1.5 * cu, cd2 = 1.5 * cd;
    const lu = Math.min(REACH, Math.max(2.5 * bu, cu2 + 12)), ld = Math.min(REACH, Math.max(2.5 * bd, cd2 + 12));
    const span2 = lu + ld;
    const g = ctx.createLinearGradient(0, c - lu, 0, c + ld);
    g.addColorStop(0, CLEAR);
    g.addColorStop((lu - cu2) / 2 / span2, HALF);
    g.addColorStop((lu - cu2) / span2, SOLID);
    g.addColorStop((lu + cd2) / span2, SOLID);
    g.addColorStop((lu + cd2 + (ld - cd2) / 2) / span2, HALF);
    g.addColorStop(1, CLEAR);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // A pointer resting on the grip holds the bell up; once everything has settled, stop drawing.
    raf = held && dragY !== dragY && now - moved > 900 && Math.abs(goal - c) < 0.05 ? 0 : requestAnimationFrame(frame);
  }

  addEventListener('scroll', () => wake(true), { passive: true });
  const refit = () => {
    measure();
    wake();
  };
  addEventListener('resize', refit);
  const ro = new ResizeObserver(refit);
  ro.observe(document.body);
  ro.observe(cv);
  addEventListener('themechange', () => {
    colours();
    wake();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return wake();
    cancelAnimationFrame(raf);
    raf = 0;
  });

  // Dragging the grip scrolls the page in proportion, like a scrollbar thumb. Mouse and pen only.
  grip.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button) return;
    dragY = e.clientY;
    dragTop = scrollY;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
    wake(true);
  });
  grip.addEventListener('pointermove', (e) => {
    if (dragY === dragY) scrollTo(0, dragTop + ((e.clientY - dragY) / (H - 2 * MARGIN)) * max);
  });
  const drop = () => {
    dragY = NaN;
    wake(true);
  };
  grip.addEventListener('pointerup', drop);
  grip.addEventListener('pointercancel', drop);
  const hover = (on: boolean) => (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    held = on;
    wake(true);
  };
  grip.addEventListener('pointerenter', hover(true));
  grip.addEventListener('pointerleave', hover(false));

  colours();
  measure();
  wake(true);
}
