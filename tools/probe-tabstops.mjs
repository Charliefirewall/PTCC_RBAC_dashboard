import { chromium } from '@playwright/test';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1680,height:950}})).newPage();
await p.goto('http://127.0.0.1:4180/?role=operations_controller#/command',{waitUntil:'networkidle'});
await p.waitForTimeout(6000);
const dead = await p.evaluate(()=>[...document.querySelectorAll('button')]
  .filter(b=>getComputedStyle(b).cursor==='default' && b.offsetParent!==null)
  .map(b=>({cls:b.className.toString().slice(0,60), txt:(b.textContent||'').trim().slice(0,32), dis:b.disabled})));
console.log('dead-looking buttons:', dead.length);
const byCls={}; dead.forEach(d=>{const k=d.cls.split(' ').slice(0,3).join(' '); byCls[k]=(byCls[k]||0)+1;});
console.log(JSON.stringify(byCls,null,1));
console.log('samples:', JSON.stringify(dead.slice(0,4)));
await b.close();
