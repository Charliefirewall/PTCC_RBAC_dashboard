import { chromium } from '@playwright/test';
const B = process.env.BASE ?? 'http://127.0.0.1:4180';
const pass=[],fail=[]; const ck=(c,m)=>(c?pass:fail).push(m);
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
await p.goto(`${B}/?role=operations_controller#/map`,{waitUntil:'networkidle'});
await p.waitForTimeout(8000);

const r = await p.evaluate(async () => {
  const m = window.__ptccMap, W = window.__ptcc;
  const v = W.world.vehicles.find(x => x.status === 'in_service' && x.speed > 8);
  if (!v) return { err: 'no moving bus' };
  const id = v.vehicle_id, live = W.world.vehicleById.get(id);
  const rendered = [], truth = [], t0 = performance.now();
  // sample on rAF (~16ms) so we resolve well inside a 394ms engine tick
  await new Promise(done => {
    const step = () => {
      const rp = m.renderedPos(id);
      if (rp) rendered.push(`${rp[0].toFixed(7)},${rp[1].toFixed(7)}`);
      truth.push(`${live.longitude.toFixed(7)},${live.latitude.toFixed(7)}`);
      if (performance.now() - t0 > 1600) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return { id, frames: rendered.length, elapsedMs: Math.round(performance.now() - t0),
           renderedUniq: new Set(rendered).size, truthUniq: new Set(truth).size };
});
console.log('motion:', JSON.stringify(r));
const ticks = Math.round(r.elapsedMs / 394);
ck(!r.err, 'moving bus observable');
ck(r.truthUniq <= ticks + 2, `engine advances once per ~394ms tick (${r.truthUniq} distinct over ~${ticks} ticks)`);
ck(r.renderedUniq > r.truthUniq, `rendered motion is smoothed between ticks: ${r.renderedUniq} rendered vs ${r.truthUniq} engine positions`);
await b.close();
pass.forEach(m=>console.log('  PASS  '+m)); fail.forEach(m=>console.log('  FAIL  '+m));
console.log(`\nMOTION: ${pass.length} passed, ${fail.length} failed`);
