/**
 * Pure deterministic delay-hotspot analytics. The supplied baseline is the explicitly
 * synthetic eight-week demo history. Counts and probabilities are estimates derived
 * from its mean/SD and synthetic planned headways, never observed AVL facts.
 */
import type { Baseline } from '../../sim/baseline';
import { BUCKET_MIN, BUCKETS } from '../../sim/baseline';
import { segmentCentrality } from '../../data/segments';
import type { Route } from '../../sim/types';
import type { I18nKey } from '../../i18n/dict';

export type HotspotWindow = 'am' | 'midday' | 'pm' | 'evening' | 'all';
export const WINDOWS: Record<HotspotWindow, [number, number]> = {
  am: [4, 14], midday: [16, 40], pm: [42, 54], evening: [54, 60], all: [0, 60],
};
const PEAK = new Set<HotspotWindow>(['am', 'pm']);
const Z90 = 1.2816;

export type HotspotRiskLevel = 'low' | 'medium' | 'high';
export interface UpcomingRisk {
  score: number;
  level: HotspotRiskLevel;
  probability_pct: number;
  expected_excess_s: number;
  start_bucket: number;
  route_id: string | null;
}
export interface RecommendationEvidence {
  evidence: 'synthetic_demo';
  selected_dow: number;
  selected_window: HotspotWindow;
  selected_start_bucket: number | null;
  selected_route_id: string | null;
  centrality: 0 | 1 | 2;
  delay_frequency_pct: number;
  recurrence_pct: number;
  contribution_pct: number;
  upcoming_risk_score: number;
  live_trigger_margin_s_per_km: number;
}
export interface Hotspot {
  key: string;
  /** Mean excess over the selected window, s/km. */
  mean: number;
  p10: number;
  p90: number;
  km: number;
  routes: string[];
  /** Seconds-like comparative impact index, not observed passenger-delay seconds. */
  impact_s: number;
  evidence: 'synthetic_demo';
  baseline_weeks: number;
  delay_frequency_pct: number;
  recurrence_pct: number;
  longest_persistent_buckets: number;
  /** Estimated affected scheduled services across baseline weeks; not unique observed buses. */
  affected_buses_est: number;
  affected_buses_pct: number;
  most_affected_days: number[];
  most_affected_windows: HotspotWindow[];
  historical_trend: 'not_available_stationary_demo';
  /** Share across every eligible segment, not only the displayed top five. */
  contribution_pct: number;
  upcoming_risk: UpcomingRisk;
  recommendation_evidence: RecommendationEvidence;
}
export interface HotspotContext {
  dow: number;
  window: HotspotWindow;
  /** Exact 15-minute start bucket, 0=06:00. */
  startBucket?: number;
  /** Limits the candidate segments to this route. */
  routeId?: string;
  n?: number;
}
export interface HotspotAnalysis {
  hotspots: Hotspot[];
  context: { dow: number; window: HotspotWindow; startBucket: number | null; routeId: string | null };
  assumptions: readonly string[];
}

const ASSUMPTIONS = [
  'synthetic 8-week baseline; replace with AVL segment observations in production',
  'affected-service counts use planned headway and assume each scheduled pass traverses its route segments',
  'delay frequency is a normal-distribution estimate from synthetic mean and standard deviation',
  'historical trend is unavailable because the demo baseline is stationary',
] as const;
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}
function daypartHeadway(r: Route, bucket: number): number {
  const hour = 6 + bucket * 0.25;
  if (hour >= 7 && hour < 9.5) return r.planned_headway_s.amPeak;
  if (hour >= 16.5 && hour < 19.5) return r.planned_headway_s.pmPeak;
  if (hour >= 19.5) return r.planned_headway_s.evening;
  return r.planned_headway_s.offPeak;
}
function probabilityPositive(mean: number, sd: number): number {
  return sd <= 0 ? (mean > 0 ? 1 : 0) : normalCdf(mean / sd);
}
function segmentBucketForTrip(r: Route, key: string, startBucket: number): number {
  const edge = r.edges?.find((e) => e.key === key);
  if (!edge || r.length_m <= 0) return startBucket;
  // Explicit demo assumption: 22 km/h end-to-end; evaluate risk at segment midpoint.
  const midpointKm = ((edge.from_m + edge.to_m) / 2) / 1000;
  return clamp(startBucket + Math.round((midpointKm / 22) * (60 / BUCKET_MIN)), 0, BUCKETS - 1);
}
function windowImpact(base: Baseline, key: string, dow: number, win: HotspotWindow, km: number, routeCount: number) {
  const [b0, b1] = WINDOWS[win];
  let value = 0;
  for (let b = b0; b < b1; b++) value += Math.max(0, base.segExcess(key, dow, b).mean) * km * routeCount;
  return value;
}

