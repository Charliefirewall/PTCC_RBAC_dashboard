const style = await fetch('https://tiles.openfreemap.org/styles/liberty').then(r=>r.json());
// which fontstacks does the style actually reference?
const stacks = new Set();
for (const l of style.layers) { const f = l.layout && l.layout['text-font']; if (f) stacks.add([].concat(f).join(',')); }
console.log('fontstacks used:', [...stacks]);

// Cyrillic lives in 0-255 (Latin) + 1024-1279 (Cyrillic). Sample the ranges a UB map needs.
const ranges = ['0-255','256-511','1024-1279','8192-8447'];
let total = 0;
for (const st of stacks) {
  for (const r of ranges) {
    const u = style.glyphs.replace('{fontstack}', encodeURIComponent(st)).replace('{range}', r);
    try { const res = await fetch(u);
      if (res.ok) { const n = (await res.arrayBuffer()).byteLength; total += n;
        console.log(`  ${st} ${r}: ${(n/1024).toFixed(0)} KB`); } else console.log(`  ${st} ${r}: HTTP ${res.status}`);
    } catch(e) { console.log('  err', e.message); }
  }
}
console.log('glyph subtotal (4 ranges x stacks):', (total/1048576).toFixed(2), 'MB');

for (const s of [style.sprite + '.json', style.sprite + '.png', style.sprite + '@2x.png']) {
  try { const r = await fetch(s); console.log(`sprite ${s.split('/').pop()}: ${r.ok ? ((+r.headers.get('content-length')||(await r.arrayBuffer()).byteLength)/1024).toFixed(0)+' KB' : 'HTTP '+r.status}`); } catch {}
}
