import { chromium } from '@playwright/test';
const B='http://127.0.0.1:4180'; const pass=[],fail=[]; const ck=(c,m)=>(c?pass:fail).push(m);
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1680,height:950}})).newPage();

// nav reachability for the default demo role
await p.goto(`${B}/?role=operations_controller#/command`,{waitUntil:'networkidle'});
await p.waitForTimeout(5000);
const nav=await p.evaluate(()=>[...document.querySelectorAll('nav a')].map(a=>a.getAttribute('href')));
for (const r of ['#/depot','#/platform','#/provenance','#/health','#/roi'])
  ck(nav.includes(r), `nav reaches ${r}`);
ck(new Set(nav).size===nav.length, `no duplicate nav entries (${nav.length})`);

// Mongolian renders on the new surfaces
for (const r of ['depot','platform','health','roi','provenance']) {
  await p.goto('about:blank');
  await p.goto(`${B}/?role=operations_controller&lang=mn#/${r}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(2500);
  const t=await p.evaluate(()=>document.querySelector('main')?.innerText||'');
  const cyr=(t.match(/[\u0400-\u04FF]/g)||[]).length;
  ck(cyr>40, `#/${r} renders Mongolian (${cyr} Cyrillic chars)`);
}

// the DEMO badge survives on the entry screen (was missing)
await p.goto('about:blank'); await p.goto(`${B}/`,{waitUntil:'networkidle'});
await p.waitForTimeout(3000);
const demo=await p.evaluate(()=>/DEMO/i.test(document.body.innerText));
ck(demo, 'DEMO badge present on the role-select entry screen');

await b.close();
pass.forEach(m=>console.log('  PASS  '+m)); fail.forEach(m=>console.log('  FAIL  '+m));
console.log(`\nFINAL: ${pass.length} passed, ${fail.length} failed`);
