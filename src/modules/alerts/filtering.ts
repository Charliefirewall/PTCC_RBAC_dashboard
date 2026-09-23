import type { Alert, HistoricalAlertRecord, Severity, AlertType } from '../../sim/types';

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
export interface AlertFilters {
  severity: Severity | 'all';
  type: AlertType | 'all';
  vehicle: string;
  startDate: string;
  endDate: string;
}

const day = (iso: string): string => iso.slice(0, 10);

export function presetRange(preset: Exclude<DatePreset, 'custom'>, anchorIso: string): { startDate: string; endDate: string } {
  // Alert timestamps carry Ulaanbaatar's +08:00 offset. Date presets are operational
  // calendar days, not UTC days; normalising the instant to UTC would turn local
  // midnight on 21 Sep into 20 Sep and hide every live alert until 08:00.
  const anchor = new Date(`${day(anchorIso)}T12:00:00Z`);
  const offset = preset === 'yesterday' ? 1 : preset === '7d' ? 6 : preset === '30d' ? 29 : 0;
  const end = new Date(anchor);
  if (preset === 'yesterday') end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (preset === 'yesterday' ? 0 : offset));
  return { startDate: day(start.toISOString()), endDate: day(end.toISOString()) };
}

export function matchesAlert(a: Alert, filters: AlertFilters): boolean {
  const query = filters.vehicle.trim().toLocaleLowerCase();
  const vehicle = (a.vehicle_id ?? String(a.params.bus ?? '')).toLocaleLowerCase();
  const raised = day(a.raised_at);
  return (
    (filters.severity === 'all' || a.severity === filters.severity) &&
    (filters.type === 'all' || a.type === filters.type) &&
    (!query || vehicle.includes(query)) &&
    (!filters.startDate || raised >= filters.startDate) &&
    (!filters.endDate || raised <= filters.endDate)
  );
}

export function filterAlerts(alerts: readonly Alert[], filters: AlertFilters): Alert[] {
  return alerts.filter((a) => matchesAlert(a, filters));
}

export function filterHistory(records: readonly HistoricalAlertRecord[], filters: AlertFilters): HistoricalAlertRecord[] {
  return records.filter((r) => matchesAlert(r.alert, filters));
}
