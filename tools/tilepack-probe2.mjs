const B = { w: 106.55, s: 47.70, e: 107.40, n: 48.10 };
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => { const r = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };

const tj = await fetch('https://tiles.openfreemap.org/planet').then(r => r.json());
console.log('TileJSON tiles:', tj.tiles, '| minzoom', tj.minzoom, '| maxzoom', tj.maxzoom);
const tmpl = tj.tiles[0];

const counts = {};
for (let z = 9; z <= 15; z++) {
  const x0 = lon2x(B.w, z), x1 = lon2x(B.e, z), y0 = lat2y(B.n, z), y1 = lat2y(B.s, z);
  counts[z] = (x1 - x0 + 1) * (y1 - y0 + 1);
}

let cum = 0;
for (const z of [9,10,11,12,13,14,15]) {
  // sample a spread of real tiles across the bbox, not just the centre
  const x0 = lon2x(B.w, z), x1 = lon2x(B.e, z), y0 = lat2y(B.n, z), y1 = lat2y(B.s, z);
  const pick = [];
  const stepX = Math.max(1, Math.floor((x1 - x0 + 1) / 4)), stepY = Math.max(1, Math.floor((y1 - y0 + 1) / 3));
  for (let x = x0; x <= x1; x += stepX) for (let y = y0; y <= y1; y += stepY) pick.push([x, y]);
  let bytes = 0, got = 0, empty = 0;
  for (const [x, y] of pick.slice(0, 12)) {
    const u = tmpl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    try { const r = await fetch(u);
      if (r.ok) { const n = (await r.arrayBuffer()).byteLength; bytes += n; got++; if (n < 100) empty++; } } catch {}
  }
  const avg = got ? bytes / got : 0;
  cum += avg * counts[z];
  console.log(`z${z}: ${String(counts[z]).padStart(5)} tiles | sampled ${String(got).padStart(2)} (${empty} empty) | avg ${(avg/1024).toFixed(1).padStart(6)} KB | layer ${(avg*counts[z]/1048576).toFixed(1).padStart(6)} MB | cumulative ${(cum/1048576).toFixed(1)} MB`);
}
