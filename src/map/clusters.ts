/**
 * Vehicle cluster markers (plan 11.5 step 1, backlog item 10).
 *
 * MapLibre clusters the `vehicles` GeoJSON source NATIVELY — no supercluster
 * dependency — and `clusterProperties` sums our own exception-funnel verdict per
 * vehicle into three aggregates (`critical` / `attention` / `normal`) as the
 * index is built. The marker below therefore knows the WORST state inside a
 * cluster without us ever looking at the member features.
 *
 * Why HTML markers and not a GL `circle` + `symbol` pair: the marker carries two
 * numbers of different weight, is a keyboard-reachable button, and must follow
 * the theme tokens — all three are free in DOM and expensive in GL (a GL label
 * would need `text-field` formatting, a glyph round-trip and a second paint
 * property to re-apply on every theme swap). There are at most a few dozen of
 * them, which is the whole point of clustering: the 1,086 vehicle dots stay in
 * the single GPU buffer the rAF loop uploads.
 *
 * Refresh is TIMER-driven, not `idle`-driven. The rAF loop calls `setData` at
 * ~18 Hz, so the map is essentially never idle and `sourcedata` fires constantly;
 * a 1 Hz poll plus `moveend` is both cheaper and steadier (cluster centroids
 * drift slowly — buses move metres per second, and a marker that re-rendered at
 * 18 Hz would visibly jitter).
 *
 * Markers are POOLED and positionally stable rather than keyed by `cluster_id`:
 * supercluster re-indexes on every `setData`, so `cluster_id` is not durable and
 * keying on it would recreate every marker once a second.
 */
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';

export interface ClusterLabels {
  /** Accessible name, e.g. "Cluster of 42 buses — 3 critical, 5 require attention". */
  aria(c: ClusterCounts): string;
}

export interface ClusterCounts {
  total: number;
  critical: number;
  attention: number;
  atRisk: number;
}

interface Pooled {
  marker: maplibregl.Marker;
  el: HTMLButtonElement;
  big: HTMLSpanElement;
  small: HTMLSpanElement;
  sig: string;
}

/** The three funnel states, worst first, mapped to the tokens the legend uses. */
const TONE = {
  critical: 'var(--color-sev-crit)',
  attention: 'var(--color-map-slower)',
  normal: 'var(--color-map-normal)',
} as const;

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export interface ClusterController {
  refresh(): void;
  setVisible(visible: boolean): void;
  /** Live totals across every cluster currently in the source — the Playwright
   *  check reads this to compare against the funnel. */
  totals(): ClusterCounts & { markers: number };
  destroy(): void;
}

