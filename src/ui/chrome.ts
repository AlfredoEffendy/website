// Chrome shared by every page: following the system's light/dark setting, chart folding, and the scroll
// marker. The initial theme is set before first paint by a tiny inline script in <head>.
import { scrollMark } from './scroll';

const root = document.documentElement;

// ---- theme ---------------------------------------------------------------------------------
// Pages follow the system setting (?theme= in the address overrides it, for testing). Charts redraw on
// 'themechange'.
const dark = matchMedia('(prefers-color-scheme: dark)');
dark.addEventListener('change', () => {
  if (new URLSearchParams(location.search).has('theme')) return;
  root.dataset.theme = dark.matches ? 'dark' : 'light';
  dispatchEvent(new Event('themechange'));
});

// ---- chart folding -------------------------------------------------------------------------------
addEventListener('click', (e) => {
  const fold = (e.target as Element).closest<HTMLElement>('.fig-fold');
  if (!fold) return;
  const open = fold.closest('.figure')!.classList.toggle('collapsed') === false;
  fold.setAttribute('aria-expanded', String(open));
  fold.setAttribute('aria-label', open ? 'Hide chart' : 'Show chart');
  dispatchEvent(new Event('figurefold'));
});

scrollMark();
