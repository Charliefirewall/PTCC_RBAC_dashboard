import { chromium } from '@playwright/test';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
await p.goto('http://127.0.0.1:4180/?role=operations_controller#/map',{waitUntil:'networkidle'});
await p.waitForTimeout(6000);
console.log(await p.evaluate(async()=>{
  const W=window.__ptcc; const ts=[]; let last=W.useSim.getState().tick;
  const t0=performance.now();
  while(performance.now()-t0<3000){ const t=W.useSim.getState().tick;
    if(t!==last){ ts.push(performance.now()); last=t; } await new Promise(r=>setTimeout(r,10)); }
  const gaps=[]; for(let i=1;i<ts.length;i++) gaps.push(Math.round(ts[i]-ts[i-1]));
  return { ticks: ts.length, medianGapMs: gaps.sort((a,b)=>a-b)[Math.floor(gaps.length/2)], speed: W.engine?.speeds ? 'n/a' : 'n/a' };
}));
await b.close();
