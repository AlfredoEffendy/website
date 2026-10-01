import { describe, expect, it } from 'vitest';
import {
  bimodalDist,
  binomPmf,
  choose,
  expDist,
  ibeta,
  lgamma,
  normCdf,
  normInv,
  poisPmf,
  tCdf,
  tCrit,
  tTwoSidedP,
  uniformDist,
  zCrit,
} from '../src/core/dist';
import { Rng } from '../src/core/rng';
import { Histogram, IntegerCounts, RunningStats, lowerBound, ols, upperBound } from '../src/core/stats';

describe('normal distribution', () => {
  it('CDF matches reference values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 15);
    expect(normCdf(1.96)).toBeCloseTo(0.9750021048517795, 13);
    expect(normCdf(-1)).toBeCloseTo(0.15865525393145707, 13);
    expect(normCdf(3)).toBeCloseTo(0.9986501019683699, 13);
    // Far tail: relative accuracy is what matters at this magnitude.
    expect(normCdf(-8) / 6.220960574271785e-16).toBeCloseTo(1, 7);
  });

  it('quantile is correct in the centre and in both tails', () => {
    expect(normInv(0.975)).toBeCloseTo(1.959963984540054, 10);
    expect(normInv(0.995)).toBeCloseTo(2.5758293035489004, 10);
    expect(normInv(0.9995)).toBeCloseTo(3.290526731491926, 10);
    expect(normInv(0.0005)).toBeCloseTo(-3.290526731491926, 10);
    expect(normInv(0.9)).toBeCloseTo(1.2815515655446004, 10);
  });

  it('z critical values match the table the original lab used', () => {
    expect(zCrit(0.8)).toBeCloseTo(1.282, 3);
    expect(zCrit(0.9)).toBeCloseTo(1.645, 3);
    expect(zCrit(0.95)).toBeCloseTo(1.96, 3);
    expect(zCrit(0.99)).toBeCloseTo(2.576, 3);
  });
});

describe('Student t distribution', () => {
  // Rows of the standard two-sided table: [df, 80%, 90%, 95%, 99%].
  const table = [
    [1, 3.078, 6.314, 12.706, 63.657],
    [2, 1.886, 2.92, 4.303, 9.925],
    [3, 1.638, 2.353, 3.182, 5.841],
    [5, 1.476, 2.015, 2.571, 4.032],
    [9, 1.383, 1.833, 2.262, 3.25],
    [18, 1.33, 1.734, 2.101, 2.878],
    [30, 1.31, 1.697, 2.042, 2.75],
    [48, 1.299, 1.677, 2.011, 2.682],
    [100, 1.29, 1.66, 1.984, 2.626],
  ];

  it('critical values match the published table at every df', () => {
    for (const [df, t80, t90, t95, t99] of table) {
      expect(tCrit(0.8, df)).toBeCloseTo(t80, 3);
      expect(tCrit(0.9, df)).toBeCloseTo(t90, 3);
      expect(tCrit(0.95, df)).toBeCloseTo(t95, 3);
      expect(tCrit(0.99, df)).toBeCloseTo(t99, 3);
    }
  });

  it('two-sided p at the 5% critical value is exactly 0.05', () => {
    for (const df of [1, 2, 3, 10, 18, 48, 200]) {
      expect(tTwoSidedP(tCrit(0.95, df), df)).toBeCloseTo(0.05, 10);
    }
  });

  it('is symmetric and approaches the normal for large df', () => {
    expect(tCdf(-1.3, 7) + tCdf(1.3, 7)).toBeCloseTo(1, 12);
    expect(tCdf(1.96, 1e6)).toBeCloseTo(normCdf(1.96), 5);
    expect(tCrit(0.999, 20)).toBeCloseTo(3.85, 2);
  });

  it('incomplete beta has the right end points and symmetry', () => {
    expect(ibeta(0, 2, 3)).toBe(0);
    expect(ibeta(1, 2, 3)).toBe(1);
    expect(ibeta(0.3, 2, 5) + ibeta(0.7, 5, 2)).toBeCloseTo(1, 12);
    expect(ibeta(0.5, 1, 1)).toBeCloseTo(0.5, 12);
  });
});

