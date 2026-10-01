// Stable argsort of numeric columns by LSD radix sort on the IEEE-754 bits (6 passes of 11 bits).
// Linear time, no comparator calls: sorting several hundred thousand rows takes tens of milliseconds.

const LITTLE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/**
 * Row ids of `rows` ordered by `col[row]`. Ties keep input order; NaN (blank) rows always go last, in
 * input order, in both directions; −0 equals 0. Descending is the reverse of ascending for the rest.
 */
export function argsort(col: ArrayLike<number>, rows: Uint32Array, desc = false): Uint32Array<ArrayBuffer> {
  const n = rows.length;
  const res = new Uint32Array(n);
  let id = new Uint32Array(n);
  let lo = new Uint32Array(n);
  let hi = new Uint32Array(n);
  const one = new Float64Array(1);
  const ou = new Uint32Array(one.buffer);
  const L = LITTLE ? 0 : 1;
  const H = 1 - L;
  const B = 2048;
  const c = new Uint32Array(6 * B);
  let m = 0;
  let nan = 0;
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const v = col[r];
    if (v !== v) {
      res[n - 1 - nan++] = r;
      continue;
    }
    one[0] = v + 0;
    let h = ou[H];
    let l = ou[L];
    // Flip the bits so unsigned order matches numeric order (negatives reversed, positives above them).
    if (h & 0x80000000) {
      h = ~h >>> 0;
      l = ~l >>> 0;
    } else h = (h | 0x80000000) >>> 0;
    lo[m] = l;
    hi[m] = h;
    id[m] = r;
    m++;
    c[l & 0x7ff]++;
    c[B + ((l >>> 11) & 0x7ff)]++;
    c[2 * B + (l >>> 22)]++;
    c[3 * B + (h & 0x7ff)]++;
    c[4 * B + ((h >>> 11) & 0x7ff)]++;
    c[5 * B + (h >>> 22)]++;
  }
  // NaN rows were written backwards from the end; put them back in input order.
  for (let a = m, b = n - 1; a < b; a++, b--) {
    const t = res[a];
    res[a] = res[b];
    res[b] = t;
  }
  // A pass where every key falls in one bucket changes nothing and is skipped.
  const skip = [false, false, false, false, false, false];
  for (let d = 0; d < 6; d++) {
    let s = 0;
    for (let b = d * B, e = b + B; b < e; b++) {
      const t = c[b];
      if (t === m) skip[d] = true;
      c[b] = s;
      s += t;
    }
  }
  let lo2 = new Uint32Array(m);
  let hi2 = new Uint32Array(m);
  let id2 = new Uint32Array(m);
  let t32: Uint32Array<ArrayBuffer>;
  for (let d = 0; d < 2; d++) {
    if (skip[d]) continue;
    const base = d * B;
    const sh = 11 * d;
    for (let i = 0; i < m; i++) {
      const l = lo[i];
      const p = c[base + ((l >>> sh) & 0x7ff)]++;
      lo2[p] = l;
      hi2[p] = hi[i];
      id2[p] = id[i];
    }
    t32 = lo; lo = lo2; lo2 = t32;
    t32 = hi; hi = hi2; hi2 = t32;
    t32 = id; id = id2; id2 = t32;
  }
  if (!skip[2]) {
    for (let i = 0; i < m; i++) {
      const p = c[2 * B + (lo[i] >>> 22)]++;
      hi2[p] = hi[i];
      id2[p] = id[i];
    }
    t32 = hi; hi = hi2; hi2 = t32;
    t32 = id; id = id2; id2 = t32;
  }
  for (let d = 3; d < 5; d++) {
    if (skip[d]) continue;
    const base = d * B;
    const sh = 11 * (d - 3);
    for (let i = 0; i < m; i++) {
      const h = hi[i];
      const p = c[base + ((h >>> sh) & 0x7ff)]++;
      hi2[p] = h;
      id2[p] = id[i];
    }
    t32 = hi; hi = hi2; hi2 = t32;
    t32 = id; id = id2; id2 = t32;
  }
  if (!skip[5]) {
    for (let i = 0; i < m; i++) id2[c[5 * B + (hi[i] >>> 22)]++] = id[i];
    id = id2;
  }
  if (desc) for (let i = 0; i < m; i++) res[i] = id[m - 1 - i];
  else res.set(id.subarray(0, m), 0);
  return res;
}
