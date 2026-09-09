// Backend route-map generator v3 — "travel-brochure" style.
//
// Modelled on the reference map: distinct pastel colour for each visible
// country, bold country names in vibrant colours, simple black city dots
// with text labels, transport icons rendered inline on route segments,
// legend box at the bottom, ROUTE MAP title header, compass top-left.
//
// This is a stylistic pivot from v2's atlas look — same core geometry
// (d3-geo, Natural Earth), same offline pipeline, but the visual
// language now matches the printed tour-brochure aesthetic travel
// agencies actually use, not a reference atlas.

const topojson = require('topojson-client');
const d3geo = require('d3-geo');
const worldTopo = require('world-atlas/countries-50m.json');
const CORRECT_INDIA = require('./india-correct-boundary.json');

const _COUNTRIES_RAW = topojson.feature(worldTopo, worldTopo.objects.countries);

// ─── Correct India boundary override ──────────────────────────────────
// Natural Earth's default India polygon reflects the Line of Control /
// de facto administration — it EXCLUDES Pakistan-Occupied Kashmir
// (Gilgit-Baltistan + Azad Kashmir) and Aksai Chin. Per the Constitution
// of India and Survey of India maps, the full state of Jammu & Kashmir
// and the Union Territory of Ladakh — including PoK and Aksai Chin — are
// integral parts of India. Depicting them otherwise is legally required
// to be corrected for Indian-audience material (Geospatial Information
// Regulation Bill 2016; MHA guidelines for map depiction).
//
// Fix: replace India's geometry with the Survey-of-India-aligned polygon
// (from Datameet's india-composite dataset, simplified to 88 KB while
// preserving the disputed regions) and CLIP the same regions out of
// Pakistan and China so those countries don't render on top of the
// claimed territory.
const CLAIMED_TERRITORIES = [
  // Rough bounding boxes to clip from Pakistan and China.
  // PoK (Gilgit-Baltistan + Azad Kashmir): roughly 72-77°E, 32.5-37.1°N
  { name: 'PoK', minLng: 72.5, maxLng: 77.0, minLat: 32.5, maxLat: 37.2 },
  // Aksai Chin: roughly 77.5-80°E, 33.5-35.5°N
  { name: 'Aksai Chin', minLng: 77.5, maxLng: 80.5, minLat: 33.5, maxLat: 35.7 },
];

function pointInBox(lng, lat, box) {
  return lng >= box.minLng && lng <= box.maxLng && lat >= box.minLat && lat <= box.maxLat;
}

const COUNTRIES_GEO = {
  ..._COUNTRIES_RAW,
  features: _COUNTRIES_RAW.features.map((f) => {
    const name = f.properties.name;
    if (name === 'India') {
      return { ...f, geometry: CORRECT_INDIA.geometry };
    }
    if (name === 'Pakistan' || name === 'China') {
      // Filter out rings that lie entirely inside a claimed territory box.
      // This is a simple heuristic — for polygons that straddle the boundary
      // we leave them alone (correct clipping would need a full polygon
      // boolean, which is expensive to run at render time). At the country
      // level this heuristic removes the PoK slice from Pakistan and the
      // Aksai Chin slice from China cleanly because those slices happen to
      // be separate rings in the Natural Earth data.
      const filterCoords = (polys) => polys.map((poly) => {
        const outer = poly[0];
        // If EVERY point in the outer ring is inside a claimed box, drop
        // the whole polygon.
        for (const box of CLAIMED_TERRITORIES) {
          const allInside = outer.every((pt) => pointInBox(pt[0], pt[1], box));
          if (allInside) return null;
        }
        return poly;
      }).filter(Boolean);
      const geom = f.geometry;
      if (geom.type === 'MultiPolygon') {
        return { ...f, geometry: { ...geom, coordinates: filterCoords(geom.coordinates) } };
      }
      return f;
    }
    return f;
  }),
};

