// Backend route-map generator for Voyage-Ed proposal PDFs.
//
// Fully offline: uses Natural Earth 50m public-domain vector data (bundled
// via the `world-atlas` npm package) for coastlines and country borders,
// projects with d3-geo's Mercator, composites markers and mode-styled route
// lines, then rasterizes the whole thing to PNG via sharp/librsvg.
//
// Why offline instead of OSM tiles:
//   - no external HTTP dependency at render time (works even if OSM's tile
//     server is unreachable, rate-limited, or slow)
//   - no per-render network cost or throttling
//   - atlas-style aesthetic matches the premium proposal PDF look better than
//     OSM's busy street map — a Delhi→Mumbai proposal doesn't need road detail
//   - deterministic output — same stops always yield the same bytes, so we
//     can cache aggressively
//
// Output style matches the CRM proposal template:
//   - land          #f4ebd3 (parchment)
//   - water         #dae7f3 (soft blue)
//   - country lines #ccb98a (muted khaki border)
//   - gold (#c9961a) numbered markers with white ring, 1..N labels
//   - flight legs   → dashed blue, arced   (#2563eb)
//   - road legs     → solid red, straight  (#dc2626)
//   - train legs    → dashed purple        (#7c3aed)
//   - cruise legs   → dashed cyan, arced   (#0891b2)
//   - city labels next to each marker

const topojson = require('topojson-client');
const d3geo = require('d3-geo');
const sharp = require('sharp');
const worldTopo = require('world-atlas/countries-50m.json');
const landTopo = require('world-atlas/land-50m.json');

// Precompute GeoJSON feature collections once at module load. Same simplified
// 50m Natural Earth polygons used elsewhere in the CRM.
const COUNTRIES_GEO = topojson.feature(worldTopo, worldTopo.objects.countries);
const LAND_GEO = topojson.feature(landTopo, landTopo.objects.land);

const MODE_STYLE = {
  flight: { color: '#2563eb', width: 3.5, dashed: true,  arc: true  },
  train:  { color: '#7c3aed', width: 3.5, dashed: true,  arc: false },
  cruise: { color: '#0891b2', width: 3.5, dashed: true,  arc: true  },
  car:    { color: '#dc2626', width: 3.5, dashed: false, arc: false },
  road:   { color: '#dc2626', width: 3.5, dashed: false, arc: false },
};

// ─── Coordinate + bounding helpers ────────────────────────────────────

function fitProjection(stops, width, height, padFrac) {
  // Compute the geographic bounding box of the stops (with a bit of padding
  // in degrees so no marker sits flush against the edge), then let d3-geo
  // fit a Mercator projection to that box inside the pixel canvas. Mercator
  // is right for travel maps — preserves angles, familiar shape (this is
  // what Google Maps / OSM use). Not equal-area, but that's fine at country
  // scale.
  const lngs = stops.map((s) => s.lng);
  const lats = stops.map((s) => s.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);

  // Pad in degrees, scaled so tiny bboxes (two hotels in one city) still get
  // a reasonable frame, and huge bboxes (continent tours) don't get bloated.
  const dLng = Math.max(1.5, (maxLng - minLng) * 0.35);
  const dLat = Math.max(1.0, (maxLat - minLat) * 0.35);
  // GeoJSON RFC-7946 requires outer rings in COUNTER-CLOCKWISE order (in
  // geographic coords with north up). SW → NW → NE → SE → SW is CCW. Winding
  // clockwise silently makes d3-geo treat the polygon as the whole globe with
  // a hole cut out, which collapses fitExtent's scale and shows the world map.
  const bbox = {
    type: 'Polygon',
    coordinates: [[
      [minLng - dLng, minLat - dLat],
      [minLng - dLng, maxLat + dLat],
      [maxLng + dLng, maxLat + dLat],
      [maxLng + dLng, minLat - dLat],
      [minLng - dLng, minLat - dLat],
    ]],
  };
  const pad = Math.round(Math.min(width, height) * padFrac);
  return d3geo.geoMercator().fitExtent(
    [[pad, pad], [width - pad, height - pad]],
    bbox,
  );
}

function projectPoint(proj, lat, lng) {
  const [x, y] = proj([lng, lat]);
  return { x, y };
}

