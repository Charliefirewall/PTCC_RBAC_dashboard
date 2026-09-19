import { chromium } from '@playwright/test';
const B = 'http://127.0.0.1:4180';
const OUT = 'H:/Mongolia Bus Transport/_compare/ours';
const ROUTES = ['dashboard','command','map','regularity','passenger','alerts','comms','health',
                'operators','copilot','agentic','roi','analytics','multimodal','settings','provenance','depot','platform'];
const pass=[], fail=[];
const ck=(c,m)=> (c?pass:fail).push(m);

const b = await chromium.launch({ headless: true });

// ---- 1. every route, both themes, zero errors ----
for (const theme of ['dark','light']) {
  const ctx = await b.newContext({ viewport:{width:1680,height:950} });
  const p = await ctx.newPage();
  const errs=[];
  p.on('pageerror', e=>errs.push(`${theme} PAGEERR ${e.message.slice(0,120)}`));
  p.on('console', m=>{ if(m.type()==='error') errs.push(`${theme} CONSOLE ${m.text().slice(0,120)}`); });
  for (const r of ROUTES) {
    await p.goto('about:blank');
    await p.goto(`${B}/?role=operations_controller&theme=${theme}#/${r}`, {waitUntil:'networkidle'});
    await p.waitForTimeout(r==='map'?4500:2200);
    const n = await p.evaluate(()=>document.querySelectorAll('.panel').length + document.querySelectorAll('main *').length);
    const txt = await p.evaluate(()=>document.querySelector('main')?.innerText||'');
    // analytics used to render a deliberate empty state: no operator had validated an
    // alert yet (L1235), so there was no event to review. The shift now opens with the
    // previous shift's events (store/seed.ts), so it must render a real review instead.
    const ok = r==='analytics' ? n>20 && !/no events yet/i.test(txt) : n>20;
    ck(ok, `${theme}/${r} rendered (${n} nodes${r==='analytics'?', seeded shift reviewable':''})`);
    if (r==='provenance'||r==='command') await p.screenshot({path:`${OUT}/int-${theme}-${r}.png`});
  }
  ck(errs.length===0, `${theme}: zero console/page errors` + (errs.length?` -> ${errs.slice(0,3).join(' | ')}`:''));
  await ctx.close();
}

// ---- 2. D-2 overlay collision ----
{
  const ctx = await b.newContext({viewport:{width:1680,height:950}}); const p = await ctx.newPage();
  await p.goto(`${B}/?role=operations_controller#/alerts`, {waitUntil:'networkidle'});
  await p.waitForTimeout(3000);
  const v = p.locator('button').filter({hasText:/Validate/i}).first();
  if (await v.count()) { await v.click(); await p.waitForTimeout(900); }
  let s = await p.evaluate(()=>({d:document.querySelectorAll('[role=dialog]').length,
    z:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&+getComputedStyle(e).zIndex>100).map(e=>getComputedStyle(e).zIndex)}));
  ck(s.d===1, `D-2: one dialog after Validate (got ${s.d})`);
  await p.keyboard.press('h'); await p.waitForTimeout(800);
  s = await p.evaluate(()=>({d:document.querySelectorAll('[role=dialog]').length,
    z:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&+getComputedStyle(e).zIndex>100).map(e=>getComputedStyle(e).zIndex)}));
  ck(s.d===1, `D-2: still one dialog after H (got ${s.d}) [was 2 stacked before]`);
  ck(new Set(s.z).size===s.z.length, `D-2: no two fixed nodes share z>100 (${s.z.join(',')})`);
  await p.screenshot({path:`${OUT}/int-overlay-after.png`});
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  const after = await p.evaluate(()=>document.querySelectorAll('[role=dialog]').length);
  ck(after===0, `D-2: Escape closes (got ${after}) [closed neither before]`);
  await ctx.close();
}

// ---- 3. D-1 error containment ----
{
  const ctx = await b.newContext({viewport:{width:1680,height:950}}); const p = await ctx.newPage();
  await p.route('**/assets/Operators-*.js', r=>r.abort());
  await p.goto(`${B}/?role=operations_controller#/operators`, {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  const shellAlive = await p.evaluate(()=>!!document.querySelector('nav') && document.body.innerText.length>200);
  ck(shellAlive, 'D-1: shell survives a failed chunk');
  await p.screenshot({path:`${OUT}/int-errorboundary.png`});
  await p.goto(`${B}/?role=operations_controller#/command`, {waitUntil:'networkidle'});
  await p.waitForTimeout(2500);
  const recovered = await p.evaluate(()=>document.querySelectorAll('.panel').length);
  ck(recovered>5, `D-1: other routes still work (${recovered} panels) [was 0 before]`);
  await ctx.close();
}

// ---- 4. map: streets, offline, no off-origin ----
{
  const ctx = await b.newContext({viewport:{width:1680,height:950}}); const p = await ctx.newPage();
  const leaked=[];
  await p.route('**', route=>{ const u=route.request().url();
    if(!u.startsWith(B)&&!u.startsWith('data:')&&!u.startsWith('blob:')){leaked.push(u);return route.abort();} route.continue(); });
  await p.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false}));
  await p.goto(`${B}/?role=operations_controller#/map`, {waitUntil:'networkidle'});
  await p.waitForTimeout(7000);
  ck(leaked.length===0, `Map: no off-origin request (${leaked.length} leaked)`);
  const shot = await p.screenshot({path:`${OUT}/int-map-offline.png`});
  ck(shot.length>200000, `Map: cartography not wireframe (${(shot.length/1024|0)} KB screenshot; a wireframe compresses far smaller)`);
  const labels = await p.evaluate(()=>{ const c=document.querySelector('canvas');
    return c ? c.width*c.height : 0; });
  ck(labels>0, `Map: GL canvas present (${labels} px)`);
  await ctx.close();
}

// ---- 5. provenance nav entry visible ----
{
  const ctx = await b.newContext({viewport:{width:1680,height:950}}); const p = await ctx.newPage();
  await p.goto(`${B}/?role=operations_controller#/command`, {waitUntil:'networkidle'});
  await p.waitForTimeout(2500);
  const navTxt = await p.evaluate(()=>document.querySelector('nav')?.innerText||'');
  ck(/evidence|question|provenance/i.test(navTxt), `Provenance nav entry present`);
  const icons = await p.evaluate(()=>document.querySelectorAll('nav svg use').length);
  ck(icons>8, `Icon sprite in use in nav (${icons} <use> refs)`);
  await ctx.close();
}

await b.close();
console.log('\n=== PASS ('+pass.length+') ===');   pass.forEach(m=>console.log('  PASS  '+m));
if(fail.length){ console.log('\n=== FAIL ('+fail.length+') ==='); fail.forEach(m=>console.log('  FAIL  '+m)); }
console.log(`\nRESULT: ${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length?1:0);
