/** Minimal geo helpers - avoids a turf dependency for three functions. */

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const la1 = rad(a[1]);
  const la2 = rad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Cumulative distance array for a polyline, length = shape.length. */
export function cumulative(shape: [number, number][]): Float64Array {
  const out = new Float64Array(shape.length);
  for (let i = 1; i < shape.length; i++) out[i] = out[i - 1]! + haversine(shape[i - 1]!, shape[i]!);
  return out;
}

export function bearing(a: [number, number], b: [number, number]): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Point at a fractional distance along a polyline. Returns [lon, lat, headingDeg].
 * Interpolating along the shape (not straight-line between ticks) keeps buses on
 * the road through curves - see plan section 20.5.
 */
export function pointAlong(
  shape: [number, number][],
  cum: Float64Array,
  frac: number,
): [number, number, number] {
  const total = cum[cum.length - 1]!;
  if (total === 0 || shape.length < 2) return [shape[0]![0], shape[0]![1], 0];
  const target = Math.min(Math.max(frac, 0), 1) * total;
  // binary search the segment
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid]! <= target) lo = mid;
    else hi = mid;
  }
  const segLen = cum[hi]! - cum[lo]!;
  const t = segLen > 0 ? (target - cum[lo]!) / segLen : 0;
  const a = shape[lo]!;
  const b = shape[hi]!;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, bearing(a, b)];
}
