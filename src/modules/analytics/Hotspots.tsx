/**
 * Delay hotspots (PTCC scenario 3b) - "identify the top 5 road segments causing most
 * buses to get delayed based on historical data (by time and day of the week) and
 * proposed action in advance". Extension - outside R1096 scope.
 *
 * Ranking and action rules are pure (./hotspotRank.ts, unit-tested). This file only adds
 * the live 30-min excess per segment (liveSegExcess, sim date only) and the map hand-off.
 */

import { useMemo, useState } from 'react';
import { useSelection, useSettings, useSim, world } from '../../store';
import { baselineOf, bucketOf, liveSegExcess, SIM_DOW } from '../../sim/baseline';
import { segmentName } from '../../data/segments';
import { EChart, AXIS, CHART_BASE } from '../../charts/EChart';
import { Button, DataTable, Panel, type Column } from '../../components/primitives';
import { Select } from '../../components/kit';
import { useLang, useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import { hotspotAction, rankHotspots, WINDOWS, type Hotspot, type HotspotWindow } from './hotspotRank';

const EM_DASH = '—';

function cssVar(n: string, f: string): string {
  return typeof document === 'undefined' ? f : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
}

type Row = Hotspot & { rank: number; name: string; live: number | null; action: I18nKey };

export default function Hotspots() {
  const t = useT();
  const lang = useLang();
  const dow = useSettings((s) => s.dow);
  const setDow = useSettings((s) => s.setDow);
  const theme = useSettings((s) => s.theme);
  const tick = useSim((s) => s.tick);
  const [win, setWin] = useState<HotspotWindow>('am');
  const base = baselineOf(world);

  const top = useMemo(() => rankHotspots(base, world.routes.filter((r) => r.active), dow, win), [base, dow, win]);

  const rows = useMemo<Row[]>(() => {
    const nowB = bucketOf(world.sim_time_s);
    return top.map((h, i) => {
      const live = liveSegExcess(world, h.key, 1800);
      const normNow = base.segExcess(h.key, SIM_DOW, nowB).mean;
      const liveMean = live.n ? live.mean : null;
      const over = liveMean !== null ? liveMean - normNow : null;
      return { ...h, rank: i + 1, name: segmentName(h.key, lang), live: liveMean, action: hotspotAction(h.key, win, over) };
    });
    // tick: the live column is refreshed every sim step
  }, [top, base, lang, win, tick]);

  const option = useMemo(
    () => ({
      ...CHART_BASE,
      grid: { ...CHART_BASE.grid, left: 30, bottom: 20 },
      xAxis: { type: 'category', data: rows.map((r) => `#${r.rank}`), ...AXIS },
      yAxis: { type: 'value', name: 'min', ...AXIS },
      series: [{ type: 'bar', barWidth: '50%', itemStyle: { color: cssVar('--color-forecast', '#b48cf2') }, data: rows.map((r) => +(r.impact_s / 60).toFixed(1)) }],
    }),
    [rows, theme],
  );

  const columns: Column<Row>[] = [
    { key: 'rank', label: t('hs.col.rank'), num: true },
    { key: 'name', label: t('hs.col.segment') },
    { key: 'mean', label: t('hs.col.mean'), num: true, render: (r) => r.mean.toFixed(1) },
    { key: 'band', label: t('hs.col.band'), num: true, render: (r) => `${r.p10.toFixed(0)} – ${r.p90.toFixed(0)}` },
    { key: 'routes', label: t('hs.col.routes'), mono: true, render: (r) => r.routes.slice(0, 5).join(', ') + (r.routes.length > 5 ? ` +${r.routes.length - 5}` : '') },
    { key: 'impact_s', label: t('hs.col.lost'), num: true, render: (r) => (r.impact_s / 60).toFixed(1) },
    { key: 'live', label: t('hs.col.live'), num: true, render: (r) => (r.live === null ? EM_DASH : r.live.toFixed(1)) },
    { key: 'action', label: t('hs.col.action'), render: (r) => t(r.action) },
  ];

  const showOnMap = () => {
    useSelection.getState().setSegments(top.map((h) => h.key));
    location.hash = '#/map';
  };

  return (
    <Panel
      titleKey="hs.title"
      sub={t('hs.sub')}
      right={
        <Button size="sm" onClick={showOnMap}>
          {t('hs.showMap')}
        </Button>
      }
      bodyClassName="flex flex-col gap-2 p-2"
    >
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t('rp.dow')}
          value={String(dow)}
          onChange={(v) => setDow(+v)}
          options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`dow.${d}` as I18nKey) }))}
        />
        <Select
          label={t('hs.window')}
          value={win}
          onChange={setWin}
          options={(Object.keys(WINDOWS) as HotspotWindow[]).map((w) => ({ value: w, label: t(`hs.win.${w}` as I18nKey) }))}
        />
      </div>
      <div data-hotspots-table>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} compact />
      </div>
      <p className="t-meta">{t('hs.lostNote')}</p>
      <div style={{ height: 160 }}>
        <EChart option={option} />
      </div>
    </Panel>
  );
}
