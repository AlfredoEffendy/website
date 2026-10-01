import { describe, expect, it } from 'vitest';
import { parseCsv, toNumber } from '../src/core/csv';
import { MAX_ROWS } from '../src/core/limits';
import { argsort } from '../src/core/sort';

describe('toNumber', () => {
  it('reads plain, signed, scientific and decorated numbers', () => {
    expect(toNumber('3.5')).toBe(3.5);
    expect(toNumber(' -2 ')).toBe(-2);
    expect(toNumber('1e3')).toBe(1000);
    expect(toNumber('$1,234.50')).toBe(1234.5);
    expect(toNumber('12%')).toBe(12);
    expect(toNumber('−4')).toBe(-4);
    expect(toNumber('3,14', true)).toBe(3.14);
    expect(toNumber('1.234,5', true)).toBe(1234.5);
  });

  it('rejects text and blanks', () => {
    expect(toNumber('')).toBeNaN();
    expect(toNumber('abc')).toBeNaN();
    expect(toNumber('12abc')).toBeNaN();
    expect(toNumber('1.2.3')).toBeNaN();
  });
});

describe('parseCsv', () => {
  it('detects a header and comma delimiter', () => {
    const p = parseCsv('height,weight\n170,65\n180,80\n165,58\n');
    expect(p.names).toEqual(['height', 'weight']);
    expect(p.rows).toBe(3);
    expect(Array.from(p.columns[0])).toEqual([170, 180, 165]);
    expect(Array.from(p.columns[1])).toEqual([65, 80, 58]);
    expect(p.delimiter).toBe(',');
  });

  it('handles tabs (pasted from a spreadsheet), no header, and Windows line endings', () => {
    const p = parseCsv('1\t2\r\n3\t4\r\n5\t6');
    expect(p.names).toEqual(['Column 1', 'Column 2']);
    expect(p.rows).toBe(3);
    expect(Array.from(p.columns[1])).toEqual([2, 4, 6]);
  });

  it('handles semicolons with decimal commas', () => {
    const p = parseCsv('x;y\n1,5;2,25\n3,0;4,75');
    expect(p.delimiter).toBe(';');
    expect(Array.from(p.columns[0])).toEqual([1.5, 3]);
    expect(Array.from(p.columns[1])).toEqual([2.25, 4.75]);
  });

  it('honours quoted fields with embedded delimiters and quotes', () => {
    const p = parseCsv('name,score\n"Smith, J",90\n"A ""B"" C",85\n');
    expect(p.names).toEqual(['score']);
    expect(p.skipped).toEqual(['name']);
    expect(Array.from(p.columns[0])).toEqual([90, 85]);
  });

  it('keeps missing cells as NaN and still treats the column as numeric', () => {
    const rows = ['a,b', ...Array.from({ length: 20 }, (_, i) => `${i},${i === 3 ? '' : i * 2}`)];
    const p = parseCsv(rows.join('\n'));
    expect(p.names).toEqual(['a', 'b']);
    expect(p.columns[1][3]).toBeNaN();
    expect(p.columns[1][4]).toBe(8);
  });

  it('reads a bare list of numbers as one column', () => {
    expect(Array.from(parseCsv('3, 5, 8, 13').columns[0])).toEqual([3, 5, 8, 13]);
    expect(Array.from(parseCsv('3\n5\n8').columns[0])).toEqual([3, 5, 8]);
    expect(Array.from(parseCsv('1.5 2.5 3.5').columns[0])).toEqual([1.5, 2.5, 3.5]);
    expect(parseCsv('3\n5\n8').names).toEqual(['x']);
  });

  it('caps the row count and reports truncation', () => {
    const text = 'x\n' + Array.from({ length: 120 }, (_, i) => i).join('\n');
    const p = parseCsv(text, 100);
    expect(p.rows).toBe(100);
    expect(p.truncated).toBe(true);
    expect(parseCsv(text, 500).truncated).toBe(false);
  });

  it('returns nothing for empty input', () => {
    expect(parseCsv('   \n ').rows).toBe(0);
    expect(parseCsv('').columns).toEqual([]);
  });

  it('strips a byte-order mark', () => {
    expect(parseCsv('﻿x,y\n1,2').names).toEqual(['x', 'y']);
  });

  it('skips blank lines and keeps line breaks inside quotes', () => {
    const p = parseCsv('note,v\n\n"two\nlines",1\n\n"x",2\n');
    expect(p.rows).toBe(2);
    expect(Array.from(p.columns[0])).toEqual([1, 2]);
  });

  it('reads the full limit of rows and stops one past it', () => {
    const n = MAX_ROWS + 1;
    const text = 'a,b\n' + Array.from({ length: n }, (_, i) => `${i},${i % 7 === 0 ? '' : -i / 4}`).join('\n');
    const p = parseCsv(text);
    expect(p.rows).toBe(MAX_ROWS);
    expect(p.truncated).toBe(true);
    expect(p.columns[0][MAX_ROWS - 1]).toBe(MAX_ROWS - 1);
    expect(p.columns[1][7]).toBeNaN();
    expect(p.columns[1][9]).toBe(-2.25);
  });
});

describe('argsort', () => {
  it('orders numbers, keeps ties stable and puts blanks last both ways', () => {
    const col = new Float64Array([3, NaN, -1, 3, 0, -0, NaN, -7.5, 1e300]);
    const rows = Uint32Array.from(col.keys());
    expect(Array.from(argsort(col, rows))).toEqual([7, 2, 4, 5, 0, 3, 8, 1, 6]);
    expect(Array.from(argsort(col, rows, true))).toEqual([8, 3, 0, 5, 4, 2, 7, 1, 6]);
  });

  it('agrees with a comparison sort on random data', () => {
    const col = Float64Array.from({ length: 5000 }, (_, i) => (i % 13 === 0 ? NaN : Math.round(Math.sin(i * 12.9898) * 43758.5453) / 8));
    const rows = Uint32Array.from({ length: 2500 }, (_, i) => i * 2);
    const want = Array.from(rows).sort((a, b) => {
      const x = col[a], y = col[b];
      if (Number.isNaN(x) || Number.isNaN(y)) return Number.isNaN(x) ? (Number.isNaN(y) ? a - b : 1) : -1;
      return x - y || a - b;
    });
    expect(Array.from(argsort(col, rows))).toEqual(want);
  });
});