export function attachClusters(
  map: maplibregl.Map,
  sourceId: string,
  labels: ClusterLabels,
): ClusterController {
  const pool: Pooled[] = [];
  let visible = true;
  let last: ClusterCounts & { markers: number } = {
    total: 0,
    critical: 0,
    attention: 0,
    atRisk: 0,
    markers: 0,
  };

  /** Size by at-risk count (plan 11.5: "HTML markers sized by at-risk count").
   *  sqrt so one bad bus is already visible and thirty do not produce a blob. */
  const sizeFor = (atRisk: number) => 26 + Math.min(22, Math.round(Math.sqrt(atRisk) * 8));

  function make(): Pooled {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ptcc-cluster';
    const big = document.createElement('span');
    big.className = 'ptcc-cluster-big';
    const small = document.createElement('span');
    small.className = 'ptcc-cluster-small';
    el.append(big, small);
    const p: Pooled = {
      el,
      big,
      small,
      sig: '',
      marker: new maplibregl.Marker({ element: el }).setLngLat([0, 0]).addTo(map),
    };
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const src = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (!src) return;
      const center = p.marker.getLngLat();
      const dur = () => (reducedMotion() ? 0 : 500);
      /** Last resort: a click must never be a no-op. */
      const stepIn = () =>
        map.easeTo({
          center,
          zoom: Math.min(map.getZoom() + 1.5, map.getMaxZoom()),
          duration: dur(),
        });
      // `cluster_id` identifies a node in the CURRENT supercluster index, and the
      // rAF loop rebuilds that index ~18 times a second — the id captured at the
      // last 1 Hz poll is already stale, and `getClusterExpansionZoom` then either
      // rejects or answers about a different cluster. Re-find the cluster under
      // this marker at click time so the id is at most one frame old.
      let id = -1;
      let best = Infinity;
      try {
        for (const f of map.querySourceFeatures(sourceId, { filter: ['has', 'point_count'] })) {
          if (f.geometry.type !== 'Point') continue;
          const [lng, lat] = f.geometry.coordinates as [number, number];
          const d = (lng - center.lng) ** 2 + (lat - center.lat) ** 2;
          if (d < best) {
            best = d;
            id = num(f.properties?.['cluster_id']);
          }
        }
      } catch (err) {
        // A broken index here only costs this one click precision, but it must not
        // be invisible — it is the same failure mode as the two in `refresh`.
        console.warn('[map] cluster expansion lookup failed; stepping in instead', err);
      }
      if (id < 0) return stepIn();
      void src
        .getClusterExpansionZoom(id)
        .then((z) => {
          if (z > map.getZoom() + 0.1)
            map.easeTo({ center, zoom: Math.min(z + 0.25, map.getMaxZoom()), duration: dur() });
          else stepIn();
        })
        .catch(stepIn);
    });
    return p;
  }

  function refresh(): void {
    if (!visible || !map.getSource(sourceId)) return;
    let feats: maplibregl.MapGeoJSONFeature[];
    try {
      feats = map.querySourceFeatures(sourceId, { filter: ['has', 'point_count'] });
    } catch (err) {
      // Wall mode has an unclustered source and legitimately lands here, so this is
      // not an error — but "source gone / index broken" lands here too and used to
      // become "0 cluster markers, no message anywhere". Say which one happened.
      console.warn('[map] no cluster features for source', sourceId, err);
      return;
    }
    // A cluster straddling a tile boundary is returned once per tile.
    const seen = new Set<number>();
    const rows: { id: number; lng: number; lat: number; c: ClusterCounts }[] = [];
    const sum = { total: 0, critical: 0, attention: 0, atRisk: 0 };
    for (const f of feats) {
      const id = num(f.properties?.['cluster_id']);
      if (seen.has(id)) continue;
      seen.add(id);
      const g = f.geometry;
      if (g.type !== 'Point') continue;
      const critical = num(f.properties?.['critical']);
      const attention = num(f.properties?.['attention']);
      const total = num(f.properties?.['point_count']);
      const c: ClusterCounts = { total, critical, attention, atRisk: critical + attention };
      sum.total += total;
      sum.critical += critical;
      sum.attention += attention;
      sum.atRisk += c.atRisk;
      rows.push({ id, lng: g.coordinates[0] as number, lat: g.coordinates[1] as number, c });
    }
    // Buses too isolated to join a cluster are drawn as ordinary GL dots, but they
    // still belong to the funnel — without them the aggregate below would silently
    // under-report and the "clusters sum to the fleet" invariant could not be
    // checked at all. One extra query per second, at 1 Hz, is worth that.
    let singles = 0;
    try {
      const ids = new Set<string>();
      for (const f of map.querySourceFeatures(sourceId, { filter: ['!', ['has', 'point_count']] })) {
        const vid = String(f.properties?.['id'] ?? '');
        if (!vid || ids.has(vid)) continue; // one feature per tile it touches
        ids.add(vid);
        singles++;
        sum.critical += num(f.properties?.['cr']);
        sum.attention += num(f.properties?.['at']);
      }
      sum.total += singles;
      sum.atRisk = sum.critical + sum.attention;
    } catch (err) {
      // Unclustered source (wall mode): nothing to add. Any other cause means the
      // totals below UNDER-REPORT the fleet, which is precisely the invariant the
      // Playwright funnel check exists to catch — so it cannot be silent.
      console.warn('[map] unclustered vehicle query failed; totals may under-report', err);
    }

    // Stable order so the pool hands the same marker back to roughly the same
    // cluster on the next poll: biggest first, then west to east.
    rows.sort((a, b) => b.c.total - a.c.total || a.lng - b.lng);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const p = pool[i] ?? (pool[i] = make());
      p.marker.setLngLat([r.lng, r.lat]);
      const tone = r.c.critical > 0 ? TONE.critical : r.c.attention > 0 ? TONE.attention : TONE.normal;
      const sig = `${r.c.atRisk}/${r.c.total}/${tone}`;
      if (p.sig !== sig) {
        p.sig = sig;
        const d = sizeFor(r.c.atRisk);
        p.el.style.setProperty('--cluster-size', `${d}px`);
        p.el.style.setProperty('--cluster-tone', tone);
        p.big.textContent = String(r.c.atRisk);
        p.small.textContent = String(r.c.total);
        p.el.setAttribute('aria-label', labels.aria(r.c));
        p.el.title = labels.aria(r.c);
      }
      if (!p.el.isConnected) p.marker.addTo(map);
    }
    while (pool.length > rows.length) pool.pop()!.marker.remove();
    last = { ...sum, markers: rows.length };
  }

  const timer = window.setInterval(refresh, 1000);
  map.on('moveend', refresh);
  refresh();

  return {
    refresh,
    setVisible(v) {
      visible = v;
      if (!v) {
        for (const p of pool) p.marker.remove();
        pool.length = 0;
        last = { total: 0, critical: 0, attention: 0, atRisk: 0, markers: 0 };
      } else refresh();
    },
    totals: () => last,
    destroy() {
      window.clearInterval(timer);
      map.off('moveend', refresh);
      for (const p of pool) p.marker.remove();
      pool.length = 0;
    },
  };
}
