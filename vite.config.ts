import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// tools/gen-pages.mjs lists every page it wrote; each becomes a build input.
const listed = resolve(import.meta.dirname, '.pages.json');
const pages: string[] = existsSync(listed) ? JSON.parse(readFileSync(listed, 'utf8')) : ['index.html'];

export default defineConfig({
  // Relative asset paths, so the build works from any folder or sub-path (GitHub Pages, Cloudflare, a USB stick).
  base: './',
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [p.replace(/\/?index\.html$/, '').replace(/\//g, '-') || 'home', resolve(import.meta.dirname, p)]),
      ),
    },
  },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.mjs'] },
});
