// ─────────────────────────────────────────────────────────────────────────────
// V2Globe — "Your World of Bookings"
// Live 3D photorealistic Earth on the dashboard. Every BOOKED deal becomes a
// glowing pin at its destination; an animated gold arc flows from Voyage-Ed
// HQ (Mohali) to each pin, visualising the agency's current reach at a glance.
// Lazily loaded from V2Pages so the ~400 kB three.js bundle doesn't bloat
// first paint on routes that don't need it.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useMemo, useState } from 'react';
import Globe from 'react-globe.gl';

// Mohali, Punjab — the origin of every arc on the globe. Hard-coded rather
// than user-configurable because it's the physical HQ address, not a setting.
const HQ = { lat: 30.7046, lng: 76.7179, name: 'Voyage-Ed · Mohali' };

// Destination → coordinates lookup. Keyed by lowercase substring so a
// destination string like "Trip to Koh Samui 2026" still matches "koh samui".
// Order matters only slightly — the longer / more specific keys are listed
// first so "koh samui" wins over "thailand" when both would match.
const DEST_COORDS = {
  // South-East Asia (most of the CRM's current bookings)
  'koh samui': { lat: 9.5120, lng: 100.0136 },
  'phi phi': { lat: 7.7407, lng: 98.7784 },
  'chiang mai': { lat: 18.7883, lng: 98.9853 },
  'chiang rai': { lat: 19.9105, lng: 99.8406 },
  'phuket': { lat: 7.8804, lng: 98.3923 },
  'krabi': { lat: 8.0863, lng: 98.9063 },
  'pattaya': { lat: 12.9236, lng: 100.8825 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'thailand': { lat: 15.8700, lng: 100.9925 },
  'nusa dua': { lat: -8.8008, lng: 115.2320 },
  'ubud': { lat: -8.5069, lng: 115.2625 },
  'seminyak': { lat: -8.6895, lng: 115.1668 },
  'kuta': { lat: -8.7183, lng: 115.1686 },
  'denpasar': { lat: -8.6500, lng: 115.2167 },
  'bali': { lat: -8.3405, lng: 115.0920 },
  'indonesia': { lat: -0.7893, lng: 113.9213 },
  'ho chi minh': { lat: 10.8231, lng: 106.6297 },
  'da nang': { lat: 16.0544, lng: 108.2022 },
  'hoi an': { lat: 15.8801, lng: 108.3380 },
  'ha long': { lat: 20.9101, lng: 107.1839 },
  'halong': { lat: 20.9101, lng: 107.1839 },
  'phu quoc': { lat: 10.2270, lng: 103.9636 },
  'nha trang': { lat: 12.2388, lng: 109.1967 },
  'hanoi': { lat: 21.0285, lng: 105.8542 },
  'saigon': { lat: 10.8231, lng: 106.6297 },
  'vietnam': { lat: 14.0583, lng: 108.2772 },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'penang': { lat: 5.4164, lng: 100.3327 },
  'langkawi': { lat: 6.3500, lng: 99.8000 },
  'malaysia': { lat: 4.2105, lng: 101.9758 },
  'sentosa': { lat: 1.2494, lng: 103.8303 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'cambodia': { lat: 12.5657, lng: 104.9910 },
  'siem reap': { lat: 13.3671, lng: 103.8448 },
  'philippines': { lat: 12.8797, lng: 121.7740 },

  // Middle East
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },
  'sharjah': { lat: 25.3463, lng: 55.4209 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'uae': { lat: 23.4241, lng: 53.8478 },
  'oman': { lat: 21.4735, lng: 55.9754 },
  'qatar': { lat: 25.3548, lng: 51.1839 },
  'doha': { lat: 25.2854, lng: 51.5310 },

  // Central Asia
  'medeu': { lat: 43.1550, lng: 77.0611 },
  'shymbulak': { lat: 43.1250, lng: 77.0817 },
  'astana': { lat: 51.1694, lng: 71.4491 },
  'almaty': { lat: 43.2220, lng: 76.8512 },
  'kazakhstan': { lat: 48.0196, lng: 66.9237 },
  'uzbekistan': { lat: 41.3775, lng: 64.5853 },
  'tashkent': { lat: 41.2995, lng: 69.2401 },
  'baku': { lat: 40.4093, lng: 49.8671 },
  'azerbaijan': { lat: 40.1431, lng: 47.5769 },
  'tbilisi': { lat: 41.7151, lng: 44.8271 },
  'georgia': { lat: 42.3154, lng: 43.3569 },

  // Europe
  'london': { lat: 51.5074, lng: -0.1278 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'uk': { lat: 54.0000, lng: -2.0000 },
  'united kingdom': { lat: 54.0000, lng: -2.0000 },
  'britain': { lat: 54.0000, lng: -2.0000 },
  'scotland': { lat: 56.4907, lng: -4.2026 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'france': { lat: 46.2276, lng: 2.2137 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'venice': { lat: 45.4408, lng: 12.3155 },
  'italy': { lat: 41.8719, lng: 12.5674 },
  'swiss': { lat: 46.8182, lng: 8.2275 },
  'switzerland': { lat: 46.8182, lng: 8.2275 },
  'spain': { lat: 40.4637, lng: -3.7492 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'netherlands': { lat: 52.1326, lng: 5.2913 },
  'turkey': { lat: 38.9637, lng: 35.2433 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'greece': { lat: 39.0742, lng: 21.8243 },
  'santorini': { lat: 36.3932, lng: 25.4615 },

  // Americas
  'new york': { lat: 40.7128, lng: -74.0060 },
  'florida': { lat: 27.9944, lng: -81.7603 },
  'california': { lat: 36.7783, lng: -119.4179 },
  'usa': { lat: 39.8283, lng: -98.5795 },
  'america': { lat: 39.8283, lng: -98.5795 },
  'canada': { lat: 56.1304, lng: -106.3468 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'mexico': { lat: 23.6345, lng: -102.5528 },

  // Oceania
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'australia': { lat: -25.2744, lng: 133.7751 },
  'new zealand': { lat: -40.9006, lng: 174.8860 },

  // Africa
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'egypt': { lat: 26.8206, lng: 30.8025 },
  'south africa': { lat: -30.5595, lng: 22.9375 },
  'kenya': { lat: -0.0236, lng: 37.9062 },
  'mauritius': { lat: -20.3484, lng: 57.5522 },
  'seychelles': { lat: -4.6796, lng: 55.4920 },

  // Indian Ocean + regional short-haul
  'maldives': { lat: 3.2028, lng: 73.2207 },
  'sri lanka': { lat: 7.8731, lng: 80.7718 },
  'colombo': { lat: 6.9271, lng: 79.8612 },
  'bhutan': { lat: 27.5142, lng: 90.4336 },
  'nepal': { lat: 28.3949, lng: 84.1240 },
  'kathmandu': { lat: 27.7172, lng: 85.3240 },

  // India (domestic) — most-asked hill stations and metros
  'madikeri': { lat: 12.4244, lng: 75.7382 },
  'coorg': { lat: 12.3375, lng: 75.8069 },
  'ooty': { lat: 11.4064, lng: 76.6932 },
  'munnar': { lat: 10.0889, lng: 77.0595 },
  'kerala': { lat: 10.8505, lng: 76.2711 },
  'manali': { lat: 32.2432, lng: 77.1892 },
  'shimla': { lat: 31.1048, lng: 77.1734 },
  'kashmir': { lat: 33.7782, lng: 76.5762 },
  'leh': { lat: 34.1526, lng: 77.5771 },
  'ladakh': { lat: 34.1526, lng: 77.5771 },
  'rishikesh': { lat: 30.0869, lng: 78.2676 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  'andaman': { lat: 11.7401, lng: 92.6586 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'rajasthan': { lat: 27.0238, lng: 74.2179 },
  'udaipur': { lat: 24.5854, lng: 73.7125 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'india': { lat: 20.5937, lng: 78.9629 },
};

// Resolve a free-form destination string to coordinates. Returns null for
// deals like "Flights only" or empty destinations so they're excluded cleanly.
function geocodeDeal(d) {
  const raw = String(d.destination || '').toLowerCase().trim();
  if (!raw) return null;
  // Fast path: exact key match
  if (DEST_COORDS[raw]) return DEST_COORDS[raw];
  // Substring match — longer keys first so "koh samui" wins over "thailand"
  const sortedKeys = Object.keys(DEST_COORDS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (raw.includes(key)) return DEST_COORDS[key];
  }
  return null;
}

export default function V2Globe({ deals = [], onPinClick }) {
  const globeEl = useRef();
  const containerRef = useRef();
  const [width, setWidth] = useState(900);

  // Build pins + arcs from BOOKED deals. Multiple deals to the same
  // destination are collapsed into one pin whose size grows with total value,
  // so popular destinations visually dominate without crowding the globe.
  const { pins, arcs, mappedCount } = useMemo(() => {
    const byCoord = new Map();
    deals.forEach((d) => {
      const c = geocodeDeal(d);
      if (!c) return;
      const key = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
      const existing = byCoord.get(key) || { ...c, deals: [], totalValue: 0, destLabel: '' };
      existing.deals.push(d);
      existing.totalValue += Number(d.sellingPrice || d.totalValue || 0);
      // Prefer the most specific destination name seen for this coord cluster
      const name = String(d.destination || '').trim();
      if (name && (!existing.destLabel || name.length < existing.destLabel.length)) {
        existing.destLabel = name;
      }
      byCoord.set(key, existing);
    });
    const pins = [];
    const arcs = [];
    byCoord.forEach((p) => {
      // Pin altitude = tall beam of light. Scales with aggregate value so a
      // ₹10L booking looms higher than a ₹50k one, but the base is set high
      // (0.35) so even single small bookings read as clear vertical beams
      // against the dark Earth, not flat dots that disappear.
      const alt = Math.min(1.1, 0.35 + Math.log10(1 + p.totalValue / 10000) * 0.14);
      pins.push({
        lat: p.lat,
        lng: p.lng,
        altitude: alt,
        // Beam width — narrow but readable, grows slightly with booking count
        radius: 0.55 + Math.min(0.6, p.deals.length * 0.12),
        // Bright saturated colours chosen for max contrast against the earth-
        // night texture. Pure #f0c842 was fading into the globe's dark gold
        // city lights — #ffd700 (pure gold) and #ff4500 (orange-red) pop.
        color: p.deals.length > 1 ? '#ffd700' : '#ff4500',
        destLabel: p.destLabel,
        deals: p.deals,
        totalValue: p.totalValue,
      });
      arcs.push({
        startLat: HQ.lat,
        startLng: HQ.lng,
        endLat: p.lat,
        endLng: p.lng,
        // Gradient 0 → 1 along the arc: fully opaque gold at HQ, fading to
        // vivid orange at the destination. Previously used 10% alpha at HQ
        // which made arcs almost invisible on light landmasses.
        color: ['rgba(255,215,0,1)', 'rgba(255,165,0,1)', 'rgba(255,69,0,1)'],
      });
    });
    return { pins, arcs, mappedCount: pins.length };
  }, [deals]);

  // Responsive width — match the container, re-measure on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const w = containerRef.current ? containerRef.current.offsetWidth : 900;
      setWidth(Math.max(320, w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // Globe setup: slow auto-rotate, zoom disabled (so it never gets stuck
  // zoomed out to space), initial view centred on India/SE Asia where most
  // of the current bookings cluster.
  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minDistance = 200;
    controls.maxDistance = 500;
    globeEl.current.pointOfView({ lat: 22, lng: 82, altitude: 2.4 }, 1200);
  }, []);

  const totalValue = pins.reduce((s, p) => s + p.totalValue, 0);
  const totalValueDisplay = totalValue >= 10000000
    ? `₹${(totalValue / 10000000).toFixed(1)}Cr`
    : totalValue >= 100000
      ? `₹${(totalValue / 100000).toFixed(1)}L`
      : `₹${Math.round(totalValue / 1000)}k`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #15264d 0%, #0a1530 60%, #050a1c 100%)',
        borderRadius: 20,
        overflow: 'hidden',
        height: 440,
        marginBottom: 24,
        border: '1px solid rgba(240,200,66,0.15)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Starfield overlay — tiny CSS-generated stars behind the globe */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent 50%),
                            radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.4), transparent 50%),
                            radial-gradient(1.5px 1.5px at 80% 20%, rgba(255,255,255,0.5), transparent 50%),
                            radial-gradient(1px 1px at 15% 80%, rgba(255,255,255,0.4), transparent 50%),
                            radial-gradient(1px 1px at 90% 50%, rgba(255,255,255,0.5), transparent 50%),
                            radial-gradient(1.5px 1.5px at 40% 10%, rgba(255,255,255,0.4), transparent 50%),
                            radial-gradient(1px 1px at 70% 85%, rgba(255,255,255,0.3), transparent 50%),
                            radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.5), transparent 50%)`,
          backgroundSize: '100% 100%',
          pointerEvents: 'none',
        }}
      />

      {/* Header overlay — top-left: title, top-right: live stats */}
      <div style={{
        position: 'absolute', top: 20, left: 24, right: 24, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
              boxShadow: '0 0 10px #22c55e',
              animation: 've-globe-pulse 1.6s ease-in-out infinite',
            }} />
            <div style={{ fontSize: 10, letterSpacing: 2.5, fontWeight: 800, color: '#f0c842' }}>LIVE · REAL-TIME</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'Georgia, "Times New Roman", serif', marginTop: 4, lineHeight: 1.1 }}>
            Your World of Bookings
          </div>
          <div style={{ fontSize: 12, color: '#8fa3c0', marginTop: 4 }}>
            {mappedCount > 0
              ? `${mappedCount} active destination${mappedCount > 1 ? 's' : ''} · spun from Mohali`
              : deals.length > 0
                ? `${deals.length} booking${deals.length > 1 ? 's' : ''} but destinations not on the map — ping Claude to add them`
                : 'No bookings yet — your first destination will light up here'}
          </div>
        </div>
        {mappedCount > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#f0c842', opacity: 0.85 }}>TOTAL VALUE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'Georgia, serif', lineHeight: 1 }}>{totalValueDisplay}</div>
            <div style={{ fontSize: 10, color: '#8fa3c0', marginTop: 4 }}>across {deals.length} booking{deals.length > 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      {/* Bottom-left legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 24, zIndex: 10,
        display: 'flex', gap: 16, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8fa3c0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0c842', boxShadow: '0 0 6px #f0c842' }} />
          Multi-booking
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8fa3c0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c', boxShadow: '0 0 6px #ea580c' }} />
          Single booking
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8fa3c0' }}>
          <div style={{ width: 14, height: 2, background: 'linear-gradient(90deg, #f0c842, #ea580c)' }} />
          Route from Mohali
        </div>
      </div>

      {/* The actual 3D globe */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Globe
          ref={globeEl}
          width={width}
          height={440}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#f0c842"
          atmosphereAltitude={0.18}
          /* Pins */
          pointsData={pins}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="altitude"
          pointColor="color"
          pointRadius="radius"
          pointLabel={(p) => `
            <div style="background:#0a1530;padding:10px 14px;border-radius:10px;color:#fff;font-size:12px;border:1px solid #f0c842;box-shadow:0 8px 24px rgba(0,0,0,0.5);min-width:180px;font-family:'DM Sans',system-ui,sans-serif">
              <div style="font-size:9px;letter-spacing:2px;font-weight:800;color:#f0c842;margin-bottom:4px">${p.deals.length} BOOKING${p.deals.length > 1 ? 'S' : ''}</div>
              <div style="font-size:14px;font-weight:800;margin-bottom:6px;font-family:Georgia,serif">${p.destLabel || 'Destination'}</div>
              <div style="font-size:11px;color:#8fa3c0;margin-bottom:4px">${p.deals.map((d) => d.clientName || 'Client').slice(0, 3).join(' · ')}${p.deals.length > 3 ? ` + ${p.deals.length - 3} more` : ''}</div>
              <div style="font-size:13px;font-weight:800;color:#f0c842">₹${p.totalValue.toLocaleString('en-IN')}</div>
            </div>
          `}
          onPointClick={(p) => {
            if (onPinClick && p.deals && p.deals.length === 1) onPinClick(p.deals[0]);
            // For clusters, let the user see the tooltip and pick from the drilldown elsewhere
          }}
          /* Arcs: HQ → destinations, thick animated dashes */
          arcsData={arcs}
          arcColor="color"
          arcStroke={0.9}
          arcDashLength={0.5}
          arcDashGap={0.1}
          arcDashInitialGap={() => Math.random()}
          arcDashAnimateTime={2200}
          arcAltitudeAutoScale={0.5}
          /* Pulsing rings: HQ (large, slow) + every destination (small, fast)
             so the whole globe looks alive with heartbeats. */
          ringsData={[
            { lat: HQ.lat, lng: HQ.lng, maxR: 6, speed: 2.5, period: 1600, color: '#ffd700' },
            ...pins.map((p) => ({ lat: p.lat, lng: p.lng, maxR: 2.5, speed: 1.8, period: 2000, color: p.color })),
          ]}
          ringColor={(r) => r.color}
          ringMaxRadius="maxR"
          ringPropagationSpeed="speed"
          ringRepeatPeriod="period"
          ringAltitude={0.012}
        />
      </div>

      {/* Keyframe for the LIVE pulse dot */}
      <style>{`
        @keyframes ve-globe-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
