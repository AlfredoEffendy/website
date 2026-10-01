# Home page and site navigation: design

Date: 2026-10-01. Status: approved in conversation, awaiting spec review.
Rollback point: git tag `before-home-page` (the site with Stats Engine at the root).

## Goal

Make the site's front door about Alfredo Effendy, for **academic job market committees**. Stats Engine stops being
the home page and becomes one of the site's tools. Success: a committee member landing on the site sees who the author is,
the fields, the job market paper and how to get the C.V. within the first screen, and every existing page and shared
lab link still works.

Decided with the author:
- Audience: job market committees.
- Home layout: **paper-first** (name, role, fields, then the job market paper card).
- Navigation: **visible links** in the top bar, with a Tools menu.
- Research interests shown anywhere on the site become the C.V. fields: International Finance · Asset Pricing ·
  Macro-Finance ("Risk Management" and "Big Data Analysis" are dropped).
- Out of scope here: the Markets page (FOMC probabilities, G10 FX and money-market rates, commodities, indices).
  It is a separate project with its own spec; this design only leaves a slot for it in the Tools menu and on the home page.

## Addresses

| Page | Before | After |
|---|---|---|
| Home | Stats Engine workspace at `/website/` | New home page at `/website/` |
| Stats Engine | `/website/` | `/website/stats-engine/` |
| Research, Teaching, C.V., course pages | unchanged | unchanged |

Shared lab runs keep working. Old links look like `/website/?lab=clt-mean&n=30&seed=5`. The home page's `<head>`
runs, before first paint: if the query string has `lab=`, `location.replace('stats-engine/' + location.search +
location.hash)`. Without a `lab` parameter nothing happens.

`ROUTES` in `tools/shell.mjs` keeps `home: ''` (now the new home page) and gains `labs: 'stats-engine/'`. Every internal link to the
workspace uses `ROUTES.labs`: the lab links on course pages (`${root}${ROUTES.labs}?lab=…`), "Try the labs" at the end
of the research article, the Stats Engine box on the Teaching page, the footer, and the Tools menu. The 404 page's
button becomes "Home" (its href logic already resolves the project sub-path).

## Top bar (every page)

```
[Σ] Alfredo Effendy   <tagline>            Research  Teaching  C.V.  Tools ▾  ☾
                                                                  ├ Stats Engine
                                                                  └ (Markets, project 2)
```

- Left: "Alfredo Effendy" links home (`aria-current="page"` on the home page). On the Stats Engine page only, the Σ
  button (which opens its tab rail) stays in front of the name, and the tagline is "Stats Engine" (the workspace's
  `<h1>` stays the tagline element, as today). Elsewhere the tagline is the section name, as today.
- Right: Research, Teaching and C.V. as plain links (`aria-current` on the active section), then a Tools disclosure
  menu (button + list, using the existing `disclosure()` in `src/ui/chrome.ts`), then the theme toggle.
- Phones (narrow widths): Research, Teaching, C.V. and the Tools items fold into one menu button; the theme toggle stays.
- Removed: the "A.E" author dropdown (and its research-interest tags and "Looking for an academic position" note) and
  the Σ lab menu on pages other than the workspace. The footer nav gains Home and keeps Stats Engine.
- `current` values: `'home' | 'research' | 'teaching' | 'cv' | 'labs'`.

## Home page (`tools/pages/home.mjs`, path `index.html`)

Top to bottom:
1. **Hero.** `<h1>` Alfredo Effendy; "Ph.D. candidate in Economics, University of Washington · expected 2027"; fields
   line (the three C.V. fields); "On the 2026–2027 academic job market". Actions: Download C.V. (PDF), Job market
   paper (PDF), email (mailto), UW Economics profile (external).
2. **Job market paper card.** Title; the one-sentence summary; three key numbers (signal on in 93 of 458 months;
   4 of the 5 worst carry months inside it; carry spot −8.99%/yr while on); Figure 1 thumbnail; buttons "Read the
   summary" and "PDF". Text and numbers are imported from `tools/pages/research.mjs` (it exports them) so there is one
   source.
3. **Work in progress.** The two titles from `IN_PROGRESS` (`tools/pages/cv.mjs`), linking to Research.
4. **Teaching.** "Instructor of record for four University of Washington courses", then the four courses (code, title,
   quarter) linking to their pages, each with its syllabus links (`tools/syllabi.mjs`); a link to Teaching.
5. **Tools.** A Stats Engine card (logo, one line, "Open Stats Engine"). The Markets card is added in project 2.

No About Me paragraph on the home page (the hero says the same thing); Research, Teaching and C.V. keep theirs.
Style group `src/styles/home.css`; entry `src/site.ts` (no page script). Facts only from `notes/source/cv.md` and the
paper, as for every page.

## Other changes

- `tools/gen-pages.mjs`: the workspace is written to `stats-engine/index.html` with root `../`; its module script and
  font preload paths resolve from there. `.pages.json` lists it so Vite builds it.
- `tools/shell.mjs`: new top bar; `authorMenu` removed; footer adds Home; `LAB_LINKS` hrefs go through `ROUTES.labs`.
- `src/ui/chrome.ts`: wires the Tools menu and the phone menu; drops the author-menu and Σ-lab-menu wiring for
  non-workspace pages (the workspace's Σ stays in `src/ui/shell.ts`).
- `src/styles/topbar.css`: styles for the links, Tools menu and phone menu; author-menu styles removed.
- Interests: `INTERESTS` in `research.mjs` and `cv.mjs`, and the About Me sentence in `tools/about.mjs`, use the C.V. fields.
- Docs: README "Where things live" and `notes/site-architecture.md` (routes, `current` values, the redirect).

## Checks

- `npm test` and `npm run build` (type-check and size budgets) pass. Home page HTML+CSS stays under the 30 KB gzip
  page budget and loads no page-specific JS.
- New `tools/check-links.mjs`, run at the end of `npm run build`: every relative `href`/`src` in `dist/**/*.html`
  resolves to a file in `dist/`; fails the build otherwise. This guards the move.
- In a browser (light and dark, desktop and phone widths): home, Stats Engine (all tabs, Σ rail, `?lab=` deep link),
  Research, article, Teaching, a course page, C.V., 404; the old `/?lab=regression&seed=7` link lands on that run.

## Rollback

`git revert` the implementation commits, or reset `main` to tag `before-home-page`, then push; GitHub Pages redeploys
the previous site.
