/**
 * Directional bus glyphs for the vehicles symbol layer (workstream U1/U4).
 *
 * WHY CANVAS AND NOT THE SPRITE: the bundled pack ships OpenFreeMap's own sprite,
 * which has no bus glyph, and the sprite is REPLACED wholesale when the operator
 * switches basemap (`setSprite`). An image registered with `map.addImage` is ours,
 * survives that swap, and — crucially — can be REDRAWN when the theme or the
 * colour mode changes, which is the only way GL can follow a CSS token.
 *
 * WHY NOT SDF: one SDF glyph plus a data-driven `icon-color` would be fewer
 * images, but a real signed distance field has to be computed (a binary alpha mask
 * used as an SDF gives blocky edges and a wrong halo) and the halo is the thing
 * keeping a bus legible over a light street basemap. Eight to ten pre-tinted
 * bitmaps are redrawn only on a theme/mode change — never per frame — so the cost
 * is nil and the result is crisp and anti-aliased at any size.
 *
 * The glyph points NORTH at rotation 0, which is what `icon-rotate: ['get',
 * 'heading']` with `icon-rotation-alignment: 'map'` expects: heading is a compass
 * bearing in degrees, clockwise from north, exactly MapLibre's rotation convention.
 */

import type maplibregl from 'maplibre-gl';

/** Device pixels. Registered at pixelRatio 2, so the glyph is 24 CSS px at
 *  `icon-size: 1` — big enough that the 2 px outline survives downscaling. */
const PX = 48;
const HALF = PX / 2;

/** `bus-<c>` / `busA-<c>`, where `c` is the palette index the rAF loop already
 *  writes and `A` means "this bus is itself in a critical condition". */
export const busImageId = (c: number, alert: boolean): string => `${alert ? 'busA' : 'bus'}-${c}`;

function drawBus(fill: string, outline: string, ring: string | null): ImageData {
  const cv = document.createElement('canvas');
  cv.width = PX;
  cv.height = PX;
  const g = cv.getContext('2d');
  if (!g) return new ImageData(PX, PX);

  // Body: a bus in plan view with a long tapered prow. The prow is a third of the
  // length on purpose — a shallow taper is invisible at 6 px, and at 6 px the
  // direction is the whole point. At 24 px it still reads as a vehicle.
  const body = new Path2D();
  body.moveTo(HALF, 4); // nose
  body.lineTo(HALF + 9, 18);
  body.lineTo(HALF + 9, 39.5);
  body.quadraticCurveTo(HALF + 9, 43, HALF + 5.5, 43);
  body.lineTo(HALF - 5.5, 43);
  body.quadraticCurveTo(HALF - 9, 43, HALF - 9, 39.5);
  body.lineTo(HALF - 9, 18);
  body.closePath();

  if (ring) {
    // Incident ring, drawn first so the body sits inside it. A static ring, not a
    // pulse: the brief rules out attention-grabbing animation.
    g.beginPath();
    g.arc(HALF, HALF, 21, 0, Math.PI * 2);
    g.strokeStyle = outline;
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = ring;
    g.lineWidth = 3.5;
    g.stroke();
  }

  g.fillStyle = fill;
  g.fill(body);
  // Outline in the page background colour: the same hairline that kept the old
  // dots off the route lines, now carrying the shape over street tiles too.
  g.strokeStyle = outline;
  g.lineWidth = 2.6;
  g.lineJoin = 'round';
  g.stroke(body);

  // Windscreen. A LIGHT wedge, not a dark line: at 8 px a dark stroke reads as a
  // gap that breaks the mark in two, whereas a bright front says "this end first"
  // even when the outline itself has gone sub-pixel. Neutral white at low alpha
  // rather than a token, because it has to lift every palette colour in both
  // themes — it is a highlight, not a state.
  const glass = new Path2D();
  glass.moveTo(HALF - 5.6, 21);
  glass.lineTo(HALF + 5.6, 21);
  glass.lineTo(HALF + 3.4, 13);
  glass.lineTo(HALF - 3.4, 13);
  glass.closePath();
  g.fillStyle = 'rgba(255,255,255,0.72)';
  g.fill(glass);

  return g.getImageData(0, 0, PX, PX);
}

/**
 * Register (or redraw in place) one glyph per palette entry, plus its alerted
 * twin. Called on load, on every `ptcc:theme`, and on a colour-mode switch — the
 * ids are stable so the layer's `icon-image` expression never changes.
 *
 * `updateImage` rather than remove/add: MapLibre keeps the same texture slot, so
 * a theme swap does not re-upload the whole sprite atlas mid-frame.
 */
export function installBusImages(
  map: maplibregl.Map,
  palette: string[],
  outline: string,
  ring: string,
): void {
  for (let i = 0; i < palette.length; i++) {
    for (const alert of [false, true]) {
      const id = busImageId(i, alert);
      const img = drawBus(palette[i]!, outline, alert ? ring : null);
      if (map.hasImage(id)) map.updateImage(id, img);
      else map.addImage(id, img, { pixelRatio: 2 });
    }
  }
}
