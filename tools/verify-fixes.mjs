import { chromium } from '@playwright/test';
const B = process.env.PTCC_BASE ?? 'http://127.0.0.1:4173'; const pass=[],fail=[]; const ck=(c,m)=>(c?pass:fail).push(m);
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1680,height:950}}); const p=await ctx.newPage();

// wall scale follows mode (was bound to preset only)
await p.goto(`${B}/?role=operations_controller&mode=wall#/command`,{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
let sc=await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--wall-scale').trim());
ck(sc==='2.2', `wall scale via ?mode=wall = ${sc} (was 1, spec 2.2)`);

// Space activates buttons again
await p.goto(`${B}/?role=operations_controller#/command`,{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
const spaceOk=await p.evaluate(async()=>{
  const btn=[...document.querySelectorAll('main button')].find(b=>b.offsetParent);
  if(!btn) return 'no button';
  let fired=false; btn.addEventListener('click',()=>fired=true,{once:true}); btn.focus();
  // Dispatch on the BUTTON, which is what a browser does when it has focus. Dispatching
  // on window makes e.target === window, which no real keypress ever produces.
  const ev=new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true});
  btn.dispatchEvent(ev); return ev.defaultPrevented ? 'preventDefault still set' : 'ok';
});
ck(spaceOk==='ok', `Space no longer swallowed on a focused button (${spaceOk})`);

// presenter hotkeys blocked behind a dialog
await p.goto(`${B}/?role=operations_controller#/alerts`,{waitUntil:'networkidle'});
await p.waitForTimeout(3500);
const v=p.locator('button').filter({hasText:/Validate/i}).first();
if(await v.count()){await v.click();await p.waitForTimeout(900);}
const modeBefore=await p.evaluate(()=>document.querySelectorAll('nav').length);
await p.keyboard.press('w'); await p.waitForTimeout(800);
const modeAfter=await p.evaluate(()=>document.querySelectorAll('nav').length);
ck(modeBefore===modeAfter, `W does not flip to wall mode behind an open dialog`);

// L1235 checklist gates Confirm
const confirmDisabled=await p.evaluate(()=>{
  const b=[...document.querySelectorAll('[role=dialog] button')].find(x=>/confirm|создать|Үүсгэх/i.test(x.textContent));
  return b ? b.disabled : 'not found';
});
ck(confirmDisabled===true, `Validate Confirm disabled until the 4 checks are ticked (${confirmDisabled})`);

await b.close();
pass.forEach(m=>console.log('  PASS  '+m)); fail.forEach(m=>console.log('  FAIL  '+m));
console.log(`\n${pass.length} passed, ${fail.length} failed`);
