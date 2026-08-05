/**
 * Voyage-Ed V2 Pages
 * ────────────────────────────────────────────────────────────
 * 3 pixel-close React pages: Dashboard, Leads, Deal Detail.
 *
 * Feature-flagged via localStorage 'voyage:v2pages'.
 * Mount = renders as full-screen overlay on top of App.js.
 * App.js still runs underneath — nothing touched.
 *
 * Data: fetched from /api/leads (existing V1 endpoint).
 * Read-only in this phase. Edit still happens in V1 UI (Click on any
 * deal → toggle V2 off → open in V1).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

/* ─── Utils ──────────────────────────────────────────────── */

const fmtINR = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toFixed(0)}`;
};

const fmtINRFull = (n) => {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN');
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return null;
  return Math.ceil((then - Date.now()) / (24 * 60 * 60 * 1000));
};

const initialsOf = (name) => {
  if (!name) return '?';
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
};

const avatarGradient = (name) => {
  // Deterministic gradient from name
  const palettes = [
    'linear-gradient(135deg,#f97316,#ea580c)',   // orange
    'linear-gradient(135deg,#14b8a6,#0d9488)',   // teal
    'linear-gradient(135deg,#a855f7,#7e22ce)',   // purple
    'linear-gradient(135deg,#b45309,#92400e)',   // amber-brown
    'linear-gradient(135deg,#0ea5e9,#0369a1)',   // blue
    'linear-gradient(135deg,#e11d48,#9f1239)',   // rose
    'linear-gradient(135deg,#059669,#047857)',   // green
    'linear-gradient(135deg,#6366f1,#4338ca)',   // indigo
  ];
  const hash = (name || '').split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
};

const flagOf = (dest) => {
  if (!dest) return '🌏';
  const s = String(dest).toLowerCase();
  if (s.includes('vietnam')) return '🇻🇳';
  if (s.includes('thailand')) return '🇹🇭';
  if (s.includes('bali') || s.includes('indonesia')) return '🇮🇩';
  if (s.includes('dubai') || s.includes('uae')) return '🇦🇪';
  if (s.includes('usa') || s.includes('america')) return '🇺🇸';
  if (s.includes('japan')) return '🇯🇵';
  if (s.includes('maldives')) return '🇲🇻';
  if (s.includes('europe') || s.includes('france') || s.includes('italy')) return '🇪🇺';
  if (s.includes('singapore')) return '🇸🇬';
  if (s.includes('malaysia')) return '🇲🇾';
  if (s.includes('sri lanka')) return '🇱🇰';
  if (s.includes('nepal')) return '🇳🇵';
  if (s.includes('bhutan')) return '🇧🇹';
  if (s.includes('uk') || s.includes('london')) return '🇬🇧';
  if (s.includes('turkey')) return '🇹🇷';
  if (s.includes('egypt')) return '🇪🇬';
  if (s.includes('kashmir') || s.includes('india')) return '🇮🇳';
  return '🌏';
};

/* ─── Data fetch hook ─────────────────────────────────── */

function useLeads() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    // Auto-detect API base — same domain in prod, backend URL in dev
    const apiBase = window.location.hostname.includes('localhost')
      ? 'http://localhost:5000'
      : (window.__VOYAGE_API__ || 'https://voyage-crm.onrender.com');

    fetch(`${apiBase}/api/leads?limit=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        setItems(Array.isArray(data) ? data : (data.leads || []));
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  return { items, loading, error };
}

/* ─── Categorization helpers ─────────────────────────── */

const categorize = (lead) => {
  const status = String(lead.status || '').toLowerCase();
  if (['booked', 'confirmed', 'travelling', 'travelled'].some((s) => status.includes(s))) return 'booked';
  if (status.includes('hot')) return 'hot';
  if (status.includes('warm')) return 'warm';
  if (status.includes('cold')) return 'cold';
  if (status.includes('cancel')) return 'cancelled';
  // Fallback by age
  const created = lead.createdAt ? new Date(lead.createdAt).getTime() : 0;
  const ageDays = created ? (Date.now() - created) / (86400000) : 0;
  if (ageDays < 2) return 'hot';
  if (ageDays < 5) return 'warm';
  return 'cold';
};

const clientName = (lead) => lead.client?.name || lead.clientName || 'Unknown';
const destination = (lead) => lead.client?.destination || lead.destination || '';
const dealValueINR = (lead) => {
  const sell =
    lead.summary?.sellingPriceINR ||
    lead.finance?.sellingPriceINR ||
    lead.sellingPriceINR ||
    lead.dealData?.summary?.sellingPriceINR ||
    0;
  return Number(sell) || 0;
};

/* ─── SVG icons ──────────────────────────────────────── */

