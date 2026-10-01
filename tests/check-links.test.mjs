import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { brokenLinks, refsIn } from '../tools/check-links.mjs';

/** A throwaway site: { 'path/in/site': 'file contents' }. */
function site(files) {
  const dir = mkdtempSync(join(tmpdir(), 'links-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
}

describe('refsIn', () => {
  it('reads href and src values, then every srcset candidate', () => {
    expect(refsIn('<a href="a/"><img src="x.webp" srcset="x.webp 1x, y.webp 2x">')).toEqual(['a/', 'x.webp', 'x.webp', 'y.webp']);
  });
});

describe('brokenLinks', () => {
  it('accepts links that resolve, including folders, queries and anchors', () => {
    const dir = site({
      'index.html': '<a href="cv/"></a><a href="cv/?x=1#top"></a><a href="#main"></a><a href="?lab=data"></a><link href="f.css">',
      'cv/index.html': '<a href="../"></a><a href="../f.css"></a><a href=".."></a>',
      'f.css': '',
    });
    expect(brokenLinks(dir)).toEqual([]);
  });

  it('skips links that leave the site, and the 404 page', () => {
    const dir = site({
      'index.html': '<a href="https://x.org/"></a><a href="mailto:a@b.c"></a><link rel="icon" href="data:image/svg+xml,x"><a href="//cdn.x/y"></a>',
      '404.html': '<a href="/"></a>',
    });
    expect(brokenLinks(dir)).toEqual([]);
  });

  it('reports missing files, missing srcset candidates and root-absolute links', () => {
    const dir = site({
      'index.html': '<a href="files/cv.pdf"></a><img src="a.webp" srcset="a.webp 1x, b.webp 2x"><a href="/research/"></a>',
      'a.webp': '',
    });
    expect(brokenLinks(dir)).toEqual(['index.html: files/cv.pdf', 'index.html: /research/ (root-absolute)', 'index.html: b.webp']);
  });
});
