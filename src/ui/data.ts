import type { Scope } from './dom';
import type { DataSource, DataTable, Filter } from './table';

export type { Column, DataSource, Filter } from './table';

export interface DataLink {
  /** Re-read the rows after the lab's data changed. Free while the drawer is closed. */
  refresh(): void;
  /** Change the filter if the drawer is open (used when a selection is cleared). */
  filter(f: Filter | null): void;
  /** Open the drawer on one source, optionally filtered or with a row marked. */
  open(opts?: { source?: number; filter?: Filter | null; row?: number | null }): void;
}

/**
 * Wire a lab's Data drawer. The table code is fetched the first time the drawer opens, so
 * labs that never look at their rows never pay for it.
 */
export function bindData(s: Scope, sources: DataSource[]): DataLink {
  const drawer = s.$<HTMLDetailsElement>('data');
  const body = s.$('dataBody');
  let table: DataTable | null = null;
  let loading: Promise<DataTable> | null = null;

  const load = (): Promise<DataTable> =>
    (loading ??= import('./table').then((m) => (table = m.dataTable(body, sources))));

  drawer.addEventListener('toggle', () => {
    if (drawer.open) load().then((t) => t.refresh());
  });
  // A link can ask for the rows to be showing (?data=1).
  if (new URL(location.href).searchParams.get('data') === '1') drawer.open = true;

  return {
    refresh() {
      if (drawer.open) table?.refresh();
    },
    filter(f) {
      if (drawer.open) table?.filter(f);
    },
    open({ source, filter, row } = {}) {
      const wasOpen = drawer.open;
      drawer.open = true;
      load().then((t) => {
        if (source !== undefined) t.show(source);
        if (filter !== undefined) t.filter(filter);
        if (row !== undefined) t.select(row);
        if (!wasOpen || filter !== undefined) guideTo(drawer);
      });
    },
  };
}

// ---- "something new below" guide -------------------------------------------------------------
// A soft glow at the bottom edge instead of a toast: no words, gone as soon as the reader arrives.
let glow: HTMLElement | null = null;
let live: HTMLElement | null = null;
let watcher: IntersectionObserver | null = null;
let timer = 0;

export function guideTo(target: Element): void {
  const dock = matchMedia('(max-width: 52rem)').matches
    ? (document.querySelector<HTMLElement>(`#panel-${document.documentElement.dataset.lab} .inputs`)?.offsetHeight ?? 0)
    : 0;
  const edge = dock + 96;
  if (target.getBoundingClientRect().top < innerHeight - edge) return; // already in view
  if (!glow) {
    glow = document.createElement('div');
    glow.className = 'glow';
    glow.setAttribute('aria-hidden', 'true');
    live = document.createElement('p');
    live.className = 'sr';
    live.setAttribute('role', 'status');
    document.body.append(glow, live);
  }
  live!.textContent = 'Data loaded below the chart.';
  const stop = () => {
    live!.textContent = '';
    glow!.classList.remove('on');
    watcher?.disconnect();
    clearTimeout(timer);
  };
  stop();
  requestAnimationFrame(() => glow!.classList.add('on'));
  watcher = new IntersectionObserver((entries) => entries[0].isIntersecting && stop(), { rootMargin: `0px 0px -${edge}px 0px` });
  watcher.observe(target);
  timer = window.setTimeout(stop, 6000);
}