// Compact quadratic-bezier "arc" between two projected points, for flight and
// cruise legs — gives the map a sense of long-distance travel without needing
// literal great-circle math (overkill at country/continent scale).
function arcPath(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const offset = Math.min(60, len * 0.18);
  const nx = -dy / (len || 1), ny = dx / (len || 1);
  const cx = midX + nx * offset;
  const cy = midY + ny * offset;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

// ─── Numbered marker SVG ──────────────────────────────────────────────

function markerSvg(number, x, y) {
  // (x, y) is where the pin tip should touch the map. The pin is 40 wide ×
  // 52 tall, tip at the center of the bottom edge.
  const label = String(number);
  const fontSize = label.length > 1 ? 13 : 15;
  const px = x - 20, py = y - 52;
  return `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">
    <path d="M20 2 C 9 2 2 10 2 20 c 0 12 12 22 18 30 c 6 -8 18 -18 18 -30 C 38 10 31 2 20 2 Z" fill="#c9961a" stroke="#ffffff" stroke-width="2.5" filter="url(#pinShadow)"/>
    <circle cx="20" cy="20" r="10.5" fill="#0d1b3e"/>
    <text x="20" y="${20 + fontSize / 3}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff">${label}</text>
  </g>`;
}

function xmlEscape(s) {
  return String(s || '').replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Marker positioning with de-clustering. When multiple stops project to
// near-identical pixel positions (e.g. Denpasar, Ubud, Kuta all within 10 km
// of each other, or the same city appearing at both ends of a loop), stacking
// pins directly on top of each other hides all but the top one. Instead, we
// offset overlapping pins around a small circle so every number stays legible.
function dodgeMarkers(pts, minSep = 32) {
  const out = pts.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 1; i < out.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = out[i].x - out[j].x, dy = out[i].y - out[j].y;
      const d = Math.hypot(dx, dy);
      if (d < minSep) {
        // Push apart along the line between them; if they're exactly
        // coincident, spread by a deterministic angle so ordering is stable
        // across renders.
        const angle = d === 0 ? (i * 2.4) : Math.atan2(dy, dx);
        const shift = (minSep - d) / 2 + 4;
        out[i].x += Math.cos(angle) * shift;
        out[i].y += Math.sin(angle) * shift;
      }
    }
  }
  return out;
}

// Smart label placement: for each marker, try 4 anchor positions (right of
// pin, left of pin, above pin, below pin) and score each by how much it
// overlaps existing labels or other markers. Pick the lowest-overlap slot.
function layoutLabels(pts, names, width, height) {
  const labelBoxes = []; // {x0,y0,x1,y1} of placed labels
  const markerBoxes = pts.map((p) => ({
    x0: p.x - 20, y0: p.y - 52, x1: p.x + 20, y1: p.y,
  }));
  const results = [];

  function boxOverlap(a, b) {
    const ox = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
    const oy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return ox * oy;
  }

  pts.forEach((p, i) => {
    const text = names[i];
    const w = text.length * 7.5 + 10;
    const h = 18;
    // Candidate anchor positions, in preference order (right, above, left, below).
    const candidates = [
      { x: p.x + 22, y: p.y - 30, anchor: 'start' },  // right of pin at top of pin
      { x: p.x,      y: p.y - 60, anchor: 'middle' }, // above pin
      { x: p.x - 22, y: p.y - 30, anchor: 'end' },    // left of pin
      { x: p.x,      y: p.y + 14, anchor: 'middle' }, // below pin tip
      { x: p.x + 22, y: p.y - 8,  anchor: 'start' },  // right at pin base
      { x: p.x - 22, y: p.y - 8,  anchor: 'end' },    // left at pin base
    ];
    let best = null;
    let bestScore = Infinity;
    for (const c of candidates) {
      const box = {
        x0: c.anchor === 'end' ? c.x - w : c.anchor === 'middle' ? c.x - w / 2 : c.x,
        y0: c.y - h,
        x1: c.anchor === 'end' ? c.x : c.anchor === 'middle' ? c.x + w / 2 : c.x + w,
        y1: c.y + 4,
      };
      // Penalty: overlap with other markers + already-placed labels + running
      // off canvas edge. Preferred candidates get a small bonus by ordering.
      let score = 0;
      for (let k = 0; k < markerBoxes.length; k++) {
        if (k !== i) score += boxOverlap(box, markerBoxes[k]) * 2;
      }
      for (const lb of labelBoxes) score += boxOverlap(box, lb) * 3;
      if (box.x0 < 2) score += (2 - box.x0) * 10;
      if (box.x1 > width - 2) score += (box.x1 - (width - 2)) * 10;
      if (box.y0 < 2) score += (2 - box.y0) * 10;
      if (box.y1 > height - 2) score += (box.y1 - (height - 2)) * 10;
      if (score < bestScore) { bestScore = score; best = { ...c, box }; }
    }
    labelBoxes.push(best.box);
    results.push({ x: best.x, y: best.y, anchor: best.anchor, text });
  });

  return results;
}