const IconDiamond = () => <span style={{ display: 'inline-block' }}>◆</span>;
const IconSparkle = () => <span style={{ display: 'inline-block' }}>✦</span>;
const IconCall = () => <span style={{ display: 'inline-block' }}>☏</span>;
const IconWhatsApp = () => <span style={{ display: 'inline-block' }}>◆</span>;
const IconMail = () => <span style={{ display: 'inline-block' }}>✉</span>;
const IconMore = () => <span style={{ display: 'inline-block' }}>⋯</span>;

/* ─── DASHBOARD ──────────────────────────────────────── */

function DashboardV2({ leads, onDealClick }) {
  // Compute KPIs from real data
  const stats = useMemo(() => {
    let collections = 0, bookings = 0, profit = 0, vendorPmts = 0;
    leads.forEach((l) => {
      const cat = categorize(l);
      if (cat === 'booked') bookings++;
      const paid = Number(l.summary?.clientPaidINR || l.summary?.paidINR || 0);
      const cost = Number(l.summary?.vendorCostINR || l.summary?.costINR || 0);
      const sell = Number(l.summary?.sellingPriceINR || 0);
      collections += paid;
      vendorPmts += cost;
      profit += (sell - cost);
    });
    return { collections, bookings, profit, vendorPmts };
  }, [leads]);

  // Upcoming departures — booked deals sorted by travel start date
  const upcomingDepartures = useMemo(() => {
    return leads
      .filter((l) => categorize(l) === 'booked')
      .map((l) => ({
        ...l,
        travelStart: l.client?.travelStartDate || l.travelStartDate || l.dealData?.travelStartDate,
        daysToDep: daysUntil(l.client?.travelStartDate || l.travelStartDate || l.dealData?.travelStartDate),
      }))
      .filter((l) => l.daysToDep !== null && l.daysToDep >= 0)
      .sort((a, b) => a.daysToDep - b.daysToDep)
      .slice(0, 4);
  }, [leads]);

  // Follow-ups today — hot/warm leads
  const followUps = useMemo(() => {
    return leads
      .filter((l) => {
        const c = categorize(l);
        return c === 'hot' || c === 'warm' || c === 'cold';
      })
      .slice(0, 4);
  }, [leads]);

  // Top destinations (bookings + revenue)
  const topDests = useMemo(() => {
    const bucket = {};
    leads.filter((l) => categorize(l) === 'booked').forEach((l) => {
      const d = destination(l).trim() || 'Other';
      const key = d.split(' ')[0]; // first word to group
      if (!bucket[key]) bucket[key] = { name: key, bookings: 0, revenue: 0 };
      bucket[key].bookings++;
      bucket[key].revenue += dealValueINR(l);
    });
    return Object.values(bucket)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [leads]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const userName = 'Vishal'; // could be pulled from user context

  const dayDots = (daysToDep) => {
    const status = daysToDep <= 3 ? 'danger' : daysToDep <= 10 ? 'warn' : 'ok';
    return status;
  };

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">{greeting}, {userName}</h1>
          <p className="v2-page-sub">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &nbsp;·&nbsp;{' '}
            <span style={{ color: '#c9a84c', fontWeight: 600 }}>Live business data</span>
          </p>
        </div>
        <div className="v2-header-actions">
          <input type="text" className="v2-search" placeholder="Search clients, deals, vendors…" />
          <button className="v2-icon-btn" title="AI Insights"><IconSparkle /></button>
          <button className="v2-icon-btn" title="Quick add">⊕</button>
        </div>
      </div>

      {/* Business Health hero */}
      <div className="v2-health-hero">
        <div className="v2-health-score">{Math.min(95, 60 + Math.floor(stats.bookings * 5))}</div>
        <div className="v2-health-body">
          <div className="v2-health-label">Business Health</div>
          <div className="v2-health-message">
            {stats.bookings > 5 ? 'Excellent · Strong pipeline' : stats.bookings > 2 ? 'Healthy · Keep going' : 'Building · Add more leads'}
          </div>
          <div className="v2-health-details">
            {upcomingDepartures.length} upcoming trips · {stats.bookings} confirmed bookings · {leads.length} total leads
          </div>
        </div>
        <div className="v2-health-metric">
          <div className="v2-health-metric-value">{fmtINR(stats.collections)}</div>
          <div className="v2-health-metric-label">Collections</div>
        </div>
        <div className="v2-health-metric">
          <div className="v2-health-metric-value">{fmtINR(stats.profit)}</div>
          <div className="v2-health-metric-label">Total Profit</div>
        </div>
      </div>

      <h2 className="v2-section-title">Today's Snapshot</h2>
      <p className="v2-section-sub">Live numbers from your CRM</p>

      <div className="v2-kpi-grid">
        <div className="v2-kpi-card">
          <div className="v2-kpi-icon green">◐</div>
          <div className="v2-kpi-label">Collections</div>
          <div className="v2-kpi-value">{fmtINR(stats.collections)}</div>
          <div className="v2-kpi-delta up">▲ Total client paid</div>
        </div>
        <div className="v2-kpi-card">
          <div className="v2-kpi-icon blue">◈</div>
          <div className="v2-kpi-label">Confirmed Bookings</div>
          <div className="v2-kpi-value">{stats.bookings}</div>
          <div className="v2-kpi-delta up">Active deals</div>
        </div>
        <div className="v2-kpi-card">
          <div className="v2-kpi-icon amber">◇</div>
          <div className="v2-kpi-label">Vendor Payments</div>
          <div className="v2-kpi-value">{fmtINR(stats.vendorPmts)}</div>
          <div className="v2-kpi-delta up">Total to suppliers</div>
        </div>
        <div className="v2-kpi-card">
          <div className="v2-kpi-icon gold">◆</div>
          <div className="v2-kpi-label">Total Profit (GPM)</div>
          <div className="v2-kpi-value">{fmtINR(stats.profit)}</div>
          <div className="v2-kpi-delta up">Across all deals</div>
        </div>
      </div>

      {/* Two-column: departures + follow-ups */}
      <div className="v2-two-col">
        <div className="v2-panel">
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">Upcoming Departures</h3>
            <a className="v2-view-all" href="#" onClick={(e) => e.preventDefault()}>View all →</a>
          </div>

          {upcomingDepartures.length === 0 ? (
            <div style={{ padding: '24px 0', color: '#6b7a99', fontSize: 13 }}>
              No upcoming departures. Convert some leads to deals to see them here.
            </div>
          ) : (
            upcomingDepartures.map((l, i) => {
              const paid = Number(l.summary?.clientPaidINR || 0);
              const total = dealValueINR(l);
              const pending = total - paid;
              const status = dayDots(l.daysToDep);
              return (
                <div key={l._id || i} className="v2-dep-row" onClick={() => onDealClick(l)} style={{ cursor: 'pointer' }}>
                  <div className={`v2-dep-days ${status === 'warn' ? 'warn' : status === 'ok' ? 'ok' : ''}`}>
                    <div className="v2-dep-days-num">{l.daysToDep}</div>
                    <div className="v2-dep-days-label">Days</div>
                  </div>
                  <div>
                    <div>
                      <span className="v2-dep-name">{clientName(l)}</span>
                      {l.dealNumber && <span className="v2-dep-dealnum">{l.dealNumber}</span>}
                    </div>
                    <div className="v2-dep-details">
                      {flagOf(destination(l))} {destination(l) || '—'} · {l.client?.travelStartDate || 'Dates TBD'}
                    </div>
                  </div>
                  <div className="v2-dep-value">
                    <div className="v2-dep-amount">{fmtINRFull(total)}</div>
                    <div className={`v2-dep-status ${pending > 0 ? 'pending' : 'paid'}`}>
                      {pending > 0 ? `${fmtINR(pending)} pending` : 'Fully paid ✓'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="v2-panel">
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">Follow-ups Today</h3>
            <a className="v2-view-all" href="#" onClick={(e) => e.preventDefault()}>View all →</a>
          </div>

          {followUps.length === 0 ? (
            <div style={{ padding: '24px 0', color: '#6b7a99', fontSize: 13 }}>
              No follow-ups needed today.
            </div>
          ) : (
            followUps.map((l, i) => {
              const cat = categorize(l);
              return (
                <div key={l._id || i} className="v2-fu-row">
                  <div className="v2-fu-head">
                    <span className="v2-fu-name">{clientName(l)}</span>
                    <span className={`v2-chip ${cat}`}>{cat.toUpperCase()}</span>
                  </div>
                  <div className="v2-fu-details">
                    {flagOf(destination(l))} {destination(l) || 'Enquiry'} · {fmtINR(dealValueINR(l))}
                  </div>
                  <div className="v2-fu-actions">
                    <button className="v2-mini-btn">☏ Call</button>
                    <button className="v2-mini-btn">◆ WhatsApp</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top destinations */}
      {topDests.length > 0 && (
        <div className="v2-panel" style={{ marginBottom: 32 }}>
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">Top Destinations</h3>
            <a className="v2-view-all" href="#" onClick={(e) => e.preventDefault()}>Analytics →</a>
          </div>
          <div className="v2-destinations">
            {topDests.map((d, i) => (
              <div key={i} className="v2-dest-card">
                <div className="v2-dest-flag">{flagOf(d.name)}</div>
                <h4 className="v2-dest-name">{d.name}</h4>
                <div className="v2-dest-labels">
                  <span>Bookings</span>
                  <span>Revenue</span>
                </div>
                <div className="v2-dest-stats">
                  <span className="v2-dest-bookings">{d.bookings}</span>
                  <span className="v2-dest-revenue">{fmtINR(d.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── LEADS PAGE ─────────────────────────────────────── */

function LeadsV2({ leads, onDealClick }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Only non-booked leads shown here
  const activeLeads = useMemo(() => {
    return leads.filter((l) => {
      const c = categorize(l);
      return c === 'hot' || c === 'warm' || c === 'cold';
    });
  }, [leads]);

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cold: 0, converted: 0 };
    leads.forEach((l) => {
      const cat = categorize(l);
      if (cat in c) c[cat]++;
      if (cat === 'booked') c.converted++;
    });
    const convertedValue = leads
      .filter((l) => categorize(l) === 'booked')
      .reduce((s, l) => s + dealValueINR(l), 0);
    const totalLeads = leads.length;
    const convRate = totalLeads > 0 ? Math.round((c.converted / totalLeads) * 100) : 0;
    return { ...c, convertedValue, convRate };
  }, [leads]);

  const filtered = useMemo(() => {
    let list = activeLeads;
    if (filter !== 'all') list = list.filter((l) => categorize(l) === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        clientName(l).toLowerCase().includes(q) ||
        destination(l).toLowerCase().includes(q) ||
        String(l.client?.phone || '').includes(search)
      );
    }
    return list;
  }, [activeLeads, filter, search]);

  const selected = filtered.find((l) => l._id === selectedId) || filtered[0] || null;

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Leads</h1>
          <p className="v2-page-sub">Manage every enquiry from first contact to booking</p>
        </div>
        <div className="v2-header-actions">
          <button className="v2-cta">+ New Lead</button>
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="v2-leads-kpis">
        <div className="v2-lead-kpi hot">
          <div className="v2-lead-kpi-label">Hot Leads</div>
          <div className="v2-lead-kpi-value">{counts.hot}</div>
          <div className="v2-lead-kpi-sub">Need follow-up today</div>
        </div>
        <div className="v2-lead-kpi warm">
          <div className="v2-lead-kpi-label">Warm Leads</div>
          <div className="v2-lead-kpi-value">{counts.warm}</div>
          <div className="v2-lead-kpi-sub">Follow-up in 2-3 days</div>
        </div>
        <div className="v2-lead-kpi cold">
          <div className="v2-lead-kpi-label">Cold Leads</div>
          <div className="v2-lead-kpi-value">{counts.cold}</div>
          <div className="v2-lead-kpi-sub">Not responded to quote</div>
        </div>
        <div className="v2-lead-kpi converted">
          <div className="v2-lead-kpi-label">Converted MTD</div>
          <div className="v2-lead-kpi-value">{counts.converted}</div>
          <div className="v2-lead-kpi-sub">{fmtINR(counts.convertedValue)} total value</div>
        </div>
        <div className="v2-lead-kpi rate">
          <div className="v2-lead-kpi-label">Conversion Rate</div>
          <div className="v2-lead-kpi-value">{counts.convRate}%</div>
          <div className="v2-lead-kpi-sub">{counts.convRate >= 20 ? 'Above 20% target' : 'Below target'}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="v2-filter-bar">
        <input
          type="text"
          className="v2-filter-search"
          placeholder="Search name, phone, destination, or note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={`v2-filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="count">{activeLeads.length}</span>
        </button>
        <button className={`v2-filter-chip ${filter === 'hot' ? 'active' : ''}`} onClick={() => setFilter('hot')}>
          Hot <span className="count">{counts.hot}</span>
        </button>
        <button className={`v2-filter-chip ${filter === 'warm' ? 'active' : ''}`} onClick={() => setFilter('warm')}>
          Warm <span className="count">{counts.warm}</span>
        </button>
        <button className={`v2-filter-chip ${filter === 'cold' ? 'active' : ''}`} onClick={() => setFilter('cold')}>
          Cold <span className="count">{counts.cold}</span>
        </button>
      </div>

      {/* Two column layout */}
      <div className="v2-leads-layout">
        <div className="v2-leads-list">
          <div className="v2-leads-list-head">
            <h3 className="v2-leads-list-title">
              Active Leads <span className="v2-leads-count">{filtered.length}</span>
            </h3>
            <select className="v2-select">
              <option>Priority: Highest</option>
              <option>Most Recent</option>
              <option>By Value</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>
              No leads match this filter.
            </div>
          ) : (
            filtered.map((l) => {
              const cat = categorize(l);
              const isSelected = selected && selected._id === l._id;
              const source = l.client?.source || l.source || 'Direct';
              const note = l.client?.notes || l.notes || l.dealData?.notes || '';
              return (
                <div
                  key={l._id}
                  className={`v2-lead-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedId(l._id)}
                >
                  <div className="v2-lead-avatar" style={{ background: avatarGradient(clientName(l)) }}>
                    {initialsOf(clientName(l))}
                  </div>
                  <div className="v2-lead-main">
                    <div className="v2-lead-namerow">
                      <span className="v2-lead-name">{clientName(l)}</span>
                      <span className={`v2-chip ${cat}`}>{cat.toUpperCase()}</span>
                    </div>
                    <div>
                      {l.client?.phone && <span className="v2-lead-phone">{l.client.phone}</span>}
                      <span className="v2-lead-source">{source}</span>
                    </div>
                    <div className="v2-lead-trip">
                      {flagOf(destination(l))} {destination(l) || 'Enquiry'} · {l.client?.nights ? `${l.client.nights}N` : ''} · {l.client?.travellers || l.client?.pax || ''} pax
                    </div>
                    {note && <div className="v2-lead-note">{note}</div>}
                  </div>
                  <div className="v2-lead-meta">
                    <div className="v2-lead-value">{fmtINR(dealValueINR(l))}</div>
                    <div className="v2-lead-time">{timeAgo(l.createdAt || l._id)}</div>
                    <div className="v2-lead-mini-actions">
                      <button className="v2-lead-mini-btn" title="WhatsApp">◆</button>
                      <button className="v2-lead-mini-btn" title="Call">☏</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right detail panel */}
        {selected ? (
          <div className="v2-lead-detail">
            <div className="v2-detail-head">
              <div className="v2-detail-head-top">
                <span className="v2-detail-head-chip">◆ {categorize(selected).toUpperCase()} LEAD</span>
                <div className="v2-detail-head-actions">
                  <button className="v2-detail-icon" title="WhatsApp">◆</button>
                  <button className="v2-detail-icon" title="Call">☏</button>
                  <button className="v2-detail-icon" title="Email">✉</button>
                  <button className="v2-detail-icon" title="More">⋯</button>
                </div>
              </div>
              <h2 className="v2-detail-name">{clientName(selected)}</h2>
              {selected.client?.phone && (
                <div className="v2-detail-phone">{selected.client.phone}</div>
              )}
              <div className="v2-detail-tags">
                <span className="v2-detail-tag">{selected.client?.source || 'Enquiry'}</span>
                {selected.client?.occasion && (
                  <span className="v2-detail-tag">{selected.client.occasion}</span>
                )}
              </div>
            </div>

            <div className="v2-detail-body">
              <div className="v2-detail-section-title">Trip Details</div>
              <div className="v2-detail-grid">
                <div>
                  <div className="v2-detail-field-label">Destination</div>
                  <div className="v2-detail-field-value">
                    {flagOf(destination(selected))} {destination(selected) || '—'}
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Nights</div>
                  <div className="v2-detail-field-value">
                    {selected.client?.nights ? `${selected.client.nights} nights` : '—'}
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Travellers</div>
                  <div className="v2-detail-field-value">
                    {selected.client?.travellers || selected.client?.pax || '—'}
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Budget</div>
                  <div className="v2-detail-field-value">{fmtINR(dealValueINR(selected))}</div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Travel Dates</div>
                  <div className="v2-detail-field-value">
                    {selected.client?.travelStartDate || 'Flexible'}
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Email</div>
                  <div className="v2-detail-field-value" style={{ fontSize: 12 }}>
                    {selected.client?.email || '—'}
                  </div>
                </div>
              </div>

              <div className="v2-detail-cta-row">
                <button
                  className="v2-detail-cta primary"
                  onClick={() => onDealClick(selected)}
                >
                  ◇ Open in Deal View
                </button>
                <button className="v2-detail-cta">◆ Send Proposal</button>
                <button className="v2-detail-cta">+ Note</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="v2-lead-detail" style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>
            Select a lead to see details
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── DEAL DETAIL ────────────────────────────────────── */

function DealDetailV2({ deal, onBack }) {
  const s = deal.summary || {};
  const client = deal.client || {};
  const sell = Number(s.sellingPriceINR || 0);
  const cost = Number(s.vendorCostINR || 0);
  const paid = Number(s.clientPaidINR || 0);
  const profit = sell - cost;
  const marginPct = sell > 0 ? Math.round((profit / sell) * 1000) / 10 : 0;
  const balance = sell - paid;
  const collectionPct = sell > 0 ? Math.round((paid / sell) * 1000) / 10 : 0;

  const daysToDep = daysUntil(client.travelStartDate);
  const isVIP = client.vip || (deal.tags || []).includes('VIP');
  const status = String(deal.status || '').toLowerCase();
  const isBooked = ['booked', 'confirmed', 'travelling'].some((s) => status.includes(s));

  const flights = deal.dealData?.flights || deal.flights || [];
  const hotels = deal.dealData?.hotels || deal.hotels || [];
  const visas = deal.dealData?.visas || deal.visas || [];
  const payments = deal.dealData?.payments || deal.payments || [];

  return (
    <main className="v2-page">
      <div className="v2-crumb">
        <a
          className="v2-crumb-link"
          href="#"
          onClick={(e) => { e.preventDefault(); onBack(); }}
        >
          ← Deals
        </a>{' '}
        &rsaquo; <span className="v2-crumb-current">{deal.dealNumber || 'DEAL'}</span> · {clientName(deal)} · {destination(deal)}
      </div>

      <div className="v2-deal-hero">
        <div className="v2-deal-hero-top">
          <div className="v2-hero-chips">
            {isVIP && <span className="v2-hero-chip gold">+ VIP Client</span>}
            {isBooked && <span className="v2-hero-chip green">◆ {String(deal.status || 'Booked').toUpperCase()}</span>}
            {daysToDep !== null && daysToDep >= 0 && daysToDep <= 30 && (
              <span className="v2-hero-chip dark">◇ {daysToDep} Days to Departure</span>
            )}
          </div>
          <div className="v2-hero-actions">
            <button className="v2-hero-btn">◆ WhatsApp</button>
            <button className="v2-hero-btn">✉ Email</button>
            <button className="v2-hero-btn gold">📄 Proposal PDF</button>
          </div>
        </div>
        <div className="v2-hero-dealnum">{deal.dealNumber}</div>
        <h1 className="v2-hero-title">
          {destination(deal) ? `Trip to ${destination(deal)}` : 'Deal'}
        </h1>
        <div className="v2-hero-subtitle">
          {clientName(deal)} · {client.travellers || client.pax || 'N/A'} pax
          {client.occasion ? ` · ${client.occasion}` : ''}
        </div>
        <div className="v2-hero-facts">
          <div>
            <div className="v2-hero-fact-label">Destination</div>
            <div className="v2-hero-fact-value">{flagOf(destination(deal))} {destination(deal) || '—'}</div>
          </div>
          <div>
            <div className="v2-hero-fact-label">Travel Dates</div>
            <div className="v2-hero-fact-value">
              {client.travelStartDate || '—'}
              {client.travelEndDate ? ` → ${client.travelEndDate}` : ''}
            </div>
          </div>
          <div>
            <div className="v2-hero-fact-label">Duration</div>
            <div className="v2-hero-fact-value">
              {client.nights ? `${client.nights} Nights` : '—'}
            </div>
          </div>
          <div>
            <div className="v2-hero-fact-label">Total Value</div>
            <div className="v2-hero-fact-value gold">{fmtINRFull(sell)}</div>
          </div>
        </div>
      </div>

      {/* Finance ribbon */}
      <div className="v2-finance-ribbon">
        <div>
          <div className="v2-fin-label">Selling Price</div>
          <div className="v2-fin-value">{fmtINRFull(sell)}</div>
          <div className="v2-fin-sub">Client final quote</div>
        </div>
        <div>
          <div className="v2-fin-label">Vendor Cost</div>
          <div className="v2-fin-value">{fmtINRFull(cost)}</div>
          <div className="v2-fin-sub">Total to suppliers</div>
        </div>
        <div>
          <div className="v2-fin-label">GPM (Profit)</div>
          <div className="v2-fin-value gold">{fmtINRFull(profit)}</div>
          <div className="v2-fin-sub green">{marginPct}% margin</div>
        </div>
        <div>
          <div className="v2-fin-label">Client Paid</div>
          <div className="v2-fin-value green">{fmtINRFull(paid)}</div>
          <div className="v2-fin-sub">{collectionPct}% collected</div>
        </div>
        <div>
          <div className="v2-fin-label">Balance Due</div>
          <div className="v2-fin-value warn">{fmtINRFull(balance)}</div>
          <div className="v2-fin-sub warn">
            {daysToDep !== null ? `Due in ${daysToDep} days` : 'To be collected'}
          </div>
        </div>
      </div>

      <div className="v2-deal-layout">
        <div>
          {/* Client accordion */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon navy">▸</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Client &amp; Travellers</h3>
                <div className="v2-acc-meta">Contact details, passport docs, preferences</div>
              </div>
            </div>
            <div className="v2-acc-body">
              <div className="v2-client-grid">
                <div>
                  <div className="v2-client-field-label">Client Name</div>
                  <div className="v2-client-field-value">{clientName(deal)}</div>
                </div>
                <div>
                  <div className="v2-client-field-label">Phone</div>
                  <div className="v2-client-field-value" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {client.phone || '—'}
                  </div>
                </div>
                <div>
                  <div className="v2-client-field-label">Email</div>
                  <div className="v2-client-field-value">{client.email || '—'}</div>
                </div>
                <div>
                  <div className="v2-client-field-label">City</div>
                  <div className="v2-client-field-value">{client.city || '—'}</div>
                </div>
                <div>
                  <div className="v2-client-field-label">Source</div>
                  <div className="v2-client-field-value">{client.source || '—'}</div>
                </div>
                <div>
                  <div className="v2-client-field-label">Occasion</div>
                  <div className="v2-client-field-value">{client.occasion || '—'}</div>
                </div>
              </div>

              <div className="v2-client-actions">
                <button className="v2-acc-btn-sm">💾 Save Draft</button>
                <button className="v2-acc-btn-sm danger">🗑 Cancel Deal</button>
                <span className="space"></span>
                <button className="v2-acc-btn-sm">◆ Send via WhatsApp</button>
                <button className="v2-acc-btn-primary">📄 Generate Proposal PDF</button>
              </div>
            </div>
          </div>

          {/* Flights */}
          {flights.length > 0 && (
            <div className="v2-acc">
              <div className="v2-acc-head">
                <div className="v2-acc-icon">✈</div>
                <div className="v2-acc-title-block">
                  <h3 className="v2-acc-title">Flights</h3>
                  <div className="v2-acc-meta">
                    {flights.length} {flights.length === 1 ? 'flight' : 'flights'}
                  </div>
                </div>
              </div>
              <div className="v2-acc-body">
                {flights.slice(0, 3).map((f, i) => (
                  <div key={i} className="v2-flight-card">
                    <div className="v2-flight-head">
                      <div className="v2-airline-code">{(f.airline || 'XX').slice(0, 2).toUpperCase()}</div>
                      <div className="v2-flight-info">
                        <div className="v2-flight-airline">{f.airline || 'Airline'}</div>
                        <div className="v2-flight-meta">
                          {f.classType || 'Economy'} · {f.baggage || 'Standard baggage'}
                        </div>
                      </div>
                      <div className="v2-flight-price">
                        <div className="v2-flight-price-val">{fmtINRFull(f.sellingPriceINR || f.priceINR || 0)}</div>
                        <div className="v2-flight-price-sub">Total</div>
                      </div>
                    </div>
                    <div className="v2-flight-leg">
                      <div>
                        <div className="v2-flight-city">{(f.fromCode || 'XXX').toUpperCase()}</div>
                        <div className="v2-flight-airport">{f.from || 'Origin'}</div>
                        <div className="v2-flight-time">{f.departTime || '—'}</div>
                        <div className="v2-flight-date">{f.departDate || ''}</div>
                      </div>
                      <div className="v2-flight-duration">
                        <div>{f.duration || '—'}</div>
                        <div style={{ borderTop: '1px dashed #d4dcec', marginTop: 8, width: 100 }}></div>
                      </div>
                      <div className="v2-flight-right">
                        <div className="v2-flight-city">{(f.toCode || 'XXX').toUpperCase()}</div>
                        <div className="v2-flight-airport">{f.to || 'Destination'}</div>
                        <div className="v2-flight-time">{f.arriveTime || '—'}</div>
                        <div className="v2-flight-date">{f.arriveDate || ''}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotels */}
          {hotels.length > 0 && (
            <div className="v2-acc">
              <div className="v2-acc-head">
                <div className="v2-acc-icon">🏨</div>
                <div className="v2-acc-title-block">
                  <h3 className="v2-acc-title">Hotels</h3>
                  <div className="v2-acc-meta">
                    {hotels.length} {hotels.length === 1 ? 'property' : 'properties'}
                  </div>
                </div>
              </div>
              <div className="v2-acc-body">
                {hotels.map((h, i) => (
                  <div key={i} className="v2-hotel-card">
                    <div className="v2-hotel-head">
                      <div className="v2-hotel-code">{(h.name || 'H').slice(0, 2).toUpperCase()}</div>
                      <div className="v2-hotel-info">
                        <div className="v2-hotel-name">
                          {h.name || 'Hotel'}
                          {h.stars && <span className="stars">{'★'.repeat(Number(h.stars) || 3)}</span>}
                        </div>
                        <div className="v2-hotel-meta">
                          {h.roomType || 'Standard'} · {h.nights ? `${h.nights} nights` : ''}
                        </div>
                      </div>
                      <div className="v2-hotel-price">
                        <div className="v2-hotel-price-val">{fmtINRFull(h.sellingPriceINR || h.priceINR || 0)}</div>
                        <div className="v2-hotel-price-sub">Total</div>
                      </div>
                    </div>
                    <div className="v2-hotel-facts">
                      <div>
                        <div className="v2-hotel-fact-lbl">Check-in</div>
                        <div className="v2-hotel-fact-val">{h.checkIn || '—'}</div>
                      </div>
                      <div>
                        <div className="v2-hotel-fact-lbl">Check-out</div>
                        <div className="v2-hotel-fact-val">{h.checkOut || '—'}</div>
                      </div>
                      <div>
                        <div className="v2-hotel-fact-lbl">Confirmation</div>
                        <div className="v2-hotel-fact-val" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {h.confirmation || h.bookingRef || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="v2-hotel-fact-lbl">Meal Plan</div>
                        <div className="v2-hotel-fact-val">{h.mealPlan || 'CP'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {flights.length === 0 && hotels.length === 0 && visas.length === 0 && (
            <div className="v2-acc" style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>
              No components added yet. Add flights, hotels, and visas in V1 view.
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          <div className="v2-side-card ai">
            <div className="v2-side-title-row">
              <div className="v2-side-icon">✦</div>
              <h4 className="v2-side-title">AI Deal Insights</h4>
            </div>
            <div className="v2-ai-body">
              This deal has {profit > 0 ? <><b>{marginPct}% margin</b> and is {marginPct >= 15 ? 'tracking healthy' : 'tight — review pricing'}</> : 'no profit set — review cost/selling prices'}.
            </div>
            {balance > 0 && daysToDep !== null && daysToDep <= 15 && (
              <ul className="v2-ai-list">
                <li>Client balance <b>{fmtINR(balance)}</b> due in {daysToDep} days</li>
              </ul>
            )}
            <button className="v2-ai-cta">+ Ask AI about this deal</button>
          </div>

          <div className="v2-side-card">
            <div className="v2-side-panel-head">
              <span className="v2-side-panel-title">Payment Schedule</span>
            </div>
            {payments.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7a99', padding: '8px 0' }}>
                No payments recorded yet.
              </div>
            ) : (
              payments.slice(0, 5).map((p, i) => (
                <div key={i} className="v2-schedule-row">
                  <div>
                    <div className="v2-schedule-milestone">{p.note || p.method || 'Payment'}</div>
                    <div className="v2-schedule-date">{p.date || ''}</div>
                  </div>
                  <div className="v2-schedule-amount">
                    <div className="v2-schedule-amount-val">{fmtINR(p.amountINR || p.amount || 0)}</div>
                    <div className="v2-schedule-status paid">Paid</div>
                  </div>
                </div>
              ))
            )}
            {balance > 0 && (
              <div className="v2-schedule-row">
                <div>
                  <div className="v2-schedule-milestone">Balance</div>
                  <div className="v2-schedule-date">Due before travel</div>
                </div>
                <div className="v2-schedule-amount">
                  <div className="v2-schedule-amount-val">{fmtINR(balance)}</div>
                  <div className="v2-schedule-status due">Due</div>
                </div>
              </div>
            )}
          </div>

          <div className="v2-side-card">
            <div className="v2-side-panel-head">
              <span className="v2-side-panel-title">Activity</span>
            </div>
            <div className="v2-activity-item">
              <div className="v2-activity-dot navy"></div>
              <div className="v2-activity-body">
                <div className="v2-activity-title">Deal opened in V2 view</div>
                <div className="v2-activity-meta">Just now</div>
              </div>
            </div>
            {deal.createdAt && (
              <div className="v2-activity-item">
                <div className="v2-activity-dot"></div>
                <div className="v2-activity-body">
                  <div className="v2-activity-title">Deal created</div>
                  <div className="v2-activity-meta">{new Date(deal.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── ROUTER ─────────────────────────────────────────── */

export default function V2Pages() {
  const [route, setRoute] = useState('dashboard'); // 'dashboard' | 'leads' | 'deal'
  const [selectedDeal, setSelectedDeal] = useState(null);
  const { items, loading, error } = useLeads();

  // Listen to sidebar clicks (from voyage-shell.js) via custom events
  useEffect(() => {
    const handler = (e) => {
      const key = e.detail?.key;
      if (key === 'dashboard') { setRoute('dashboard'); setSelectedDeal(null); }
      if (key === 'leads') { setRoute('leads'); setSelectedDeal(null); }
      if (key === 'deals') { setRoute('leads'); setSelectedDeal(null); }
    };
    window.addEventListener('voyage:nav', handler);
    return () => window.removeEventListener('voyage:nav', handler);
  }, []);

  const openDeal = useCallback((deal) => {
    setSelectedDeal(deal);
    setRoute('deal');
    window.scrollTo(0, 0);
  }, []);

  const goBack = useCallback(() => {
    setRoute('leads');
    setSelectedDeal(null);
  }, []);

  if (loading) {
    return (
      <main className="v2-page">
        <div style={{ textAlign: 'center', padding: 80, color: '#6b7a99' }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: '#c9a84c' }}>◐</div>
          <div style={{ fontSize: 14 }}>Loading your data…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="v2-page">
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: 24, color: '#dc2626' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Couldn't load data</div>
          <div style={{ fontSize: 13 }}>{error}</div>
          <div style={{ fontSize: 12, marginTop: 12, color: '#6b7a99' }}>
            V1 view is still working — turn off V2 layout to continue there.
          </div>
        </div>
      </main>
    );
  }

  if (route === 'deal' && selectedDeal) {
    return <DealDetailV2 deal={selectedDeal} onBack={goBack} />;
  }
  if (route === 'leads') {
    return <LeadsV2 leads={items} onDealClick={openDeal} />;
  }
  return <DashboardV2 leads={items} onDealClick={openDeal} />;
}
