import { chromium } from '@playwright/test';
const b = await chromium.launch({headless:true});
const p = await (await b.newContext({viewport:{width:1680,height:950}})).newPage();
await p.goto('http://127.0.0.1:4173/?role=operations_controller&theme=light#/command',{waitUntil:'networkidle'});
await p.waitForTimeout(6000);
const r = await p.evaluate(()=>({
  dataTheme: document.documentElement.getAttribute('data-theme'),
  bg1: getComputedStyle(document.documentElement).getPropertyValue('--color-bg1'),
  header: getComputedStyle(document.querySelector('header')).backgroundColor,
  headerCls: document.querySelector('header').className,
  nav: getComputedStyle(document.querySelector('nav')).backgroundColor,
  navCls: document.querySelector('nav').className,
})); console.log(JSON.stringify(r,null,1));
await b.close();
