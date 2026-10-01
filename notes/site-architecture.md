# Site architecture (read before changing anything)

This is a static multi-page site built with Vite and plain TypeScript. There is no UI framework, no chart library, no CDN and no third-party request.
- Node 22 or newer.
- Python 3.12 with PyMuPDF and Pillow, only to regenerate the paper's figures.

## Build
- `node tools/gen-pages.mjs` writes every HTML page, copies `static/` and fonts into `public/`, writes `.pages.json`.
- `npx tsc --noEmit` type-checks. `npx vite build` bundles to `dist/`. `node tools/report-size.mjs` enforces budgets.
- `npm run build` does all four. `npm test` runs vitest (`tests/`).
- Preview: `npm run preview` serves `dist/` on port 4173.
- Screenshots: `SHOT_DIR=<dir> tools/shot.sh "<path-and-query>" <name> <width> <height>`. This runs headless Chrome against the preview. Set the Chrome path inside the script for your machine.
- Add `?theme=light` or `?theme=dark` to force a theme.

## Pages
- `index.html` — the lab workspace, generated from `tools/labs.mjs` by `tools/gen-pages.mjs`. Entry `src/main.ts`.
- Every other page comes from a module in `tools/pages/` (subfolders allowed). Each exports `pages`, an array (or a function, sync
  or async, returning an array) of:
  ```js
  {
    path: 'research/index.html',        // where the page is written, relative to the project root; always <folder>/index.html
    title: 'Research · Alfredo Effendy',
    description: '…',                   // meta description, plain text
    current: 'research',                // 'labs' | 'research' | 'teaching' | 'cv' — highlights the author menu
    css: ['article'],                   // extra style groups: src/styles/<name>.css, inlined after the shared groups
    body: (root) => `<main id="main">…</main>`,  // root = relative path to site root, e.g. '../../'
    entry: 'src/pages/research.ts',     // optional; must `import '../site'` (correct relative path) as its first import
    tagline: 'Research',                // optional; the text after the logo in the top bar (HTML allowed)
    extraHead: '',                      // optional extra <head> markup
    bodyClass: '',                      // optional
    about: true,                        // optional; pages whose `current` is research, teaching or cv end with the shared
                                        // About Me paragraph (tools/about.mjs) automatically. Do not write your own bio block.
  }
  ```
  The generator wraps `body` with the shared `<head>`, top bar and footer (`tools/shell.mjs`). The body must contain exactly one
  `<main id="main">` and one `<h1>`.
- Internal links are always relative: `${root}research/`, `${root}teaching/econ-200/`, `${root}?lab=regression`. Never start a link
  with `/` (the site may be served from a sub-folder). Route constants: `ROUTES` in `tools/shell.mjs`.
- `public/404.html` is copied from `src/404.html` (self-contained).

## Styles
- `src/styles/base.css` (tokens, type, controls `.btn .field .seg .check .badge`, chart frame `.figure .plot .key`, `.stats .stat`,
  equations `.eq .frac .sqrt .slot`, footer), `topbar.css`, `scroll.css` — inlined into every page in that order.
- `src/styles/lab.css` — workspace only. Page groups: add `src/styles/<name>.css` and list it in the page's `css`.
- Design tokens only (`--accent`, `--accent-soft`, `--bar`, `--gold`, `--gold-ink`, `--ink`, `--muted`, `--line`, `--line-strong`,
  `--surface`, `--paper`, `--tint`, `--pop`, `--ok`, `--bad`, `--grid-minor`, `--grid-major`, `--paper-grid`, `--font-display`,
  `--font-body`, `--font-math`, `--font-mono`, spacing `--s-1…--s-12`, `--radius`). Both themes must work: never hard-code colours.
- UW brand: Spirit Purple #4b2e83 accent, Heritage Gold #85754d for theory/secondary, Encode Sans Condensed display, Open Sans body.
- Purple = simulated/observed/data, gold = theory/expected. `<i>` is reserved for mathematical symbols.
- Respect `prefers-reduced-motion` (base.css already kills CSS animation; JS animation must check `reducedMotion()` from `src/ui/dom.ts`).

## Scripts
- `src/ui/chrome.ts` runs on every page: theme toggle, author menu, Σ lab menu (non-workspace pages), chart folding, scroll marker.
  It exports `disclosure(button, panel, onChange?)` for menus.
- `src/ui/shell.ts` — workspace only (imports chrome). `src/site.ts` — default entry for other pages (imports chrome).
- Reusable: `src/ui/plot.ts` (`Plot` canvas with HiDPI + resize + `mark/pick` hit regions, `linear`, `ticks`, `xAxis`, `yLabels`,
  `curve`, `label`, `tween`, `Morph`, `palette()` which reads CSS tokens), `src/ui/eq.ts` (`fillEq` slot animation),
  `src/ui/dom.ts` (`fmt`, `tidy`, `pct`, `reducedMotion`, `scope`), `src/core/*` (exact distributions, seeded `Rng`, stats, OLS).
- Lazy-load anything heavy with dynamic `import()`. Budgets (gzip, `tools/report-size.mjs`): each page's HTML+CSS ≤ 30 KB
  (workspace ≤ 24 KB; the owner allowed it past 20 KB when needed, but keep it lean), each page's up-front JS ≤ 20 KB, each lazy chunk ≤ 8 KB, each image ≤ 160 KB.

## Data scale
- **"Your data" limit: exactly 711,996 rows.** The owner chose it. Larger files keep their first 711,996 rows, and the reader is told.
- Files are read up to 64 MB.
- Both constants live in `src/core/limits.ts`. The tab states the row limit in one plain line under its notes (`fine` in `tools/labs.mjs`); keep the two in step.
- Do not explain the number or attach any story to it anywhere, code comments included.
- Keep the engine light:
  - typed-array columns, with no per-row objects;
  - file parsing in a worker (`src/core/csv-worker.ts`);
  - linear-time radix sort (`src/core/sort.ts`);
  - a density raster for big scatter plots.
- Simulations keep their 50,000-draw batch fields.
- The first load must not grow. Anything heavy loads only in the tab that needs it.

## Content rules
- Facts about the author come only from `notes/source/cv.md` and the job market paper. The paper's PDF is
  `static/files/when-yield-curves-invert-together.pdf`; its text is in `notes/source/jmp.txt`. Never publish the phone number or referees' emails. Course content comes from cited public sources (UW course catalogue etc.). Never invent dates,
  quarters, enrolment numbers, evaluations, quotes, or results.
- Few words, tool-like, no marketing tone. British-neutral plain English is fine; keep the existing voice of `tools/labs.mjs`.
- `static/` holds committed files served as-is (PDFs, figure images). Put generated-from-source assets there via a reproducible
  script in `tools/`.
