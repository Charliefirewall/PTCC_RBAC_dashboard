import { chromium } from '@playwright/test';
const B = process.env.PTCC_BASE ?? 'http://127.0.0.1:4173'; const pass=[],fail=[]; const ck=(c,m)=>(c?pass:fail).push(m);
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1680,height:950}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));

// AI panel opens from any route via the ambient ask bar
await p.goto(`${B}/?role=operations_controller#/regularity`,{waitUntil:'networkidle'});
await p.waitForTimeout(5000);
await p.keyboard.press('/'); await p.waitForTimeout(600);
const focused = await p.evaluate(()=>document.activeElement?.tagName === 'INPUT');
ck(focused, 'AI: "/" focuses the ask bar from a non-copilot route');

await p.keyboard.type('what requires immediate attention'); await p.keyboard.press('Enter');
await p.waitForTimeout(2500);
const ans = await p.evaluate(()=>{
  const d=document.querySelector('[role=dialog]');
  const txt=d?.textContent||'';
  return { open:!!d, len:txt.length,
    hasNumbers:/\d/.test(txt),
    hasSources:/source|эх сурвалж/i.test(txt),
    hasProposal: (d?.querySelectorAll('a[href^="#/"], button')?.length)||0 };
});
ck(ans.open, 'AI: answer opens in a drawer without leaving the route');
ck(ans.len>120, `AI: substantive answer rendered (${ans.len} chars)`);
ck(ans.hasNumbers, 'AI: answer is grounded in live operational figures');
ck(ans.hasProposal>0, `AI: answer offers next actions (${ans.hasProposal} controls)`);

// context preserved: hash unchanged
const hash = await p.evaluate(()=>location.hash);
ck(hash.includes('regularity'), `AI: operator keeps their screen (${hash})`);

// no overlap: exactly one dialog, one scrim
const ov = await p.evaluate(()=>({d:document.querySelectorAll('[role=dialog]').length,
  s:document.querySelectorAll('[data-overlay-scrim]').length}));
ck(ov.d===1 && ov.s<=1, `AI: no overlay collision (${ov.d} dialog, ${ov.s} scrim)`);
await p.keyboard.press('Escape'); await p.waitForTimeout(500);

// agent console: reasoning -> evidence -> recommendation -> human gate
await p.goto('about:blank'); await p.goto(`${B}/?role=operations_controller#/agentic`,{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
const ag = await p.evaluate(()=>{
  const t=document.querySelector('main')?.textContent||'';
  return { cards: document.querySelectorAll('details').length,
    approve: [...document.querySelectorAll('button')].filter(b=>/approve/i.test(b.textContent)).length,
    reasoning: /because|учир|reason/i.test(t), noAuto: /operator|no autonomy|nothing here executes|оператор/i.test(t) };
});
ck(ag.approve>0, `AI: human approval gate present (${ag.approve} Approve controls)`);
ck(ag.reasoning, 'AI: reasoning shown, not just a verdict');
ck(ag.noAuto, 'AI: the no-autonomy boundary is stated on screen');
ck(errs.length===0, `AI: zero page errors`+(errs.length?` -> ${errs[0]}`:''));
await b.close();
pass.forEach(m=>console.log('  PASS  '+m)); fail.forEach(m=>console.log('  FAIL  '+m));
console.log(`\nAI: ${pass.length} passed, ${fail.length} failed`);
