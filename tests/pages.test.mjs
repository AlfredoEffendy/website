import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const at = (path) => new URL(`../${path}`, import.meta.url);

describe('page chrome', () => {
  it('has no About Me section any more', () => {
    expect(readFileSync(at('tools/gen-pages.mjs'), 'utf8')).not.toMatch(/about\.mjs|aboutMe|ABOUT_SECTIONS|About Me/);
    expect(existsSync(at('tools/about.mjs'))).toBe(false);
    expect(existsSync(at('src/styles/about.css'))).toBe(false);
  });

  it('titles Stats Engine and the 404 page as part of the author\'s site', () => {
    expect(readFileSync(at('tools/gen-pages.mjs'), 'utf8')).toContain("title: 'Stats Engine · Alfredo Effendy'");
    expect(readFileSync(at('src/404.html'), 'utf8')).toContain('<title>Page not found · Alfredo Effendy</title>');
  });

  it('ships the link-preview photo as a JPEG (WebP is not read by every app)', () => {
    expect(existsSync(at('static/img/alfredo-effendy-og.jpg'))).toBe(true);
  });

  it('has no footer on any page', () => {
    expect(readFileSync(at('tools/gen-pages.mjs'), 'utf8')).not.toMatch(/footer/);
  });
});