// ─── Country colour palette ───────────────────────────────────────────
// Six pastel fills + matching vibrant label colours. Assigned to visible
// countries in-order by centroid position (western-most first) so a
// Europe map always paints Switzerland red-pink, Austria green, etc. in
// the same order every render for the same trip — deterministic.
const COUNTRY_COLOURS = [
  { fill: '#fddede', label: '#c22030' }, // pink · red
  { fill: '#dcefd7', label: '#2a8a3f' }, // mint · green
  { fill: '#e6dcf1', label: '#7b3fae' }, // lavender · purple
  { fill: '#faedca', label: '#c98a1a' }, // butter · amber
  { fill: '#d7e5f4', label: '#2a5aa3' }, // powder · blue
  { fill: '#f8dcc0', label: '#c96a1c' }, // peach · orange
  { fill: '#d9eae7', label: '#2a7a72' }, // seafoam · teal
  { fill: '#f0dbe7', label: '#a83870' }, // rose · magenta
];

// Mode → line style + icon.
// Line styles chosen to distinguish clearly at print size:
//   train  = solid line with white tick-marks (railway)
//   road   = dashed line
//   air    = dotted line + gentle arc
//   cruise = long-dashed line + arc
const MODE_STYLE = {
  train:  { color: '#0d3a7a', width: 3.5, dash: '',       icon: 'train',  arc: false },
  car:    { color: '#0d3a7a', width: 3.5, dash: '10,6',   icon: 'car',    arc: false },
  road:   { color: '#0d3a7a', width: 3.5, dash: '10,6',   icon: 'car',    arc: false },
  flight: { color: '#0d3a7a', width: 3.5, dash: '2,6',    icon: 'plane',  arc: true  },
  cruise: { color: '#0d3a7a', width: 3.5, dash: '14,7',   icon: 'ship',   arc: true  },
};

