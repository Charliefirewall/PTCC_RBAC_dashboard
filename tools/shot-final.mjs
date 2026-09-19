import { chromium } from '@playwright/test';
const b = await chromium.launch({headless:true});
for (const [w,h,tag] of [[1680,950,'1680'],[1280,800,'1280']]) {
  const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage();
  await p.goto(`http://127.0.0.1:4174/?role=operations_controller#/command`,{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await p.screenshot({path:`H:/Mongolia Bus Transport/_compare/ours/final-command-${tag}.png`});
  const trunc = await p.evaluate(()=>[...document.querySelectorAll('main *')]
    .filter(e=>e.scrollWidth>e.clientWidth+4 && e.clientWidth>60 && e.children.length===0)
    .map(e=>({t:e.textContent.slice(0,40), sw:e.scrollWidth, cw:e.clientWidth})).slice(0,6));
  console.log(tag, 'truncated leaf nodes:', trunc.length, JSON.stringify(trunc).slice(0,300));
}
await b.close();
