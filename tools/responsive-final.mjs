import { chromium } from '@playwright/test';
const B='http://127.0.0.1:4180';
const ROUTES=['dashboard','command','map','regularity','passenger','alerts','comms','health','operators',
              'copilot','agentic','roi','analytics','multimodal','settings','provenance','depot','platform'];
const b=await chromium.launch({headless:true});
const totals={}; const worst=[];
for (const [w,h] of [[1024,768],[1280,800],[1440,900],[1680,950]]) {
  let clipped=0, overflow=0, noAffordance=0;
  for (const theme of ['dark','light']) {
    const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
    for (const r of ROUTES) {
      await p.goto('about:blank');
      await p.goto(`${B}/?role=operations_controller&theme=${theme}#/${r}`,{waitUntil:'networkidle'});
      await p.waitForTimeout(r==='map'?3500:1600);
      const res=await p.evaluate(()=>{
        const bad=[];
        for (const e of document.querySelectorAll('main *')) {
          if (e.children.length===0 && e.scrollWidth>e.clientWidth+4 && e.clientWidth>60) {
            const cs=getComputedStyle(e);
            if (cs.textOverflow==='ellipsis'||cs.overflow==='hidden') bad.push((e.textContent||'').trim().slice(0,32));
          }
        }
        const m=document.querySelector('main');
        const ov = m ? m.scrollWidth>m.clientWidth+2 : false;
        const noAff = ov && getComputedStyle(m).overflowX==='hidden';
        return {clipped:bad, ov, noAff};
      });
      clipped+=res.clipped.length; if(res.ov) overflow++; if(res.noAff) noAffordance++;
      if (res.clipped.length>2) worst.push(`${w}/${theme}/${r}: ${res.clipped.length}`);
    }
    await ctx.close();
  }
  totals[w]={clipped,overflow,noAffordance};
  console.log(`${w}px  clipped=${String(clipped).padStart(3)}  h-overflow=${overflow}  no-scroll-affordance=${noAffordance}`);
}
console.log('\nworst offenders:', worst.slice(0,8).join(' | ') || 'none above 2');
await b.close();