// ─── Transport icons (inline SVG paths) ───────────────────────────────
// Each icon is drawn inside a 22×22 rounded white background so it sits
// cleanly on top of the route line. Rendered upright regardless of route
// direction — ships/trains/planes are read symbolically here, not literally.
function iconSvg(kind, x, y) {
  const bg = `<circle cx="${x}" cy="${y}" r="12" fill="#ffffff" stroke="#0d3a7a" stroke-width="1.6"/>`;
  const c = (path, opts = {}) => `<path d="${path}" fill="${opts.fill || '#0d3a7a'}" stroke="none"/>`;
  const off = (dx, dy) => `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;

  if (kind === 'train') {
    // Simple train silhouette: body + window + wheels
    return `<g>${bg}
      <rect x="${(x - 6).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="12" height="8" rx="2" fill="#0d3a7a"/>
      <rect x="${(x - 4.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="9" height="3" rx="0.6" fill="#ffffff"/>
      <circle cx="${(x - 3.5).toFixed(1)}" cy="${(y + 4.2).toFixed(1)}" r="1.5" fill="#0d3a7a"/>
      <circle cx="${(x + 3.5).toFixed(1)}" cy="${(y + 4.2).toFixed(1)}" r="1.5" fill="#0d3a7a"/>
    </g>`;
  }
  if (kind === 'car' || kind === 'bus') {
    // Bus silhouette (like reference)
    return `<g>${bg}
      <rect x="${(x - 6.5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="13" height="8" rx="2.2" fill="#0d3a7a"/>
      <rect x="${(x - 5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="4" height="3" rx="0.6" fill="#ffffff"/>
      <rect x="${(x + 1).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="4" height="3" rx="0.6" fill="#ffffff"/>
      <circle cx="${(x - 3.5).toFixed(1)}" cy="${(y + 4).toFixed(1)}" r="1.5" fill="#0d3a7a"/>
      <circle cx="${(x + 3.5).toFixed(1)}" cy="${(y + 4).toFixed(1)}" r="1.5" fill="#0d3a7a"/>
    </g>`;
  }
  if (kind === 'plane') {
    // Airplane silhouette
    return `<g>${bg}
      <path d="M ${off(-7, 0)} L ${off(2, -1)} L ${off(3, -5)} L ${off(5, -5)} L ${off(4.5, -0.5)} L ${off(7, 0)} L ${off(4.5, 0.5)} L ${off(5, 5)} L ${off(3, 5)} L ${off(2, 1)} Z" fill="#0d3a7a"/>
    </g>`;
  }
  if (kind === 'ship') {
    return `<g>${bg}
      <path d="M ${off(-6, 1)} L ${off(6, 1)} L ${off(4, 4)} L ${off(-4, 4)} Z" fill="#0d3a7a"/>
      <rect x="${(x - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="6" height="3" fill="#0d3a7a"/>
      <rect x="${(x - 0.5).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="1" height="3" fill="#0d3a7a"/>
    </g>`;
  }
  return bg;
}

// ─── Great-circle helpers (for flights) ───────────────────────────────
function greatCirclePath(a, b, proj, samples = 48) {
  const interp = d3geo.geoInterpolate([a.lng, a.lat], [b.lng, b.lat]);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const [lng, lat] = interp(i / samples);
    const [x, y] = proj([lng, lat]);
    pts.push([x, y]);
  }
  return { d: 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'), midpoint: pts[Math.floor(pts.length / 2)] };
}
function quadraticArc(a, b) {
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Special case: start == end (cruise leaves and returns to the same port
  // — Singapore round-trip cruise, for example). Draw a circular loop
  // into the sea instead of a zero-length line so the trip visibly reads
  // as "cruise loop from here" rather than a marker on top of itself.
  if (len < 6) {
    const r = 55;
    const cx1 = a.x + 15, cy1 = a.y - r * 2;
    const cx2 = a.x + r * 2 + 30, cy2 = a.y - r * 2;
    return {
      d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} C${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${(a.x + 6).toFixed(1)},${a.y.toFixed(1)}`,
      midpoint: [a.x + r + 20, a.y - r],
    };
  }
  const off = Math.min(70, len * 0.18);
  const cx = midX - (dy / len) * off, cy = midY + (dx / len) * off;
  const mid = [(a.x + b.x) / 4 + cx / 2, (a.y + b.y) / 4 + cy / 2];
  return { d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`, midpoint: mid };
}

// ─── Projection ───────────────────────────────────────────────────────
function fitProjection(stops, width, height, padFrac) {
  const lngs = stops.map((s) => s.lng), lats = stops.map((s) => s.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const spanLng = maxLng - minLng, spanLat = maxLat - minLat;
  const dLng = spanLng < 1 ? Math.max(0.15, spanLng * 0.6)
              : spanLng < 4 ? Math.max(0.5, spanLng * 0.4)
              : Math.max(1.5, spanLng * 0.35);
  const dLat = spanLat < 1 ? Math.max(0.12, spanLat * 0.6)
              : spanLat < 4 ? Math.max(0.4, spanLat * 0.4)
              : Math.max(1.0, spanLat * 0.35);
  const bbox = {
    type: 'Polygon',
    coordinates: [[
      [minLng - dLng, minLat - dLat], [minLng - dLng, maxLat + dLat],
      [maxLng + dLng, maxLat + dLat], [maxLng + dLng, minLat - dLat],
      [minLng - dLng, minLat - dLat],
    ]],
  };
  const pad = Math.round(Math.min(width, height) * padFrac);
  return d3geo.geoMercator().fitExtent([[pad, pad + 40], [width - pad, height - pad - 60]], bbox);
}

// Test whether a projected point (x, y) is inside a feature's rendered
// SVG path. Uses d3-geo's path bounds as a fast reject, then a proper
// point-in-polygon test on the un-projected coordinate.
function pointInFeature(feature, lng, lat) {
  return d3geo.geoContains(feature, [lng, lat]);
}

function visibleCountries(proj, width, height, visitedIndices) {
  const pathGen = d3geo.geoPath(proj);
  const items = [];
  COUNTRIES_GEO.features.forEach((f, fi) => {
    const bounds = pathGen.bounds(f);
    if (!bounds) return;
    const [[x0, y0], [x1, y1]] = bounds;
    // Reject fully off-screen
    if (x1 < 0 || y1 < 0 || x0 > width || y0 > height) return;
    const w = x1 - x0, h = y1 - y0;
    // Reject specks — country's visible chunk too small to matter for the fill
    if (w < 8 && h < 8) return;
    const centroid = d3geo.geoCentroid(f);
    const [cx, cy] = proj(centroid);
    items.push({ feature: f, idx: fi, name: (f.properties.name || '').toUpperCase(), cx, cy, w, h, area: w * h });
  });
  // Palette assignment among ALL visible countries (deterministic).
  const byX = [...items].sort((a, b) => a.cx - b.cx || a.name.localeCompare(b.name));
  const paletteMap = new Map(byX.map((it, i) => [it.idx, COUNTRY_COLOURS[i % COUNTRY_COLOURS.length]]));

  // ── Which of these deserve a label? ───────────────────────────────
  // Stricter: label only if:
  //  (a) centroid falls INSIDE the map frame with padding,
  //  (b) centroid falls INSIDE that country's own geometry (so a fragment
  //      whose visible bounds are near frame edge but centroid is on
  //      unrelated distant land doesn't show up), and
  //  (c) projected width is at least the label's own width.
  // Then de-duplicate any that would visually collide, keeping the larger.
  const labelable = items.filter((it) => {
    if (!isFinite(it.cx) || !isFinite(it.cy)) return false;
    if (it.cx < 20 || it.cx > width - 20 || it.cy < 30 || it.cy > height - 30) return false;
    const centroid = d3geo.geoCentroid(it.feature);
    if (!d3geo.geoContains(it.feature, centroid)) return false;
    const nameLen = it.name.length;
    const minW = Math.max(60, nameLen * 6.5);
    return it.w >= minW && it.h >= 30;
  });
  const sortedByArea = [...labelable].sort((a, b) => b.area - a.area);
  const keptLabels = [];
  for (const l of sortedByArea) {
    const collision = keptLabels.some((k) => Math.hypot(k.cx - l.cx, k.cy - l.cy) < 65);
    if (!collision) keptLabels.push(l);
  }
  const labelIdxSet = new Set(keptLabels.map((k) => k.idx));

  return items.map((it) => ({
    ...it,
    colour: paletteMap.get(it.idx),
    visited: visitedIndices.has(it.idx),
    showLabel: labelIdxSet.has(it.idx),
  }));
}

// ─── XML escape ───────────────────────────────────────────────────────
function xmlEscape(s) {
  return String(s || '').replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ─── City label placement — simple 4-position tries ────────────────────
function placeCityLabels(dots, names, width, height) {
  const placed = [];
  const boxAt = (x, y, w, h, anchor) => {
    let x0;
    if (anchor === 'start') x0 = x;
    else if (anchor === 'middle') x0 = x - w / 2;
    else x0 = x - w;
    return { x0, y0: y - h + 4, x1: x0 + w, y1: y + 4 };
  };
  const overlap = (a, b) => {
    const ox = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
    const oy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return ox * oy;
  };
  dots.forEach((dot, i) => {
    const text = names[i];
    const w = text.length * 7 + 6;
    const h = 15;
    const candidates = [
      { dx: 10, dy: 4, anchor: 'start' },   // right of dot
      { dx: -10, dy: 4, anchor: 'end' },    // left of dot
      { dx: 0, dy: -12, anchor: 'middle' }, // above
      { dx: 0, dy: 20, anchor: 'middle' },  // below
      { dx: 10, dy: -10, anchor: 'start' }, // NE
      { dx: -10, dy: -10, anchor: 'end' },  // NW
      { dx: 10, dy: 18, anchor: 'start' },  // SE
      { dx: -10, dy: 18, anchor: 'end' },   // SW
    ];
    let best = null, bestScore = Infinity;
    for (const cand of candidates) {
      const x = dot.x + cand.dx, y = dot.y + cand.dy;
      const box = boxAt(x, y, w, h, cand.anchor);
      if (box.x0 < 4 || box.x1 > width - 4 || box.y0 < 4 || box.y1 > height - 4) continue;
      let score = 0;
      for (let k = 0; k < dots.length; k++) {
        if (k === i) continue;
        const d = Math.hypot(x - dots[k].x, y - dots[k].y);
        if (d < 18) score += (18 - d) * 4;
      }
      for (const pl of placed) score += overlap(box, pl.box) * 3;
      if (score < bestScore) { bestScore = score; best = { x, y, anchor: cand.anchor, text, box }; }
    }
    if (!best) best = { x: dot.x + 10, y: dot.y + 4, anchor: 'start', text, box: boxAt(dot.x + 10, dot.y + 4, w, h, 'start') };
    placed.push(best);
  });
  return placed;
}

// ─── Main renderer ────────────────────────────────────────────────────
function renderRouteMap(stops, opts = {}) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error('need 2+ stops');
  const width = opts.width || 900;
  const height = opts.height || 620;
  const padding = opts.padding == null ? 0.08 : opts.padding;

  const proj = fitProjection(stops, width, height, padding);
  const dots = stops.map((s) => {
    const [x, y] = proj([s.lng, s.lat]);
    return { x, y };
  });
  const pathGen = d3geo.geoPath(proj);

  // Which countries do our stops actually fall in? Those get the vibrant
  // palette; every other visible country gets a neutral fill. This matches
  // the reference where visited countries pop and adjacent ones are muted.
  const visitedIndices = new Set();
  stops.forEach((s) => {
    COUNTRIES_GEO.features.forEach((f, fi) => {
      if (d3geo.geoContains(f, [s.lng, s.lat])) visitedIndices.add(fi);
    });
  });

  const countries = visibleCountries(proj, width, height, visitedIndices);
  const NEUTRAL_FILL = '#eef1f4';
  const NEUTRAL_LABEL = '#9aa5b1';
  // Paint order: everything except India first, India last. This asserts
  // the correct India boundary over any Pakistan/China polygon that still
  // overlaps into PoK or Aksai Chin — those disputed regions must render
  // as India visually, per the Constitution of India and Survey of India
  // conventions.
  const indiaFeatures = countries.filter((c) => c.name === 'INDIA');
  const otherFeatures = countries.filter((c) => c.name !== 'INDIA');
  const paintCountry = (c) => {
    const fill = c.visited ? c.colour.fill : NEUTRAL_FILL;
    return `<path d="${pathGen(c.feature)}" fill="${fill}" stroke="#ffffff" stroke-width="1.5"/>`;
  };
  const countryFills = [...otherFeatures.map(paintCountry), ...indiaFeatures.map(paintCountry)].join('');
  // Reserve zones where country labels must not fall: compass rose,
  // ROUTE MAP header, legend at bottom, and every city dot (with a
  // buffer). Prevents "SWITZERLAND" sitting on top of Zurich/Lucerne/
  // Interlaken dots the way it did in the first pass.
  const noGoZones = [
    { cx: 30, cy: 40, r: 55 },       // compass rose
    { cx: 95, cy: 12, r: 105 },      // ROUTE MAP header
    { cx: width / 2, cy: height - 27, r: 200 }, // legend
    ...dots.map((d) => ({ cx: d.x, cy: d.y, r: 30 })), // city dots buffer
  ];
  const labelBlocked = (cx, cy) => noGoZones.some((z) => Math.hypot(cx - z.cx, cy - z.cy) < z.r);
  const countryLabels = countries.filter((c) => c.showLabel).map((c) => {
    // Candidate label positions — centroid first, then offset positions
    // inside the country's bounding box. This mirrors how the reference
    // places SWITZERLAND at the bottom-left of Switzerland's outline (away
    // from the Zurich/Lucerne/Interlaken dot cluster) instead of dead
    // centre where the dots are.
    const pathBounds = pathGen.bounds(c.feature);
    const [[bx0, by0], [bx1, by1]] = pathBounds;
    const candidates = [
      { x: c.cx, y: c.cy },                             // centroid (preferred)
      { x: c.cx, y: (by1 + c.cy) / 2 },                 // south of centroid
      { x: c.cx, y: (by0 + c.cy) / 2 },                 // north of centroid
      { x: (bx0 + c.cx) / 2, y: c.cy },                 // west of centroid
      { x: (bx1 + c.cx) / 2, y: c.cy },                 // east of centroid
      { x: c.cx * 0.65 + bx0 * 0.35, y: by1 * 0.6 + c.cy * 0.4 }, // SW quadrant
      { x: c.cx * 0.65 + bx1 * 0.35, y: by0 * 0.6 + c.cy * 0.4 }, // NE quadrant
    ];
    // Score each candidate: must be inside country geometry, inside frame,
    // not blocked by dots/compass/legend/header. Prefer the earliest one.
    const invert = proj.invert.bind(proj);
    let chosen = null;
    for (const cand of candidates) {
      const cx = Math.min(width - 60, Math.max(60, cand.x));
      const cy = Math.min(height - 60, Math.max(45, cand.y));
      if (labelBlocked(cx, cy)) continue;
      const [lng, lat] = invert([cx, cy]) || [null, null];
      if (lng == null || !d3geo.geoContains(c.feature, [lng, lat])) continue;
      chosen = { cx, cy }; break;
    }
    if (!chosen) return '';
    const { cx, cy } = chosen;
    const labelColour = c.visited ? c.colour.label : NEUTRAL_LABEL;
    const weight = c.visited ? 800 : 700;
    const opacity = c.visited ? 0.95 : 0.55;
    const words = c.name.split(' ');
    if (words.length > 1 && c.name.length > 10) {
      const half = Math.ceil(words.length / 2);
      const line1 = words.slice(0, half).join(' ');
      const line2 = words.slice(half).join(' ');
      return `<text x="${cx.toFixed(1)}" y="${(cy - 6).toFixed(1)}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="${weight}" fill="${labelColour}" letter-spacing="1.2" opacity="${opacity}">${xmlEscape(line1)}</text>
              <text x="${cx.toFixed(1)}" y="${(cy + 10).toFixed(1)}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="${weight}" fill="${labelColour}" letter-spacing="1.2" opacity="${opacity}">${xmlEscape(line2)}</text>`;
    }
    return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="${weight}" fill="${labelColour}" letter-spacing="1.2" opacity="${opacity}">${xmlEscape(c.name)}</text>`;
  }).join('');

  // Route segments — each rendered as a path with mode-specific dash;
  // transport icon placed at midpoint. Modes present are tracked for the
  // legend at the bottom.
  //
  // Every leg gets a subtle curve based on whether it's an outbound (going
  // to a not-yet-visited city) or return (going back to a visited one).
  // Without this the SIN→KUL outbound flight and the KUL→DEL return
  // (which run through the same air corridor) would draw on top of each
  // other and read as a single line. Curve them in opposite directions
  // (outbound bows one way, return the other) and both are visible.
  const visitedByStop = new Set();
  const modesPresent = new Set();
  const routeSvg = [];
  const routeIcons = [];
  const keyOf = (s) => `${s.lat.toFixed(3)},${s.lng.toFixed(3)}`;
  visitedByStop.add(keyOf(stops[0]));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    const pA = dots[i], pB = dots[i + 1];
    const mode = (b.mode || 'car').toLowerCase();
    const style = MODE_STYLE[mode] || MODE_STYLE.car;
    modesPresent.add(mode);
    const isReturn = visitedByStop.has(keyOf(b));
    visitedByStop.add(keyOf(b));
    let path, midpoint;
    if (style.arc && mode === 'flight') {
      // Flights already arc via great-circle; for returns bow the other way
      // by nudging via a slightly offset control point.
      const gc = greatCirclePath(a, b, proj);
      path = gc.d; midpoint = gc.midpoint;
      if (isReturn) {
        // Overwrite with a quadratic bow in the opposite normal direction
        // so return leg is visibly separate from outbound.
        const q = quadraticArc(pA, pB);
        path = q.d.replace(/Q(\S+?),(\S+?) /, (m, cx, cy) => {
          const dx = pB.x - pA.x, dy = pB.y - pA.y;
          const len = Math.hypot(dx, dy) || 1;
          const off = Math.min(90, len * 0.15);
          const mX = (pA.x + pB.x) / 2 + (dy / len) * off;
          const mY = (pA.y + pB.y) / 2 - (dx / len) * off;
          return `Q${mX.toFixed(1)},${mY.toFixed(1)} `;
        });
        midpoint = [(pA.x + pB.x) / 2, (pA.y + pB.y) / 2 - 25];
      }
    } else if (style.arc) {
      const q = quadraticArc(pA, pB);
      path = q.d; midpoint = q.midpoint;
    } else {
      path = `M${pA.x.toFixed(1)},${pA.y.toFixed(1)} L${pB.x.toFixed(1)},${pB.y.toFixed(1)}`;
      midpoint = [(pA.x + pB.x) / 2, (pA.y + pB.y) / 2];
    }
    routeSvg.push(`<path d="${path}" fill="none" stroke="${style.color}" stroke-width="${style.width}" stroke-linecap="round"${style.dash ? ` stroke-dasharray="${style.dash}"` : ''}/>`);
    routeIcons.push(iconSvg(style.icon, midpoint[0], midpoint[1]));
  }

  // Dedupe dots + labels by coordinate — same city appearing more than
  // once (e.g. Delhi as origin AND return, Singapore as pre-cruise AND
  // post-cruise) should paint as ONE dot with ONE label. The route paths
  // still connect through the underlying stop sequence so nothing about
  // the trip logic is lost.
  const seen = new Map(); // key → first index
  const uniqueDots = [];
  stops.forEach((s, i) => {
    const k = keyOf(s);
    if (!seen.has(k)) {
      seen.set(k, uniqueDots.length);
      uniqueDots.push({ x: dots[i].x, y: dots[i].y, name: s.name, isLast: i === stops.length - 1 });
    } else if (i === stops.length - 1) {
      // If the final stop coincides with an earlier one, mark that earlier
      // dot as the endpoint so it gets the red pin.
      uniqueDots[seen.get(k)].isLast = true;
    }
  });

  // Simple black city dots + labels — from deduplicated set so revisits
  // don't stack labels. The dot marked isLast (final stop, or an earlier
  // dot that the trip returns to) gets the red pin.
  const uniqueXY = uniqueDots.map((d) => ({ x: d.x, y: d.y }));
  const cityLabels = placeCityLabels(uniqueXY, uniqueDots.map((d) => d.name), width, height);
  const cityLabelSvg = cityLabels.map((l) =>
    `<text x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="${l.anchor}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700" fill="#0d1b3e" paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round">${xmlEscape(l.text)}</text>`
  ).join('');
  const cityDots = uniqueDots.map((p) => {
    if (p.isLast) {
      return `<g>
        <circle cx="${p.x.toFixed(1)}" cy="${(p.y + 8).toFixed(1)}" rx="3" ry="1.5" fill="#0d1b3e" opacity="0.25"/>
        <path d="M ${p.x.toFixed(1)},${(p.y - 12).toFixed(1)} C ${(p.x - 6).toFixed(1)},${(p.y - 12).toFixed(1)} ${(p.x - 6).toFixed(1)},${(p.y - 4).toFixed(1)} ${p.x.toFixed(1)},${(p.y + 3).toFixed(1)} C ${(p.x + 6).toFixed(1)},${(p.y - 4).toFixed(1)} ${(p.x + 6).toFixed(1)},${(p.y - 12).toFixed(1)} ${p.x.toFixed(1)},${(p.y - 12).toFixed(1)} Z" fill="#e63946" stroke="#ffffff" stroke-width="1"/>
        <circle cx="${p.x.toFixed(1)}" cy="${(p.y - 8).toFixed(1)}" r="2" fill="#ffffff"/>
      </g>`;
    }
    return `<g>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#0d1b3e" stroke="#ffffff" stroke-width="1.5"/>
    </g>`;
  }).join('');

  // Legend at bottom — matches modes actually used in this trip
  const legendItems = [];
  if (modesPresent.has('train')) legendItems.push({ kind: 'train', label: 'By Train', line: 'solid' });
  if (modesPresent.has('car') || modesPresent.has('road')) legendItems.push({ kind: 'car', label: 'By Road', line: 'dash' });
  if (modesPresent.has('flight')) legendItems.push({ kind: 'plane', label: 'By Air', line: 'dot' });
  if (modesPresent.has('cruise')) legendItems.push({ kind: 'ship', label: 'By Cruise', line: 'longdash' });
  const legendWidth = 50 + legendItems.length * 110;
  const legendX = (width - legendWidth) / 2;
  const legendY = height - 42;
  const legendSvg = `<g>
    <rect x="${legendX}" y="${legendY}" width="${legendWidth}" height="30" rx="15" fill="#ffffff" stroke="#0d3a7a" stroke-width="1.2"/>
    ${legendItems.map((it, i) => {
      const ix = legendX + 20 + i * 110;
      const linePreview = it.line === 'dash' ? '<line x1="0" y1="0" x2="14" y2="0" stroke="#0d3a7a" stroke-width="2" stroke-dasharray="4,2"/>'
                        : it.line === 'dot' ? '<line x1="0" y1="0" x2="14" y2="0" stroke="#0d3a7a" stroke-width="2" stroke-dasharray="1,3"/>'
                        : it.line === 'longdash' ? '<line x1="0" y1="0" x2="14" y2="0" stroke="#0d3a7a" stroke-width="2" stroke-dasharray="6,3"/>'
                        : '<line x1="0" y1="0" x2="14" y2="0" stroke="#0d3a7a" stroke-width="2.5"/>';
      return `<g transform="translate(${ix}, ${legendY + 15})">
        ${iconSvg(it.kind, 0, 0).replace(/circle cx="0" cy="0" r="12"/, 'circle cx="0" cy="0" r="10"')}
        <g transform="translate(20, 0)">${linePreview}</g>
        <text x="42" y="4" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700" fill="#0d3a7a">${it.label}</text>
      </g>`;
    }).join('')}
  </g>`;

  // Title box top-left + compass
  const titleBox = `<g>
    <path d="M 0,0 L 170,0 L 190,26 L 0,26 Z" fill="#0d3a7a"/>
    <text x="14" y="18" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="800" fill="#ffffff" letter-spacing="2">ROUTE MAP</text>
  </g>`;
  const compass = `<g transform="translate(30, 56)" font-family="Inter,Arial,sans-serif">
    <circle cx="0" cy="0" r="14" fill="#ffffff" stroke="#0d3a7a" stroke-width="1.5"/>
    <polygon points="0,-11 4,2 0,4 -4,2" fill="#0d3a7a"/>
    <polygon points="0,11 4,-2 0,-4 -4,-2" fill="#c9ccd4"/>
    <text x="0" y="-16" text-anchor="middle" font-size="9" font-weight="800" fill="#0d3a7a">N</text>
  </g>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5f8fc"/>
      <stop offset="1" stop-color="#e8f0f8"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#water)" rx="14"/>
  ${countryFills}
  ${countryLabels}
  ${routeSvg.join('\n  ')}
  ${routeIcons.join('\n  ')}
  ${cityDots}
  ${cityLabelSvg}
  ${titleBox}
  ${compass}
  ${legendSvg}
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#0d3a7a" stroke-width="2" rx="14"/>
</svg>`;

  return svg;
}

// Sync alias for callers that expect a Promise-like interface (backend
// endpoint uses await for consistency even though this is now sync).
async function renderRouteMapPng(stops, opts) { return renderRouteMap(stops, opts); }

module.exports = { renderRouteMap, renderRouteMapPng };
