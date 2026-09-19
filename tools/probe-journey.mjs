import { chromium } from '@playwright/test';
const B='http://127.0.0.1:4180';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1680,height:950}})).newPage();
await p.goto(`${B}/?role=operations_controller#/command`,{waitUntil:'networkidle'});
await p.waitForTimeout(7000);

console.log('--- headings on #/command ---');
console.log(await p.evaluate(()=>[...document.querySelectorAll('h1,h2')].map(h=>`${h.tagName}: ${h.textContent.trim().slice(0,70)}`).slice(0,5)));

console.log('--- worklist rows on #/command vs #/alerts ---');
console.log('command:', await p.evaluate(()=>({
  dataAlertRow: document.querySelectorAll('[data-alert-row]').length,
  priorityBtns: [...document.querySelectorAll('main button')].filter(b=>/Bus |R\d/.test(b.textContent)).length,
})));

console.log('--- map handle + halo API ---');
console.log(await p.evaluate(()=>{
  const m=window.__ptccMap;
  if(!m) return 'no __ptccMap on #/command';
  return { keys:Object.keys(m), hasMap:!!m.map, srcs: m.map? Object.keys(m.map.getStyle().sources).filter(s=>/sel|veh/.test(s)) : null };
}));
await b.close();
