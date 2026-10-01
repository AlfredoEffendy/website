// Size limits for "Your data". One place, so the page text, the parser and the notes agree.

/** Most rows read from one file or paste (owner-chosen limit). */
export const MAX_ROWS = 711_996;

/** Larger files are read up to this many bytes; the rows after the cut are dropped and the reader is told. */
export const MAX_BYTES = 64 * 1024 * 1024;
