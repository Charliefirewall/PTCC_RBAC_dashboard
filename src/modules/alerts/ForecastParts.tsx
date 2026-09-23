/**
 * Forecast tab pieces from the recommended-answer enhancements:
 *   E6  "How the forecast works" - the model's own terms for one row, in plain words
 *   E7  forecast vs what actually happened - the scorecard
 *   E8  watch list - the routes closest to being listed, greyed, when the list is quiet
 *   E9  all horizons at once - routes x (+15, +30, +45, +1h)
 *
 * Everything reads useForecast; nothing here touches the live alert list.
 */

import { Empty, EvidenceTag, Panel } from '../../components/primitives';
import type { I18nKey } from '../../i18n/dict';
import { useT } from '../../i18n/t';
import { HORIZONS, type ForecastAlert } from '../../rules/forecast';
import { hhmm } from '../../sim/engine';
import { overlay } from '../../store/overlay';
import { useForecast } from '../../store/forecast';
import { LevelBadge } from './sop';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const min = (s: number) => `${s >= 0 ? '+' : '−'}${Math.abs(s / 60).toFixed(1)}`;

/** E6: open the explanation for one forecast row. */
export function openHowItWorks(a: ForecastAlert, title: string) {
  overlay.openModal({ id: 'fc.how', title, body: <HowItWorks a={a} /> });
}

function HowItWorks({ a }: { a: ForecastAlert }) {
  const t = useT();
  const x = a.terms;
  return (
    <div className="flex flex-col gap-3 text-[12px]" data-how-it-works="">
      <p className="text-[var(--color-text2)]">{t('fc.how.intro')}</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>{t('fc.how.step1')}</li>
        <li>{t('fc.how.step2', { tau: x?.tau_min ?? 30 })}</li>
        <li>{t('fc.how.step3')}</li>
      </ol>
      {x ? (
        <div className="num rounded border border-[var(--color-forecast)] p-2 text-[11px]">
          <div className="panel-title mb-1">{t('fc.how.thisRow', { route: a.route_id ?? '', h: a.horizon_min })}</div>
          <div>{t('fc.how.norm', { v: min(x.norm_h_s) })}</div>
          <div>{t('fc.how.drift', { v: min(x.drift_s), f: x.fade.toFixed(2) })}</div>
          <div>{t('fc.how.seg', { v: min(x.seg_s), f: x.fade.toFixed(2) })}</div>
          <div className="mt-1 font-semibold text-[var(--color-forecast)]">
            {t('fc.how.result', { v: min(x.norm_h_s + (x.drift_s + x.seg_s) * x.fade), p: pct(a.probability), c: a.confidence.toFixed(2) })}
          </div>
        </div>
      ) : (
        <p className="t-meta">{t('fc.how.network')}</p>
      )}
      <p className="t-meta">{t('fc.how.honest')}</p>
    </div>
  );
}

/** E8: shown under an empty list so the tab demonstrates the capability in a quiet network. */
export function WatchList({ h }: { h: (typeof HORIZONS)[number] }) {
  const t = useT();
  const watch = useForecast((s) => s.watch[h]);
  if (!watch.length) return null;
  return (
    <div className="border-t border-[var(--color-line)] px-3 py-2 opacity-70" data-watch-list="">
      <div className="panel-title mb-1">{t('fc.watch.title')}</div>
      <ul className="num flex flex-col gap-0.5 text-[11px] text-[var(--color-text3)]">
        {watch.map((w) => (
          <li key={w.route_id} data-watch-row="">
            {w.route_id} · {t('fc.watch.row', { p: pct(w.probability), v: min(w.mu_min * 60) })}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** E9: routes x horizons, so a problem can be seen growing or fading over the hour. */
export function HorizonMatrix() {
  const t = useT();
  const byH = useForecast((s) => s.byHorizon);
  const routes = [...new Set(HORIZONS.flatMap((h) => byH[h].map((a) => a.route_id ?? 'net')))];
  if (!routes.length) return <Empty tone="ok" title={t('fc.none', { h: 60 })} text={t('fc.noneHint')} />;
  const cell = (route: string, h: (typeof HORIZONS)[number]) => byH[h].find((a) => (a.route_id ?? 'net') === route);
  return (
    <table className="num w-full text-[11px]" data-horizon-matrix="">
      <thead className="text-left text-[var(--color-text3)]">
        <tr>
          <th className="px-2 py-1">{t('fc.matrix.route')}</th>
          {HORIZONS.map((h) => (
            <th key={h} className="px-2 py-1">+{h === 60 ? '1h' : `${h}m`}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {routes.map((r) => (
          <tr key={r} className="border-t border-[var(--color-line)]">
            <td className="px-2 py-1 font-semibold">{r === 'net' ? t('fc.matrix.network') : r}</td>
            {HORIZONS.map((h) => {
              const a = cell(r, h);
              return (
                <td key={h} className="px-2 py-1">
                  {a ? (
                    <span className="inline-flex items-center gap-1">
                      <LevelBadge level={a.level} forecast />
                      <span className="text-[var(--color-forecast)]">{pct(a.probability)}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--color-text3)]">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** E7: forecast vs what actually happened. */
export function ScorecardPanel() {
  const t = useT();
  const score = useForecast((s) => s.score);
  const recent = score.resolved.slice(0, 8);
  const mark = { hit: '✓', lower: '≈', miss: '✗' } as const;
  return (
    <Panel
      title={t('fc.score.title')}
      right={<EvidenceTag label="ASSUMPTION" cite="SIMULATED" />}
      className="shrink-0"
      collapsible
      defaultOpen
      bodyClassName="p-2"
    >
      <div className="num mb-2 flex flex-wrap gap-3 text-[11px]" data-scorecard="">
        {HORIZONS.map((h) => {
          const s = score.stats[h];
          return (
            <span key={h} className="rounded border border-[var(--color-line)] px-2 py-0.5">
              +{h === 60 ? '1h' : `${h}m`}: {s ? t('fc.score.rate', { hits: s.hits, n: s.n, p: pct(s.hits / Math.max(1, s.n)) }) : t('fc.score.none')}
            </span>
          );
        })}
        <span className="t-meta">{t('fc.score.pending', { n: score.pending.length })}</span>
      </div>
      {recent.length === 0 ? (
        <p className="t-meta">{t('fc.score.empty')}</p>
      ) : (
        <ul className="num flex flex-col gap-0.5 text-[11px]">
          {recent.map((r) => (
            <li key={`${r.route_id}|${r.h}|${r.made_at_s}`} data-score-row={r.outcome}>
              <span className={r.outcome === 'hit' ? 'text-[var(--color-sev-ok)]' : r.outcome === 'miss' ? 'text-[var(--color-sev-crit)]' : 'text-[var(--color-sev-warn)]'}>
                {mark[r.outcome]}
              </span>{' '}
              {t('fc.score.row', {
                at: hhmm(r.made_at_s),
                route: r.route_id,
                level: r.level,
                p: pct(r.probability),
                h: r.h,
                outcome: t(`fc.score.${r.outcome}` as I18nKey, { level: r.actual_level }),
              })}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
