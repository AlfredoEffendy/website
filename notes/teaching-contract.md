# Teaching section contract

Two kinds of work happen in parallel: one agent builds the **teaching kit** (index page, course page
template, shared styles); four agents each build **one course** (content + interactive). This file is
the interface between them. Neither side edits the other's files.

## Routes
- `teaching/index.html` — overview: solo-instructor courses first (cards), then the TA record.
- `teaching/<slug>/index.html` — one page per solo-instructor course. Slugs: `bbus-221`, `qmeth-201`, `econ-301`, `econ-200`.

## Files
| Owner | Files |
|---|---|
| Kit | `tools/pages/teaching.mjs` (exports `pages`), `src/styles/teaching.css`, `src/pages/teaching.ts` (index behaviour, optional) |
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
  whenSource: 'https://…',                           // URL supporting a quarter, or null
  catalog: { text: '…', url: '…' },                  // official catalogue description, verbatim or closely paraphrased, with its URL
  summary: '…',                                      // ≤ 40 words: what students leave able to do
  concepts: [                                        // 4–7 core concepts the course covers, each sourced
    { title: '…', body: '… (≤ 45 words)', source: 'https://…' },
  ],
  interactive: {
    title: '…',                                      // e.g. 'Tax incidence on a market'
    lead: '… (≤ 30 words)',
    html: (root) => `…`,                             // markup for the interactive; ids prefixed with the slug, e.g. 'econ-200-price'
    entry: 'src/pages/courses/econ-200.ts',          // imports '../../site' first
    css: ['course-econ-200'],                        // optional extra style groups
  },
  labs: [['confidence-intervals', 'Confidence intervals']], // optional links into Stats Engine labs (slug, label)
  sources: [{ label: 'UW course catalogue: ECON', url: '…' }], // every URL used above
};
```

## Course page layout (rendered by the kit)
1. Header: code + title, role badge ("Solo instructor"), unit, when (with source link if a quarter is cited).
2. The interactive (the first thing below the header, tool-like, using `.figure`/`.plot` from base.css where it is a chart).
3. "What the course covers": catalogue description (quoted, linked) + the concepts as a compact grid.
4. Related Stats Engine labs (if any), then sources.
5. Previous / next course navigation and a link back to `teaching/`.

## Interactive rules
- Canvas charts through `src/ui/plot.ts` (`Plot`, `linear`, `ticks`, `xAxis`, `yLabels`, `curve`, `palette`), controls with base.css
  classes (`.field`, `.btn`, `.seg`, `.check`), live equation through `src/ui/eq.ts` (`fillEq`) with `.eq`/`.slot` markup.
- Purple = the model's current state/data, gold = reference/theory/initial state. Both themes. Keyboard operable. Reduced motion respected.
- Each entry chunk ≤ 8 KB gzip beyond shared code. No external requests.
- Illustrative numbers must be labelled as illustrative; nothing is presented as real data unless sourced.
