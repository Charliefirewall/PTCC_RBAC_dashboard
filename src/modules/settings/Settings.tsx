/**
 * Thresholds & Settings - the module that makes the demo's biggest finding visible.
 *
 * Every parameter below is NAMED in the design document's Tables 9-14 and given a
 * value in NONE of them (R1331: "PTCC administrators shall configure"). That gap is
 * the point of this screen: each field carries its source table and a DEMO DEFAULT
 * tag, so nobody in the room can mistake a demo number for a requirement.
 *
 * Changing a value calls `useSettings.set`, which re-evaluates the rules on the spot
 * (store bridge), so the alert list visibly moves while the slider is dragged - the
 * scripted demo beat for "thresholds are configurable, not hard-coded".
 *
 * Dozens of parameters in one scroll is the clutter complaint, so each source table is
 * its own collapsible Panel (first open). The per-field provenance is NOT what gets
 * trimmed - collapsing is.
 */

import { useTx } from '../../i18n/t';
import { engine, useSettings, type Preset } from '../../store';
import { DEFAULT_SPEEDS, type SpeedProfile } from '../../sim/engine';
import { DEMO_DEFAULTS, THRESHOLD_META, type Thresholds } from '../../rules/thresholds';
import { TIMETABLE_PROVENANCE } from '../../sim/timetable';
import { Button, EvidenceTag, Panel, StatusPill } from '../../components/primitives';
import { unreviewedKeys, useT } from '../../i18n/t';
import type { I18nKey } from '../../i18n/dict';
import type { Lang, RoleId } from '../../sim/types';
import { roleLabelKey } from '../roles/roles';
import { useState } from 'react';

const NUMERIC_KEYS = (Object.keys(DEMO_DEFAULTS) as (keyof Thresholds)[]).filter(
  (k) => typeof DEMO_DEFAULTS[k] === 'number',
);

/** Group by the source table, in the order the source lists them. */
// 'PTCC input' first: the only group whose VALUES come from the client (PTCC note, Sept 2026).
const TABLE_ORDER = ['PTCC input', 'Table 9', 'Table 10', 'Table 11', 'Table 12', 'Table 13', 'Table 14', '—'];

const ROLES: RoleId[] = [
  'operations_controller',
  'incident_manager',
  'communication_controller',
  'dispatcher',
  'field_inspector',
  'bus_operator_occ',
  'supervisor',
];

const SPEED_KEYS: (keyof SpeedProfile)[] = [
  'centralPeak',
  'centralOff',
  'arterialPeak',
  'arterialOff',
  'feederPeak',
  'feederOff',
  'suburbanPeak',
  'suburbanOff',
  'freeFlow',
];

/** bg3 reads as a field in BOTH themes; bg2 vanishes against a white light-theme panel. */
const FIELD = 'rounded border border-[var(--color-line)] bg-[var(--color-bg3)]';

/**
 * Every numeric field here writes straight into state the rule engine and the simulation
 * read on the next tick, so a junk value is not a cosmetic problem:
 *
 *   - an emptied field yields `Number('') === 0`, which silently pinned a threshold to
 *     zero and a road speed to 0 km/h - the fleet stops moving mid-demo;
 *   - `Number('1e999')` is `Infinity`, and a threshold of Infinity reaches every panel
 *     that prints it;
 *   - an absurd but finite value (a six-digit planning horizon) is not a NaN, it is a
 *     freeze: `planDepots` builds one column per week.
 *
 * So: an empty or non-finite entry commits NOTHING - the control snaps back to the value
 * the store still holds, and the operator can carry on typing. A finite entry is clamped
 * at the TOP only. The lower bound is deliberately left open: clamping it up to `min` on
 * every keystroke makes the field impossible to type into (typing "50" into a min-10
 * field would jump to 10 after the first digit), and a small or negative threshold is
 * finite - the consumers that could divide by it already guard zero.
 */
function commit(raw: string, max: number, write: (v: number) => void): void {
  const v = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(v)) return;
  write(Math.min(max, v));
}

