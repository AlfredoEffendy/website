import { lgamma } from './dist';

/** Seeded generator (mulberry32) with the samplers every lab shares. Same seed, same run. */
export class Rng {
  private s: number;
  private spare = NaN;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Uniform on (0, 1): never exactly 0, so logarithms are always finite. */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  }

  /** Integer uniform on [a, b]. */
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  uniform(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  /** Standard normal by the polar method; the second deviate is kept for the next call. */
  normal(): number {
    if (!Number.isNaN(this.spare)) {
      const v = this.spare;
      this.spare = NaN;
      return v;
    }
    let u: number, v: number, r: number;
    do {
      u = 2 * this.next() - 1;
      v = 2 * this.next() - 1;
      r = u * u + v * v;
    } while (r >= 1 || r === 0);
    const f = Math.sqrt((-2 * Math.log(r)) / r);
    this.spare = v * f;
    return u * f;
  }

  exponential(mean: number): number {
    return -mean * Math.log(this.next());
  }

  bernoulli(p: number): boolean {
    return this.next() < p;
  }

  /** Binomial(n, p) by CDF inversion on the smaller of p and 1 − p. */
  binomial(n: number, p: number): number {
    if (p <= 0) return 0;
    if (p >= 1) return n;
    const flip = p > 0.5;
    const q = flip ? 1 - p : p;
    const ratio = q / (1 - q);
    let pmf = Math.pow(1 - q, n);
    let u = this.next();
    let k = 0;
    while (u > pmf && k < n) {
      u -= pmf;
      pmf *= (ratio * (n - k)) / (k + 1);
      k++;
    }
    return flip ? n - k : k;
  }

  /** Poisson(λ): Knuth's product method below 30, Hörmann's PTRS rejection above. */
  poisson(lambda: number): number {
    if (lambda < 30) {
      const limit = Math.exp(-lambda);
      let k = 0;
      let prod = this.next();
      while (prod > limit) {
        k++;
        prod *= this.next();
      }
      return k;
    }
    const slam = Math.sqrt(lambda);
    const loglam = Math.log(lambda);
    const b = 0.931 + 2.53 * slam;
    const a = -0.059 + 0.02483 * b;
    const invalpha = 1.1239 + 1.1328 / (b - 3.4);
    const vr = 0.9277 - 3.6224 / (b - 2);
    for (;;) {
      const u = this.next() - 0.5;
      const v = this.next();
      const us = 0.5 - Math.abs(u);
      const k = Math.floor(((2 * a) / us + b) * u + lambda + 0.43);
      if (us >= 0.07 && v <= vr) return k;
      if (k < 0 || (us < 0.013 && v > us)) continue;
      if (
        Math.log(v) + Math.log(invalpha) - Math.log(a / (us * us) + b) <=
        -lambda + k * loglam - lgamma(k + 1)
      )
        return k;
    }
  }

  /** n distinct indices from 0…N−1 (partial Fisher–Yates: n swaps, not N). */
  sampleIndices(N: number, n: number): Uint32Array {
    const pool = new Uint32Array(N);
    for (let i = 0; i < N; i++) pool[i] = i;
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(this.next() * (N - i));
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, n);
  }
}

/** A fresh seed for "New seed" (not used for anything that must be reproducible). */
export const randomSeed = (): number => (Math.random() * 1e6) | 0 || 1;
