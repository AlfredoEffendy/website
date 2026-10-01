import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const at = (path) => new URL(`../${path}`, import.meta.url);

describe('page chrome', () => {
  it('has no About Me section any more', () => {
    expect(readFileSync(at('tools/gen-pages.mjs'), 'utf8')).not.toMatch(/about\.mjs|aboutMe|ABOUT_SECTIONS|About Me/);
    expect(existsSync(at('tools/about.mjs'))).toBe(false);
    expect(existsSync(at('src/styles/about.css'))).toBe(false);
  });
});
