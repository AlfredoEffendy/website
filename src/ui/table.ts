// The data table behind each chart. Loaded only when a Data drawer is first opened.
// Rows render a page at a time, in batches as the reader scrolls, so even the largest file never puts
// more than one page in the DOM.
import { argsort } from '../core/sort';
import './table.css';

export interface Column {
  key: string;
  label: string;
  get(row: number): number | string;
  format?(v: number): string;
  /** Present when the cell can be edited; values are clamped to these bounds. */
  edit?: { min?: number; max?: number; integer?: boolean };
}

export interface Filter {
  label: string;
  test(row: number): boolean;
}

export interface DataSource {
  name: string;
  columns: Column[];
  count(): number;
  /** Write an edited value; the lab recomputes its statistics and redraws. */
  set?(row: number, key: string, value: number): void;
  edited?(): boolean;
  /** Put the edited rows back to what the simulation produced. */
  restore?(): void;
  /** Ready-made filters offered as chips. */
  chips?(): Filter[];
  /** A row was chosen in the table: highlight it on the chart. */
  onSelect?(row: number | null): void;
}

export interface DataTable {
  refresh(): void;
  filter(f: Filter | null): void;
  /** Bring a row into view and mark it. */
  select(row: number | null): void;
  show(source: number): void;
}

const PAGE = 100;
const BATCH = 25;

