// Chrome shared by every page: theme toggle, the author menu, the Σ lab menu (on pages other than
// the workspace), chart folding, and the scroll marker. The initial theme is set before first paint
// by a tiny inline script in <head>.
import { scrollMark } from './scroll';

const root = document.documentElement;

// ---- theme ---------------------------------------------------------------------------------
const toggle = document.getElementById('theme');
toggle?.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  toggle.setAttribute('aria-pressed', String(dark));
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch {
    /* storage unavailable: the choice simply lasts for this page */
  }
  dispatchEvent(new Event('themechange'));
});
toggle?.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));

// ---- disclosure menus ----------------------------------------------------------------------------
/**
 * A button that shows and hides a menu panel. Clicking outside, choosing a link, Escape, or moving
 * focus past both the button and the panel closes it; Escape returns focus to the button. Not modal:
 * focus is never trapped. Closing waits for the panel's exit animation (none under reduced motion).
 */
export function disclosure(button: HTMLElement, panel: HTMLElement, onChange?: (open: boolean) => void): (open: boolean) => void {
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  let turn = 0;
  const set = (open: boolean) => {
    if (isOpen() === open) return;
    button.setAttribute('aria-expanded', String(open));
    const mine = ++turn;
    if (open) {
      panel.classList.remove('closing');
      panel.hidden = false;
    } else {
      panel.classList.add('closing');
      const done = () => {
        if (mine !== turn) return;
        panel.hidden = true;
        panel.classList.remove('closing');
      };
      Promise.all(panel.getAnimations().map((a) => a.finished)).then(done, () => {});
      setTimeout(done, 400); // a background tab may never finish the animation
    }
    onChange?.(open);
  };
  const within = (node: EventTarget | null) => node instanceof Node && (button.contains(node) || panel.contains(node));
  button.addEventListener('click', () => set(!isOpen()));
  panel.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) set(false);
  });
  addEventListener('pointerdown', (e) => {
    if (isOpen() && !within(e.target)) set(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      set(false);
      button.focus();
    }
  });
  // Tab past the last link (or Shift+Tab back before the button) closes the menu.
  const leave = (e: FocusEvent) => {
    if (isOpen() && e.relatedTarget && !within(e.relatedTarget)) set(false);
  };
  button.addEventListener('focusout', leave);
  panel.addEventListener('focusout', leave);
  return set;
}

// "Alfredo Effendy" → "A.E" while its About Me menu is open (CSS folds the name on aria-expanded).
const authorBtn = document.getElementById('authorBtn');
const authorMenu = document.getElementById('authorMenu');
if (authorBtn && authorMenu) disclosure(authorBtn, authorMenu);

// On pages other than the workspace, Σ opens a plain list of the labs (and turns into ×).
const nav = document.getElementById('nav');
const labMenu = document.getElementById('labmenu');
if (nav && labMenu) disclosure(nav, labMenu);

// ---- logo -------------------------------------------------------------------------------------------
// A click on the Stats Engine mark sends a pulse of light (topbar.css). Already on the workspace's
// default view, it scrolls back to the top instead of reloading the page.
const brand = document.querySelector<HTMLAnchorElement>('.brand');
brand?.addEventListener('click', (e) => {
  brand.classList.remove('pulse');
  void brand.offsetWidth; // restart the animation on repeated clicks
  brand.classList.add('pulse');
  const here = new URL(brand.href, location.href);
  if (here.pathname === location.pathname && !location.search && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
    e.preventDefault();
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
});
brand?.addEventListener('animationend', (e) => {
  if (e.animationName === 'bm-pulse') brand.classList.remove('pulse');
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
