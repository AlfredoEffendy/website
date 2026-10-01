# Alfredo Effendy: academic website

A plain academic site for the 2026–2027 job market: Home, C.V., Research (the job market paper's title, PDF and
abstract) and Teaching. The interactive material is all in teaching: each course taught as instructor of record has a
page with an interactive illustration and its syllabus, and **Stats Engine** (`stats-engine/`) is one fast lab
workspace with six statistics simulations and a "Your data" tab, with exact statistics and live equations.

Static site: Vite and plain TypeScript. There is no UI framework, no chart library and no third-party request.

## Run it

You need Node 22 or newer. The site was built with Node 24.

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm test
```

`npm run build` does five things:
1. writes every HTML page (`tools/gen-pages.mjs`);
2. type-checks;
3. bundles the site into `dist/`;
4. prints a size report that fails the build if a budget is broken;
5. checks that every internal link resolves (`tools/check-links.mjs`).

`dist/` works from any folder or sub-path. All links are relative.

**GitHub Pages.** Push the repo, then set Settings → Pages → Source to "GitHub Actions". The included `.github/workflows/pages.yml` builds and deploys on every push to `main`.

## Where things live

| Path | What it holds |
|---|---|
| `tools/gen-pages.mjs` | Writes every page: CSS is inlined, and the shared head, top bar and footer are added |
| `tools/shell.mjs` | Shared chrome: routes (`ROUTES`, `labHref`), the top bar, the footer, the theme boot script |
| `tools/syllabi.mjs` | The course syllabi (PDFs in `static/files/syllabi/`, redacted before publishing), linked from Teaching and the C.V. |
| `tools/labs.mjs` | The lab workspace (`stats-engine/index.html`): every tab's controls, chart frame, equation and notes |
| `tools/check-links.mjs` | Fails the build when a page links to a file that is not in `dist/` |
| `tools/make-headshot.py` | Crops `notes/source/headshot.jpg` into the home page's WebP sizes in `static/img/` |
| `tools/pages/*.mjs` | Every other page (`home`, `cv`, `research`, `teaching`). Each module exports `pages` (see `notes/site-architecture.md`) |
| `tools/pages/courses/*.mjs` | One module per course, in the shape set by `notes/teaching-contract.md` |
| `src/main.ts`, `src/labs/` | Workspace entry, plus one lazily loaded module per lab |
| `src/core/` | Seeded random numbers, exact distributions, statistics/OLS, CSV parser and worker, radix sort, limits |
| `src/ui/` | Canvas plot helper, equation animation, data table, export, scroll marker, shared page chrome |
| `src/pages/` | Entry scripts for the course pages' interactives |
| `src/styles/` | `base`, `topbar` and `scroll` go on every page; `page` is the plain-page column; the rest are per-page groups |
| `static/` | Served as-is: the C.V., paper and syllabus PDFs, and the headshot (`img/`) |
| `notes/` | The contributor contract, the course-page contract, and the content sources (C.V. transcription, paper text) |
| `tests/` | Reference-value tests for the maths, CSV parser and sort |

Generated files are git-ignored: `index.html`, `stats-engine/`, `research/`, `teaching/`, `cv/`, `public/` and `.pages.json`. Edit the sources instead.

## Rules worth keeping

- **Plain look.** Home, C.V., Research and Teaching stay plain, like a faculty page: text, lists and links; no animations, cards, chips or decorative backgrounds. Interactive material belongs to the course pages and Stats Engine.
- **Content.** Facts about the author come only from `notes/source/cv.md` (which also records the author's Google Site wording and TA quarters) and the paper. Course facts come from cited public catalogues. Never invent dates, numbers or quotes. Never publish the phone number or referees' emails.
- **Colour.** Purple means simulated or observed; gold means theory. UW Spirit Purple `#4b2e83` and Heritage Gold `#85754d`; Encode Sans Condensed with Open Sans.
- **Writing and themes.** Use few words and keep the tool-like voice. Both themes must work, so use design tokens and never hard-code colours.
- **Shareable runs.** A link reproduces a run, because settings and the seed live in the query string (`?lab=clt-mean&n=30&seed=5`).
- **Budgets.** Gzip limits are set in `tools/report-size.mjs`:

  | What | Budget | Now |
  |---|---|---|
  | Workspace HTML+CSS | 24 KB | about 20 KB |
  | Other pages' HTML+CSS | 30 KB | each well under |
  | Start-up JS per page | 20 KB | |
  | Each lazy chunk | 8 KB | |
  | All JS | 70 KB | about 66 KB |
  | Each image | 160 KB | |

## "Your data" engine

- **Limits.** Up to **711,996 rows**; files are read up to 64 MB. Both live in `src/core/limits.ts`. The page states the row limit in one line under the tab's notes; keep the two in step.
- **Parsing.** An opened file is parsed in a Web Worker (`src/core/csv-worker.ts`). Cells go straight into `Float64Array` columns, with no per-row objects. The columns come back as transferred buffers, not copies. Pasted text is parsed on the main thread.
- **Table.** It renders one page at a time. Sorting uses a linear-time radix argsort (`src/core/sort.ts`), and blanks always sort last.
- **Scatter plots.** Above 20,000 points they draw as a density raster.
- **Measured.** A 14 MB, 712,000-row file loads in about 2.4 s on a laptop. That includes parsing, the fit and the first draw. It keeps exactly 711,996 rows.
- **TanStack.** It was evaluated and not adopted. Table Core builds an object per row (about 0.5 KB a row). Virtual stops working past Chrome's limit of about 33.5 million pixels on an element's height. DB adds about 80 KB gzip. Query, Store and Router solve problems this site does not have. The typed-array design above is lighter for this data shape.
- **Next steps.**
  - Stream-parse with progress and cancel.
  - Add sufficient-statistic groups for O(1) recomputation after an edit.
  - Make the table header keyboard-sortable without losing focus, with keyboard row selection and `aria-rowcount`.
  - Scroll wide tables (6+ columns) inside their own box.

## Known gaps

- Phone layouts were checked in desktop browsers at phone widths, not on handsets.
- Under Lighthouse's throttled-phone profile, the workspace's first layout pass is slow, which pushes total blocking time up. Unthrottled, first paint is about 0.25 s.
- Course pages show quarters. ECON 200, ECON 301 and QMETH 201 ("Summer 2024", "Winter 2025", "Summer 2025") come from public UW time-schedule and section pages, cited in each module's `whenSource`. The C.V. lists years only, so confirm those quarters with the author. B BUS 221 ("Winter and Spring 2026") was confirmed by the author.
