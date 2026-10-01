# Teaching section contract

Two kinds of work happen in parallel: one agent builds the **teaching kit** (index page, course page
template, shared styles); four agents each build **one course** (content + interactive). This file is
the interface between them. Neither side edits the other's files.

## Routes
- `teaching/index.html` — overview, plain like the author's Google Site: instructor-of-record courses by unit (each linking to
  its page, with its quarters and syllabi), then the TA courses with their quarters.
- `teaching/<slug>/index.html` — one page per instructor-of-record course. Slugs: `bbus-221`, `qmeth-201`, `econ-301`, `econ-200`.

## Files
| Owner | Files |
|---|---|
| Kit | `tools/pages/teaching.mjs` (exports `pages`), `src/styles/teaching.css` (no overview script: the overview is plain markup) |
| Course `<slug>` | `tools/pages/courses/<slug>.mjs` (exports `course`, **never** `pages`), `src/pages/courses/<slug>.ts` (entry), optional `src/styles/course-<slug>.css` |

The generator imports every `.mjs` under `tools/pages/` and only uses an export named `pages`, so the
course modules are inert unless the kit imports them.

## Course module shape (`tools/pages/courses/<slug>.mjs`)
```js
export const course = {
  slug: 'econ-200',
  code: 'ECON 200',
  title: 'Introduction to Microeconomics',           // as on the C.V.
  unit: 'Department of Economics, University of Washington',
  role: 'Instructor',                                // solo instructor of record
  when: '2024',                                      // exactly as the C.V. gives it; may add a cited quarter (e.g. 'Summer 2024')
                                                     // or one the author confirmed (recorded in notes/source/cv.md)
  whenSource: 'https://…',                           // URL supporting a quarter, or null
  catalog: { text: '…', url: '…' },                  // official catalogue description, verbatim or closely paraphrased, with its URL
  summary: '…',                                      // ≤ 40 words: what students leave able to do
  concepts: [                                        // 4–7 core concepts the course covers, from the author's own syllabus
    { title: '…', body: '… (≤ 45 words)', source: 'https://…' }, // `source` only when it is not the syllabus
                                                     // (e.g. the textbook); never another instructor's syllabus
  ],
  interactive: {
    title: '…',                                      // e.g. 'Tax incidence on a market'
    lead: '… (≤ 30 words)',
    html: (root) => `…`,                             // markup for the interactive; ids prefixed with the slug, e.g. 'econ-200-price'
    entry: 'src/pages/courses/econ-200.ts',          // imports '../../site' first
    css: ['course-econ-200'],                        // optional extra style groups
  },
  labs: [['confidence-intervals', 'Confidence intervals']], // optional links into Stats Engine labs (slug, label)
  sources: [{ label: 'UW course catalogue: ECON', url: '…' }], // every URL used above; the author's syllabus as a
                                                     // site path ('files/syllabi/<slug>-<term>.pdf')
};
```

## Course page layout (rendered by the kit)
1. Header, plain: a link back to Teaching, `<h1>` "code: title", and one line "Instructor of record · unit · when · Syllabus:
   links" (syllabus PDFs from `tools/syllabi.mjs`, also linked from the overview and the C.V.).
2. The interactive (the first thing below the header, tool-like, using `.figure`/`.plot` from base.css where it is a chart). The
   interactive is the only styled part of the page.
3. "What the course covers": catalogue description (quoted, linked) + the concepts as a plain list.
4. Related Stats Engine labs (if any), then sources.
5. Previous / next course navigation and a link back to `teaching/`.

## Interactive rules
- Canvas charts through `src/ui/plot.ts` (`Plot`, `linear`, `ticks`, `xAxis`, `yLabels`, `curve`, `palette`), controls with base.css
  classes (`.field`, `.btn`, `.seg`, `.check`), live equation through `src/ui/eq.ts` (`fillEq`) with `.eq`/`.slot` markup.
- Purple = the model's current state/data, gold = reference/theory/initial state. Both themes. Keyboard operable. Reduced motion respected.
- Each entry chunk ≤ 8 KB gzip beyond shared code. No external requests.
- Illustrative numbers must be labelled as illustrative; nothing is presented as real data unless sourced.
