// Measure a bundled vector-tile pack for the UB maxBounds area.
const B = { w: 106.55, s: 47.70, e: 107.40, n: 48.10 };   // LiveMap maxBounds
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => { const r = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };

// 1. get the real style to find tile/glyph/sprite sources
const style = await fetch('https://tiles.openfreemap.org/styles/liberty').then(r => r.json());
console.log('glyphs :', style.glyphs);
console.log('sprite :', style.sprite);
const src = Object.entries(style.sources).find(([, s]) => s.type === 'vector')[1];
const tileURL = src.tiles ? src.tiles[0] : src.url;
console.log('vector :', tileURL, '| maxzoom', src.maxzoom);

// 2. count tiles per zoom
let total = 0; const rows = [];
for (let z = 9; z <= 15; z++) {
  const x0 = lon2x(B.w, z), x1 = lon2x(B.e, z);
  const y0 = lat2y(B.n, z), y1 = lat2y(B.s, z);
  const n = (x1 - x0 + 1) * (y1 - y0 + 1);
  total += n; rows.push({ z, n, cum: total, x: [x0, x1], y: [y0, y1] });
}
console.table(rows.map(r => ({ z: r.z, tiles: r.n, cumulative: r.cum })));

// 3. sample REAL tile sizes at each zoom over the city centre
const tmpl = tileURL.replace(/^.*?(https:)/, '$1');
for (const z of [10, 12, 13, 14, 15]) {
  const xs = [lon2x(106.85, z), lon2x(106.92, z), lon2x(106.98, z)];
  const ys = [lat2y(47.93, z), lat2y(47.90, z)];
  let bytes = 0, got = 0;
  for (const x of xs) for (const y of ys) {
    const u = tmpl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    try { const r = await fetch(u);
      if (r.ok) { bytes += (await r.arrayBuffer()).byteLength; got++; } } catch {}
  }
  const avg = got ? bytes / got : 0;
  const row = rows.find(r => r.z === z);
  console.log(`z${z}: sampled ${got} tiles, avg ${(avg/1024).toFixed(1)} KB -> est ${(avg*row.n/1048576).toFixed(1)} MB for ${row.n} tiles`);
}