export default function Settings() {
  const t = useT();
  const tx = useTx();
  const th = useSettings((s) => s.th);
  const lang = useSettings((s) => s.lang);
  const preset = useSettings((s) => s.preset);
  const legend = useSettings((s) => s.legend);
  const role = useSettings((s) => s.role);
  const showEvidence = useSettings((s) => s.showEvidence);
  const llmEnabled = useSettings((s) => s.llmEnabled);
  const l1Auto = useSettings((s) => s.l1_auto_exec);
  const dow = useSettings((s) => s.dow);
  const [speeds, setSpeeds] = useState<SpeedProfile>({ ...engine.speeds });
  const [simSpeed, setSimSpeed] = useState(engine.speed);
  const [changes, setChanges] = useState<{ key: keyof Thresholds; from: number; to: number }[]>([]);

  const groups = TABLE_ORDER.map((table) => ({
    table,
    keys: NUMERIC_KEYS.filter((k) => THRESHOLD_META[k].table === table),
  })).filter((g) => g.keys.length > 0);

  function setSpeed<K extends keyof SpeedProfile>(k: K, v: number) {
    const next = { ...speeds, [k]: v };
    setSpeeds(next);
    engine.speeds = next; // the engine reads this every tick; no React state holds vehicles
  }

  function setThreshold(k: keyof Thresholds, from: number, to: number) {
    useSettings.getState().set(k, to as Thresholds[typeof k]);
    setChanges((xs) => [...xs.slice(-19), { key: k, from, to }]);
  }

  function resetGroup(keys: (keyof Thresholds)[]) {
    for (const k of keys) {
      const current = useSettings.getState().th[k];
      const target = DEMO_DEFAULTS[k];
      if (typeof current === 'number' && typeof target === 'number' && current !== target) setThreshold(k, current, target);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-auto xl:grid-cols-2">
      <Panel titleKey="set.thresholds" className="xl:row-span-2" bodyClassName="p-3">
        <p className="t-meta mb-3">
          {t('set.noValueNote')} {t('set.changeNote')}
        </p>
        <Button variant="ghost" size="sm" onClick={() => useSettings.getState().reset()} className="mb-3">
          {t('set.reset')}
        </Button>

        <div className="flex flex-col gap-2">
          {groups.map((g, i) => (
            <Panel key={g.table} title={tx(g.table)} collapsible defaultOpen={i === 0} summary={g.keys.length} bodyClassName="p-3"
              right={<Button size="sm" variant="ghost" onClick={() => resetGroup(g.keys)}>{t('support.set.resetGroup')}</Button>}>
              {g.keys.map((k) => (
                <ThresholdField key={String(k)} k={k} value={th[k] as number} onCommit={(v) => setThreshold(k, th[k] as number, v)} />
              ))}
              {/* the one non-numeric parameter: a list, shown read-only */}
              {g.table === THRESHOLD_META.video_trigger_events.table && (
                <div className="t-body flex flex-wrap items-center justify-between gap-2 py-1">
                  <span className="text-[var(--color-text2)]">{t('th.video_trigger_events')}</span>
                  <span className="num text-[var(--color-text3)]">{th.video_trigger_events.map(tx).join(', ')}</span>
                </div>
              )}
            </Panel>
          ))}
        </div>
      </Panel>

      <Panel
        titleKey="set.speedProfile"
        bodyClassName="p-3"
        collapsible
        defaultOpen={false}
        summary={`${tx('centralPeak')} ${speeds.centralPeak}`}
      >
        <p className="t-meta mb-2">{t('set.speedNote')}</p>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {SPEED_KEYS.map((k) => (
            <label key={k} className="t-body flex items-center justify-between gap-2 py-1">
              <span className="min-w-0 truncate text-[var(--color-text2)]" title={tx(k)}>
                {tx(k)}
                {k === 'centralPeak' ? <EvidenceTag label="CONFIRMED" cite="CD + S5" className="ml-1" /> : null}
              </span>
              <input
                type="number"
                min={1}
                max={90}
                step={1}
                value={Number.isFinite(speeds[k]) ? speeds[k] : DEFAULT_SPEEDS[k]}
                onChange={(e) => commit(e.target.value, 90, (v) => setSpeed(k, v))}
                className={`num t-body w-16 shrink-0 px-1 py-0.5 text-right ${FIELD}`}
              />
            </label>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSpeeds({ ...DEFAULT_SPEEDS });
            engine.speeds = { ...DEFAULT_SPEEDS };
          }}
          className="mt-2"
        >
          {t('set.reset')}
        </Button>
      </Panel>

      <Panel title={`${t('set.language')} · ${t('set.preset')}`} bodyClassName="p-3">
        <Row label={t('set.language')}>
          <Choice
            options={[
              ['en', 'English'],
              ['mn', 'Монгол'],
            ]}
            value={lang}
            onPick={(v) => useSettings.getState().setLang(v as Lang)}
          />
        </Row>
        <Row label={t('set.preset')}>
          <Choice
            options={[
              ['wall', t('top.presetWall')],
              ['ws', t('top.presetWs')],
              ['laptop', t('top.presetLaptop')],
            ]}
            value={preset}
            onPick={(v) => useSettings.getState().setPreset(v as Preset)}
          />
        </Row>
        {/* S7 shows three route states, S5 four. The client has both; expose the switch. */}
        <Row label={t('set.legend')}>
          <Choice
            options={[
              ['s7', t('set.legendS7')],
              ['s5', t('set.legendS5')],
            ]}
            value={legend}
            onPick={(v) => useSettings.getState().setLegend(v as 's7' | 's5')}
          />
        </Row>
        <Row label={t('set.simSpeed')}>
          <Choice
            options={[
              ['1', '×1'],
              ['12', '×12'],
              ['60', '×60'],
            ]}
            value={String(simSpeed)}
            onPick={(v) => {
              setSimSpeed(Number(v));
              engine.setSpeed(Number(v));
            }}
          />
        </Row>
        <Row label={t('set.evidence')}>
          <Choice
            options={[
              ['on', t('set.on')],
              ['off', t('set.off')],
            ]}
            value={showEvidence ? 'on' : 'off'}
            onPick={(v) => {
              if ((v === 'on') !== showEvidence) useSettings.getState().toggleEvidence();
            }}
          />
        </Row>
        {/* PTCC SOP L1: the human gate on the one automatic action the demo takes. */}
        <Row label={t('set.l1AutoExec')}>
          <Choice
            options={[
              ['on', t('set.on')],
              ['off', t('set.off')],
            ]}
            value={l1Auto ? 'on' : 'off'}
            onPick={(v) => useSettings.getState().setL1AutoExec(v === 'on')}
          />
        </Row>
        <Row label={t('set.dow')}>
          <select
            value={dow}
            onChange={(e) => useSettings.getState().setDow(Number(e.target.value))}
            className={`t-body px-2 py-1 ${FIELD}`}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {t(`dow.${d}` as I18nKey)}
              </option>
            ))}
          </select>
        </Row>
        <p className="t-meta -mt-1 mb-1">{t('support.set.day')}</p>
        <Row label={t('set.role')}>
          <select
            value={role}
            onChange={(e) => useSettings.getState().setRole(e.target.value as RoleId)}
            className={`t-body px-2 py-1 ${FIELD}`}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(roleLabelKey(r))}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('set.llm')}>
          <StatusPill tone={llmEnabled ? 'warn' : 'ok'}>{llmEnabled ? t('set.on') : t('set.off')}</StatusPill>
        </Row>
        <p className="t-meta mt-1">{t('set.llmNote')}</p>
      </Panel>

      <Panel titleKey="support.set.log" bodyClassName="p-3" collapsible defaultOpen={false} summary={changes.length}>
        {changes.length === 0 ? <p className="t-meta">{t('support.set.noChanges')}</p> : (
          <ol className="flex max-h-48 flex-col gap-1 overflow-auto">
            {[...changes].reverse().map((c, i) => (
              <li key={`${String(c.key)}-${i}`} className="t-meta flex justify-between gap-3 border-b border-[var(--color-line-soft)] py-1">
                <span>{t(THRESHOLD_META[c.key].labelKey as I18nKey)}</span>
                <span className="num">{c.from} → {c.to} {tx(THRESHOLD_META[c.key].unit)}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel
        titleKey="set.provenance"
        bodyClassName="p-3"
        collapsible
        defaultOpen={false}
        summary={`${unreviewedKeys().length} ${t('set.unreviewed')}`}
      >
        <Prov label={t('set.provTimetable')} evidence="ASSUMPTION" body={TIMETABLE_PROVENANCE} />
        <Prov label={t('set.provGeometry')} evidence="INFERRED" body={t('set.provGeometryNote')} />
        <Prov label={t('set.provValues')} evidence="ASSUMPTION" body={t('set.provValuesNote')} />
        <Prov label={t('set.provCost')} evidence="FUTURE" body={t('set.provCostNote')} />
        <div className="t-body mt-2 flex items-center justify-between border-t border-[var(--color-line)] pt-2">
          <span className="text-[var(--color-text2)]">{t('set.unreviewed')}</span>
          <span className="num text-[var(--color-sev-warn)]">{unreviewedKeys().length}</span>
        </div>
      </Panel>
    </div>
  );
}

function ThresholdField({ k, value, onCommit }: { k: keyof Thresholds; value: number; onCommit: (v: number) => void }) {
  const t = useT();
  const tx = useTx();
  const m = THRESHOLD_META[k];
  const label = t(m.labelKey as I18nKey);
  // A stored value that is somehow not finite must not become `value={NaN}` on a
  // controlled input - React would render an empty box with no way back. Fall back to
  // the field's own minimum; `set.reset()` restores the demo default either way.
  const safe = Number.isFinite(value) ? value : m.min;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-2">
        {/* min-w-0 truncate: a long label must never push the input off the row */}
        <span className="t-body min-w-0 truncate text-[var(--color-text2)]" title={label}>
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={m.min}
            max={m.max}
            step={m.step}
            value={safe}
            onChange={(e) => commit(e.target.value, m.max, onCommit)}
            // Two controls (number + range) drive the same value, so a <label> wrapper
            // could only name one of them. Both were unnamed before.
            aria-label={label}
            className={`num t-body w-20 px-1 py-0.5 text-right ${FIELD}`}
          />
          <span className="t-meta w-8">{tx(m.unit)}</span>
        </span>
      </div>
      <input
        type="range"
        min={m.min}
        max={m.max}
        step={m.step}
        value={safe}
        onChange={(e) => commit(e.target.value, m.max, onCommit)}
        aria-label={label}
        className="w-full"
        style={{ accentColor: 'var(--color-accent)' }}
      />
      <div className="flex items-center gap-2">
        <EvidenceTag label={m.table === 'PTCC input' ? 'CONFIRMED' : 'ASSUMPTION'} cite={m.table} />
        <span className="t-meta uppercase tracking-wider">{t('set.demoDefault')}</span>
        <span className="t-meta ml-auto">{t('support.set.preview')}: <span className="num">{String(DEMO_DEFAULTS[k])} → {safe}</span></span>
      </div>
    </div>
  );
}

/**
 * One settings row.
 *
 * It was a <div> with a <span>, which is why the role <select> below had no accessible
 * name: the visible label was never associated with the control. A <label> element does
 * that with no aria and no id plumbing. Each row holds at most one labelable control
 * (Choice renders buttons, which are not labelable and carry their own text), so the
 * implicit association is unambiguous.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="t-body flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] py-1.5 last:border-0">
      <span className="text-[var(--color-text2)]">{label}</span>
      {children}
    </label>
  );
}

function Choice({
  options,
  value,
  onPick,
}: {
  options: [string, string][];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className="t-body rounded border px-2 py-0.5"
          style={{
            borderColor: v === value ? 'var(--color-accent)' : 'var(--color-line)',
            color: v === value ? 'var(--color-accent)' : 'var(--color-text2)',
          }}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function Prov({
  label,
  body,
  evidence,
}: {
  label: string;
  body: string;
  evidence: 'CONFIRMED' | 'INFERRED' | 'ASSUMPTION' | 'FUTURE';
}) {
  return (
    <div className="mb-2 border-b border-[var(--color-line)] pb-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className="t-body font-semibold text-[var(--color-text2)]">{label}</span>
        <EvidenceTag label={evidence} />
      </div>
      <p className="t-meta">{body}</p>
    </div>
  );
}
