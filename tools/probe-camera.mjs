import { chromium } from '@playwright/test';
const B='http://127.0.0.1:4180';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1680,height:950}})).newPage();
await p.goto(`${B}/?role=operations_controller#/map`,{waitUntil:'networkidle'});
await p.waitForTimeout(7000);
const r = await p.evaluate(async () => {
  const m = window.__ptccMap, W = window.__ptcc;
  // zoom in so most buses are OFF screen - the case the ease exists for
  m.setZoom(15); await new Promise(r=>setTimeout(r,1500));
  const before = m.center();
  // pick the bus furthest from the current centre
  const far = W.world.vehicles.filter(v=>v.status==='in_service')
    .map(v=>({v, d: Math.abs(v.longitude-before.lng)+Math.abs(v.latitude-before.lat)}))
    .sort((a,b)=>b.d-a.d)[0].v;
  W.useSelection.getState().selectVehicle(far.vehicle_id);
  await new Promise(r=>setTimeout(r,3000));
  const after = m.center();
  return { zoom: m.zoom().toFixed(2), id: far.vehicle_id, halo: m.halo(),
           drift: (Math.abs(before.lng-after.lng)+Math.abs(before.lat-after.lat)).toFixed(5) };
});
console.log('OFF-SCREEN SELECTION:', JSON.stringify(r));
console.log(r.drift > 0.0001 ? 'PASS  camera eases to an off-screen selection'
                             : 'FAIL  camera did not move even for an off-screen bus');
await b.close();