/** Rich route/day/exact-start analysis for Analytics & Review. */
export function analyzeHotspots(base: Baseline, routes: readonly Route[], context: HotspotContext): HotspotAnalysis {
  const dow = clamp(Math.trunc(context.dow), 0, 6);
  const win = context.window;
  const n = Math.max(0, context.n ?? 5);
  const startBucket = context.startBucket === undefined ? null : clamp(Math.trunc(context.startBucket), 0, BUCKETS - 1);
  const eligibleRoutes = routes.filter((r) => !context.routeId || r.route_id === context.routeId);
  const selectedRouteId = context.routeId && eligibleRoutes.length ? context.routeId : null;
  const [b0, b1] = WINDOWS[win];
  const using = new Map<string, Route[]>();
  const km = new Map<string, number>();
  for (const r of eligibleRoutes) for (const e of r.edges ?? []) {
    const list = using.get(e.key) ?? [];
    if (!list.some((x) => x.route_id === r.route_id)) list.push(r);
    using.set(e.key, list);
    if (!km.has(e.key)) km.set(e.key, Math.abs(e.to_m - e.from_m) / 1000);
  }

  type Work = Omit<Hotspot, 'contribution_pct' | 'recommendation_evidence'>;
  const work: Work[] = [];
  for (const key of base.segKeys) {
    const rs = using.get(key);
    if (!rs?.length) continue;
    const segmentKm = km.get(key) ?? 0;
    let positive = 0, mean = 0, sd = 0, probability = 0, recurrence = 0, services = 0;
    let previousP: number | null = null, run = 0, longestRun = 0;
    for (let b = b0; b < b1; b++) {
      const e = base.segExcess(key, dow, b);
      const p = probabilityPositive(e.mean, e.sd);
      positive += Math.max(0, e.mean); mean += e.mean; sd += e.sd; probability += p;
      if (previousP !== null) recurrence += previousP * p;
      previousP = p;
      if (p >= 0.6) longestRun = Math.max(longestRun, ++run); else run = 0;
      for (const r of rs) services += (BUCKET_MIN * 60) / Math.max(60, daypartHeadway(r, b));
    }
    const buckets = Math.max(1, b1 - b0);
    mean /= buckets; sd /= buckets;
    const frequency = probability / buckets;
    const impact = positive * segmentKm * rs.length;
    const recurrencePct = buckets > 1 ? (recurrence / (buckets - 1)) * 100 : frequency * 100;
    const dayScores = Array.from({ length: 7 }, (_, day) => ({ day, value: windowImpact(base, key, day, win, segmentKm, rs.length) }))
      .sort((a, b) => b.value - a.value || a.day - b.day);
    const windowScores = (Object.keys(WINDOWS) as HotspotWindow[]).filter((w) => w !== 'all')
      .map((window) => ({ window, value: windowImpact(base, key, dow, window, segmentKm, rs.length) }))
      .sort((a, b) => b.value - a.value || a.window.localeCompare(b.window));
    const riskStart = startBucket ?? Math.floor((b0 + b1 - 1) / 2);
    const riskRoute = selectedRouteId ? rs.find((r) => r.route_id === selectedRouteId) : rs[0];
    const arrivalBucket = riskRoute ? segmentBucketForTrip(riskRoute, key, riskStart) : riskStart;
    const riskStat = base.segExcess(key, dow, arrivalBucket);
    const riskProbability = probabilityPositive(riskStat.mean, riskStat.sd);
    const expectedExcess = Math.max(0, riskStat.mean * segmentKm);
    const score = clamp(Math.round(riskProbability * 65 + Math.min(35, expectedExcess / 3)), 0, 100);
    work.push({
      key, mean, p10: mean - Z90 * sd, p90: mean + Z90 * sd, km: segmentKm,
      routes: rs.map((r) => r.route_id), impact_s: impact, evidence: 'synthetic_demo', baseline_weeks: base.weeks,
      delay_frequency_pct: frequency * 100, recurrence_pct: recurrencePct, longest_persistent_buckets: longestRun,
      affected_buses_est: Math.round(services * base.weeks * frequency), affected_buses_pct: frequency * 100,
      most_affected_days: dayScores.slice(0, 2).map((x) => x.day),
      most_affected_windows: windowScores.slice(0, 2).map((x) => x.window),
      historical_trend: 'not_available_stationary_demo',
      // This is an analytical review scale, not an SOP incident level: >=50 flags
      // a senior review candidate, while the store still requires a human escalation.
      upcoming_risk: { score, level: score >= 50 ? 'high' : score >= 35 ? 'medium' : 'low', probability_pct: riskProbability * 100, expected_excess_s: expectedExcess, start_bucket: riskStart, route_id: selectedRouteId },
    });
  }
  const totalImpact = work.reduce((sum, h) => sum + h.impact_s, 0);
  const hotspots = work.map((h): Hotspot => {
    const contribution = totalImpact > 0 ? (h.impact_s / totalImpact) * 100 : 0;
    return { ...h, contribution_pct: contribution, recommendation_evidence: {
      evidence: 'synthetic_demo', selected_dow: dow, selected_window: win, selected_start_bucket: startBucket,
      selected_route_id: selectedRouteId, centrality: segmentCentrality(h.key), delay_frequency_pct: h.delay_frequency_pct,
      recurrence_pct: h.recurrence_pct, contribution_pct: contribution, upcoming_risk_score: h.upcoming_risk.score,
      live_trigger_margin_s_per_km: LIVE_OVER_NORM_S_PER_KM,
    } };
  }).sort((a, b) => b.impact_s - a.impact_s || a.key.localeCompare(b.key)).slice(0, n);
  return { hotspots, context: { dow, window: win, startBucket, routeId: selectedRouteId }, assumptions: ASSUMPTIONS };
}

