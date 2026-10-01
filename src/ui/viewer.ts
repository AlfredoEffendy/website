// Figure viewer: one modal dialog to inspect a figure (fit, zoom, pan) or to walk through it step by
// step, with a highlighted region and its note. Ported to TypeScript from the owner's SparseMind
// figure viewer (dist/assets/figure-viewer.js); here the figure is a raster cut from the paper.
// Loaded on first use by src/pages/research.ts. It brings its own styles (design tokens only), so
// pages that never open it carry none of them.
//   zoom: + / − buttons, + = − keys, Ctrl/Cmd + wheel, pinch, double-click; 0 or Fit resets
//   pan: drag, arrow keys (and the arrow buttons)
//   close: Escape, "Back to article", or the browser's Back; focus returns to the opener
import { reducedMotion } from './dom';

export interface Step {
  /** [x, y, width, height] as fractions of the figure. */
  region: [number, number, number, number];
  note: string;
}
export interface ViewerFigure {
  src: string;
  /** Already-loaded smaller rendition, shown underneath while `src` arrives. */
  preview?: string;
  w: number;
  h: number;
  alt: string;
  no: string;
  title: string;
  steps: Step[];
}

const MAX = 6;
const PAD = 12;
const NUDGE = 64;
const EASE = 'cubic-bezier(.2,.7,.2,1)';
// The white sheet stays white in the dark theme (it is the paper's figure), dimmed slightly.
const CSS = `.v-open{overflow:hidden}
.viewer{width:min(76rem,100% - 1.5rem);max-width:none;height:min(56rem,100% - 1.5rem);max-height:none;margin:auto;padding:0;border:1px solid var(--line-strong);border-radius:calc(2*var(--radius));background:var(--surface);color:var(--ink);overflow:hidden}
.viewer[open]{display:grid;grid-template-rows:auto minmax(10rem,1fr) auto;animation:v-in .28s ${EASE}}
.viewer::backdrop{background:color-mix(in oklch,var(--n-950) 62%,transparent)}
@keyframes v-in{from{opacity:0;transform:translateY(10px) scale(.985)}}
.v-head{display:flex;align-items:center;gap:var(--s-4);padding:var(--s-3) var(--s-4);border-bottom:1px solid var(--line)}
.v-head>div{min-width:0}.v-no{color:var(--gold-ink)}
.v-head h2{font:600 1.125rem/1.25 var(--font-display)}
.v-close{margin-left:auto;flex:none}
.v-surface{position:relative;overflow:hidden;background:var(--paper-grid),var(--paper);touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.v-surface.dragging{cursor:grabbing}
.v-surface:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}
.v-content{position:absolute;left:50%;top:50%;transform-origin:center;will-change:transform;background:var(--n-0) center/100% 100% no-repeat;box-shadow:0 1px 0 var(--line),0 18px 40px -28px var(--pop)}
:root[data-theme="dark"] .v-content{filter:brightness(.92)}
.v-content img{display:block;width:100%;height:100%;pointer-events:none;-webkit-user-drag:none}
.v-glide{transition:transform .5s ${EASE}}
.v-spot{position:absolute;border-radius:calc(4px/var(--k,1));outline:calc(2.5px/var(--k,1)) solid var(--accent);box-shadow:0 0 0 400vmax color-mix(in oklch,var(--n-0) 72%,transparent);pointer-events:none;transition:left .5s ${EASE},top .5s ${EASE},width .5s ${EASE},height .5s ${EASE}}
:root[data-theme="dark"] .v-spot{box-shadow:0 0 0 400vmax color-mix(in oklch,var(--n-950) 58%,transparent)}
.v-foot{display:grid;gap:var(--s-2);padding:var(--s-3) var(--s-4);border-top:1px solid var(--line)}
.v-walk{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s-2)}
.v-choices,.v-zoom,.v-pan{display:flex;gap:3px}
.v-choices .btn{min-width:2rem;padding:0 var(--s-2)}
.v-choices .btn[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.v-count{margin-left:auto;font:600 .875rem var(--font-display);color:var(--muted);font-variant-numeric:tabular-nums}
.v-note{min-height:3.1em;max-inline-size:75ch;font-size:.9375rem;line-height:1.55}
.v-tools{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s-2) var(--s-4)}
.v-zoom .btn,.v-pan .btn{min-width:2.25rem;font-size:.875rem}
.v-hint{font-size:.75rem;color:var(--muted)}
.viewer .btn:disabled{opacity:.35}
@media (max-width:40rem){.viewer{width:100%;height:100%;border-radius:0;border:0}.v-head{padding:var(--s-2) var(--s-3)}.v-foot{padding:var(--s-2) var(--s-3) calc(var(--s-2) + env(safe-area-inset-bottom,0px))}.v-pan,.v-hint{display:none}.v-note{font-size:.875rem;min-height:4.6em}}
@media (prefers-reduced-motion:reduce){.viewer[open],.v-glide,.v-spot{animation:none;transition:none}}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

let dialog: HTMLDialogElement | null = null;
let surface: HTMLDivElement;
let content: HTMLDivElement;
let img: HTMLImageElement;
let spot: HTMLDivElement;
let no: HTMLParagraphElement;
let title: HTMLHeadingElement;
let note: HTMLParagraphElement;
let count: HTMLOutputElement;
let choices: HTMLDivElement;
let walkBar: HTMLDivElement;

let fig: ViewerFigure;
let opener: HTMLElement | null = null;
let step = -1;
let zoom = 1;
let x = 0;
let y = 0;
let fit = 1;
let w = 1;
let h = 1;
let vw = 1;
let vh = 1;
let raf = 0;
let glideTimer = 0;
let pushed = false;
/** Set while our own history.back() is in flight, so its popstate is not taken for the reader's Back. */
let selfPop = false;
const pointers = new Map<number, { x: number; y: number }>();
let gesture: { d: number; mx: number; my: number; z: number; x: number; y: number } | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function btn(label: string, action: string, aria = '', cls = 'btn sm'): HTMLButtonElement {
  const b = el('button', cls, label);
  b.type = 'button';
  b.dataset.v = action;
  if (aria) b.setAttribute('aria-label', aria);
  return b;
}
const $ = (action: string) => dialog!.querySelector<HTMLButtonElement>(`[data-v="${action}"]`)!;

function build(): HTMLDialogElement {
  document.head.append(el('style', '', CSS));
  const d = el('dialog', 'viewer');
  d.setAttribute('aria-labelledby', 'v-title');
  const head = el('header', 'v-head');
  const names = el('div');
  no = el('p', 'cap v-no');
  title = el('h2');
  title.id = 'v-title';
  names.append(no, title);
  head.append(names, btn('Back to article', 'close', '', 'btn v-close'));

  surface = el('div', 'v-surface');
  surface.tabIndex = 0;
  surface.setAttribute('role', 'region');
  surface.setAttribute('aria-label', 'Figure. Plus and minus zoom, arrow keys pan, 0 fits.');
  content = el('div', 'v-content');
  img = el('img');
  img.decoding = 'async';
  img.draggable = false;
  spot = el('div', 'v-spot');
  spot.hidden = true;
  content.append(img, spot);
  surface.append(content);

  const foot = el('div', 'v-foot');
  walkBar = el('div', 'v-walk');
  walkBar.setAttribute('role', 'group');
  walkBar.setAttribute('aria-label', 'Walkthrough');
  choices = el('div', 'v-choices');
  count = el('output', 'v-count');
  walkBar.append(btn('← Previous', 'prev'), choices, btn('Next →', 'next'), count);
  note = el('p', 'v-note');
  note.setAttribute('aria-live', 'polite');
  const tools = el('div', 'v-tools');
  const zoomBar = el('div', 'v-zoom');
  zoomBar.append(btn('−', 'out', 'Zoom out'), btn('Fit', 'fit'), btn('+', 'in', 'Zoom in'));
  const pan = el('div', 'v-pan');
  for (const [a, label] of [['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→']]) pan.append(btn(label, a, `Pan ${a}`));
  tools.append(zoomBar, pan, el('p', 'v-hint', 'Ctrl + scroll or pinch to zoom · drag to pan'));
  foot.append(walkBar, note, tools);
  d.append(head, surface, foot);
  document.body.append(d);

  d.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLElement>('[data-v]')?.dataset.v;
    if (!a) return;
    if (a === 'close') shut();
    else if (a === 'prev' || a === 'next') go(step + (a === 'next' ? 1 : -1));
    else if (a.startsWith('step:')) go(+a.slice(5));
    else if (a === 'fit') reset(true);
    else if (a === 'in' || a === 'out') scale(zoom * (a === 'in' ? 1.35 : 1 / 1.35), 0, 0, true);
    else {
      x += a === 'left' ? NUDGE : a === 'right' ? -NUDGE : 0;
      y += a === 'up' ? NUDGE : a === 'down' ? -NUDGE : 0;
      glide();
      paint();
    }
  });
  // Escape closes through shut() too, so the page is restored at once (the close event is async).
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    shut();
  });
  d.addEventListener('close', restore);

  surface.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || !e.cancelable) return;
      e.preventDefault();
      const [cx, cy] = at(e);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
      scale(zoom * Math.exp(-clamp(e.deltaY * unit, -240, 240) * 0.004), cx, cy);
    },
    { passive: false },
  );
  surface.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    content.classList.remove('v-glide');
    const [px, py] = at(e);
    pointers.set(e.pointerId, { x: px, y: py });
    surface.setPointerCapture(e.pointerId);
    rebase();
  });
  surface.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    const [px, py] = at(e);
    pointers.set(e.pointerId, { x: px, y: py });
    const ps = [...pointers.values()];
    if (ps.length > 1 && gesture.d) {
      const mx = (ps[0].x + ps[1].x) / 2;
      const my = (ps[0].y + ps[1].y) / 2;
      zoom = clamp((gesture.z * Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y)) / gesture.d, 1, MAX);
      const r = zoom / gesture.z;
      x = mx - (gesture.mx - gesture.x) * r;
      y = my - (gesture.my - gesture.y) * r;
    } else if (ps.length === 1) {
      x = gesture.x + ps[0].x - gesture.mx;
      y = gesture.y + ps[0].y - gesture.my;
    }
    surface.classList.add('dragging');
    paint();
  });
  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (!pointers.size) surface.classList.remove('dragging');
    rebase();
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) surface.addEventListener(type, end);
  surface.addEventListener('dblclick', (e) => {
    const [cx, cy] = at(e);
    if (zoom > 1.01) reset(true);
    else scale(2.5, cx, cy, true);
  });
  surface.addEventListener('keydown', (e) => {
    const map: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '+': 'in', '=': 'in', '-': 'out', '0': 'fit' };
    const a = map[e.key];
    if (!a || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    $(a).click();
  });
  new ResizeObserver(() => {
    if (!d.open || (surface.clientWidth === vw && surface.clientHeight === vh)) return;
    measure();
    if (step >= 0) frame(false);
    else paint();
  }).observe(surface);
  addEventListener('popstate', () => {
    if (selfPop) return void (selfPop = false);
    if (!d.open) return;
    pushed = false;
    shut();
  });
  addEventListener('pagehide', shut);
  return d;
}

/** Close the viewer and give the page back. */
function shut(): void {
  if (!dialog?.open) return;
  dialog.close();
  restore();
}

/** Runs once per opening: unlock the page, return focus, drop the history entry the viewer added. */
function restore(): void {
  if (!document.documentElement.classList.contains('v-open')) return;
  pointers.clear();
  gesture = null;
  cancelAnimationFrame(raf);
  raf = 0;
  document.documentElement.classList.remove('v-open');
  opener?.focus({ preventScroll: true });
  if (pushed) {
    pushed = false;
    selfPop = true;
    history.back();
  }
}

/** Pointer position relative to the surface centre. */
function at(e: MouseEvent): [number, number] {
  const r = surface.getBoundingClientRect();
  return [e.clientX - r.left - vw / 2, e.clientY - r.top - vh / 2];
}

function rebase(): void {
  const ps = [...pointers.values()];
  gesture =
    ps.length > 1
      ? { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), mx: (ps[0].x + ps[1].x) / 2, my: (ps[0].y + ps[1].y) / 2, z: zoom, x, y }
      : ps.length
        ? { d: 0, mx: ps[0].x, my: ps[0].y, z: zoom, x, y }
        : null;
}

/** Lay the figure out at the surface's width, scaled down to fit its height. */
function measure(): void {
  vw = surface.clientWidth;
  vh = surface.clientHeight;
  w = Math.max(1, vw - 2 * PAD);
  h = (w * fig.h) / fig.w;
  content.style.width = `${w}px`;
  content.style.height = `${h}px`;
  fit = Math.min(1, (vh - 2 * PAD) / h);
}

function reset(animate = false): void {
  pointers.clear();
  gesture = null;
  zoom = 1;
  x = y = 0;
  if (animate) glide();
  paint();
}

function scale(value: number, cx: number, cy: number, animate = false): void {
  const next = clamp(value, 1, MAX);
  const r = next / zoom;
  x = cx - (cx - x) * r;
  y = cy - (cy - y) * r;
  zoom = next;
  if (animate) glide();
  paint();
}

function glide(): void {
  if (reducedMotion()) return;
  content.classList.add('v-glide');
  clearTimeout(glideTimer);
  glideTimer = window.setTimeout(() => content.classList.remove('v-glide'), 560);
}

/** Keep the figure in view, then write the transform on the next frame (or at once with `now`). */
function paint(now = false): void {
  const k = fit * zoom;
  const mx = Math.max(0, (w * k - vw) / 2 + PAD);
  const my = Math.max(0, (h * k - vh) / 2 + PAD);
  x = clamp(x, -mx, mx);
  y = clamp(y, -my, my);
  if (now) {
    cancelAnimationFrame(raf);
    raf = 0;
    apply();
  } else if (!raf)
    raf = requestAnimationFrame(() => {
      raf = 0;
      apply();
    });
}

function apply(): void {
  const s = fit * zoom;
  content.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${s})`;
  content.style.setProperty('--k', String(s));
  $('out').disabled = zoom <= 1;
  $('in').disabled = zoom >= MAX;
}