// ─── Land / country vector paths ──────────────────────────────────────

function svgPathForFeatures(features, proj) {
  // d3-geo's geoPath renders GeoJSON features to SVG-path strings under our
  // projection. We concatenate all features into one path per layer to keep
  // the SVG small — one <path> for all land, one for all country borders.
  const pathGen = d3geo.geoPath(proj);
  return features.map((f) => pathGen(f)).filter(Boolean).join(' ');
}

// ─── Main renderer ────────────────────────────────────────────────────

/**
 * Render a route map to a PNG buffer.
 *
 * @param {Array<{name:string, lat:number, lng:number, mode?:string}>} stops
 *   Each stop has a display name, coordinates, and (except for the first) a
 *   mode of arrival from the previous stop. Modes: flight | train | cruise
 *   | car (default). The first stop's mode is ignored.
 * @param {object} [opts]
 * @param {number} [opts.width=800]
 * @param {number} [opts.height=560]
 * @param {number} [opts.padding=0.08]  frame padding as fraction of shorter side
 * @returns {Promise<Buffer>} PNG bytes
 */
async function renderRouteMap(stops, opts = {}) {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error('renderRouteMap: need at least 2 stops');
  }
  const width = opts.width || 800;
  const height = opts.height || 560;
  const padding = opts.padding == null ? 0.08 : opts.padding;

  const proj = fitProjection(stops, width, height, padding);
  const rawPts = stops.map((s) => projectPoint(proj, s.lat, s.lng));
  // Route lines use the true projected positions (drawn between actual city
  // coords). Markers get slightly nudged apart when they'd otherwise stack.
  const pts = dodgeMarkers(rawPts, 34);

  const landPath = svgPathForFeatures(LAND_GEO.features, proj);
  const bordersPath = svgPathForFeatures(COUNTRIES_GEO.features, proj);

  // Route lines: one <path> per segment. Dashes handled by stroke-dasharray
  // — cleaner than synthesizing many short sub-lines.
  const routeLines = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const style = MODE_STYLE[(stops[i + 1].mode || 'car').toLowerCase()] || MODE_STYLE.car;
    const a = rawPts[i], b = rawPts[i + 1];
    const d = style.arc
      ? arcPath(a.x, a.y, b.x, b.y)
      : `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    const dashAttr = style.dashed ? ` stroke-dasharray="8,6"` : '';
    routeLines.push(`<path d="${d}" fill="none" stroke="${style.color}" stroke-width="${style.width}" stroke-linecap="round"${dashAttr}/>`);
  }

  const labels = layoutLabels(pts, stops.map((s) => s.name), width, height).map((l) =>
    `<text x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="${l.anchor}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700" fill="#0d1b3e" paint-order="stroke" stroke="#ffffff" stroke-width="3" stroke-linejoin="round">${xmlEscape(l.text)}</text>`
  ).join('');

  const markers = pts.map((p, i) => markerSvg(i + 1, p.x, p.y)).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="pinShadow" x="-20%" y="-10%" width="140%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
      <feOffset dy="1.5"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e2edf6"/>
      <stop offset="1" stop-color="#cfdff0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#water)"/>
  <path d="${landPath}" fill="#f4ebd3" stroke="none"/>
  <path d="${bordersPath}" fill="none" stroke="#ccb98a" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round"/>
  ${routeLines.join('\n  ')}
  ${labels}
  ${markers}
  <text x="${width - 8}" y="${height - 8}" text-anchor="end" font-family="Arial,sans-serif" font-size="9" fill="#7d8bab">Voyage-Ed · Natural Earth</text>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'), { density: 144 })
    .resize(width, height)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

module.exports = { renderRouteMap };
