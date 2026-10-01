export const reducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** DOM helpers bound to one lab. Every lab's elements carry its slug as an id prefix. */
export interface Scope {
  slug: string;
  panel: HTMLElement;
  $<T extends HTMLElement = HTMLElement>(id: string): T;
  /** Read a number field, clamp it to its declared range, and write the clean value back. */
  num(id: string, fallback: number, integer?: boolean): number;
  setText(id: string, text: string): void;
  on(id: string, fn: () => void, ev?: string): void;
  /** Mark the lab as live: removes the loading shimmer. */
  ready(): void;
}

export function scope(slug: string): Scope {
  const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
    document.getElementById(`${slug}-${id}`) as T;
  const panel = document.getElementById(`panel-${slug}`)!;
  return {
    slug,
    panel,
    $,
    num(id, fallback, integer = false) {
      const el = $<HTMLInputElement>(id);
      let v = parseFloat(el.value);
      if (!Number.isFinite(v)) v = fallback;
      if (integer) v = Math.round(v);
      const min = el.min === '' ? -Infinity : +el.min;
      const max = el.max === '' ? Infinity : +el.max;
      v = Math.min(max, Math.max(min, v));
      if (String(v) !== el.value) el.value = String(v);
      return v;
    },
    setText(id, text) {
      const el = $(id);
      if (el.textContent !== text) el.textContent = text;
    },
    on: (id, fn, ev = 'click') => $(id).addEventListener(ev, fn),
    ready: () => panel.classList.add('ready'),
  };
}

/** Fixed decimals with a real minus sign. */
export function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—';
  const s = x.toFixed(digits);
  return (s.startsWith('-') ? '−' + s.slice(1) : s).replace(/^−(0\.?0*)$/, '$1');
}

/** Compact number for axis labels and slots: no trailing zeros. */
export function tidy(x: number, maxDigits = 3): string {
  if (!Number.isFinite(x)) return '—';
  const s = String(+x.toFixed(maxDigits));
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

export const int = (x: number): string => Math.round(x).toLocaleString('en-US');

export const pct = (x: number, digits = 1): string => fmt(100 * x, digits) + '%';

export function pValue(p: number): string {
  return p < 0.0001 ? '< 0.0001' : fmt(p, 4);
}

/** A p-value as a phrase: "p = 0.0312" or "p < 0.0001". */
export const pPhrase = (p: number): string => (p < 0.0001 ? '<i>p</i> < <b>0.0001</b>' : `<i>p</i> = <b>${fmt(p, 4)}</b>`);

export const clockTime = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour12: false });

/** Show the one child of `host` whose data-for matches `key`; hide the others. */
export function showFor(host: ParentNode, key: string): void {
  host.querySelectorAll<HTMLElement>('[data-for]').forEach((el) => {
    el.hidden = el.dataset.for !== key;
  });
}
