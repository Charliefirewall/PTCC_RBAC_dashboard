/**
 * Demo scenarios D1-D9.
 *
 * Every one is a DOCUMENTED workflow from the source material, not an invention -
 * see the `source` field on each. Hotkeys 1-9 fire them; N advances a multi-step
 * scenario; 0 resets.
 */

import { seedDeviceBaseline } from '../data/build';
import type { World } from './types';

export type ScenarioId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9';

export interface Step {
  label: string;
  role?: string;
  apply(w: World, t: number): void;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  source: string;
  steps: Step[];
  reset(w: World): void;
}

const V = (w: World, id: string) => w.vehicleById.get(id);

function vehiclesOn(w: World, route_id: string) {
  return w.vehicles.filter((v) => v.route_id === route_id && v.status === 'in_service');
}

function clearFlags(w: World) {
  for (const v of w.vehicles) {
    v.flags = {};
    if (v.status === 'breakdown') v.status = 'in_service';
    // Scenarios that hard-set pax_count (D2, D8) would otherwise leave the board red
    // for several sim-minutes while passengers alight a few per cent per stop. The
    // presenter presses 0 to get a clean slate, so give them one: fall back to a
    // resting occupancy proportional to the route's own demand weight.
    const r = w.routeById.get(v.route_id);
    const resting = Math.round(v.capacity * 0.1 * Math.min(2.2, r?.demand_weight ?? 1));
    if (v.pax_count > resting) v.pax_count = resting;
    v.left_behind = 0;
    v.driver_status = 'normal';
    v.door_status = 'normal';
    // Scenarios push schedule_deviation to 900-1080 s. The engine's mean reversion
    // (x0.9995 per tick) needs ~20 sim-minutes to walk that back, so without this the
    // board still showed ~23 critical vehicles after the presenter pressed 0.
    // +/-240 s is inside the normal operating spread, not an artificial zero.
    v.schedule_deviation = Math.max(-240, Math.min(240, v.schedule_deviation));
  }
  w.flagUntil.clear();
  w.congestion.clear();
  w.demandBoost.clear();
  w.suspended.clear();
  w.feed_stale = false;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  // ---------------------------------------------------------------- D1
  D1: {
    id: 'D1',
    title: 'Service gap and bunching on R7 / R12',
    source: 'S8 Chart B (28-min gap vs ~10-min plan) · L1054–L1055 · R2640',
    steps: [
      {
        label: 'Congestion on the central corridor; two R7 buses held',
        apply(w, t) {
          w.congestion.set('R7', { factor: 0.25, until_s: t + 2400 });
          w.congestion.set('R12', { factor: 0.3, until_s: t + 2400 });
          // open a gap: push the leaders forward, hold the followers
          const r7 = vehiclesOn(w, 'R7').sort((a, b) => a.trip_progress - b.trip_progress);
          if (r7.length >= 3) {
            r7[0]!.trip_progress = (r7[0]!.trip_progress + 0.22) % 1;
            r7[1]!.schedule_deviation = 720;
            r7[2]!.schedule_deviation = 760; // bunched pair behind the gap
            r7[2]!.trip_progress = (r7[1]!.trip_progress + 0.004) % 1;
          }
          const lead = V(w, '3-015');
          if (lead) lead.schedule_deviation = 1080; // S8: R12 +18 min
        },
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D2
  D2: {
    id: 'D2',
    title: 'Overcrowding — R5 at 96 %',
    source: 'S8 Charts C/D · L1021 · L1042 · S10 "High load" = Warning',
    steps: [
      {
        label: 'Demand spike on the central routes',
        apply(w, t) {
          const target: [string, number][] = [['R5', 0.96], ['R18', 0.91], ['R22', 0.87], ['R10', 0.78], ['R3', 0.72]];
          for (const [rid, load] of target) {
            w.demandBoost.set(rid, { factor: 2.4, until_s: t + 1800 });
            for (const v of vehiclesOn(w, rid)) {
              v.pax_count = Math.round(v.capacity * load);
              v.left_behind = Math.round(v.capacity * (load - 0.6) * 0.5);
            }
          }
        },
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D3
  D3: {
    id: 'D3',
    title: 'Vehicle breakdown — the PTCC / Operator-OCC boundary',
    source: 'R2627–R2642 Scenario A · L1359–L1366 breakdown playbook · L718',
    steps: [
      {
        label: 'Bus 3-015 breaks down on Bayankhoshuu Rd',
        apply(w, t) {
          const v = V(w, '3-015') ?? vehiclesOn(w, 'R12')[0];
          if (v) {
            v.status = 'breakdown';
            v.speed = 0;
            v.schedule_deviation = 1080;
          }
          // followers catch up -> bunching, which is what PTCC actually manages
          const r12 = vehiclesOn(w, 'R12');
          if (r12.length >= 2) r12[1]!.trip_progress = Math.max(0, (v?.trip_progress ?? 0.5) - 0.006);
          w.congestion.set('R12', { factor: 0.5, until_s: t + 1800 });
        },
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D4
  D4: {
    id: 'D4',
    title: 'Traffic accident — compulsory-action gate and evidence',
    source: 'L1367–L1374 playbook · L1337–L1347 gate + override · L1384–L1392 evidence',
    steps: [
      {
        label: 'Harsh braking on Route 23',
        apply(w) {
          const v = V(w, '1-042') ?? vehiclesOn(w, 'R23')[0];
          if (v) v.flags.harsh_braking = true;
        },
      },
      {
        label: 'Accident confirmed at Peace Ave / Bayangol; lane blocked',
        apply(w, t) {
          const v = V(w, '1-042') ?? vehiclesOn(w, 'R23')[0];
          if (v) {
            v.flags.accident = true;
            v.speed = 0;
          }
          w.congestion.set('R23', { factor: 0.2, until_s: t + 2400 });
        },
      },
      {
        label: 'Buses behind divert around the blocked lane',
        role: 'Operator OCC',
        apply(w) {
          // The diversion step of the same accident playbook: with the lane gone the
          // followers leave the corridor. That is what `route_deviation` is for - the
          // engine offsets them off the route shape and slows them, and the rule engine
          // raises the service_deviation warning the controller has to confirm.
          const acc = V(w, '1-042');
          for (const v of vehiclesOn(w, 'R23').filter((x) => x !== acc).slice(0, 2)) {
            v.flags.route_deviation = true;
          }
        },
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D5
  D5: {
    id: 'D5',
    title: 'Bus 305 panic button',
    source: 'S7 alert row · R1125 video auto-trigger · L1211',
    steps: [
      {
        label: 'Panic activation, Bus 305',
        apply(w) {
          const v = V(w, '3-305') ?? vehiclesOn(w, 'R12')[1];
          if (v) {
            v.flags.panic = true;
            v.driver_status = 'alert';
            v.speed = 0;
          }
        },
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D6
  D6: {
    id: 'D6',
    title: 'Equipment failure and the repeated-failure pattern',
    source: 'S7/S9 counters · L1119–L1122 · L1124 repeated failures · L1349–L1358',
    steps: [
      {
        label: 'AFC offline on Bus 2-418 plus the S7/S9 opening counts',
        apply(w) {
          const v = V(w, '2-418');
          if (v) v.equipment.afc = 'offline';
          const opB = w.vehicles.filter((x) => x.operator_id === 'B' && x.status === 'in_service');
          for (let i = 0; i < 5 && i < opB.length; i++) opB[i * 13 % opB.length]!.equipment.afc = 'offline';
          const others = w.vehicles.filter((x) => x.operator_id !== 'B' && x.status === 'in_service');
          for (let i = 0; i < 2; i++) others[i * 17 % others.length]!.equipment.afc = 'offline';
          for (let i = 0; i < 3; i++) others[50 + i * 11]!.equipment.cctv = 'offline';
          for (let i = 0; i < 2; i++) others[200 + i * 7]!.equipment.tbox = 'offline';
        },
      },
    ],
    reset(w) {
      // Restore the S7/S9 opening counts, do not zero them - see seedDeviceBaseline.
      seedDeviceBaseline(w.vehicles);
    },
  },

  // ---------------------------------------------------------------- D7 (flagship)
  D7: {
    id: 'D7',
    title: 'Multi-corridor flooding, Level 3',
    source: 'R2910–R2950 Table 40 — six phases, 19 steps · L2416–L2423 · R2898–R2909 roles',
    steps: [
      {
        label: 'Phase 1 · Initial alert — flooding reported on three corridors',
        role: 'Driver / Dispatcher',
        apply(w, t) {
          for (const rid of ['R7', 'R12', 'R23']) {
            w.congestion.set(rid, { factor: 0.1, until_s: t + 7200 });
            for (const v of vehiclesOn(w, rid)) v.speed = 0;
          }
        },
      },
      {
        label: 'Phase 1 · Verification — AVL, CCTV and UB Card anomalies checked',
        role: 'Operations Controller',
        apply(w) {
          for (const rid of ['R7', 'R12', 'R23']) {
            for (const v of vehiclesOn(w, rid)) v.schedule_deviation = Math.max(v.schedule_deviation, 900);
          }
        },
      },
      {
        label: 'Phase 1 · Assessment — multi-corridor impact confirmed',
        role: 'PTCC Incident Manager',
        apply() {},
      },
      {
        label: 'Phase 2 · Escalation — Level 3 declared by the Emergency Commission / SEC',
        role: 'External authority',
        apply() {},
      },
      {
        label: 'Phase 2 · Inter-agency setup — communication log opened',
        role: 'Communication Controller',
        apply() {},
      },
      {
        label: 'Phase 3A · Diversions approved and issued; standby buses deployed',
        role: 'Incident Manager → Operator OCC',
        apply(w) {
          w.suspended.add('R23');
          w.congestion.set('R7', { factor: 0.55, until_s: w.sim_time_s + 3600 });
        },
      },
      {
        label: 'Phase 3B · Passenger messaging drafted, validated and published',
        role: 'Communication Controller',
        apply() {},
      },
      {
        label: 'Phase 4 · Monitoring and adaptive response',
        role: 'Operations Controller',
        apply(w) {
          w.congestion.set('R12', { factor: 0.7, until_s: w.sim_time_s + 3600 });
        },
      },
      {
        label: 'Phase 5 · Clearance confirmed; phased restoration granted',
        role: 'Incident Manager',
        apply(w) {
          w.suspended.delete('R23');
          w.congestion.clear();
        },
      },
      {
        label: 'Phase 6 · Consolidation and incident report',
        role: 'Operations / Communication Controller',
        apply() {},
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D8
  D8: {
    id: 'D8',
    title: 'Peak demand / special event',
    source: 'L2480–L2496 — dynamic fleet allocation, headway control on live load',
    steps: [
      {
        label: 'Event crowds arrive - boardings x2.5 on six central corridors',
        apply(w, t) {
          // A demand multiplier alone takes ~2 sim-minutes to show, which is dead air in
          // a demo. Step the current loads up immediately AND raise demand, so the
          // operator sees the surge land and then keep building.
          for (const rid of ['R3', 'R5', 'R7', 'R12', 'R18', 'R22']) {
            w.demandBoost.set(rid, { factor: 2.8, until_s: t + 2400 });
            for (const v of vehiclesOn(w, rid)) {
              v.pax_count = Math.min(
                Math.round(v.capacity * 1.02),
                Math.round(Math.max(v.pax_count, v.capacity * 0.62) * 1.25),
              );
            }
          }
        },
      },
      {
        label: 'Crowds concentrate at the central nodes - loads approach capacity',
        apply(w) {
          for (const rid of ['R5', 'R7', 'R18']) {
            for (const v of vehiclesOn(w, rid)) {
              v.pax_count = Math.round(v.capacity * 0.93);
              v.left_behind = Math.round(v.capacity * 0.2);
            }
          }
        },
      },
    ],
    reset: clearFlags,
  },

  // ---------------------------------------------------------------- D9
  D9: {
    id: 'D9',
    title: 'System outage / degraded operations',
    source: 'L2530–L2546 · S6 speaker note (data-centre fire) · R1903–R1907 DC/DR',
    steps: [
      { label: 'UB Card feed goes stale — degraded operations', apply(w) { w.feed_stale = true; } },
      { label: 'Feed restored; outage event recorded', apply(w) { w.feed_stale = false; } },
    ],
    reset(w) {
      w.feed_stale = false;
    },
  },
};

export function resetAll(w: World): void {
  for (const s of Object.values(SCENARIOS)) s.reset(w);
  clearFlags(w);
}
