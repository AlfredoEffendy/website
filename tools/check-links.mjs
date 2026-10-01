// Fails the build when a page links to a file that is not in dist/: every relative href, src and
// srcset URL in dist/**/*.html must resolve to a file. Links that leave the site (http:, mailto:,
// data:, //host) and in-page anchors are skipped. A root-absolute link ("/x") is always reported,
// because the site is served from a sub-folder. 404.html is skipped (its script fixes its own link).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** Every link target in a page's markup: href and src values first, then each URL in a srcset. */
export function refsIn(html) {
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) for (const part of m[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
  return refs;
}

/** "page: link" for every link in the site at `dir` that does not resolve to a file there. */
export function brokenLinks(dir) {
  const problems = [];
  for (const page of walk(dir).filter((f) => f.endsWith('.html') && !f.endsWith('404.html'))) {
    const name = relative(dir, page).replaceAll('\\', '/');
    for (const ref of refsIn(readFileSync(page, 'utf8'))) {
      if (!ref || ref.startsWith('#') || ref.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(ref)) continue;
      if (ref.startsWith('/')) {
        problems.push(`${name}: ${ref} (root-absolute)`);
        continue;
      }
      const path = decodeURIComponent(ref.replace(/&amp;/g, '&').replace(/[?#].*$/, ''));
      if (!path) continue; // "?lab=data" or "#x": the page itself
      let target = resolve(dirname(page), path);
      if (path.endsWith('/') || path.endsWith('..') || (existsSync(target) && statSync(target).isDirectory())) target = join(target, 'index.html');
      if (!existsSync(target)) problems.push(`${name}: ${ref}`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = brokenLinks(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
  if (problems.length) {
    console.error(`Broken links:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('links: all resolve');
}