export function dataTable(host: HTMLElement, sources: DataSource[]): DataTable {
  let src = sources[0];
  let filter: Filter | null = null;
  let sort: { col: number; dir: 1 | -1 } | null = null;
  let view = new Uint32Array(0);
  let page = 0;
  let rendered = 0;
  let selected: number | null = null;

  host.innerHTML =
    '<div class="data-bar"><div class="data-chips"></div><span class="data-info" aria-live="polite"></span><button class="btn sm" type="button" data-act="restore" hidden>Restore</button></div>' +
    '<table class="data-table"><thead></thead><tbody></tbody></table><div class="data-more" aria-hidden="true"></div>' +
    '<div class="data-pager"><button class="btn sm" type="button" data-act="prev">Prev</button><span></span><button class="btn sm" type="button" data-act="next">Next</button></div>';
  const chips = host.querySelector<HTMLElement>('.data-chips')!;
  const info = host.querySelector<HTMLElement>('.data-info')!;
  const restore = host.querySelector<HTMLButtonElement>('[data-act="restore"]')!;
  const thead = host.querySelector('thead')!;
  const tbody = host.querySelector('tbody')!;
  const more = host.querySelector<HTMLElement>('.data-more')!;
  const pager = host.querySelector<HTMLElement>('.data-pager')!;
  const pagerText = pager.querySelector('span')!;

  const cell = (c: Column, row: number): string => {
    const v = c.get(row);
    const text = typeof v === 'number' ? (c.format ? c.format(v) : String(v)) : v;
    if (!c.edit || typeof v !== 'number') return `<td>${text}</td>`;
    const { min, max, integer } = c.edit;
    return `<td><input class="cell" type="number" inputmode="decimal" value="${Number.isNaN(v) ? '' : +v.toFixed(4)}" step="${integer ? 1 : 'any'}"${
      min !== undefined ? ` min="${min}"` : ''
    }${max !== undefined ? ` max="${max}"` : ''} data-key="${c.key}" aria-label="${c.label}, row ${row + 1}"></td>`;
  };

  /** Rows that pass the filter, in the chosen order. Rebuilt only when either changes. */
  function build(): void {
    const n = src.count();
    let rows = new Uint32Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) if (!filter || filter.test(i)) rows[k++] = i;
    if (k < n) rows = rows.slice(0, k);
    if (sort) {
      const { get } = src.columns[sort.col];
      if (k && typeof get(rows[0]) === 'string') {
        const dir = sort.dir;
        rows.sort((a, b) => String(get(a)).localeCompare(String(get(b))) * dir || a - b);
      } else {
        // Numbers: radix sort, linear time, and blank cells always sort last.
        const values = new Float64Array(n);
        for (let i = 0; i < k; i++) values[rows[i]] = +get(rows[i]);
        rows = argsort(values, rows, sort.dir === -1);
      }
    }
    view = rows;
    page = Math.min(page, Math.max(0, Math.ceil(view.length / PAGE) - 1));
  }

  /** Append the next batch of the current page; called again as the sentinel scrolls into view. */
  function append(): void {
    const end = Math.min(view.length, (page + 1) * PAGE);
    const from = page * PAGE + rendered;
    if (from >= end) return;
    const to = Math.min(end, from + BATCH);
    let html = '';
    for (let i = from; i < to; i++) {
      const row = view[i];
      html += `<tr data-row="${row}"${row === selected ? ' class="sel"' : ''}>${src.columns.map((c) => cell(c, row)).join('')}</tr>`;
    }
    tbody.insertAdjacentHTML('beforeend', html);
    rendered += to - from;
    more.hidden = from + (to - from) >= end;
  }

  function draw(): void {
    thead.innerHTML = `<tr>${src.columns
      .map((c, i) => {
        const dir = sort?.col === i ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none';
        return `<th aria-sort="${dir}"><button type="button" data-sort="${i}">${c.label}<span aria-hidden="true">${dir === 'ascending' ? ' ▲' : dir === 'descending' ? ' ▼' : ''}</span></button></th>`;
      })
      .join('')}</tr>`;
    tbody.innerHTML = '';
    rendered = 0;
    append();

    const total = src.count();
    const pages = Math.max(1, Math.ceil(view.length / PAGE));
    pager.hidden = pages < 2;
    pagerText.textContent = `Page ${page + 1} of ${pages}`;
    pager.querySelector<HTMLButtonElement>('[data-act="prev"]')!.disabled = page === 0;
    pager.querySelector<HTMLButtonElement>('[data-act="next"]')!.disabled = page >= pages - 1;
    info.textContent = filter
      ? `${view.length.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} rows`
      : `${total.toLocaleString('en-US')} rows`;
    restore.hidden = !src.edited?.();

    const quick = src.chips?.() ?? [];
    chips.innerHTML =
      (sources.length > 1
        ? sources.map((s, i) => `<button class="chip" type="button" data-source="${i}" aria-pressed="${s === src}">${s.name}</button>`).join('')
        : '') +
      quick.map((f, i) => `<button class="chip" type="button" data-chip="${i}" aria-pressed="${filter?.label === f.label}">${f.label}</button>`).join('') +
      (filter && !quick.some((f) => f.label === filter!.label)
        ? `<button class="chip" type="button" data-chip="clear" aria-pressed="true">${filter.label} ✕</button>`
        : '');
  }

  const refresh = (): void => {
    build();
    draw();
  };

  host.addEventListener('click', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('button, tr[data-row]');
    if (!t) return;
    if (t.dataset.sort !== undefined) {
      const col = +t.dataset.sort;
      sort = sort?.col !== col ? { col, dir: 1 } : sort.dir === 1 ? { col, dir: -1 } : null;
      refresh();
    } else if (t.dataset.source !== undefined) api.show(+t.dataset.source);
    else if (t.dataset.chip !== undefined) {
      const quick = src.chips?.() ?? [];
      const f = t.dataset.chip === 'clear' ? null : quick[+t.dataset.chip];
      api.filter(f && filter?.label === f.label ? null : f);
    } else if (t.dataset.act === 'prev' || t.dataset.act === 'next') {
      page += t.dataset.act === 'next' ? 1 : -1;
      draw();
      host.scrollIntoView({ block: 'nearest' });
    } else if (t.dataset.act === 'restore') {
      src.restore?.();
      refresh();
    } else if (t.dataset.row !== undefined && !(e.target as Element).closest('input')) {
      const row = +t.dataset.row;
      selected = selected === row ? null : row;
      tbody.querySelectorAll('.sel').forEach((el) => el.classList.remove('sel'));
      if (selected !== null) t.classList.add('sel');
      src.onSelect?.(selected);
    }
  });

  // Edits commit when the field loses focus or Enter is pressed, never per keystroke.
  host.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.classList.contains('cell') || !src.set) return;
    const row = +input.closest('tr')!.dataset.row!;
    const col = src.columns.find((c) => c.key === input.dataset.key)!;
    let v = parseFloat(input.value);
    if (!Number.isFinite(v)) {
      input.value = String(col.get(row));
      return;
    }
    if (col.edit!.integer) v = Math.round(v);
    v = Math.min(col.edit!.max ?? Infinity, Math.max(col.edit!.min ?? -Infinity, v));
    src.set(row, col.key, v);
    // Refresh this row's computed cells in place, so focus and scroll position are kept.
    const tr = input.closest('tr')!;
    src.columns.forEach((c, i) => {
      if (c.key !== col.key) tr.children[i].outerHTML = cell(c, row);
    });
    input.value = String(v);
    restore.hidden = !src.edited?.();
  });
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as Element).classList.contains('cell')) (e.target as HTMLInputElement).blur();
  });

  new IntersectionObserver((entries) => entries[0].isIntersecting && append(), { rootMargin: '200px' }).observe(more);

  const api: DataTable = {
    refresh,
    filter(f) {
      filter = f;
      page = 0;
      refresh();
    },
    select(row) {
      selected = row;
      if (row !== null) {
        const at = view.indexOf(row);
        if (at >= 0) {
          page = Math.floor(at / PAGE);
          draw();
          while (page * PAGE + rendered <= at) append();
        }
      }
      tbody.querySelectorAll('.sel').forEach((el) => el.classList.remove('sel'));
      tbody.querySelector(`tr[data-row="${row}"]`)?.classList.add('sel');
    },
    show(i) {
      src = sources[i];
      filter = null;
      sort = null;
      page = 0;
      selected = null;
      refresh();
    },
  };
  refresh();
  return api;
}
