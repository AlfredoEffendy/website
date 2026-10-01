import { tTwoSidedP } from './dist';

/** Running count, mean and variance (Welford): adding a value never rescans the data. */
export class RunningStats {
  n = 0;
  mean = 0;
  private m2 = 0;

  push(x: number): void {
    this.n++;
    const d = x - this.mean;
    this.mean += d / this.n;
    this.m2 += d * (x - this.mean);
  }

  /** Sample standard deviation (divisor n − 1). */
  get sd(): number {
    return this.n > 1 ? Math.sqrt(this.m2 / (this.n - 1)) : 0;
  }

  /** Standard deviation of the values as a complete set (divisor n). */
  get sdPop(): number {
    return this.n > 0 ? Math.sqrt(this.m2 / this.n) : 0;
  }

  reset(): void {
    this.n = 0;
    this.mean = 0;
    this.m2 = 0;
  }
}

/** Equal-width bins over [lo, hi]; values outside the range are counted in `outside`. */
export class Histogram {
  counts: Uint32Array;
  max = 0;
  outside = 0;
  readonly width: number;

  constructor(
    readonly lo: number,
    readonly hi: number,
    readonly bins: number,
  ) {
    this.counts = new Uint32Array(bins);
    this.width = (hi - lo) / bins;
  }

  add(x: number): void {
    const i = Math.floor((x - this.lo) / this.width);
    if (i < 0 || i >= this.bins) {
      if (x === this.hi) this.bump(this.bins - 1);
      else this.outside++;
      return;
    }
    this.bump(i);
  }

  private bump(i: number): void {
    const c = ++this.counts[i];
    if (c > this.max) this.max = c;
  }
}

/** Dense counts of integer outcomes; grows to cover whatever range has been seen. */
export class IntegerCounts {
  private data = new Uint32Array(64);
  private offset = 0;
  private started = false;
  lo = 0;
  hi = -1;
  max = 0;
  total = 0;

  add(k: number): void {
    if (!this.started) {
      this.offset = k - 16;
      this.lo = this.hi = k;
      this.started = true;
    }
    let i = k - this.offset;
    if (i < 0 || i >= this.data.length) {
      const lo = Math.min(this.lo, k);
      const hi = Math.max(this.hi, k);
      const size = Math.max(64, (hi - lo + 1) * 2);
      const offset = lo - Math.floor((size - (hi - lo + 1)) / 2);
      const next = new Uint32Array(size);
      for (let v = this.lo; v <= this.hi; v++) next[v - offset] = this.data[v - this.offset];
      this.data = next;
      this.offset = offset;
      i = k - offset;
    }
    if (k < this.lo) this.lo = k;
    if (k > this.hi) this.hi = k;
    const c = ++this.data[i];
    if (c > this.max) this.max = c;
    this.total++;
  }

  get(k: number): number {
    const i = k - this.offset;
    return i >= 0 && i < this.data.length ? this.data[i] : 0;
  }
}

/** Index of the first element ≥ x in an ascending array of length n. */
export function lowerBound(a: Float64Array, n: number, x: number): number {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Index of the first element > x in an ascending array of length n. */
export function upperBound(a: Float64Array, n: number, x: number): number {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface Fit {
  n: number;
  df: number;
  slope: number;
  intercept: number;
  r: number;
  /** Residual standard error, √(SSE / (n − 2)). */
  se: number;
  /** Standard error of the slope. */
  seSlope: number;
  t: number;
  /** Exact two-sided p-value for H0: slope = 0. */
  p: number;
  meanX: number;
  meanY: number;
  sxx: number;
  sxy: number;
  minX: number;
  maxX: number;
}

/** Ordinary least squares on centred sums (numerically stable for offset data). */
export function ols(xs: ArrayLike<number>, ys: ArrayLike<number>): Fit {
  const n = xs.length;
  let mx = 0;
  let my = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
    if (xs[i] < minX) minX = xs[i];
    if (xs[i] > maxX) maxX = xs[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const df = n - 2;
  const sse = Math.max(0, syy - slope * sxy);
  const se = Math.sqrt(sse / df);
  const seSlope = se / Math.sqrt(sxx);
  const t = slope / seSlope;
  return {
    n,
    df,
    slope,
    intercept,
    r: sxy / Math.sqrt(sxx * syy),
    se,
    seSlope,
    t,
    p: tTwoSidedP(t, df),
    meanX: mx,
    meanY: my,
    sxx,
    sxy,
    minX,
    maxX,
  };
}

/**
 * Half-width at x of the band for the mean response (confidence) or a new point (prediction).
 * `crit` is the t multiplier for the chosen level; compute it once per draw, not per point.
 */
export function bandHalfWidth(fit: Fit, x: number, crit: number, prediction: boolean): number {
  const d = x - fit.meanX;
  return crit * fit.se * Math.sqrt((prediction ? 1 : 0) + 1 / fit.n + (d * d) / fit.sxx);
}

/** Append-only list of numbers that grows as needed (kept so results can be exported). */
export class Series {
  data = new Float64Array(1024);
  n = 0;

  push(x: number): void {
    if (this.n === this.data.length) {
      const next = new Float64Array(this.n * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.n++] = x;
  }
}
