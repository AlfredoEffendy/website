import { type Continuous, bimodalDist, expDist, normalDist, uniformDist } from './dist';
import type { Rng } from './rng';

export type PopKind = 'uniform' | 'normal' | 'exp' | 'bimodal';

export interface Population {
  dist: Continuous;
  draw(r: Rng): number;
}

/**
 * The four parent populations shared by the sampling labs, on an axis from 0 to `max`.
 * `spread` holds the three widths as fractions of `max`: normal SD, exponential mean, bimodal SD.
 */
export function population(
  kind: PopKind,
  max: number,
  spread: { normal: number; exp: number; bimodal: number },
): Population {
  switch (kind) {
    case 'uniform': {
      const a = 0.1 * max;
      const b = 0.9 * max;
      return { dist: uniformDist(a, b), draw: (r) => r.uniform(a, b) };
    }
    case 'normal': {
      const mu = 0.5 * max;
      const sd = spread.normal * max;
      return { dist: normalDist(mu, sd), draw: (r) => mu + sd * r.normal() };
    }
    case 'exp': {
      const shift = 0.05 * max;
      const mean = spread.exp * max;
      return { dist: expDist(mean, shift), draw: (r) => shift + r.exponential(mean) };
    }
    case 'bimodal': {
      const m1 = 0.3 * max;
      const m2 = 0.7 * max;
      const sd = spread.bimodal * max;
      return {
        dist: bimodalDist(m1, m2, sd),
        draw: (r) => (r.next() < 0.5 ? m1 : m2) + sd * r.normal(),
      };
    }
  }
}
