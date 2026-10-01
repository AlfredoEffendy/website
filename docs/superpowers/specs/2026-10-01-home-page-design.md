# Plain academic site with interactive teaching: design (revision 2)

Date: 2026-10-01. Status: approved in conversation, awaiting spec review.
Rollback point: git tag `before-home-page` (the site with Stats Engine at the root).

Revision 2 replaces revision 1 (paper-first home page, Tools menu, decorative styling). Kept from revision 1 and
already built on branch `worktree-home-page`: the link checker (`tools/check-links.mjs`), Stats Engine at
`stats-engine/` with old `/?lab=…` links forwarded, and the site root as the home page.

## Goal

A simple academic website for **job market committees**, in the spirit of the author's Google Site
(https://sites.google.com/view/alfredoeffendy/home), where the **teaching** section shows more than a list: each
course taught as instructor of record has an interactive illustration, and Stats Engine collects the statistics
simulations. Success: the site reads as a plain, personal academic site (not a template), and a committee member
can reach the C.V., the paper and the interactive teaching pages in one click from the home page.

Decided with the author:
- Look: **plain academic**, like the Google Site without its dark banner.
- Research: plain list; the job market paper's title links to its PDF with the **abstract** underneath; the long
  summary article is retired.
- Wording follows the Google Site, lightly corrected.
- Out of scope: the Markets page (FOMC probabilities, G10 rates). It is a separate project; it will add one menu link.

## Look (every page)

- Plain background: `var(--paper)` with no grid pattern anywhere outside Stats Engine and the course interactives.
- Fonts unchanged (Encode Sans Condensed for headings, Open Sans for text). Purple (`--accent`) only for links and
  headings; body text `--ink`; secondary text `--muted`.
- Removed: grid-paper backgrounds, entrance/hover animations, stat tiles, cards, chips and badges, "From the C.V."
  captions, the About Me section at the end of pages, and the theme button. Pages follow the visitor's system
  light/dark setting (the existing boot script already does; a saved choice from before still applies).
- Stats Engine's workspace and the course interactives keep their own tool styling: they are the showcase.

## Top bar and footer

```
[Σ] Alfredo Effendy                         Home  C.V.  Research  Teaching  Stats Engine
```
- "Alfredo Effendy" links home. The five links are plain text; the current page's link is marked
  `aria-current="page"` (purple, underlined). On phones the links wrap onto a second row: no menu button, no script.
- Stats Engine only: the Σ button that opens its tab rail stays in front of the name, and the workspace keeps a
  visually hidden `<h1>Stats Engine</h1>` for screen readers.
- Footer: one line, "Alfredo Effendy · Department of Economics, University of Washington", and the existing
  "not an official University site" note. No footer menu.

## Pages

**Home (`index.html`).** `<h1>Alfredo Effendy</h1>`, then (text left, photo right; photo first on phones):
- "I am an Economics Ph.D. candidate at the University of Washington."
- "My research interests are in International Finance, Asset Pricing, Risk Management, and Big Data Analysis."
- "I am on the 2026–2027 academic job market." (in `--accent`)
- "My Teaching page has the interactive illustrations I built for my courses, and Stats Engine, a statistics tool for
  teaching." (links to Teaching and Stats Engine)
- Links: C.V. (PDF) · Job market paper (PDF)
- Contact: Department of Economics · University of Washington · 319C Savery Hall, Seattle, WA 98195 · aeffendy@uw.edu
- Headshot: `notes/source/headshot.jpg` → `tools/make-headshot.py` → `static/img/alfredo-effendy-{200,400}.webp`,
  shown at about 14rem wide with `srcset`, `alt="Alfredo Effendy"`, explicit width/height.
- Keeps the `<head>` script that forwards old shared lab links (`/?lab=…`) to `stats-engine/`.

**C.V. (`cv/`).** `<h1>C.V.</h1>`, a line "Download C.V. (PDF) · September 2026", then the C.V. as plain sections
(`<h2>` Education, Working Papers, Work in Progress, Teaching, Fellowships and Awards, Professional Service,
Non-Academic Employment, References) with a year column and an entry column. Same facts as now (from
`notes/source/cv.md`); no phone number or referees' emails; no "Read the summary" button.

**Research (`research/`).** `<h1>Research</h1>`; `<h2>Working Papers</h2>`: the paper title (as on the PDF, "When Yield
Curves Invert Together: Currency Crash Risk") linking to the PDF, "(Job Market Paper)", and the paper's abstract
(verbatim, PDF p. 1); `<h2>Work in Progress</h2>`: the two titles with their C.V. descriptions. The article
`research/when-yield-curves-invert-together/` is removed with its code and figures.

**Teaching (`teaching/`).** `<h1>Teaching</h1>`, one short paragraph ("Each course I teach as instructor of record has
a page with an interactive illustration I built for it, the topics it covers and its syllabus. Stats Engine collects
the statistics simulations I use in class."), then, laid out like the Google Site:
- `<h2>Instructor of Record</h2>`, grouped by unit (University of Washington Bothell, School of Business; University
  of Washington, Foster School of Business; University of Washington, Department of Economics). Each course: its
  code and title linking to its course page, then its quarters with syllabus links, e.g. "Winter 2026 (Syllabus),
  Spring 2026 (Syllabus)".
- `<h2>Teaching Assistant</h2>`, grouped by unit, each course with its quarters, oldest first, as listed on the Google
  Site (recorded in `notes/source/cv.md`).

**Course pages (`teaching/<slug>/`).** Same content and order (title, interactive, what the course covers, related
labs, sources, previous/next). Restyled plainly: no header grid or badge; one line under the title: "Instructor of
record · <unit> · <quarters> · Syllabus: <links>". The interactive itself is unchanged.

**Stats Engine (`stats-engine/`).** Unchanged inside; the plain top bar.

## Data

`notes/source/cv.md` gains, as author-provided (Google Site, read 2026-10-01): the home page wording, and the TA
quarters: BUS AN 510 Summer 2025, Summer 2026; SCM 501 Summer 2026; QMETH 201 Spring 2024, Fall 2024, Fall 2025;
STAT 311 Summer 2022, Spring 2023, Summer 2023, Fall 2023, Winter 2024, Spring 2024; ECON 201 Winter 2022, Fall 2022,
Winter 2023; ECON 345 Spring 2022; ACMS 37020 Spring 2019, Fall 2019; ACMS 30600 Fall 2019; ACMS 30010 Spring 2019;
ACMS 20620 Spring 2019; ACMS 30530 Fall 2018; ACMS 10145 Fall 2018.

## Removed code

The Tools menu and phone menu (markup, `chrome.ts` wiring, CSS), the theme button, the About Me section
(`tools/about.mjs`, `src/styles/about.css`), the Teaching overview's cards, stat tiles and TA timeline
(`src/pages/teaching.ts`), and the research article (its page module part, `src/pages/research.ts`, `src/ui/viewer.ts`
(used only by the article), `src/styles/article.css`, `static/research/jmp/`, `tools/extract-figures.py`). Like a
typical faculty page, the paper is just its title, the PDF link and the abstract: no interactive material.

## Checks

- `npm test` and `npm run build` pass (type-check, size budgets, `links: all resolve`).
- Tests pin: the top bar's five links and `aria-current`; the home text, photo, contact and PDF links; the Research
  abstract and the absence of the article; the Teaching structure (course links, quarters, syllabus links, TA
  quarters); the C.V. page without the summary button.
- In a browser, light and dark (system setting), desktop and 375 px: every page; the links wrap on phones without
  horizontal scrolling; Stats Engine's Σ rail still works; an old `/?lab=regression&seed=7` link lands on that run.

## Rollback

`git revert` the implementation commits, or reset `main` to tag `before-home-page`, then push.
