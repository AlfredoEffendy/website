import { randomSeed } from '../core/rng';
import type { Scope } from './dom';

type Control = HTMLInputElement | HTMLSelectElement;

/** Each lab registers how to write its settings into the address bar; the router calls it on a tab switch. */
export const syncers: Record<string, () => void> = {};

export interface LabState {
  /**
   * Mirror the lab's settings into the query string so a link reproduces the setup.
   * `ids` are control ids; radio groups are given as "name:<group>". Only values that differ
   * from the page defaults are written, so a default setup has a clean URL.
   */
  bindParams(ids: string[], onChange: (id: string) => void): void;
  /** Re-write the query string after the script itself changes a control. */
  sync(): void;
  radio(name: string): string;
  checked(id: string): boolean;
  /** Current seed (any integer; blank falls back to the default). */
  seed(): number;
  /** Wire the "New seed" button: pick a seed, show it, and rerun. */
  bindNewSeed(rerun: () => void): void;
}

export function labState(s: Scope): LabState {
  const radios = (name: string) =>
    document.querySelectorAll<HTMLInputElement>(`input[name="${s.slug}-${name}"]`);
  const radio = (name: string): string => {
    for (const r of radios(name)) if (r.checked) return r.value;
    return '';
  };
  const isRadio = (id: string) => id.startsWith('name:');
  const key = (id: string) => (isRadio(id) ? id.slice(5) : id);
  const read = (id: string): string => {
    if (isRadio(id)) return radio(key(id));
    const el = s.$<Control>(id);
    return el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
  };
  const write = (id: string, value: string): void => {
    if (isRadio(id)) {
      for (const r of radios(key(id))) r.checked = r.value === value;
      return;
    }
    const el = s.$<Control>(id);
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = value === '1';
    else el.value = value;
  };

  let sync = () => {};
  const state: LabState = {
    bindParams(ids, onChange) {
      const url = new URL(location.href);
      const defaults = new Map<string, string>();
      for (const id of ids) {
        defaults.set(id, read(id));
        const given = url.searchParams.get(key(id));
        if (given !== null) write(id, given);
      }
      sync = () => {
        const next = new URL(location.href);
        for (const id of ids) {
          const v = read(id);
          if (v === defaults.get(id)) next.searchParams.delete(key(id));
          else next.searchParams.set(key(id), v);
        }
        history.replaceState(null, '', next);
      };
      syncers[s.slug] = sync;
      for (const id of ids) {
        const targets = isRadio(id) ? Array.from(radios(key(id))) : [s.$<Control>(id)];
        for (const el of targets)
          el.addEventListener('change', () => {
            onChange(id);
            sync();
          });
      }
    },
    sync: () => sync(),
    radio,
    checked: (id) => s.$<HTMLInputElement>(id).checked,
    seed() {
      const el = s.$<HTMLInputElement>('seed');
      const v = parseInt(el.value, 10);
      if (Number.isFinite(v)) return v;
      el.value = el.defaultValue;
      return +el.defaultValue;
    },
    bindNewSeed(rerun) {
      s.on('newSeed', () => {
        s.$<HTMLInputElement>('seed').value = String(randomSeed());
        sync();
        rerun();
      });
    },
  };
  return state;
}
