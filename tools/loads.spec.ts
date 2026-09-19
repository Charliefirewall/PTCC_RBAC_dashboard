import { test } from '@playwright/test';
test('load distribution', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?role=operations_controller#/command');
  await page.waitForTimeout(8000);
  const r = await page.evaluate(() => {
    const w = (window as any).__ptcc;
    const m = w.useSim.getState().metrics;
    const all = [...m.per_route.values()].filter((x: any) => x.vehicles > 0).map((x: any) => ({ id: x.route_id, l: Math.round(x.load_pct) }));
    all.sort((a: any, b: any) => b.l - a.l);
    const ls = all.map((x: any) => x.l);
    const q = (p: number) => ls[Math.floor(ls.length * p)] ?? 0;
    return {
      top8: all.slice(0, 8),
      p90: q(0.1), p50: q(0.5), p10: q(0.9),
      mean: Math.round(ls.reduce((a: number, b: number) => a + b, 0) / ls.length),
      ridership: Math.round(m.ridership_today),
      simTime: w.useSim.getState().snap.sim_time_s,
      funnel: m.funnel,
      alerts: w.useAlerts.getState().alerts.length,
    };
  });
  console.log('LOADS: ' + JSON.stringify(r));
});
