import { chromium } from '@playwright/test';
const B='http://127.0.0.1:4174';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1680,height:950}})).newPage();

// A. analytics: is 8 nodes an empty state (correct) or a break?
await p.goto(`${B}/?role=operations_controller#/analytics`,{waitUntil:'networkidle'});
await p.waitForTimeout(2500);
console.log('ANALYTICS text:', JSON.stringify((await p.evaluate(()=>document.querySelector('main')?.innerText||'')).slice(0,200)));

// B. same route but AFTER creating an event via scenario D5 + validate
await p.goto(`${B}/?role=operations_controller#/command`,{waitUntil:'networkidle'});
await p.waitForTimeout(3000);
await p.keyboard.press('5'); await p.waitForTimeout(3000);
await p.goto(`${B}/?role=operations_controller#/analytics`);
await p.waitForTimeout(2500);
const n=await p.evaluate(()=>document.querySelectorAll('main *').length);
console.log('ANALYTICS after scenario: nodes =', n);
await b.close();
