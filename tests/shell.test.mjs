import { describe, expect, it } from 'vitest';
import { ICON, ROUTES, SITE_URL, THEME_BOOT, head, labHref, topbar } from '../tools/shell.mjs';

describe('link previews and the browser tab', () => {
  const html = head({ title: 'C.V. · Alfredo Effendy', description: 'd', style: '', root: '../', path: 'cv/index.html' });

  it('name the site after the author and point at the page\'s public address', () => {
    expect(SITE_URL).toBe('https://alfredoeffendy.github.io/website/');
    expect(html).toContain('<meta property="og:site_name" content="Alfredo Effendy">');
    expect(html).toContain('<meta property="og:url" content="https://alfredoeffendy.github.io/website/cv/">');
    expect(html).toContain('<link rel="canonical" href="https://alfredoeffendy.github.io/website/cv/">');
  });

  it('show the author\'s photo as the preview image', () => {
    expect(html).toContain('<meta property="og:image" content="https://alfredoeffendy.github.io/website/img/alfredo-effendy-og.jpg">');
  });

  it('use the author\'s initials as the icon, not the Stats Engine bell', () => {
    const svg = decodeURIComponent(ICON);
    expect(svg).toContain('>AE<');
    expect(svg).not.toContain('M4 24c5');
  });
});

/** Runs the boot script with a given address, system setting and saved choice; returns data-theme. */
function bootTheme({ search = '', systemDark = false, saved = null }) {
  const documentElement = { dataset: {} };
  const localStorage = { getItem: () => saved };
  new Function('document', 'location', 'matchMedia', 'localStorage', THEME_BOOT)(
    { documentElement },
    { search },
    () => ({ matches: systemDark }),
    localStorage,
  );
  return documentElement.dataset.theme;
}

describe('theme before first paint', () => {
  it('follows the system setting and ignores a choice saved by the old theme button', () => {
    expect(bootTheme({ systemDark: true, saved: 'light' })).toBe('dark');
    expect(bootTheme({ systemDark: false, saved: 'dark' })).toBe('light');
  });
  it('lets ?theme= in the address override the system (for testing)', () => {
    expect(bootTheme({ search: '?theme=dark' })).toBe('dark');
    expect(bootTheme({ search: '?theme=light', systemDark: true })).toBe('light');
  });
});

describe('labHref', () => {
  it('points into stats-engine/, with the default lab at the bare address', () => {
    expect(ROUTES.labs).toBe('stats-engine/');
    expect(labHref('../')).toBe('../stats-engine/');
    expect(labHref('./', 'discrete')).toBe('./stats-engine/');
    expect(labHref('./', 'regression')).toBe('./stats-engine/?lab=regression');
  });
});

describe('topbar', () => {
  it('shows the name and five plain links, marking the current page', () => {
    const html = topbar({ root: '../', current: 'research' });
    expect(html).toContain('<a class="brand" href="../">Alfredo Effendy</a>');
    const links = [...html.matchAll(/<li><a href="([^"]*)"( aria-current="page")?>([^<]+)<\/a><\/li>/g)].map((m) => [m[1], m[3], Boolean(m[2])]);
    expect(links).toEqual([
      ['../', 'Home', false],
      ['../cv/', 'C.V.', false],
      ['../research/', 'Research', true],
      ['../teaching/', 'Teaching', false],
      ['../stats-engine/', 'Stats Engine', false],
    ]);
    expect(html).not.toMatch(/menuBtn|toolsBtn|id="theme"|id="nav"|tagline/);
  });

  it('marks Home on the home page', () => {
    expect(topbar({ root: './', current: 'home' })).toContain('<li><a href="./" aria-current="page">Home</a></li>');
  });

  it('keeps the Σ rail button on Stats Engine, with a heading for screen readers', () => {
    const html = topbar({ root: '../', current: 'labs', lab: true });
    expect(html).toContain('id="nav"');
    expect(html).toContain('<h1 class="sr">Stats Engine</h1>');
    expect(html).toContain('<li><a href="../stats-engine/" aria-current="page">Stats Engine</a></li>');
  });
});

describe('footer', () => {
  it('is gone: shell.mjs no longer offers one', async () => {
    expect(Object.keys(await import('../tools/shell.mjs'))).not.toContain('footer');
  });
});
