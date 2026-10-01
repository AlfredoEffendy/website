// Course syllabi: the author's own PDFs, served from static/files/syllabi/. Keyed by course slug, quarters in order.
// Redacted before publishing (2026-10-01): QMETH 201 page 1 and both B BUS 221 files were re-rendered as images with
// the TA's email, the Zoom links and the Zoom meeting ID blacked out (and Canvas's "Edit" button removed), so none of
// it survives in the files. The repository is public: never commit an unredacted copy.

export const SYLLABI = {
  'bbus-221': [
    { term: 'Winter 2026', file: 'files/syllabi/bbus-221-winter-2026.pdf' },
    { term: 'Spring 2026', file: 'files/syllabi/bbus-221-spring-2026.pdf' },
  ],
  'qmeth-201': [{ term: 'Summer 2025', file: 'files/syllabi/qmeth-201-summer-2025.pdf' }],
  'econ-301': [{ term: 'Winter 2025', file: 'files/syllabi/econ-301-winter-2025.pdf' }],
  'econ-200': [{ term: 'Summer 2024', file: 'files/syllabi/econ-200-summer-2024.pdf' }],
};

/** A course's syllabus links, one per quarter, comma-separated ('' when it has none). */
export const syllabusLinks = (slug, root) =>
  (SYLLABI[slug] ?? [])
    .map(
      (s) =>
        `<a href="${root}${s.file}" type="application/pdf" target="_blank" rel="noopener">${s.term}<span class="sr"> syllabus (PDF, opens in a new tab)</span></a>`,
    )
    .join(', ');