/** Backward-compatible ranking API. */
export function rankHotspots(base: Baseline, routes: readonly Route[], dow: number, win: HotspotWindow, n = 5): Hotspot[] {
  return analyzeHotspots(base, routes, { dow, window: win, n }).hotspots;
}

/** Live margin above norm (s/km), not a ratio to a potentially zero/negative norm. */
export const LIVE_OVER_NORM_S_PER_KM = 15;
export interface HotspotActionDecision {
  action: I18nKey;
  trigger: 'live_margin_exceeded' | 'central_peak' | 'central_offpeak' | 'arterial' | 'schedule';
  live_over_norm_s_per_km: number | null;
  threshold_s_per_km: number;
  rationale: { key: string; value: number | string | null }[];
}
export function hotspotActionDecision(key: string, win: HotspotWindow, liveOverNorm: number | null): HotspotActionDecision {
  const centrality = segmentCentrality(key);
  if (liveOverNorm !== null && liveOverNorm > LIVE_OVER_NORM_S_PER_KM) return {
    action: 'hs.act.tcc_notify', trigger: 'live_margin_exceeded', live_over_norm_s_per_km: liveOverNorm,
    threshold_s_per_km: LIVE_OVER_NORM_S_PER_KM,
    rationale: [{ key: 'live_over_norm_s_per_km', value: liveOverNorm }, { key: 'trigger_margin_s_per_km', value: LIVE_OVER_NORM_S_PER_KM }],
  };
  const pair: [I18nKey, HotspotActionDecision['trigger']] = centrality === 2
    ? PEAK.has(win) ? ['hs.act.signal_priority', 'central_peak'] : ['hs.act.stop_spacing', 'central_offpeak']
    : centrality === 1 ? ['hs.act.bus_lane', 'arterial'] : ['hs.act.schedule_pad', 'schedule'];
  return { action: pair[0], trigger: pair[1], live_over_norm_s_per_km: liveOverNorm, threshold_s_per_km: LIVE_OVER_NORM_S_PER_KM,
    rationale: [{ key: 'segment_centrality', value: centrality }, { key: 'selected_window', value: win }, { key: 'live_over_norm_s_per_km', value: liveOverNorm }] };
}
export function hotspotAction(key: string, win: HotspotWindow, liveOverNorm: number | null): I18nKey {
  return hotspotActionDecision(key, win, liveOverNorm).action;
}
const TO_TCC = new Set<I18nKey>(['hs.act.tcc_notify', 'hs.act.signal_priority', 'hs.act.bus_lane']);
export function draftFor(action: I18nKey): { recipient: 'tcc' | 'bus_operator'; message_type: 'coordination_request' | 'operational_instruction' } {
  return TO_TCC.has(action) ? { recipient: 'tcc', message_type: 'coordination_request' } : { recipient: 'bus_operator', message_type: 'operational_instruction' };
}