describe('discrete distributions', () => {
  it('log-gamma reproduces factorials', () => {
    expect(Math.exp(lgamma(6))).toBeCloseTo(120, 8);
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
  });

  it('binomial pmf sums to 1 and matches a known value', () => {
    let sum = 0;
    for (let k = 0; k <= 20; k++) sum += binomPmf(k, 20, 0.2);
    expect(sum).toBeCloseTo(1, 12);
    expect(binomPmf(3, 20, 0.2)).toBeCloseTo(0.2053641430080907, 10);
    expect(choose(20, 3)).toBe(1140);
    expect(binomPmf(0, 5, 0)).toBe(1);
  });

  it('Poisson pmf sums to 1 and matches a known value', () => {
    let sum = 0;
    for (let k = 0; k <= 60; k++) sum += poisPmf(k, 4);
    expect(sum).toBeCloseTo(1, 12);
    expect(poisPmf(3, 4)).toBeCloseTo(0.19536681481316454, 12);
  });
});

describe('continuous populations', () => {
  it('uniform, exponential and bimodal moments are exact', () => {
    const u = uniformDist(100, 900);
    expect(u.mean).toBe(500);
    expect(u.sd).toBeCloseTo(230.94010767585033, 10);
    const e = expDist(150, 50);
    expect(e.mean).toBe(200);
    expect(e.sd).toBe(150);
    expect(e.cdf(50)).toBe(0);
    const b = bimodalDist(300, 700, 70);
    expect(b.mean).toBe(500);
    expect(b.sd).toBeCloseTo(Math.sqrt(70 * 70 + 200 * 200), 10);
  });
});

describe('samplers (fixed seed)', () => {
  const N = 400_000;
  const moments = (draw: () => number) => {
    const s = new RunningStats();
    for (let i = 0; i < N; i++) s.push(draw());
    return s;
  };

  it('the same seed gives the same sequence', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
    expect(new Rng(43).next()).not.toBe(new Rng(42).next());
  });

  it('uniform draws stay strictly inside (0, 1)', () => {
    const r = new Rng(1);
    for (let i = 0; i < 100_000; i++) {
      const u = r.next();
      expect(u > 0 && u < 1).toBe(true);
    }
  });

  it('normal', () => {
    const r = new Rng(7);
    const s = moments(() => r.normal());
    expect(s.mean).toBeCloseTo(0, 2);
    expect(s.sd).toBeCloseTo(1, 2);
  });

  it('exponential', () => {
    const r = new Rng(8);
    const s = moments(() => r.exponential(20));
    expect(Math.abs(s.mean - 20)).toBeLessThan(0.15);
    expect(Math.abs(s.sd - 20)).toBeLessThan(0.2);
  });

  it('integer uniform covers both end points evenly', () => {
    const r = new Rng(9);
    const c = new IntegerCounts();
    for (let i = 0; i < N; i++) c.add(r.int(1, 8));
    expect(c.lo).toBe(1);
    expect(c.hi).toBe(8);
    for (let k = 1; k <= 8; k++) expect(Math.abs(c.get(k) / N - 0.125)).toBeLessThan(0.004);
  });

  it('binomial, including p above one half and large n', () => {
    for (const [n, p] of [
      [20, 0.2],
      [20, 0.85],
      [1000, 0.5],
    ]) {
      const r = new Rng(10);
      const s = moments(() => r.binomial(n, p));
      expect(Math.abs(s.mean - n * p)).toBeLessThan(0.02 * Math.sqrt(n));
      expect(Math.abs(s.sd - Math.sqrt(n * p * (1 - p)))).toBeLessThan(0.02 * Math.sqrt(n));
    }
  });

  it('Poisson on both sides of the algorithm switch', () => {
    for (const lambda of [4, 29.5, 30, 120]) {
      const r = new Rng(11);
      const s = moments(() => r.poisson(lambda));
      expect(Math.abs(s.mean - lambda)).toBeLessThan(0.02 * Math.sqrt(lambda) + 0.02);
      expect(Math.abs(s.sd - Math.sqrt(lambda))).toBeLessThan(0.03 * Math.sqrt(lambda));
    }
  });

  it('sampling without replacement returns distinct in-range indices', () => {
    const idx = new Rng(12).sampleIndices(500, 50);
    expect(idx.length).toBe(50);
    expect(new Set(idx).size).toBe(50);
    expect(Math.max(...idx)).toBeLessThan(500);
  });
});

