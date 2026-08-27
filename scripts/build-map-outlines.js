// Extracts and simplifies real country boundaries from Natural Earth (via
// world-atlas 50m) and emits the same COUNTRY_OUTLINES shape the CRM's
// SVG-fallback expects: { region: { bounds: [[minLat,minLng],[maxLat,maxLng]], path: "M lng,lat L lng,lat ... Z" } }
//
// Simplification threshold is picked per region so:
//  - small islands (Bali, Sri Lanka, UAE) keep enough detail to be recognizable
//  - continental Europe simplifies aggressively (dozens of countries → ~few KB)
//  - path total across all 9 regions stays well under ~40 KB uncompressed

const topojson = require('topojson-client');
const topoSimplify = require('topojson-simplify');
const worldRaw = require('world-atlas/countries-50m.json');

// Presimplify once; then per-region we pick a different quantile threshold.
const world = topoSimplify.presimplify(worldRaw);

function featureByName(topo, name) {
  const geo = topojson.feature(topo, topo.objects.countries);
  return geo.features.find((f) => f.properties.name === name) || null;
}

function polygonRings(geom) {
  // Return an array of rings (each ring = array of [lng,lat])
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return [].concat(...geom.coordinates);
  return [];
}

function boundsOfRings(rings) {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  rings.forEach((ring) => {
    ring.forEach(([lng, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
  });
  return [[minLat, minLng], [maxLat, maxLng]];
}

function ringsToSvgPath(rings) {
  // Emit a single SVG path with subpaths per ring, using "lng,lat" coord pairs
  // and 2-decimal precision to keep bundle size small (~11m precision).
  return rings
    .map((ring) => {
      if (ring.length < 3) return '';
      const pts = ring.map(([lng, lat]) => `${lng.toFixed(2)},${lat.toFixed(2)}`);
      return 'M' + pts[0] + ' L' + pts.slice(1).join(' L') + ' Z';
    })
    .filter(Boolean)
    .join(' ');
}

function filterRingsInBox(rings, box) {
  // Keep only rings whose centroid falls inside the box; useful for extracting
  // Bali out of Indonesia's 133 polygons, or European regions from wider hosts.
  const [[minLat, minLng], [maxLat, maxLng]] = box;
  return rings.filter((ring) => {
    let sx = 0, sy = 0;
    ring.forEach(([lng, lat]) => { sx += lng; sy += lat; });
    const cx = sx / ring.length, cy = sy / ring.length;
    return cx >= minLng && cx <= maxLng && cy >= minLat && cy <= maxLat;
  });
}

function dropRingsSmaller(rings, minVertices) {
  return rings.filter((r) => r.length >= minVertices);
}

// Drop rings that simplified down to essentially a single point — tiny islets
// (Lakshadweep specks, Nusa Ceningan) that collapse under aggressive weights
// contribute nothing visually but bloat the path. Threshold in degrees.
function dropDegenerateRings(rings, minSpanDeg) {
  return rings.filter((r) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    r.forEach(([lng, lat]) => {
      if (lng < minX) minX = lng;
      if (lng > maxX) maxX = lng;
      if (lat < minY) minY = lat;
      if (lat > maxY) maxY = lat;
    });
    return (maxX - minX) >= minSpanDeg || (maxY - minY) >= minSpanDeg;
  });
}

function extractRegion({ name, countries, weight, filterBox, minVertices = 4, boundsOverride }) {
  const simplified = topoSimplify.simplify(world, weight);
  let allRings = [];
  countries.forEach((cn) => {
    const feat = featureByName(simplified, cn);
    if (!feat) { console.warn(`  missing: ${cn}`); return; }
    allRings.push(...polygonRings(feat.geometry));
  });
  if (filterBox) allRings = filterRingsInBox(allRings, filterBox);
  allRings = dropRingsSmaller(allRings, minVertices);
  // Drop rings that collapsed to a near-point during simplification. Threshold
  // scales with the region: island regions (Bali, Sri Lanka) keep smaller rings,
  // continent-scale views (Europe) discard anything under ~0.2° (~22km).
  const minSpan = (boundsOverride ? Math.max(boundsOverride[1][0] - boundsOverride[0][0], boundsOverride[1][1] - boundsOverride[0][1]) : 10) * 0.008;
  allRings = dropDegenerateRings(allRings, minSpan);
  const path = ringsToSvgPath(allRings);
  const bounds = boundsOverride || boundsOfRings(allRings);
  return { name, bounds, path, rings: allRings.length, pathLen: path.length };
}

// ─── Region definitions ───────────────────────────────────────────
// weight (min area threshold for topojson-simplify) chosen per region:
//   larger weight = more aggressive simplification = shorter path
//   values calibrated by eyeballing: small enough to keep coast recognizable,
//   large enough that path length stays reasonable.

const REGIONS = [
  { name: 'india',     countries: ['India'],                       weight: 0.15 },
  { name: 'vietnam',   countries: ['Vietnam'],                     weight: 0.05 },
  { name: 'thailand',  countries: ['Thailand'],                    weight: 0.05 },
  { name: 'bali',      countries: ['Indonesia'],                   weight: 0.005,
    filterBox: [[-9.5, 114], [-8, 117]],  // Bali + Lombok + Nusa
    boundsOverride: [[-9.0, 114.4], [-8.0, 116.5]] },
  { name: 'uae',       countries: ['United Arab Emirates', 'Oman'], weight: 0.02,
    // Include Oman coastline for context (Musandam peninsula wraps around),
    // then clip to UAE bounds so the frame stays UAE-centered.
    filterBox: [[22, 51], [26.5, 57]],
    boundsOverride: [[22.0, 51.0], [26.5, 56.5]] },
  { name: 'srilanka',  countries: ['Sri Lanka'],                   weight: 0.005,
    // Extend a hair south so Mirissa (5.94°N) sits inside the frame — the
    // Natural Earth coastline just clips it otherwise.
    boundsOverride: [[5.7, 79.5], [10.0, 82.1]] },
  { name: 'malaysia',  countries: ['Malaysia', 'Singapore', 'Thailand'], weight: 0.02,
    // Peninsular Malaysia + Singapore only. Including Sabah/Sarawak on Borneo
    // (116°E) stretches the frame absurdly wide — KK trips are rare and its
    // marker just falls outside the frame gracefully. Thailand is added
    // because its southern peninsula shares the same landmass and clipping
    // there mid-peninsula would look artificial.
    filterBox: [[0.5, 99], [8.5, 106]],
    boundsOverride: [[0.5, 99.5], [7.5, 105.5]] },
  { name: 'bhutan',    countries: ['Bhutan'],                      weight: 0.005 },
  { name: 'georgia',   countries: ['Georgia', 'Armenia', 'Azerbaijan'], weight: 0.02,
    boundsOverride: [[38.5, 40.0], [43.7, 50.5]] },  // include neighbouring stops (Baku, Yerevan)
  { name: 'europe',    countries: [
      // Continental + UK/Ireland + Scandinavia + Iberia + Balkans + Turkey west + Greece
      'United Kingdom','Ireland','France','Germany','Netherlands','Belgium','Luxembourg',
      'Switzerland','Austria','Italy','Spain','Portugal','Andorra','Monaco',
      'Denmark','Norway','Sweden','Finland','Iceland','Estonia','Latvia','Lithuania',
      'Poland','Czechia','Slovakia','Hungary','Slovenia','Croatia','Bosnia and Herz.',
      'Serbia','Montenegro','Kosovo','Albania','Macedonia','Bulgaria','Romania',
      'Moldova','Ukraine','Belarus','Greece','Turkey','Cyprus','Malta','San Marino','Vatican',
    ], weight: 0.4,
    boundsOverride: [[35, -12], [72, 42]] },  // exclude Turkey's easternmost tip / Ural Russia
];

const out = {};
REGIONS.forEach((r) => {
  const info = extractRegion(r);
  out[r.name] = { bounds: info.bounds, path: info.path };
  console.log(`${r.name.padEnd(10)} rings=${String(info.rings).padStart(3)}  path=${String(info.pathLen).padStart(6)} chars  bounds=${JSON.stringify(info.bounds)}`);
});

// Emit the JS constant, formatted to match the existing V2Pages.js style.
const lines = [
  '// Real country boundaries simplified from Natural Earth 50m (public domain),',
  '// generated by scripts/build-map-outlines.js. Path uses lng,lat coordinate',
  '// pairs (SVG projection code in buildRouteMapSVG projects them). Rings are',
  '// separated by M...Z subpaths so multi-island regions render correctly.',
  'const COUNTRY_OUTLINES = {',
];
Object.entries(out).forEach(([k, v]) => {
  lines.push(`  ${k}: {`);
  lines.push(`    bounds: ${JSON.stringify(v.bounds)},`);
  lines.push(`    path: ${JSON.stringify(v.path)},`);
  lines.push(`  },`);
});
lines.push('};');
require('fs').writeFileSync('/home/claude/maps/outlines.js', lines.join('\n') + '\n');
console.log('\ntotal path bytes:', Object.values(out).reduce((a, v) => a + v.path.length, 0));
console.log('wrote /home/claude/maps/outlines.js');
