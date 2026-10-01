// App shell: tab switching, lazy lab loading, and the address bar.
import './ui/shell';
import * as discrete from './labs/discrete';
import { reducedMotion } from './ui/dom';
import { flushPlots } from './ui/plot';
import { syncers } from './ui/state';

interface Lab {
  init(): void;
}

// The first lab ships with the page; the rest arrive on demand and are warmed when the page is idle.
const loaders: Record<string, () => Promise<Lab>> = {
  discrete: () => Promise.resolve(discrete),
  continuous: () => import('./labs/continuous'),
  'clt-mean': () => import('./labs/clt-mean'),
  'clt-proportion': () => import('./labs/clt-proportion'),
  'confidence-intervals': () => import('./labs/confidence-intervals'),
  regression: () => import('./labs/regression'),
  data: () => import('./labs/data'),
};
/** Loaded on demand only: never warmed in the background. */
const HEAVY = new Set(['data']);
const DEFAULT = 'discrete';
const root = document.documentElement;
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const started = new Set<string>();
let active = '';
let request = 0;

const wait = (ms: number) => new Promise<null>((resolve) => setTimeout(resolve, ms, null));
const slugFromUrl = (): string => {
  const lab = new URL(location.href).searchParams.get('lab') ?? DEFAULT;
  return lab in loaders ? lab : DEFAULT;
};

/** Show a lab's panel. Its controls and empty chart frame are real markup, so this is instant. */
function show(slug: string): void {
  active = slug;
  root.dataset.lab = slug; // CSS shows the panel and notes whose lab matches this attribute
  for (const tab of tabs) {
    const on = tab.dataset.lab === slug;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  }
  document.title = `${tabs.find((t) => t.dataset.lab === slug)!.dataset.name} · Stats Engine`;
  dispatchEvent(new Event('labchange'));
}

function start(slug: string, lab: Lab): void {
  if (!started.has(slug)) {
    started.add(slug);
    lab.init();
  }
  flushPlots();
}

async function activate(slug: string, animate: boolean): Promise<void> {
  if (slug === active) return;
  const mine = ++request;
  const loading = loaders[slug]();
  // A warm chunk resolves at once and gets the animated swap. A cold one shows its panel
  // straight away; the loading mark fades into the chart frame if the wait becomes noticeable.
  let lab = await Promise.race([loading, wait(120)]);
  if (mine !== request) return;
  if (!lab) {
    show(slug);
    const t0 = performance.now();
    try {
      lab = await loading;
    } catch {
      return retry(slug);
    }
    // Once the mark has appeared (after 280 ms), keep it up long enough to read as deliberate.
    const seen = performance.now() - t0 - 280;
    if (seen > 0 && seen < 400) await wait(400 - seen);
    if (mine !== request) return;
    return start(slug, lab);
  }
  const ready = lab;
  const swap = () => {
    show(slug);
    start(slug, ready);
  };
  if (animate && !reducedMotion() && document.startViewTransition) document.startViewTransition(swap);
  else swap();
}

/** The lab's code did not arrive (offline, or a deploy replaced the file): say so and offer another go. */
function retry(slug: string): void {
  const panel = document.getElementById(`panel-${slug}`)!;
  panel.classList.add('ready');
  const note = document.createElement('p');
  note.className = 'notice';
  note.setAttribute('role', 'alert');
  note.innerHTML = 'This tab did not load. <button class="btn sm" type="button">Retry</button>';
  note.querySelector('button')!.addEventListener('click', () => location.reload());
  panel.querySelector('.output')!.prepend(note);
}

/** A tab click starts from a clean address: only the lab's own settings belong in it. */
function open(slug: string): void {
  if (slug === active) return;
  history.pushState(null, '', slug === DEFAULT ? location.pathname : `?lab=${slug}`);
  activate(slug, true).then(() => syncers[slug]?.());
}

for (const tab of tabs) {
  const slug = tab.dataset.lab!;
  tab.addEventListener('click', () => open(slug));
  // Hovering or focusing a tab fetches its code, so the click that follows is instant.
  const warm = () => void loaders[slug]().catch(() => {});
  tab.addEventListener('pointerenter', warm, { once: true });
  tab.addEventListener('focus', warm, { once: true });
  tab.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(tab);
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? tabs[(i + 1) % tabs.length]
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? tabs[(i - 1 + tabs.length) % tabs.length]
          : e.key === 'Home'
            ? tabs[0]
            : e.key === 'End'
              ? tabs[tabs.length - 1]
              : null;
    if (!next) return;
    e.preventDefault();
    next.focus();
    open(next.dataset.lab!);
  });
}

addEventListener('popstate', () => activate(slugFromUrl(), true));

// The page is already complete as markup. Let the browser paint it, then bring the lab to life,
// and only once everything is quiet fetch the other labs' code.
const afterPaint = (fn: () => void) => requestAnimationFrame(() => setTimeout(fn));
afterPaint(() =>
  activate(slugFromUrl(), false).then(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1200));
    idle(() => Object.keys(loaders).forEach((slug) => HEAVY.has(slug) || loaders[slug]().catch(() => {})), { timeout: 4000 });
  }),
);