/** Frame the current step's region: zoom until it fills the view (at most 3×), centred. */
function frame(animate: boolean): void {
  const [rx, ry, rw, rh] = fig.steps[step].region;
  zoom = clamp(Math.min((vw - 4 * PAD) / (rw * w * fit), (vh - 4 * PAD) / (rh * h * fit)), 1, 3);
  x = -(rx + rw / 2 - 0.5) * w * fit * zoom;
  y = -(ry + rh / 2 - 0.5) * h * fit * zoom;
  if (animate) glide();
  paint();
}

function go(i: number): void {
  const n = fig.steps.length;
  step = clamp(i, 0, n - 1);
  const s = fig.steps[step];
  const [rx, ry, rw, rh] = s.region;
  Object.assign(spot.style, { left: `${rx * 100}%`, top: `${ry * 100}%`, width: `${rw * 100}%`, height: `${rh * 100}%` });
  spot.hidden = false;
  note.textContent = s.note;
  count.textContent = `${step + 1} / ${n}`;
  $('prev').disabled = step === 0;
  $('next').disabled = step === n - 1;
  [...choices.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === step)));
  frame(true);
}

/** Open `figure`; with `walk`, start its walkthrough at the first step. Focus returns to `by` on close. */
export function openViewer(figure: ViewerFigure, by: HTMLElement, walk = false): void {
  dialog ??= build();
  if (dialog.open) return;
  fig = figure;
  opener = by;
  no.textContent = figure.no;
  title.textContent = figure.title;
  img.alt = figure.alt;
  img.width = figure.w;
  img.height = figure.h;
  content.style.backgroundImage = figure.preview ? `url("${figure.preview}")` : '';
  if (img.getAttribute('src') !== figure.src) img.src = figure.src;
  const walking = walk && figure.steps.length > 0;
  walkBar.hidden = !walking;
  choices.replaceChildren(...figure.steps.map((_, i) => btn(String(i + 1), `step:${i}`, `Step ${i + 1}`)));
  step = -1;
  spot.hidden = true;
  note.textContent = '';
  note.hidden = !walking;
  dialog.classList.toggle('walking', walking);
  dialog.showModal();
  document.documentElement.classList.add('v-open');
  history.pushState({ viewer: 1 }, '');
  pushed = true;
  measure();
  content.classList.remove('v-glide');
  zoom = 1;
  x = y = 0;
  paint(true);
  void content.offsetWidth; // commit the fitted frame so the first step glides in from it
  if (walking) {
    go(0);
    $('next').focus();
  } else surface.focus({ preventScroll: true });
}
