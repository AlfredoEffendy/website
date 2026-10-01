// Workspace-only chrome: the Σ button as tab-rail control, the phone dock, and viewport fitting.
// Shared chrome (theme, author menu, folding, scroll marker) lives in ./chrome.
import './chrome';

const root = document.documentElement;
const phone = matchMedia('(max-width: 52rem)');

// ---- Σ menu button ---------------------------------------------------------------------------
// Wide screens: folds the tab rail down to icons and back (remembered).
// Phone: opens the tab list as a sheet under the top bar; any choice, outside tap or Escape closes it.
const nav = document.getElementById('nav')!;
const tabs = document.getElementById('tabs')!;
const setNav = (open: boolean) => nav.setAttribute('aria-expanded', String(open));
const syncNav = () => setNav(!phone.matches && root.dataset.rail === 'open');

nav.addEventListener('click', () => {
  const open = nav.getAttribute('aria-expanded') !== 'true';
  setNav(open);
  if (phone.matches) return;
  root.dataset.rail = open ? 'open' : 'mini';
  try {
    localStorage.setItem('rail', root.dataset.rail);
  } catch {
    /* not saved */
  }
});
tabs.addEventListener('click', (e) => {
  if (phone.matches && (e.target as Element).closest('.tab')) setNav(false);
});
addEventListener('pointerdown', (e) => {
  if (phone.matches && !(e.target as Element).closest('#tabs, #nav')) setNav(false);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && phone.matches && nav.getAttribute('aria-expanded') === 'true') {
    setNav(false);
    nav.focus();
  }
});
phone.addEventListener('change', syncNav);
syncNav();

// ---- phone dock ------------------------------------------------------------------------------
// The dock shows one strip of number fields and the actions; θ opens every setting as a sheet.
for (const more of document.querySelectorAll<HTMLElement>('.dock-more')) {
  const dock = more.closest<HTMLElement>('.inputs')!;
  const set = (open: boolean) => {
    dock.toggleAttribute('data-sheet', open);
    more.setAttribute('aria-expanded', String(open));
    if (open) dock.scrollTop = 0;
  };
  more.addEventListener('click', () => set(!dock.hasAttribute('data-sheet')));
  dock.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dock.hasAttribute('data-sheet')) {
      set(false);
      more.focus();
    }
    // Enter commits a number and puts the on-screen keyboard away.
    if (e.key === 'Enter' && (e.target as Element).matches('input[type="number"]')) (e.target as HTMLElement).blur();
  });
}

// ---- viewport fitting --------------------------------------------------------------------------
// Decides how much can stay pinned: everything on a tall phone, less with the keyboard up,
// nothing when the reader has pinch-zoomed. Also tells the data table where its sticky bar sits.
const vv = window.visualViewport;
let queued = 0;
function fit(): void {
  queued = 0;
  const rem = parseFloat(getComputedStyle(root).fontSize);
  const zoomed = !!vv && vv.scale > 1.05;
  const h = vv && !zoomed ? vv.height : innerHeight;
  const tier = zoomed || h < 20 * rem ? 'free' : h < 30 * rem ? 'short' : 'tall';
  root.dataset.fit = tier;
  if (tier === 'short') root.style.setProperty('--vvh', `${h}px`);
  else root.style.removeProperty('--vvh');
  const top = vv && !zoomed ? Math.max(0, vv.offsetTop) : 0;
  root.style.setProperty('--vv-top', `${top}px`);
  // A folded chart sits at the top of the screen; the data table's sticky bar goes just under it.
  const folded = document.querySelector<HTMLElement>(`#panel-${root.dataset.lab} .figure.collapsed`);
  root.style.setProperty('--pin', `${folded ? folded.offsetHeight : 0}px`);
}
const refit = () => {
  queued ||= requestAnimationFrame(fit);
};
vv?.addEventListener('resize', refit);
vv?.addEventListener('scroll', refit);
addEventListener('resize', refit);
addEventListener('labchange', refit);
addEventListener('figurefold', refit);
refit();
