/** Seeded PRNG so every demo run is reproducible (plan section 14.3). */

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  range(lo: number, hi: number): number;
  pick<T>(arr: readonly T[]): T;
  poisson(lambda: number): number;
  normal(mean: number, sd: number): number;
  state(): number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (m) => Math.floor(next() * m),
    range: (lo, hi) => lo + next() * (hi - lo),
    pick: (arr) => arr[Math.floor(next() * arr.length)]!,
    poisson(lambda) {
      if (lambda <= 0) return 0;
      if (lambda > 30) return Math.max(0, Math.round(rng.normal(lambda, Math.sqrt(lambda))));
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= next();
      } while (p > L);
      return k - 1;
    },
    normal(mean, sd) {
      // Box-Muller
      const u = Math.max(next(), 1e-12);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    state: () => a >>> 0,
  };
  return rng;
}

/** One stream per subsystem so adding a draw in one does not perturb another. */
export interface Streams {
  movement: Rng;
  demand: Rng;
  devices: Rng;
  incidents: Rng;
  seed: Rng;
}

export function makeStreams(seed: number): Streams {
  return {
    movement: mulberry32(seed ^ 0x9e3779b9),
    demand: mulberry32(seed ^ 0x85ebca6b),
    devices: mulberry32(seed ^ 0xc2b2ae35),
    incidents: mulberry32(seed ^ 0x27d4eb2f),
    seed: mulberry32(seed),
  };
}
