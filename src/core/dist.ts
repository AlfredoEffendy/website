// Exact distribution functions. Everything the labs report as "theory" comes from here.

const SQRT_2PI = 2.5066282746310002;

/** ln Γ(x) for x > 0 (Lanczos, g = 7, n = 9; ~15 significant digits). */
export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function normPdf(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI);
}

/** Standard normal CDF, double precision (West 2005). */
export function normCdf(x: number): number {
  const z = Math.abs(x);
  let c = 0;
  if (z <= 37) {
    const e = Math.exp((-z * z) / 2);
    if (z < 7.07106781186547) {
      let n = 3.52624965998911e-2 * z + 0.700383064443688;
      n = n * z + 6.37396220353165;
      n = n * z + 33.912866078383;
      n = n * z + 112.079291497871;
      n = n * z + 221.213596169931;
      n = n * z + 220.206867912376;
      let d = 8.83883476483184e-2 * z + 1.75566716318264;
      d = d * z + 16.064177579207;
      d = d * z + 86.7807322029461;
      d = d * z + 296.564248779674;
      d = d * z + 637.333633378831;
      d = d * z + 793.826512519948;
      d = d * z + 440.413735824752;
      c = (e * n) / d;
    } else {
      let f = z + 0.65;
      f = z + 4 / f;
      f = z + 3 / f;
      f = z + 2 / f;
      f = z + 1 / f;
      c = e / f / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}

/** Standard normal quantile: Acklam's approximation (all three branches) plus one Halley step. */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let x: number;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - lo) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normCdf(x) - p;
  const u = e * SQRT_2PI * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Continued fraction for the incomplete beta function (modified Lentz). */
function betacf(a: number, b: number, x: number): number {
  const TINY = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
export function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

export function tPdf(t: number, df: number): number {
  return (
    Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) /
    Math.sqrt(df * Math.PI) /
    Math.pow(1 + (t * t) / df, (df + 1) / 2)
  );
}

/** Two-sided tail probability P(|T| ≥ |t|) for Student's t with df degrees of freedom. */
export function tTwoSidedP(t: number, df: number): number {
  if (!isFinite(t)) return 0;
  return ibeta(df / (df + t * t), df / 2, 0.5);
}

export function tCdf(t: number, df: number): number {
  const tail = 0.5 * tTwoSidedP(t, df);
  return t > 0 ? 1 - tail : tail;
}

/** Student t quantile by safeguarded Newton iteration on the exact CDF. */
export function tInv(p: number, df: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  if (p < 0.5) return -tInv(1 - p, df);
  let lo = 0;
  let hi = 2;
  while (tCdf(hi, df) < p) {
    lo = hi;
    hi *= 2;
    if (hi > 1e12) return hi;
  }
  const z = normInv(p);
  let x = Math.min(Math.max(z + (z * z * z + z) / (4 * df), lo), hi);
  for (let i = 0; i < 100; i++) {
    const f = tCdf(x, df) - p;
    if (f > 0) hi = x;
    else lo = x;
    let next = x - f / tPdf(x, df);
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - x) <= 1e-13 * Math.max(1, Math.abs(x))) return next;
    x = next;
  }
  return x;
}

/** Two-sided critical value: the t* with central area `level` (e.g. 0.95). */
export const tCrit = (level: number, df: number): number => tInv(1 - (1 - level) / 2, df);
export const zCrit = (level: number): number => normInv(1 - (1 - level) / 2);

export function binomPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n || k !== Math.floor(k)) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(
    lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log1p(-p),
  );
}

export function poisPmf(k: number, lambda: number): number {
  if (k < 0 || k !== Math.floor(k)) return 0;
  return Math.exp(k * Math.log(lambda) - lambda - lgamma(k + 1));
}

/** n choose k, exact for the sizes the labs use (rounded from log-gamma above 2^53). */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** A continuous population with closed-form density, CDF, mean and SD. */
export interface Continuous {
  mean: number;
  sd: number;
  pdf(x: number): number;
  cdf(x: number): number;
  /** Plot range that holds essentially all of the mass. */
  lo: number;
  hi: number;
}

export function normalDist(mu: number, sigma: number): Continuous {
  return {
    mean: mu,
    sd: sigma,
    pdf: (x) => normPdf(x, mu, sigma),
    cdf: (x) => normCdf((x - mu) / sigma),
    lo: mu - 4 * sigma,
    hi: mu + 4 * sigma,
  };
}

export function uniformDist(a: number, b: number): Continuous {
  const w = b - a;
  return {
    mean: (a + b) / 2,
    sd: w / Math.sqrt(12),
    pdf: (x) => (x >= a && x <= b ? 1 / w : 0),
    cdf: (x) => (x <= a ? 0 : x >= b ? 1 : (x - a) / w),
    lo: a - 0.08 * w,
    hi: b + 0.08 * w,
  };
}

/** Exponential with the given mean, shifted right by `shift`. */
export function expDist(mean: number, shift = 0): Continuous {
  return {
    mean: shift + mean,
    sd: mean,
    pdf: (x) => (x < shift ? 0 : Math.exp(-(x - shift) / mean) / mean),
    cdf: (x) => (x < shift ? 0 : 1 - Math.exp(-(x - shift) / mean)),
    lo: shift - 0.04 * mean * 7,
    hi: shift + 7 * mean,
  };
}

/** Equal-weight mixture of N(m1, s) and N(m2, s). */
export function bimodalDist(m1: number, m2: number, s: number): Continuous {
  const half = (m2 - m1) / 2;
  return {
    mean: (m1 + m2) / 2,
    sd: Math.sqrt(s * s + half * half),
    pdf: (x) => 0.5 * normPdf(x, m1, s) + 0.5 * normPdf(x, m2, s),
    cdf: (x) => 0.5 * normCdf((x - m1) / s) + 0.5 * normCdf((x - m2) / s),
    lo: m1 - 4 * s,
    hi: m2 + 4 * s,
  };
}
