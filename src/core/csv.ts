// Reads pasted or uploaded tabular text into numeric columns. Pure: no DOM, fully testable.
import { MAX_ROWS } from './limits';

export interface Parsed {
  /** Names of the numeric columns, in file order. */
  names: string[];
  /** One array per numeric column; missing or unreadable cells are NaN. */
  columns: Float64Array[];
  rows: number;
  /** Columns left out because they are not numbers. */
  skipped: string[];
  /** True when the input had more rows than the cap and the rest was dropped. */
  truncated: boolean;
  delimiter: string;
}

const DELIMITERS = [',', '\t', ';', '|'];

/** Split text into rows of cells, honouring quoted fields ("a ""quoted"" value", embedded newlines). */
function split(text: string, delimiter: string, maxRows: number): { rows: string[][]; more: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0].trim() !== '') rows.push(row);
      row = [];
      if (rows.length > maxRows) return { rows, more: true };
    } else cell += ch;
  }
  row.push(cell);
  if (row.length > 1 || row[0].trim() !== '') rows.push(row);
  return { rows, more: false };
}

/** The delimiter that splits the first lines into the same number of fields (more than one) most often. */
function sniff(text: string): string {
  const lines = text.split('\n', 20).filter((l) => l.trim() !== '');
  let best = ',';
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => l.split(d).length);
    const fields = counts[0];
    if (fields < 2) continue;
    const consistent = counts.filter((c) => c === fields).length / counts.length;
    const score = consistent * 100 + Math.min(fields, 50);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Parse one cell as a number, tolerating currency signs, percent signs and thousands separators. */
export function toNumber(raw: string, decimalComma = false): number {
  let s = raw.trim().replace(/^["']|["']$/g, '');
  if (s === '') return NaN;
  s = s.replace(/[$€£¥%\s]/g, '').replace(/−/g, '-');
  if (decimalComma) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,(?=\d{3}(\D|$))/g, '');
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
}

/** toNumber with a fast path for plain numbers ("12", "-3.5", "1e6"), which are most cells of a large file. */
function cellValue(s: string, decimalComma: boolean): number {
  if (!decimalComma && s.length) {
    let plain = true;
    for (let k = 0; k < s.length && plain; k++) {
      const ch = s.charCodeAt(k);
      plain = (ch >= 48 && ch <= 57) || ch === 46 || ch === 45 || ch === 43 || ch === 101 || ch === 69;
    }
    if (plain) return Number(s);
  }
  return toNumber(s, decimalComma);
}

/** Text after the closing quote of a quoted cell is kept, as spreadsheet programs do. */
function cellEnd(text: string, from: number, delimiter: number): number {
  let e = from;
  while (e < text.length) {
    const ch = text.charCodeAt(e);
    if (ch === delimiter || ch === 10) break;
    e++;
  }
  return e;
}

/**
 * Numeric columns of a delimited text. The first rows decide the delimiter, header and number style;
 * then one pass reads every cell straight into Float64Array columns (no per-row objects), so several
 * hundred thousand rows parse in well under a second.
 */
export function parseCsv(input: string, maxRows = MAX_ROWS): Parsed {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const delimiter = sniff(text);
  const head = split(text, delimiter, 50).rows.slice(0, 50);

  // A bare list of numbers ("3, 5, 8" or space separated, on one line) is a single column.
  if (head.length <= 1) {
    const flat = text.trim().split(/[\s,;|]+/);
    if (flat.length > 1 && flat.every((t) => !Number.isNaN(toNumber(t)))) {
      const n = Math.min(flat.length, maxRows);
      const col = new Float64Array(n);
      for (let r = 0; r < n; r++) col[r] = toNumber(flat[r]);
      return { names: ['x'], columns: [col], rows: n, skipped: [], truncated: flat.length > maxRows, delimiter: '' };
    }
  }
  if (!head.length) return { names: [], columns: [], rows: 0, skipped: [], truncated: false, delimiter };

  const width = Math.max(...head.map((r) => r.length));
  // Semicolon-separated files usually come from locales that write 3,14 for 3.14.
  const decimalComma = delimiter === ';' && head.slice(1, 20).some((r) => r.some((c) => /^-?\d+,\d+$/.test(c.trim())));
  const numeric = (r: string[]) => r.filter((c) => !Number.isNaN(toNumber(c, decimalComma))).length;
  const hasHeader = head.length > 1 && (numeric(head[0]) === 0 || numeric(head[0]) < numeric(head[1]));
  const header = hasHeader ? head[0] : [];

  // Lines are an upper bound on rows (blank lines, the header and quoted line breaks only lower it).
  let lines = 1;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) lines++;
  const cap = Math.min(lines, maxRows);
  const cols = Array.from({ length: width }, () => new Float64Array(cap));
  const filled = new Uint32Array(width);
  const good = new Uint32Array(width);
  const D = delimiter.charCodeAt(0);
  const line: string[] = [];
  let skipHeader = hasHeader;
  let truncated = false;
  let n = 0;

  for (let i = 0; i <= text.length; ) {
    let cell: string;
    if (text.charCodeAt(i) === 34) {
      // Quoted cell: "" is a literal quote; delimiters and line breaks inside are kept.
      let j = i + 1;
      let s = '';
      for (;;) {
        const q = text.indexOf('"', j);
        if (q === -1) {
          s += text.slice(j);
          j = text.length;
          break;
        }
        s += text.slice(j, q);
        if (text.charCodeAt(q + 1) === 34) {
          s += '"';
          j = q + 2;
        } else {
          j = q + 1;
          break;
        }
      }
      i = cellEnd(text, j, D);
      cell = s + text.slice(j, i);
    } else {
      const e = cellEnd(text, i, D);
      cell = text.slice(i, e);
      i = e;
    }
    line.push(cell);
    if (i < text.length && text.charCodeAt(i) === D) {
      i++;
      continue;
    }
    // End of a line (or of the text).
    i++;
    if (line.length === 1 && line[0].trim() === '') {
      line.length = 0;
      continue;
    }
    if (skipHeader) skipHeader = false;
    else if (n === maxRows) {
      truncated = true;
      break;
    } else {
      for (let c = 0; c < width; c++) {
        const s = line[c] ?? '';
        const v = cellValue(s, decimalComma);
        cols[c][n] = v;
        if (v === v) {
          good[c]++;
          filled[c]++;
        } else if (s.trim() !== '') filled[c]++;
      }
      n++;
    }
    line.length = 0;
  }

  const names: string[] = [];
  const columns: Float64Array[] = [];
  const skipped: string[] = [];
  for (let c = 0; c < width; c++) {
    const name = (header[c] ?? '').trim() || (width === 1 ? 'x' : `Column ${c + 1}`);
    if (filled[c] > 0 && good[c] / filled[c] >= 0.9) {
      names.push(name);
      columns.push(n === cap ? cols[c] : cols[c].slice(0, n));
    } else if (filled[c] > 0) skipped.push(name);
  }
  return { names, columns, rows: n, skipped, truncated, delimiter };
}