describe('statistics helpers', () => {
  it('running stats agree with the direct formulas', () => {
    const s = new RunningStats();
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((x) => s.push(x));
    expect(s.mean).toBe(5);
    expect(s.sdPop).toBe(2);
    expect(s.sd).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });

  it('histogram bins include the upper edge', () => {
    const h = new Histogram(0, 10, 5);
    [0, 1.9, 2, 9.99, 10, 11, -1].forEach((x) => h.add(x));
    expect(Array.from(h.counts)).toEqual([2, 1, 0, 0, 2]);
    expect(h.outside).toBe(2);
    expect(h.max).toBe(2);
  });

  it('integer counts grow in both directions', () => {
    const c = new IntegerCounts();
    [5, 5, 200, -40, 5].forEach((k) => c.add(k));
    expect(c.get(5)).toBe(3);
    expect(c.get(200)).toBe(1);
    expect(c.get(-40)).toBe(1);
    expect(c.get(0)).toBe(0);
    expect([c.lo, c.hi, c.max, c.total]).toEqual([-40, 200, 3, 5]);
  });

  it('binary searches count a closed interval', () => {
    const a = Float64Array.from([1, 2, 2, 3, 5, 8]);
    expect(upperBound(a, 6, 3) - lowerBound(a, 6, 2)).toBe(3);
    expect(upperBound(a, 6, 100) - lowerBound(a, 6, -100)).toBe(6);
  });

  it('least squares reproduces a hand-worked example', () => {
    // x = 1..5, y = 2, 4, 5, 4, 5  →  b1 = 0.6, b0 = 2.2, r = 0.7746, t = 2.1213, p = 0.1240
    const f = ols([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(f.slope).toBeCloseTo(0.6, 12);
    expect(f.intercept).toBeCloseTo(2.2, 12);
    expect(f.r).toBeCloseTo(0.7745966692414834, 12);
    expect(f.t).toBeCloseTo(2.1213203435596424, 10);
    expect(f.p).toBeCloseTo(0.12402706265755453, 8);
    expect(f.df).toBe(3);
  });
});

describe('statistical acceptance checks', () => {
  it('a 95% t interval for a normal mean captures about 95% of the time', () => {
    const r = new Rng(2026);
    const n = 10;
    const crit = tCrit(0.95, n - 1);
    let hits = 0;
    const trials = 20_000;
    for (let i = 0; i < trials; i++) {
      const s = new RunningStats();
      for (let j = 0; j < n; j++) s.push(500 + 100 * r.normal());
      const m = (crit * s.sd) / Math.sqrt(n);
      if (Math.abs(s.mean - 500) <= m) hits++;
    }
    expect(Math.abs(hits / trials - 0.95)).toBeLessThan(0.005);
  });

  it('with no true relationship, 5% of regressions are significant at α = 0.05', () => {
    const r = new Rng(2027);
    let sig = 0;
    const trials = 20_000;
    for (const n of [20, 50]) {
      sig = 0;
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      for (let i = 0; i < trials; i++) {
        for (let j = 0; j < n; j++) {
          xs[j] = r.normal();
          ys[j] = r.normal();
        }
        if (ols(xs, ys).p <= 0.05) sig++;
      }
      expect(Math.abs(sig / trials - 0.05)).toBeLessThan(0.005);
    }
  });
});
