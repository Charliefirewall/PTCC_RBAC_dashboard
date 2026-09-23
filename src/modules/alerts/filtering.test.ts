import { describe, expect, it } from 'vitest';
import type { Alert, HistoricalAlertRecord } from '../../sim/types';
import { filterAlerts, filterHistory, presetRange, type AlertFilters } from './filtering';

const alert = (id: string, vehicle_id: string, raised_at: string, severity: Alert['severity'] = 'warning'): Alert => ({
  id, rule_id: 'delay_sop', type: 'service_deviation', severity, vehicle_id, route_id: 'R7',
  title_key: 'alert.service_deviation', params: { bus: vehicle_id }, raised_at, raised_at_s: 1,
  metric: { name: 'delay_min', value: 8, threshold: 5, unit: 'min' }, pax_affected: 20,
  impact_score: 20, tier: 1, acknowledged: false,
});
const base: AlertFilters = { severity: 'all', type: 'all', vehicle: '', startDate: '', endDate: '' };

describe('Alerts & Events combined filtering', () => {
  it('combines partial vehicle, inclusive dates, type and severity', () => {
    const rows = [
      alert('a', '1-062', '2026-09-15T08:00:00Z', 'critical'),
      alert('b', '1-063', '2026-09-22T08:00:00Z', 'warning'),
      { ...alert('c', '2-062', '2026-09-20T08:00:00Z', 'critical'), type: 'security' as const },
    ];
    expect(filterAlerts(rows, { ...base, severity: 'critical', type: 'service_deviation', vehicle: '062', startDate: '2026-09-15', endDate: '2026-09-22' }).map((x) => x.id)).toEqual(['a']);
  });

  it('uses the same predicate for archived actual alerts', () => {
    const record = (a: Alert): HistoricalAlertRecord => ({ alert: a, resolved_at: a.raised_at, resolved_at_s: 2, stops: [], forecasts: [] });
    expect(filterHistory([record(alert('a', '1-062', '2026-09-21T08:00:00Z'))], { ...base, vehicle: '1-06' })).toHaveLength(1);
  });

  it('builds deterministic inclusive preset ranges', () => {
    expect(presetRange('7d', '2026-09-23T12:00:00Z')).toEqual({ startDate: '2026-09-17', endDate: '2026-09-23' });
    expect(presetRange('yesterday', '2026-09-23T12:00:00Z')).toEqual({ startDate: '2026-09-22', endDate: '2026-09-22' });
    expect(presetRange('today', '2026-09-21T00:01:00+08:00')).toEqual({ startDate: '2026-09-21', endDate: '2026-09-21' });
  });
});
