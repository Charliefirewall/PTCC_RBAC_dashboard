import { chromium } from '@playwright/test';
const b = await chromium.launch({headless:true});
const ctx = await b.newContext({viewport:{width:1000,height:700}});
const p = await ctx.newPage();
const tiles = {ok:0, fail:0};
p.on('response', r => { if (/\.pbf|openfreemap|tile\.openstreetmap/.test(r.url())) { r.status()<400 ? tiles.ok++ : tiles.fail++; } });
await p.setContent(`<html><head>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet"/>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>html,body,#m{margin:0;height:100%}</style></head>
<body><div id="m"></div><script>
window.done=false;
const map=new maplibregl.Map({container:'m',style:'https://tiles.openfreemap.org/styles/liberty',center:[106.9176,47.9188],zoom:13});
map.on('idle',()=>{window.done=true});
map.on('error',e=>{window.mapErr=String(e.error&&e.error.message||e)});
</script></body></html>`, {waitUntil:'networkidle'});
await p.waitForFunction('window.done===true', null, {timeout:40000}).catch(()=>console.log('idle timeout'));
await p.waitForTimeout(3000);
await p.screenshot({path:'H:/Mongolia Bus Transport/_compare/ours/ub-liberty-test.png'});
console.log('tiles ok/fail:', tiles.ok, tiles.fail, 'err:', await p.evaluate(()=>window.mapErr||'none'));
await b.close();
