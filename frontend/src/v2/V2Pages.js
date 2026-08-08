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

// eslint-disable-next-line no-unused-vars
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

const apiBase = () =>
  window.location.hostname.includes('localhost')
    ? 'http://localhost:5000'
    : (window.__VOYAGE_API__ || 'https://voyage-crm.onrender.com');

const authHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function useLeads() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${apiBase()}/api/leads?limit=500`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : (data.leads || []));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadTick]);

  const refetch = useCallback(() => setReloadTick((t) => t + 1), []);

  return { items, loading, error, refetch };
}

/* ─── Data model helpers — MATCH App.js exactly ─────────
   Real deal shape (flat, not nested under .client or .summary):
     clientName, contactNo, email, destination, travelDates,
     adults, children, infants, leadSource, priority, remarks,
     status, stage, dealNumber, followUpDate,
     hotelVendors[], flightVendors[], landVendors[], visaVendors[],
     clientPayments[], travellers[], tiers[], useTiers
   Vendor line item: { costPrice, sellingPrice, currency, exchangeRate, payments[] }
   ──────────────────────────────────────────────────────── */

const n = (v) => Number(v) || 0;
const toINR = (amount, currency, rate) => (currency === 'INR' ? n(amount) : n(amount) * n(rate));
const sumBy = (arr, key) => (arr || []).reduce((s, i) => s + n(i[key]), 0);

const DEAL_STAGES = ['New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Booked', 'Completed', 'Cancelled', 'Lost'];
const LEAD_SOURCES = ['WhatsApp', 'Instagram', 'Website', 'Referral', 'Walk-in', 'Call', 'Facebook', 'Google', 'Other'];

const stageOf = (d) => {
  if (!d) return 'New Lead';
  if (d.stage && DEAL_STAGES.includes(d.stage)) return d.stage;
  if (d.stage === 'Travelled') return 'Completed';
  const s = d.status || '';
  if (s === 'Booked') return 'Booked';
  if (s === 'Completed') return 'Completed';
  if (s === 'Cancelled') return 'Cancelled';
  if (s === 'Quoted') return 'Quoted';
  if (s === 'In Progress') return 'Contacted';
  return 'New Lead';
};
const isBookedStage = (d) => { const s = stageOf(d); return s === 'Booked' || s === 'Completed'; };
const isCancelledStage = (d) => stageOf(d) === 'Cancelled' || stageOf(d) === 'Lost';

const dealVendors = (d) => [
  ...(d.hotelVendors || []),
  ...(d.flightVendors || []),
  ...(d.trainVendors || []),
  ...(d.landVendors || []),
  ...(d.visaVendors || []),
];

const bookedTierOf = (d) => {
  if (!d || !d.useTiers || !Array.isArray(d.tiers)) return null;
  return d.tiers.find((t) => t && t.booked && n(t.totalPrice) > 0) || null;
};

// Selling price: booked-tier total if tiers are in use, else sum of vendor selling prices (converted to INR)
const sellINR = (d) => {
  const tier = bookedTierOf(d);
  if (tier) return n(tier.totalPrice);
  return dealVendors(d).reduce((s, v) => s + toINR(v.sellingPrice, v.currency, v.exchangeRate), 0);
};
const costINR = (d) => dealVendors(d).reduce((s, v) => s + toINR(v.costPrice, v.currency, v.exchangeRate), 0);
const paidINR = (d) => sumBy(d.clientPayments, 'amount');
const profitINR = (d) => sellINR(d) - costINR(d);
// eslint-disable-next-line no-unused-vars
const balanceINR = (d) => sellINR(d) - paidINR(d);

// Categorize for pipeline chips: booked/cancelled first, then hot/warm/cold by priority + age
const categorize = (lead) => {
  if (isBookedStage(lead)) return 'booked';
  if (isCancelledStage(lead)) return 'cancelled';
  const priority = String(lead.priority || '').toLowerCase();
  if (priority === 'high' || priority === 'urgent') return 'hot';
  if (priority === 'low') return 'cold';
  // Fallback by recency (Mongo ObjectId embeds creation timestamp, but createdAt is more reliable)
  const created = lead.createdAt ? new Date(lead.createdAt).getTime() : 0;
  const ageDays = created ? (Date.now() - created) / 86400000 : 999;
  if (ageDays < 2) return 'hot';
  if (ageDays < 5) return 'warm';
  return 'cold';
};

const clientName = (lead) => lead.clientName || 'Unknown';
const destination = (lead) => lead.destination || '';
const dealValueINR = (lead) => sellINR(lead);
const paxOf = (lead) => n(lead.adults) + n(lead.children) + n(lead.infants);

const waLinkFor = (phone, msg) => {
  const digits = (phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const withCountry = digits.length === 10 ? '91' + digits : digits;
  return `https://wa.me/${withCountry}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
};
const telLinkFor = (phone) => {
  const digits = (phone || '').replace(/[^\d]/g, '');
  return digits ? `tel:+${digits.length === 10 ? '91' + digits : digits}` : null;
};

/* ─── SVG icons ──────────────────────────────────────── */

// eslint-disable-next-line no-unused-vars
const IconSparkle = () => <span style={{ display: 'inline-block' }}>✦</span>;

/* ─── DASHBOARD ──────────────────────────────────────── */

function DashboardV2({ leads, onDealClick }) {
  // Compute KPIs from real data
  const stats = useMemo(() => {
    // Match V1's business logic exactly: vendor cost, profit, and collections
    // are only meaningful once a deal is actually Booked/Completed. Many
    // leads have vendor pricing filled in during quoting (before booking),
    // so summing across ALL leads wildly inflates "Vendor Payments" —
    // V1's own dashboard rollup filters allDeals.filter(isBookedStage) for
    // exactly this reason.
    const booked = leads.filter(isBookedStage);
    let collections = 0, profit = 0, vendorPmts = 0;
    booked.forEach((l) => {
      collections += paidINR(l);
      vendorPmts += costINR(l);
      profit += profitINR(l);
    });
    return { collections, bookings: booked.length, profit, vendorPmts };
  }, [leads]);

  // Upcoming departures — booked deals, most recently updated first
  // (travelDates is free-text in this CRM, not a structured date, so we
  // can't compute exact days-to-departure — show the text as-is)
  const upcomingDepartures = useMemo(() => {
    return leads
      .filter((l) => isBookedStage(l))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [leads]);

  // Follow-ups today — hot/warm leads with a follow-up date, or just recent hot/warm
  const followUps = useMemo(() => {
    return leads
      .filter((l) => {
        const c = categorize(l);
        return c === 'hot' || c === 'warm' || c === 'cold';
      })
      .sort((a, b) => {
        const fa = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
        const fb = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
        return fa - fb;
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
            <button type="button" className="v2-view-all" onClick={(e) => e.preventDefault()} style={{background:"none",border:"none",cursor:"pointer",padding:0,font:"inherit"}}>View all →</button>
          </div>

          {upcomingDepartures.length === 0 ? (
            <div style={{ padding: '24px 0', color: '#6b7a99', fontSize: 13 }}>
              No upcoming departures. Convert some leads to deals to see them here.
            </div>
          ) : (
            upcomingDepartures.map((l, i) => {
              const paid = paidINR(l);
              const total = sellINR(l);
              const pending = total - paid;
              const statusClass = pending <= 0 ? 'ok' : pending < total * 0.3 ? 'warn' : '';
              return (
                <div key={l._id || i} className="v2-dep-row" onClick={() => onDealClick(l)} style={{ cursor: 'pointer' }}>
                  <div className={`v2-dep-days ${statusClass}`}>
                    <div className="v2-dep-days-num" style={{ fontSize: 15 }}>{stageOf(l) === 'Completed' ? '✓' : '◆'}</div>
                    <div className="v2-dep-days-label">{stageOf(l)}</div>
                  </div>
                  <div>
                    <div>
                      <span className="v2-dep-name">{clientName(l)}</span>
                      {l.dealNumber && <span className="v2-dep-dealnum">{l.dealNumber}</span>}
                    </div>
                    <div className="v2-dep-details">
                      {flagOf(destination(l))} {destination(l) || '—'} · {l.travelDates || 'Dates TBD'}
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
            <button type="button" className="v2-view-all" onClick={(e) => e.preventDefault()} style={{background:"none",border:"none",cursor:"pointer",padding:0,font:"inherit"}}>View all →</button>
          </div>

          {followUps.length === 0 ? (
            <div style={{ padding: '24px 0', color: '#6b7a99', fontSize: 13 }}>
              No follow-ups needed today.
            </div>
          ) : (
            followUps.map((l, i) => {
              const cat = categorize(l);
              return (
                <div key={l._id || i} className="v2-fu-row" onClick={() => onDealClick(l)} style={{ cursor: 'pointer' }}>
                  <div className="v2-fu-head">
                    <span className="v2-fu-name">{clientName(l)}</span>
                    <span className={`v2-chip ${cat}`}>{cat.toUpperCase()}</span>
                  </div>
                  <div className="v2-fu-details">
                    {flagOf(destination(l))} {destination(l) || 'Enquiry'} · {fmtINR(dealValueINR(l))}
                  </div>
                  <div className="v2-fu-actions">
                    {telLinkFor(l.contactNo) ? (
                      <a href={telLinkFor(l.contactNo)} className="v2-mini-btn" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>☏ Call</a>
                    ) : (
                      <button className="v2-mini-btn" onClick={(e) => { e.stopPropagation(); window.veToast && window.veToast('No phone number on file', 'warning'); }}>☏ Call</button>
                    )}
                    {waLinkFor(l.contactNo) ? (
                      <a href={waLinkFor(l.contactNo, `Hi ${clientName(l)}, following up on your ${destination(l) || 'trip'} enquiry with Voyage-Ed.`)} target="_blank" rel="noreferrer" className="v2-mini-btn" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>◆ WhatsApp</a>
                    ) : (
                      <button className="v2-mini-btn" onClick={(e) => { e.stopPropagation(); window.veToast && window.veToast('No phone number on file', 'warning'); }}>◆ WhatsApp</button>
                    )}
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
            <button type="button" className="v2-view-all" onClick={(e) => e.preventDefault()} style={{background:"none",border:"none",cursor:"pointer",padding:0,font:"inherit"}}>Analytics →</button>
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

/* ─── NEW LEAD MODAL — real POST to /api/leads ────────── */

function NewLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    clientName: '', contactNo: '', email: '', destination: '',
    travelDates: '', adults: '2', children: '0', leadSource: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.clientName.trim()) { setErr('Client name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`${apiBase()}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          ...form,
          stage: 'New Lead',
          status: 'Not Actioned',
          priority: 'Normal',
          modeOfQuery: 'Call',
        }),
      });
      if (!res.ok) throw new Error('Server error ' + res.status);
      const created = await res.json();
      window.veToast && window.veToast('Lead created ✓', 'success');
      onCreated(created);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,35,80,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: 480, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(15,35,80,.35)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #e8ecf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#0d1b3e', margin: 0 }}>+ New Lead</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7a99' }}>✕</button>
        </div>
        <div style={{ padding: '22px 26px', display: 'grid', gap: 14 }}>
          {err && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 12 }}>{err}</div>}
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Client Name *</div>
            <input value={form.clientName} onChange={set('clientName')} placeholder="Full name" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Phone</div>
              <input value={form.contactNo} onChange={set('contactNo')} placeholder="+91 …" style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Email</div>
              <input value={form.email} onChange={set('email')} placeholder="Optional" style={inputStyle} />
            </div>
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Destination</div>
            <input value={form.destination} onChange={set('destination')} placeholder="e.g. Vietnam, Bali, Dubai…" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Travel Dates</div>
              <input value={form.travelDates} onChange={set('travelDates')} placeholder="Flexible / dates" style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Lead Source</div>
              <select value={form.leadSource} onChange={set('leadSource')} style={inputStyle}>
                <option value="">Select source…</option>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Adults</div>
              <input type="number" min="1" value={form.adults} onChange={set('adults')} style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Children</div>
              <input type="number" min="0" value={form.children} onChange={set('children')} style={inputStyle} />
            </div>
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Notes</div>
            <textarea value={form.remarks} onChange={set('remarks')} rows={3} placeholder="Anything worth remembering…" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ padding: '18px 26px', borderTop: '1px solid #e8ecf5', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="v2-detail-cta" style={{ padding: '11px 20px' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="v2-detail-cta primary" style={{ padding: '11px 20px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '✓ Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #e8ecf5', borderRadius: 10,
  fontSize: 13, fontFamily: 'inherit', color: '#0d1b3e', outline: 'none', boxSizing: 'border-box',
};

/* ─── LEADS PAGE ─────────────────────────────────────── */

function LeadsV2({ leads, onDealClick, mode = 'active', onLeadCreated }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);

  const isDealsMode = mode === 'booked';

  // Active mode: hot/warm/cold enquiries not yet converted.
  // Deals mode: everything already Booked/Completed — the "old/past deals" view.
  const scopedLeads = useMemo(() => {
    if (isDealsMode) return leads.filter((l) => isBookedStage(l));
    return leads.filter((l) => {
      const c = categorize(l);
      return c === 'hot' || c === 'warm' || c === 'cold';
    });
  }, [leads, isDealsMode]);

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

    // Deals-mode specific totals
    const bookedDeals = leads.filter((l) => isBookedStage(l));
    const totalValue = bookedDeals.reduce((s, l) => s + sellINR(l), 0);
    const totalCollected = bookedDeals.reduce((s, l) => s + paidINR(l), 0);
    const totalBalance = bookedDeals.reduce((s, l) => s + balanceINR(l), 0);
    const fullyPaidCount = bookedDeals.filter((l) => balanceINR(l) <= 0).length;

    return { ...c, convertedValue, convRate, totalValue, totalCollected, totalBalance, fullyPaidCount, dealsCount: bookedDeals.length };
  }, [leads]);

  const filtered = useMemo(() => {
    let list = scopedLeads;
    if (isDealsMode) {
      if (filter === 'paid') list = list.filter((l) => balanceINR(l) <= 0);
      if (filter === 'due') list = list.filter((l) => balanceINR(l) > 0);
    } else if (filter !== 'all') {
      list = list.filter((l) => categorize(l) === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        clientName(l).toLowerCase().includes(q) ||
        destination(l).toLowerCase().includes(q) ||
        String(l.contactNo || '').includes(search)
      );
    }
    return list;
  }, [scopedLeads, filter, search, isDealsMode]);

  const selected = filtered.find((l) => l._id === selectedId) || filtered[0] || null;

  return (
    <main className="v2-page">
      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={(created) => {
            setShowNewLead(false);
            onLeadCreated && onLeadCreated();
            if (created && created._id) setSelectedId(created._id);
          }}
        />
      )}

      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">{isDealsMode ? 'Deals' : 'Leads'}</h1>
          <p className="v2-page-sub">
            {isDealsMode ? 'Every confirmed booking — past and upcoming' : 'Manage every enquiry from first contact to booking'}
          </p>
        </div>
        {!isDealsMode && (
          <div className="v2-header-actions">
            <button className="v2-cta" onClick={() => setShowNewLead(true)}>+ New Lead</button>
          </div>
        )}
      </div>

      {/* KPI ribbon */}
      {isDealsMode ? (
        <div className="v2-leads-kpis">
          <div className="v2-lead-kpi converted">
            <div className="v2-lead-kpi-label">Total Deals</div>
            <div className="v2-lead-kpi-value">{counts.dealsCount}</div>
            <div className="v2-lead-kpi-sub">Booked or completed</div>
          </div>
          <div className="v2-lead-kpi rate">
            <div className="v2-lead-kpi-label">Total Value</div>
            <div className="v2-lead-kpi-value" style={{ fontSize: 24 }}>{fmtINR(counts.totalValue)}</div>
            <div className="v2-lead-kpi-sub">Across all deals</div>
          </div>
          <div className="v2-lead-kpi hot" style={{ borderLeftColor: '#059669' }}>
            <div className="v2-lead-kpi-label">Collected</div>
            <div className="v2-lead-kpi-value" style={{ fontSize: 24 }}>{fmtINR(counts.totalCollected)}</div>
            <div className="v2-lead-kpi-sub">{counts.fullyPaidCount} fully paid</div>
          </div>
          <div className="v2-lead-kpi warm">
            <div className="v2-lead-kpi-label">Balance Due</div>
            <div className="v2-lead-kpi-value" style={{ fontSize: 24 }}>{fmtINR(counts.totalBalance)}</div>
            <div className="v2-lead-kpi-sub">Still to collect</div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Filter bar */}
      <div className="v2-filter-bar">
        <input
          type="text"
          className="v2-filter-search"
          placeholder={isDealsMode ? 'Search client, destination…' : 'Search name, phone, destination, or note…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isDealsMode ? (
          <>
            <button className={`v2-filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All <span className="count">{scopedLeads.length}</span>
            </button>
            <button className={`v2-filter-chip ${filter === 'due' ? 'active' : ''}`} onClick={() => setFilter('due')}>
              Balance Due <span className="count">{counts.dealsCount - counts.fullyPaidCount}</span>
            </button>
            <button className={`v2-filter-chip ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>
              Fully Paid <span className="count">{counts.fullyPaidCount}</span>
            </button>
          </>
        ) : (
          <>
            <button className={`v2-filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All <span className="count">{scopedLeads.length}</span>
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
          </>
        )}
      </div>

      {/* Two column layout */}
      <div className="v2-leads-layout">
        <div className="v2-leads-list">
          <div className="v2-leads-list-head">
            <h3 className="v2-leads-list-title">
              {isDealsMode ? 'All Deals' : 'Active Leads'} <span className="v2-leads-count">{filtered.length}</span>
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
              const source = l.leadSource || 'Direct';
              const note = l.remarks || '';
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
                      {l.contactNo && <span className="v2-lead-phone">{l.contactNo}</span>}
                      <span className="v2-lead-source">{source}</span>
                    </div>
                    <div className="v2-lead-trip">
                      {flagOf(destination(l))} {destination(l) || 'Enquiry'} · {l.travelDates || 'Dates flexible'} · {paxOf(l) || ''} pax
                    </div>
                    {note && <div className="v2-lead-note">{note}</div>}
                  </div>
                  <div className="v2-lead-meta">
                    <div className="v2-lead-value">{fmtINR(dealValueINR(l))}</div>
                    <div className="v2-lead-time">{timeAgo(l.createdAt || l.updatedAt)}</div>
                    <div className="v2-lead-mini-actions">
                      {waLinkFor(l.contactNo) ? (
                        <a href={waLinkFor(l.contactNo, `Hi ${clientName(l)}, following up on your ${destination(l) || 'trip'} enquiry with Voyage-Ed.`)} target="_blank" rel="noreferrer" className="v2-lead-mini-btn" title="WhatsApp" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', display: 'inline-flex' }}>◆</a>
                      ) : (
                        <button className="v2-lead-mini-btn" title="WhatsApp" onClick={(e) => { e.stopPropagation(); window.veToast && window.veToast('No phone number on file', 'warning'); }}>◆</button>
                      )}
                      {telLinkFor(l.contactNo) ? (
                        <a href={telLinkFor(l.contactNo)} className="v2-lead-mini-btn" title="Call" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', display: 'inline-flex' }}>☏</a>
                      ) : (
                        <button className="v2-lead-mini-btn" title="Call" onClick={(e) => { e.stopPropagation(); window.veToast && window.veToast('No phone number on file', 'warning'); }}>☏</button>
                      )}
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
              {selected.contactNo && (
                <div className="v2-detail-phone">{selected.contactNo}</div>
              )}
              <div className="v2-detail-tags">
                <span className="v2-detail-tag">{selected.leadSource || 'Enquiry'}</span>
                {selected.modeOfQuery && (
                  <span className="v2-detail-tag">{selected.modeOfQuery}</span>
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
                  <div className="v2-detail-field-label">Travellers</div>
                  <div className="v2-detail-field-value">
                    {paxOf(selected) || '—'} pax
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Budget / Quote</div>
                  <div className="v2-detail-field-value">{fmtINR(dealValueINR(selected))}</div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Travel Dates</div>
                  <div className="v2-detail-field-value">
                    {selected.travelDates || 'Flexible'}
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Email</div>
                  <div className="v2-detail-field-value" style={{ fontSize: 12 }}>
                    {selected.email || '—'}
                  </div>
                </div>
                <div>
                  <div className="v2-detail-field-label">Stage</div>
                  <div className="v2-detail-field-value">
                    {stageOf(selected)}
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
                <button
                  className="v2-detail-cta"
                  onClick={() => window.veToast && window.veToast('Proposal generation stays in V1 for now', 'warning')}
                >◆ Send Proposal</button>
                <button
                  className="v2-detail-cta"
                  onClick={async () => {
                    const note = window.prompt('Add a note for ' + clientName(selected) + ':', '');
                    if (!note || !note.trim()) return;
                    try {
                      const combined = selected.remarks ? `${selected.remarks}\n${note.trim()}` : note.trim();
                      await patchDeal(selected._id, { remarks: combined });
                      window.veToast && window.veToast('Note added ✓', 'success');
                      onLeadCreated && onLeadCreated();
                    } catch (e) {
                      window.veToast && window.veToast('Could not save note — try again', 'warning');
                    }
                  }}
                >+ Note</button>
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

/* ─── QUICK-ADD MODALS — Flight / Hotel / Visa ──────────
   Simplified single-sector/single-line forms (not the full OCR-scan,
   multi-sector, room-tier builder V1 has) so a new deal can be built
   out fully inside V2 without switching back to V1. ──────────────── */

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'JPY', 'MYR'];

function CurrencyCostRow({ form, setForm }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Currency</div>
          <select value={form.currency} onChange={set('currency')} style={inputStyle}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Cost Price</div>
          <input type="number" value={form.costPrice} onChange={set('costPrice')} placeholder="0" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Selling Price</div>
          <input type="number" value={form.sellingPrice} onChange={set('sellingPrice')} placeholder="0" style={inputStyle} />
        </div>
      </div>
      {form.currency !== 'INR' && (
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Exchange Rate (1 {form.currency} = ? INR)</div>
          <input type="number" value={form.exchangeRate} onChange={set('exchangeRate')} placeholder="e.g. 86" style={inputStyle} />
        </div>
      )}
    </>
  );
}

function ModalShell({ title, onClose, onSubmit, saving, err, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,35,80,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: 480, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(15,35,80,.35)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #e8ecf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#0d1b3e', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7a99' }}>✕</button>
        </div>
        <div style={{ padding: '22px 26px', display: 'grid', gap: 14 }}>
          {err && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 12 }}>{err}</div>}
          {children}
        </div>
        <div style={{ padding: '18px 26px', borderTop: '1px solid #e8ecf5', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="v2-detail-cta" style={{ padding: '11px 20px' }}>Cancel</button>
          <button onClick={onSubmit} disabled={saving} className="v2-detail-cta primary" style={{ padding: '11px 20px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '✓ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function patchDeal(dealId, patch) {
  const res = await fetch(`${apiBase()}/api/leads/${dealId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Server error ' + res.status);
  return res.json();
}

/* ─── AI EXTRACT — screenshot / PDF → structured JSON ───
   Same backend endpoint + prompts V1's "AI Extract" already uses in
   production (/api/chat, model claude-sonnet-4-6). Reads a flight or
   hotel screenshot / PDF and returns structured fields to pre-fill
   the Add Flight / Add Hotel form — the person still reviews and
   confirms before saving, nothing is auto-committed.               */

const AIX_SYS = {
  flight: 'You extract flight booking details for a travel agency CRM. From the given image(s)/text (airline PNRs, vendor quotes, screenshots, emails), output ONLY valid JSON, no markdown, no explanation: {"vendorName":string,"costPrice":number|null,"flightType":"one-way|return|multi-city","sectors":[...],"returnSectors":[...]}. Each sector object = {"from":"IATA or city","fromName":string,"to":"IATA or city","toName":string,"date":"YYYY-MM-DD","arrDate":"YYYY-MM-DD or null (only if arrival is a different day)","depTime":"HHMM 24h","arrTime":"HHMM 24h","airlineCode":"2-letter code","airlineName":string}. TRIP TYPE RULES — decide flightType carefully: (1) "return" (round-trip) if the journey goes A→B (with possible connections) and later comes back to the ORIGIN city B→A on a later date — put the OUTBOUND legs in "sectors" and the HOMEBOUND legs in "returnSectors". A connecting/layover stop (e.g. DEL→DOH→YYZ) is still ONE direction, not multi-city. (2) "one-way" if travel goes one direction only and never returns to the origin — all legs in "sectors", leave "returnSectors" empty. (3) "multi-city" only if there are 3+ distinct cities in an open-jaw pattern that is NOT a simple there-and-back — put every leg in "sectors" in journey order, leave "returnSectors" empty. Missing fields = empty string or null. costPrice = total quoted cost if visible.',
  hotel: 'You extract hotel booking details for a travel agency CRM. From the given image(s)/text (hotel quotes, confirmations, screenshots, emails), output ONLY valid JSON, no markdown: {"hotels":[{"vendorName":string,"city":string,"hotelName":string,"starRating":"3|4|5 or empty","roomCategory":string,"checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","costPrice":number|null}]}. One object per hotel/stay. Missing = empty string or null.',
  train: 'You extract train booking details for a travel agency CRM (domestic Indian trains like IRCTC/Rajdhani/Vande Bharat or international rail like Eurostar/Shinkansen/Trenitalia). Output ONLY valid JSON, no markdown: {"vendorName":string,"costPrice":number|null,"isInternational":boolean,"tripType":"one-way|return|multi-city","segments":[...],"returnSegments":[...]}. Each segment = {"trainNo":string,"trainName":string,"from":"station code","fromStation":"full station name","to":"station code","toStation":"full station name","date":"YYYY-MM-DD","depTime":"HHMM 24h","arrTime":"HHMM 24h","classOfTravel":"1A|2A|3A|SL|CC|EC|2S|Sleeper|First Class|Business|Standard|Other","coach":string,"pnr":string}. RULES: (1) Distinguish tripType: "return" if journey goes A→B and later comes back B→A — outbound legs in segments, homebound in returnSegments; "one-way" if single direction; "multi-city" for 3+ cities. (2) For Indian trains: use IRCTC station codes (NDLS, MMCT, HWH, MAS, etc.) and Indian classes (1A/2A/3A/SL/CC/EC/2S). Set isInternational=false. (3) For international: use rail station codes if visible, common classes First/Business/Standard. Set isInternational=true. (4) PNR is 10 digits for IRCTC. Missing fields = empty string or null. Never invent a PNR — leave empty if unclear.',
  ticket: 'You extract e-ticket details from airline tickets issued by consolidators (Akbar, MakeMyTrip, Amadeus, etc.) for a travel agency CRM. Output ONLY valid JSON, no markdown: {"pnr":string,"airlineCode":string,"airlineName":string,"issuedDate":"YYYY-MM-DD","passengers":[{"name":string,"type":"Adult|Child|Infant","ticketNo":string,"seat":string,"baggage":string}],"segments":[{"airlineCode":string,"flightNo":string,"from":"IATA","fromName":string,"to":"IATA","toName":string,"date":"YYYY-MM-DD","depTime":"HHMM 24h","arrTime":"HHMM 24h","cabin":string,"baggage":string,"terminal":string,"status":string}]}. RULES: (1) pnr is the airline booking reference / PNR / record locator — the most important field, read it very carefully character by character. (2) Passenger names exactly as printed. (3) Include EVERY flight segment in journey order, including connections. (4) Ticket numbers are usually 13 digits. (5) Missing fields = empty string. Never invent a PNR or ticket number — leave empty if not clearly visible.',
  passport: 'You extract traveller identity details from passport / Aadhaar / ID images for a travel agency CRM. Multiple documents may be attached — output one entry per person. Output ONLY valid JSON, no markdown: {"travellers":[{"firstName":string,"lastName":string,"salutation":"Mr|Mrs|Ms|Mstr|Miss","gender":"Male|Female","dob":"YYYY-MM-DD","idType":"Passport|Aadhaar|Other","passportNo":string,"passportIssue":"YYYY-MM-DD","passportExpiry":"YYYY-MM-DD","nationality":string}]}. RULES: (1) firstName = given name(s) exactly as printed. (2) If the document has NO surname/last name, set lastName to "LNU" (Last Name Unknown — airline convention). (3) salutation from gender+age: adult male Mr, adult female Mrs/Ms, boy child Mstr, girl child Miss. (4) For Aadhaar cards fill passportNo with the Aadhaar number and idType "Aadhaar"; leave passport dates empty. (5) Missing fields = empty string. Read MRZ when available — it is the most reliable source.',
};

const fileToDataURI = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const blockFromDataURI = (dataURI) => {
  const pdf = dataURI.match(/^data:application\/pdf;base64,(.+)$/);
  if (pdf) return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf[1] } };
  const im = dataURI.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (im) return { type: 'image', source: { type: 'base64', media_type: im[1], data: im[2] } };
  return null;
};

async function runAIExtract(kind, files) {
  const dataURIs = await Promise.all(files.map(fileToDataURI));
  const content = dataURIs.map(blockFromDataURI).filter(Boolean);
  if (!content.length) throw new Error('Could not read the attached file(s)');
  content.push({ type: 'text', text: 'Extract from the attached file(s).' });

  const res = await fetch(`${apiBase()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: AIX_SYS[kind],
      messages: [{ role: 'user', content }],
    }),
  });
  let data;
  try { data = await res.json(); } catch { throw new Error(`Server didn't respond (HTTP ${res.status})`); }
  if (!res.ok || data.error) throw new Error((data.error && (data.error.message || data.error)) || `API error (HTTP ${res.status})`);
  const txt = ((data.content || []).map((c) => c.text || '').join('') || '').replace(/```json|```/g, '').trim();
  if (!txt) throw new Error('AI returned nothing — file may not have been readable');
  try { return JSON.parse(txt); }
  catch { throw new Error("Could not understand the AI's response — try a clearer image"); }
}

function AddFlightModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    from: '', fromName: '', to: '', toName: '', date: '', depTime: '', arrTime: '',
  });
  const [aiSectors, setAiSectors] = useState(null); // full multi-sector data from AI, if used
  const [aiReturnSectors, setAiReturnSectors] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true);
    setErr('');
    try {
      const j = await runAIExtract('flight', files);
      const mapSec = (x) => ({
        from: x.from || '', fromName: x.fromName || '', to: x.to || '', toName: x.toName || '',
        date: x.date || '', depTime: x.depTime || '', arrTime: x.arrTime || '',
        airlineCode: (x.airlineCode || '').toUpperCase(), airlineName: x.airlineName || '',
      });
      const secs = (j.sectors || []).map(mapSec);
      const retSecs = (j.returnSectors || []).map(mapSec);
      if (!secs.length) throw new Error('No flight details found in this file');
      setAiSectors(secs);
      setAiReturnSectors(retSecs);
      const first = secs[0];
      setForm((f) => ({
        ...f,
        name: j.vendorName || first.airlineName || f.name,
        costPrice: j.costPrice != null ? String(j.costPrice) : f.costPrice,
        from: first.from, fromName: first.fromName, to: first.to, toName: first.toName,
        date: first.date, depTime: first.depTime, arrTime: first.arrTime,
      }));
      const totalLegs = secs.length + retSecs.length;
      setAiSummary(
        totalLegs > 1
          ? `✓ Extracted ${secs.length} outbound + ${retSecs.length} return sector${retSecs.length !== 1 ? 's' : ''} — all will be saved. Fields below show the first leg for review.`
          : '✓ Extracted — review the fields below before saving.'
      );
      window.veToast && window.veToast('Flight details extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read this file — try a clearer screenshot');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (!form.name.trim()) { setErr('Airline name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const usingAI = Array.isArray(aiSectors) && aiSectors.length > 0;
      const newVendor = {
        id: 'fl_' + Date.now(),
        name: form.name,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        flightType: usingAI && aiReturnSectors && aiReturnSectors.length ? 'return' : 'oneway',
        sectors: usingAI ? aiSectors : [{
          from: form.from, fromName: form.fromName, to: form.to, toName: form.toName,
          date: form.date, depTime: form.depTime, arrTime: form.arrTime,
        }],
        returnSectors: usingAI ? aiReturnSectors : [],
        payments: [],
      };
      const updated = await patchDeal(deal._id, { flightVendors: [...(deal.flightVendors || []), newVendor] });
      window.veToast && window.veToast('Flight added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="+ Add Flight" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading file…' : 'Scan a screenshot or PDF — AI fills the form below'}
          </span>
          <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
        </label>
        {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Airline Name *</div>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Vietnam Airlines" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>From (code)</div>
          <input value={form.from} onChange={set('from')} placeholder="DEL" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>To (code)</div>
          <input value={form.to} onChange={set('to')} placeholder="SGN" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>From (city)</div>
          <input value={form.fromName} onChange={set('fromName')} placeholder="New Delhi" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>To (city)</div>
          <input value={form.toName} onChange={set('toName')} placeholder="Ho Chi Minh City" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
          <input value={form.date} onChange={set('date')} placeholder="6 Oct 2026" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Dep Time</div>
          <input value={form.depTime} onChange={set('depTime')} placeholder="23:35" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Arr Time</div>
          <input value={form.arrTime} onChange={set('arrTime')} placeholder="06:05" style={inputStyle} />
        </div>
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddTrainModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    trainNo: '', trainName: '', from: '', fromStation: '', to: '', toStation: '',
    date: '', depTime: '', arrTime: '', classOfTravel: '3A', pnr: '',
  });
  const [aiSegments, setAiSegments] = useState(null);
  const [aiReturnSegments, setAiReturnSegments] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true);
    setErr('');
    try {
      const j = await runAIExtract('train', files);
      const mapSeg = (x) => ({
        trainNo: x.trainNo || '', trainName: x.trainName || '',
        from: x.from || '', fromStation: x.fromStation || '', to: x.to || '', toStation: x.toStation || '',
        date: x.date || '', depTime: x.depTime || '', arrTime: x.arrTime || '',
        classOfTravel: x.classOfTravel || '', coach: x.coach || '', pnr: x.pnr || '',
      });
      const segs = (j.segments || []).map(mapSeg);
      const retSegs = (j.returnSegments || []).map(mapSeg);
      if (!segs.length) throw new Error('No train details found in this file');
      setAiSegments(segs);
      setAiReturnSegments(retSegs);
      const first = segs[0];
      setForm((f) => ({
        ...f,
        name: j.vendorName || first.trainName || f.name,
        costPrice: j.costPrice != null ? String(j.costPrice) : f.costPrice,
        trainNo: first.trainNo, trainName: first.trainName,
        from: first.from, fromStation: first.fromStation, to: first.to, toStation: first.toStation,
        date: first.date, depTime: first.depTime, arrTime: first.arrTime,
        classOfTravel: first.classOfTravel || f.classOfTravel, pnr: first.pnr,
      }));
      const totalLegs = segs.length + retSegs.length;
      setAiSummary(
        totalLegs > 1
          ? `✓ Extracted ${segs.length} outbound + ${retSegs.length} return segment${retSegs.length !== 1 ? 's' : ''} — all will be saved.`
          : '✓ Extracted — review the fields below before saving.'
      );
      window.veToast && window.veToast('Train details extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read this file — try a clearer screenshot');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (!form.name.trim() && !form.trainName.trim()) { setErr('Train name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const usingAI = Array.isArray(aiSegments) && aiSegments.length > 0;
      const newVendor = {
        id: 'tr_' + Date.now(),
        name: form.name || form.trainName,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        tripType: usingAI && aiReturnSegments && aiReturnSegments.length ? 'return' : 'one-way',
        isInternational: false,
        segments: usingAI ? aiSegments : [{
          trainNo: form.trainNo, trainName: form.trainName,
          from: form.from, fromStation: form.fromStation, to: form.to, toStation: form.toStation,
          date: form.date, depTime: form.depTime, arrTime: form.arrTime,
          classOfTravel: form.classOfTravel, pnr: form.pnr,
        }],
        returnSegments: usingAI ? aiReturnSegments : [],
        payments: [],
      };
      const updated = await patchDeal(deal._id, { trainVendors: [...(deal.trainVendors || []), newVendor] });
      window.veToast && window.veToast('Train added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="+ Add Train" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading file…' : 'Scan a screenshot or PDF — AI fills the form below'}
          </span>
          <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
        </label>
        {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Train No.</div>
          <input value={form.trainNo} onChange={set('trainNo')} placeholder="12951" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Train Name *</div>
          <input value={form.trainName} onChange={set('trainName')} placeholder="Rajdhani Express" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>From (station code)</div>
          <input value={form.from} onChange={set('from')} placeholder="NDLS" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>To (station code)</div>
          <input value={form.to} onChange={set('to')} placeholder="MMCT" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>From (station name)</div>
          <input value={form.fromStation} onChange={set('fromStation')} placeholder="New Delhi" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>To (station name)</div>
          <input value={form.toStation} onChange={set('toStation')} placeholder="Mumbai Central" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
          <input value={form.date} onChange={set('date')} placeholder="15 Oct 2026" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Dep Time</div>
          <input value={form.depTime} onChange={set('depTime')} placeholder="1630" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Arr Time</div>
          <input value={form.arrTime} onChange={set('arrTime')} placeholder="0800" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Class</div>
          <select value={form.classOfTravel} onChange={set('classOfTravel')} style={inputStyle}>
            {['1A', '2A', '3A', 'SL', 'CC', 'EC', '2S', 'Sleeper', 'First Class', 'Business', 'Standard'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>PNR</div>
          <input value={form.pnr} onChange={set('pnr')} placeholder="10-digit PNR" style={inputStyle} />
        </div>
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddHotelModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({
    hotelName: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    country: '', city: '', starRating: '4', roomCategory: '', checkIn: '', checkOut: '', confirmationNo: '',
  });
  const [extraHotels, setExtraHotels] = useState([]); // any additional hotels found beyond the first
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true);
    setErr('');
    try {
      const j = await runAIExtract('hotel', files);
      const hotels = j.hotels || [];
      if (!hotels.length) throw new Error('No hotel details found in this file');
      const h0 = hotels[0];
      setForm((f) => ({
        ...f,
        hotelName: h0.hotelName || f.hotelName,
        city: h0.city || f.city,
        starRating: h0.starRating || f.starRating,
        roomCategory: h0.roomCategory || f.roomCategory,
        checkIn: h0.checkIn || f.checkIn,
        checkOut: h0.checkOut || f.checkOut,
        costPrice: h0.costPrice != null ? String(h0.costPrice) : f.costPrice,
      }));
      setExtraHotels(hotels.slice(1));
      setAiSummary(
        hotels.length > 1
          ? `✓ Found ${hotels.length} hotels. First one filled below — the other ${hotels.length - 1} will be added when you save.`
          : '✓ Extracted — review the fields below before saving.'
      );
      window.veToast && window.veToast('Hotel details extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read this file — try a clearer screenshot');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (!form.hotelName.trim()) { setErr('Hotel name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const newVendor = {
        id: 'ht_' + Date.now(),
        hotelName: form.hotelName,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        country: form.country, city: form.city,
        starRating: form.starRating, roomCategory: form.roomCategory,
        checkIn: form.checkIn, checkOut: form.checkOut, confirmationNo: form.confirmationNo,
        payments: [],
      };
      // Any additional hotels the AI found (e.g. a multi-city itinerary
      // screenshot) get added as their own entries too — cost price only,
      // since selling price/markup is a per-property decision.
      const extraVendors = extraHotels.map((h, i) => ({
        id: 'ht_' + Date.now() + '_' + i,
        hotelName: h.hotelName || '', currency: 'INR',
        costPrice: Number(h.costPrice) || 0, sellingPrice: 0, exchangeRate: 1,
        country: '', city: h.city || '', starRating: h.starRating || '',
        roomCategory: h.roomCategory || '', checkIn: h.checkIn || '', checkOut: h.checkOut || '',
        confirmationNo: '', payments: [],
      }));
      const updated = await patchDeal(deal._id, {
        hotelVendors: [...(deal.hotelVendors || []), newVendor, ...extraVendors],
      });
      window.veToast && window.veToast(
        extraVendors.length ? `${1 + extraVendors.length} hotels added ✓` : 'Hotel added ✓',
        'success'
      );
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="+ Add Hotel" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading file…' : 'Scan a screenshot or PDF — AI fills the form below'}
          </span>
          <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
        </label>
        {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Hotel Name *</div>
        <input value={form.hotelName} onChange={set('hotelName')} placeholder="e.g. Radisson Hotel Danang" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>City</div>
          <input value={form.city} onChange={set('city')} style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Country</div>
          <input value={form.country} onChange={set('country')} style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Stars</div>
          <select value={form.starRating} onChange={set('starRating')} style={inputStyle}>
            {[3, 4, 5].map((s) => <option key={s} value={s}>{s} ★</option>)}
          </select>
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Room Category</div>
        <input value={form.roomCategory} onChange={set('roomCategory')} placeholder="Deluxe Room" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Check-in</div>
          <input value={form.checkIn} onChange={set('checkIn')} placeholder="7 Oct 2026" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Check-out</div>
          <input value={form.checkOut} onChange={set('checkOut')} placeholder="10 Oct 2026" style={inputStyle} />
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Confirmation No.</div>
        <input value={form.confirmationNo} onChange={set('confirmationNo')} style={inputStyle} />
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddVisaModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '', visaStatus: 'Not Applied',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) { setErr('Visa name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const newVendor = {
        id: 'vs_' + Date.now(),
        name: form.name,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        visaStatus: form.visaStatus,
        payments: [],
      };
      const updated = await patchDeal(deal._id, { visaVendors: [...(deal.visaVendors || []), newVendor] });
      window.veToast && window.veToast('Visa added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="+ Add Visa" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Visa Type / Name *</div>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Vietnam e-Visa" style={inputStyle} />
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Status</div>
        <select value={form.visaStatus} onChange={set('visaStatus')} style={inputStyle}>
          {['Not Applied', 'Applied', 'Approved', 'Rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddPaymentModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', mode: 'Bank Transfer', date: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true);
    setErr('');
    try {
      const newPayment = {
        amount: Number(form.amount),
        mode: form.mode,
        date: form.date || new Date().toISOString().slice(0, 10),
        note: form.note,
      };
      const updated = await patchDeal(deal._id, { clientPayments: [...(deal.clientPayments || []), newPayment] });
      window.veToast && window.veToast('Payment recorded ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="+ Record Client Payment" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Amount Received (₹) *</div>
        <input type="number" value={form.amount} onChange={set('amount')} placeholder="0" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Mode</div>
          <select value={form.mode} onChange={set('mode')} style={inputStyle}>
            {['Bank Transfer', 'UPI', 'Cash', 'Card', 'Cheque'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
          <input type="date" value={form.date} onChange={set('date')} style={inputStyle} />
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Note</div>
        <input value={form.note} onChange={set('note')} placeholder="e.g. Booking deposit" style={inputStyle} />
      </div>
    </ModalShell>
  );
}

function ScanTicketModal({ deal, onClose, onSaved }) {
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true);
    setErr('');
    try {
      const j = await runAIExtract('ticket', files);
      if (!j.pnr && !(j.passengers || []).length) throw new Error('No ticket details found in this file');
      setPreview(j);
      window.veToast && window.veToast('E-Ticket details extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read this file — try a clearer scan');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (!preview) { setErr('Scan an e-ticket first'); return; }
    setSaving(true);
    setErr('');
    try {
      const updated = await patchDeal(deal._id, { eTicket: preview });
      window.veToast && window.veToast('E-Ticket saved ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="✨ Scan E-Ticket" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '🎫'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading ticket…' : 'Upload the e-ticket (PDF or screenshot) — reads PNR, passengers, segments'}
          </span>
          <input type="file" accept="image/*,.pdf" onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
        </label>
      </div>
      {preview && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ background: '#f9fafc', borderRadius: 8, padding: '10px 12px' }}>
            <div className="v2-detail-field-label">PNR</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#0d1b3e' }}>
              {preview.pnr || '—'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 4 }}>
              {preview.airlineName || preview.airlineCode || ''} {preview.issuedDate ? `· Issued ${preview.issuedDate}` : ''}
            </div>
          </div>
          {(preview.passengers || []).length > 0 && (
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Passengers</div>
              {preview.passengers.map((p, i) => (
                <div key={i} style={{ fontSize: 12.5, padding: '4px 0', borderBottom: i < preview.passengers.length - 1 ? '1px solid #f0f2f7' : 'none' }}>
                  {p.name} <span style={{ color: '#6b7a99' }}>· {p.type} · Ticket {p.ticketNo || '—'} · Seat {p.seat || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

function ScanTravellerModal({ deal, onClose, onSaved }) {
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null); // travellers array pending confirmation
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true);
    setErr('');
    try {
      const j = await runAIExtract('passport', files);
      const list = j.travellers || [];
      if (!list.length) throw new Error('No traveller details found in this file');
      setPreview(list);
      window.veToast && window.veToast(`${list.length} traveller${list.length !== 1 ? 's' : ''} extracted ✓`, 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read this file — try a clearer scan');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (!preview || !preview.length) { setErr('Scan a passport/ID first'); return; }
    setSaving(true);
    setErr('');
    try {
      const newTravellers = preview.map((t) => ({
        id: 'tv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        firstName: t.firstName || '', lastName: t.lastName || 'LNU',
        salutation: t.salutation || 'Mr', type: t.type || 'Adult',
        dob: t.dob || '', isLead: false,
        passportNo: t.passportNo || '', idType: t.idType || 'Passport',
        passportIssue: t.passportIssue || '', passportExpiry: t.passportExpiry || '',
        nationality: t.nationality || 'Indian',
      }));
      const updated = await patchDeal(deal._id, { travellers: [...(deal.travellers || []), ...newTravellers] });
      window.veToast && window.veToast(`${newTravellers.length} traveller${newTravellers.length !== 1 ? 's' : ''} added ✓`, 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="✨ Scan Passport / ID" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '🛂'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading document(s)…' : 'Upload passport / Aadhaar photos — one or more travellers at once'}
          </span>
          <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
        </label>
      </div>
      {preview && preview.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="v2-detail-field-label">Found {preview.length} traveller{preview.length !== 1 ? 's' : ''} — review before saving</div>
          {preview.map((t, i) => (
            <div key={i} style={{ background: '#f9fafc', borderRadius: 8, padding: '10px 12px', fontSize: 12.5 }}>
              <b>{t.salutation} {t.firstName} {t.lastName}</b>
              <div style={{ color: '#6b7a99', marginTop: 2 }}>
                {t.idType || 'Passport'} {t.passportNo || '—'} · {t.nationality || '—'} · {t.dob || 'DOB unknown'}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

/* ─── DEAL DETAIL ────────────────────────────────────── */

function DealDetailV2({ deal: initialDeal, onBack, onDealUpdated }) {
  const [deal, setDeal] = useState(initialDeal);
  const [modal, setModal] = useState(null); // null | 'flight' | 'hotel' | 'visa' | 'payment'
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState(null);
  const [savingClient, setSavingClient] = useState(false);
  const [busy, setBusy] = useState(false); // stage-change / delete in flight

  useEffect(() => { setDeal(initialDeal); }, [initialDeal]);

  const handleSaved = (updated) => {
    setDeal(updated);
    setModal(null);
    onDealUpdated && onDealUpdated(updated);
  };

  const startEditClient = () => {
    setClientForm({
      clientName: deal.clientName || '',
      contactNo: deal.contactNo || '',
      email: deal.email || '',
      destination: deal.destination || '',
      travelDates: deal.travelDates || '',
      modeOfQuery: deal.modeOfQuery || '',
      leadSource: deal.leadSource || '',
      priority: deal.priority || 'Normal',
    });
    setEditingClient(true);
  };

  const saveClientEdit = async () => {
    setSavingClient(true);
    try {
      const updated = await patchDeal(deal._id, clientForm);
      window.veToast && window.veToast('Saved ✓', 'success');
      setEditingClient(false);
      handleSaved(updated);
    } catch (e) {
      window.veToast && window.veToast('Could not save — try again', 'warning');
    } finally {
      setSavingClient(false);
    }
  };

  const changeStage = async (newStage, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const updated = await patchDeal(deal._id, { stage: newStage, status: newStage });
      window.veToast && window.veToast(`Deal marked ${newStage} ✓`, 'success');
      handleSaved(updated);
    } catch (e) {
      window.veToast && window.veToast('Could not update — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const deleteVendor = async (arrayKey, vendorId, label) => {
    if (!window.confirm(`Remove this ${label}?`)) return;
    setBusy(true);
    try {
      const filtered = (deal[arrayKey] || []).filter((v) => v.id !== vendorId);
      const updated = await patchDeal(deal._id, { [arrayKey]: filtered });
      window.veToast && window.veToast(`${label} removed`, 'success');
      handleSaved(updated);
    } catch (e) {
      window.veToast && window.veToast('Could not remove — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const waLink = () => {
    const phone = (deal.contactNo || '').replace(/[^\d]/g, '');
    const msg = encodeURIComponent(`Hi ${clientName(deal)}, following up on your ${destination(deal) || 'trip'} booking with Voyage-Ed.`);
    return phone ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${msg}` : null;
  };
  const mailLink = () => {
    if (!deal.email) return null;
    const subject = encodeURIComponent(`Voyage-Ed — ${deal.dealNumber || 'Your Trip'}`);
    return `mailto:${deal.email}?subject=${subject}`;
  };

  const sell = sellINR(deal);
  const cost = costINR(deal);
  const paid = paidINR(deal);
  const profit = sell - cost;
  const marginPct = sell > 0 ? Math.round((profit / sell) * 1000) / 10 : 0;
  const balance = sell - paid;
  const collectionPct = sell > 0 ? Math.round((paid / sell) * 1000) / 10 : 0;

  const isVIP = (deal.priority === 'High' || deal.priority === 'Urgent');
  const isBooked = isBookedStage(deal);

  const flights = deal.flightVendors || [];
  const trains = deal.trainVendors || [];
  const hotels = deal.hotelVendors || [];
  const visas = deal.visaVendors || [];
  const payments = deal.clientPayments || [];
  const travellers = deal.travellers || [];

  return (
    <main className="v2-page">
      <div className="v2-crumb">
        <button
          type="button"
          className="v2-crumb-link"
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
        >
          ← Deals
        </button>{' '}
        &rsaquo; <span className="v2-crumb-current">{deal.dealNumber || 'DEAL'}</span> · {clientName(deal)} · {destination(deal)}
      </div>

      <div className="v2-deal-hero">
        <div className="v2-deal-hero-top">
          <div className="v2-hero-chips">
            {isVIP && <span className="v2-hero-chip gold">+ VIP Client</span>}
            {isBooked && <span className="v2-hero-chip green">◆ {stageOf(deal).toUpperCase()}</span>}
            {!isBooked && <span className="v2-hero-chip dark">◇ {stageOf(deal).toUpperCase()}</span>}
          </div>
          <div className="v2-hero-actions">
            {waLink() ? (
              <a href={waLink()} target="_blank" rel="noreferrer" className="v2-hero-btn" style={{ textDecoration: 'none' }}>◆ WhatsApp</a>
            ) : (
              <button className="v2-hero-btn" onClick={() => window.veToast && window.veToast('No phone number on file', 'warning')}>◆ WhatsApp</button>
            )}
            {mailLink() ? (
              <a href={mailLink()} className="v2-hero-btn" style={{ textDecoration: 'none' }}>✉ Email</a>
            ) : (
              <button className="v2-hero-btn" onClick={() => window.veToast && window.veToast('No email on file', 'warning')}>✉ Email</button>
            )}
            <button className="v2-hero-btn gold" onClick={() => window.veToast && window.veToast('Proposal PDF generation stays in V1 for now', 'warning')}>📄 Proposal PDF</button>
          </div>
        </div>
        <div className="v2-hero-dealnum">{deal.dealNumber}</div>
        <h1 className="v2-hero-title">
          {destination(deal) ? `Trip to ${destination(deal)}` : 'Deal'}
        </h1>
        <div className="v2-hero-subtitle">
          {clientName(deal)} · {paxOf(deal) || 'N/A'} pax
        </div>
        <div className="v2-hero-facts">
          <div>
            <div className="v2-hero-fact-label">Destination</div>
            <div className="v2-hero-fact-value">{flagOf(destination(deal))} {destination(deal) || '—'}</div>
          </div>
          <div>
            <div className="v2-hero-fact-label">Travel Dates</div>
            <div className="v2-hero-fact-value">
              {deal.travelDates || '—'}
            </div>
          </div>
          <div>
            <div className="v2-hero-fact-label">Stage</div>
            <div className="v2-hero-fact-value">
              {stageOf(deal)}
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
            {balance > 0 ? 'Payment pending' : 'Fully collected'}
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
              {!editingClient && (
                <div className="v2-acc-actions">
                  <button className="v2-acc-btn-sm" onClick={startEditClient}>✎ Edit</button>
                </div>
              )}
            </div>
            <div className="v2-acc-body">
              {editingClient ? (
                <div className="v2-client-grid">
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Client Name</div>
                    <input value={clientForm.clientName} onChange={(e) => setClientForm((f) => ({ ...f, clientName: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Phone</div>
                    <input value={clientForm.contactNo} onChange={(e) => setClientForm((f) => ({ ...f, contactNo: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Email</div>
                    <input value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Destination</div>
                    <input value={clientForm.destination} onChange={(e) => setClientForm((f) => ({ ...f, destination: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Travel Dates</div>
                    <input value={clientForm.travelDates} onChange={(e) => setClientForm((f) => ({ ...f, travelDates: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Lead Source</div>
                    <select value={clientForm.leadSource} onChange={(e) => setClientForm((f) => ({ ...f, leadSource: e.target.value }))} style={inputStyle}>
                      <option value="">Select…</option>
                      {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="v2-client-field-label" style={{ marginBottom: 6 }}>Priority</div>
                    <select value={clientForm.priority} onChange={(e) => setClientForm((f) => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                      {['Low', 'Normal', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="v2-client-grid">
                  <div>
                    <div className="v2-client-field-label">Client Name</div>
                    <div className="v2-client-field-value">{clientName(deal)}</div>
                  </div>
                  <div>
                    <div className="v2-client-field-label">Phone</div>
                    <div className="v2-client-field-value" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {deal.contactNo || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="v2-client-field-label">Email</div>
                    <div className="v2-client-field-value">{deal.email || '—'}</div>
                  </div>
                  <div>
                    <div className="v2-client-field-label">Mode of Query</div>
                    <div className="v2-client-field-value">{deal.modeOfQuery || '—'}</div>
                  </div>
                  <div>
                    <div className="v2-client-field-label">Lead Source</div>
                    <div className="v2-client-field-value">{deal.leadSource || '—'}</div>
                  </div>
                  <div>
                    <div className="v2-client-field-label">Priority</div>
                    <div className="v2-client-field-value">{deal.priority || '—'}</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #e8ecf5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="v2-detail-field-label" style={{ marginBottom: 0 }}>
                    Travellers ({travellers.length})
                  </div>
                  <button className="v2-acc-btn-sm" onClick={() => setModal('traveller')}>🛂 Scan Passport / ID</button>
                </div>
                {travellers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#6b7a99' }}>No travellers added yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {travellers.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafc', borderRadius: 8, padding: '8px 12px', fontSize: 12.5 }}>
                        <div>
                          <b>{t.salutation} {t.firstName} {t.lastName}</b>
                          <span style={{ color: '#6b7a99', marginLeft: 8 }}>
                            {t.type} · {t.idType} {t.passportNo || ''}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteVendor('travellers', t.id, 'traveller')}
                          disabled={busy}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="v2-client-actions">
                {editingClient ? (
                  <>
                    <button className="v2-acc-btn-sm" onClick={() => setEditingClient(false)}>Cancel</button>
                    <button className="v2-acc-btn-primary" onClick={saveClientEdit} disabled={savingClient}>
                      {savingClient ? 'Saving…' : '✓ Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    {!isBookedStage(deal) && (
                      <button className="v2-acc-btn-sm" disabled={busy} onClick={() => changeStage('Booked', `Mark ${clientName(deal)}'s deal as Booked?`)}>
                        ◆ Convert to Deal
                      </button>
                    )}
                    {stageOf(deal) !== 'Cancelled' && (
                      <button className="v2-acc-btn-sm danger" disabled={busy} onClick={() => changeStage('Cancelled', `Cancel this deal? This can be reversed later in V1 if needed.`)}>
                        🗑 Cancel Deal
                      </button>
                    )}
                    <span className="space"></span>
                    {waLink() ? (
                      <a href={waLink()} target="_blank" rel="noreferrer" className="v2-acc-btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>◆ WhatsApp</a>
                    ) : (
                      <button className="v2-acc-btn-sm" onClick={() => window.veToast && window.veToast('No phone number on file', 'warning')}>◆ WhatsApp</button>
                    )}
                    {mailLink() ? (
                      <a href={mailLink()} className="v2-acc-btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>✉ Email</a>
                    ) : (
                      <button className="v2-acc-btn-sm" onClick={() => window.veToast && window.veToast('No email on file', 'warning')}>✉ Email</button>
                    )}
                    <button className="v2-acc-btn-primary" onClick={() => window.veToast && window.veToast('Proposal PDF generation stays in V1 for now', 'warning')}>📄 Proposal PDF</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Flights */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">✈</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Flights</h3>
                <div className="v2-acc-meta">
                  {flights.length > 0 ? `${flights.length} ${flights.length === 1 ? 'flight' : 'flights'}` : 'None added yet'}
                  {deal.eTicket?.pnr ? ` · PNR ${deal.eTicket.pnr}` : ''}
                </div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-sm" onClick={() => setModal('ticket')}>🎫 Scan E-Ticket</button>
                <button className="v2-acc-btn-primary" onClick={() => setModal('flight')}>+ Add Flight</button>
              </div>
            </div>
            {flights.length > 0 && (
              <div className="v2-acc-body">
                {flights.map((f, i) => {
                  const allSectors = [...(f.sectors || []), ...(f.returnSectors || [])].filter((s) => s.from || s.to);
                  const fSell = toINR(f.sellingPrice, f.currency, f.exchangeRate);
                  const fPaid = sumBy(f.payments, 'amount');
                  return (
                    <div key={f.id || i} className="v2-flight-card">
                      <div className="v2-flight-head">
                        <div className="v2-airline-code">{(f.name || allSectors[0]?.airlineCode || 'XX').slice(0, 2).toUpperCase()}</div>
                        <div className="v2-flight-info">
                          <div className="v2-flight-airline">{f.name || allSectors[0]?.airlineName || 'Airline'}</div>
                          <div className="v2-flight-meta">
                            {f.flightType === 'return' ? 'Round trip' : 'One way'} · {allSectors.length} sector{allSectors.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="v2-flight-price">
                          <div className="v2-flight-price-val">{fmtINRFull(fSell)}</div>
                          <div className="v2-flight-price-sub">{allSectors.length} sector{allSectors.length !== 1 ? 's' : ''} total</div>
                        </div>
                        <button
                          onClick={() => deleteVendor('flightVendors', f.id, 'flight')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✕</button>
                      </div>
                      {allSectors.map((sec, si) => (
                        <div className="v2-flight-leg" key={si}>
                          <div>
                            <div className="v2-flight-city">{(sec.from || '—').toUpperCase()}</div>
                            <div className="v2-flight-airport">{sec.fromName || ''}</div>
                            <div className="v2-flight-time">{sec.depTime || '—'}</div>
                            <div className="v2-flight-date">{sec.date || ''}</div>
                          </div>
                          <div className="v2-flight-duration">
                            <div style={{ borderTop: '1px dashed #d4dcec', marginTop: 8, width: 100 }}></div>
                          </div>
                          <div className="v2-flight-right">
                            <div className="v2-flight-city">{(sec.to || '—').toUpperCase()}</div>
                            <div className="v2-flight-airport">{sec.toName || ''}</div>
                            <div className="v2-flight-time">{sec.arrTime || '—'}</div>
                            <div className="v2-flight-date">{sec.date || ''}</div>
                          </div>
                        </div>
                      ))}
                      {fSell > 0 && (
                        <div className="v2-pay-bar">
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${fPaid >= fSell ? '' : 'amber'}`} style={{ width: `${Math.min(100, (fPaid / fSell) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid: <b>{fmtINRFull(fPaid)}</b> / {fmtINRFull(fSell)}</span>
                            <span className={`v2-pay-status ${fPaid >= fSell ? 'paid' : 'due'}`}>
                              {fPaid >= fSell ? '✓ Fully Paid' : `${fmtINRFull(fSell - fPaid)} due`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trains */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">🚆</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Trains</h3>
                <div className="v2-acc-meta">
                  {trains.length > 0 ? `${trains.length} ${trains.length === 1 ? 'train' : 'trains'}` : 'None added yet'}
                </div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-primary" onClick={() => setModal('train')}>+ Add Train</button>
              </div>
            </div>
            {trains.length > 0 && (
              <div className="v2-acc-body">
                {trains.map((t, i) => {
                  const allSegs = [...(t.segments || []), ...(t.returnSegments || [])].filter((s) => s.from || s.to);
                  const tSell = toINR(t.sellingPrice, t.currency, t.exchangeRate);
                  const tPaid = sumBy(t.payments, 'amount');
                  return (
                    <div key={t.id || i} className="v2-flight-card">
                      <div className="v2-flight-head">
                        <div className="v2-airline-code">{(t.name || 'TR').slice(0, 2).toUpperCase()}</div>
                        <div className="v2-flight-info">
                          <div className="v2-flight-airline">{t.name || 'Train'}</div>
                          <div className="v2-flight-meta">
                            {t.tripType === 'return' ? 'Round trip' : 'One way'} · {allSegs.length} segment{allSegs.length !== 1 ? 's' : ''}
                            {allSegs[0]?.pnr ? ` · PNR ${allSegs[0].pnr}` : ''}
                          </div>
                        </div>
                        <div className="v2-flight-price">
                          <div className="v2-flight-price-val">{fmtINRFull(tSell)}</div>
                        </div>
                        <button
                          onClick={() => deleteVendor('trainVendors', t.id, 'train')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✕</button>
                      </div>
                      {allSegs.map((seg, si) => (
                        <div className="v2-flight-leg" key={si}>
                          <div>
                            <div className="v2-flight-city">{(seg.from || '—').toUpperCase()}</div>
                            <div className="v2-flight-airport">{seg.fromStation || ''}</div>
                            <div className="v2-flight-time">{seg.depTime || '—'}</div>
                            <div className="v2-flight-date">{seg.date || ''} · {seg.classOfTravel || ''}</div>
                          </div>
                          <div className="v2-flight-duration">
                            <div style={{ borderTop: '1px dashed #d4dcec', marginTop: 8, width: 100 }}></div>
                          </div>
                          <div className="v2-flight-right">
                            <div className="v2-flight-city">{(seg.to || '—').toUpperCase()}</div>
                            <div className="v2-flight-airport">{seg.toStation || ''}</div>
                            <div className="v2-flight-time">{seg.arrTime || '—'}</div>
                          </div>
                        </div>
                      ))}
                      {tSell > 0 && (
                        <div className="v2-pay-bar">
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${tPaid >= tSell ? '' : 'amber'}`} style={{ width: `${Math.min(100, (tPaid / tSell) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid: <b>{fmtINRFull(tPaid)}</b> / {fmtINRFull(tSell)}</span>
                            <span className={`v2-pay-status ${tPaid >= tSell ? 'paid' : 'due'}`}>
                              {tPaid >= tSell ? '✓ Fully Paid' : `${fmtINRFull(tSell - tPaid)} due`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hotels */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">🏨</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Hotels</h3>
                <div className="v2-acc-meta">
                  {hotels.length > 0 ? `${hotels.length} ${hotels.length === 1 ? 'property' : 'properties'}` : 'None added yet'}
                </div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-primary" onClick={() => setModal('hotel')}>+ Add Hotel</button>
              </div>
            </div>
            {hotels.length > 0 && (
              <div className="v2-acc-body">
                {hotels.map((h, i) => {
                  const hSell = toINR(h.sellingPrice, h.currency, h.exchangeRate);
                  const hPaid = sumBy(h.payments, 'amount');
                  return (
                    <div key={h.id || i} className="v2-hotel-card">
                      <div className="v2-hotel-head">
                        <div className="v2-hotel-code">{(h.hotelName || 'H').slice(0, 2).toUpperCase()}</div>
                        <div className="v2-hotel-info">
                          <div className="v2-hotel-name">
                            {h.hotelName || 'Hotel'}
                            {h.starRating && <span className="stars">{'★'.repeat(Number(h.starRating) || 3)}</span>}
                          </div>
                          <div className="v2-hotel-meta">
                            {h.roomCategory || 'Standard'} · {h.city || ''} {h.nights ? `· ${h.nights} nights` : ''}
                          </div>
                        </div>
                        <div className="v2-hotel-price">
                          <div className="v2-hotel-price-val">{fmtINRFull(hSell)}</div>
                          <div className="v2-hotel-price-sub">{h.currency !== 'INR' ? `${h.currency} ${h.costPrice || 0}` : 'Total'}</div>
                        </div>
                        <button
                          onClick={() => deleteVendor('hotelVendors', h.id, 'hotel')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✕</button>
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
                            {h.confirmationNo || '—'}
                          </div>
                        </div>
                        <div>
                          <div className="v2-hotel-fact-lbl">Country</div>
                          <div className="v2-hotel-fact-val">{h.country || '—'}</div>
                        </div>
                      </div>
                      {hSell > 0 && (
                        <div className="v2-pay-bar">
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${hPaid >= hSell ? '' : 'amber'}`} style={{ width: `${Math.min(100, (hPaid / hSell) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid: <b>{fmtINRFull(hPaid)}</b> / {fmtINRFull(hSell)}</span>
                            <span className={`v2-pay-status ${hPaid >= hSell ? 'paid' : 'due'}`}>
                              {hPaid >= hSell ? '✓ Fully Paid' : `${fmtINRFull(hSell - hPaid)} due`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visa */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">◇</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Visa</h3>
                <div className="v2-acc-meta">
                  {visas.length > 0 ? `${visas.length} ${visas.length === 1 ? 'application' : 'applications'}` : 'None added yet'}
                </div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-primary" onClick={() => setModal('visa')}>+ Add Visa</button>
              </div>
            </div>
            {visas.length > 0 && (
              <div className="v2-acc-body">
                {visas.map((v, i) => {
                  const vSell = toINR(v.sellingPrice, v.currency, v.exchangeRate);
                  return (
                    <div key={v.id || i} className="v2-hotel-card">
                      <div className="v2-hotel-head">
                        <div className="v2-hotel-code">VE</div>
                        <div className="v2-hotel-info">
                          <div className="v2-hotel-name">{v.name || 'Visa Application'}</div>
                          <div className="v2-hotel-meta">{v.visaStatus || 'Not Applied'}</div>
                        </div>
                        <div className="v2-hotel-price">
                          <div className="v2-hotel-price-val">{fmtINRFull(vSell)}</div>
                        </div>
                        <button
                          onClick={() => deleteVendor('visaVendors', v.id, 'visa')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {modal === 'flight' && <AddFlightModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'ticket' && <ScanTicketModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'train' && <AddTrainModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'traveller' && <ScanTravellerModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'hotel' && <AddHotelModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'visa' && <AddVisaModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'payment' && <AddPaymentModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
        </div>

        {/* Right sidebar */}
        <div>
          <div className="v2-side-card ai">
            <div className="v2-side-title-row">
              <div className="v2-side-icon">✦</div>
              <h4 className="v2-side-title">AI Deal Insights</h4>
            </div>
            <div className="v2-ai-body">
              {sell > 0
                ? <>This deal has <b>{marginPct}% margin</b> and is {marginPct >= 15 ? 'tracking healthy' : 'tight — review pricing'}.</>
                : 'No selling price set yet — add vendor pricing to see margin insights.'}
            </div>
            {balance > 0 && (
              <ul className="v2-ai-list">
                <li>Client balance <b>{fmtINR(balance)}</b> still pending</li>
              </ul>
            )}
            <button className="v2-ai-cta" onClick={() => window.veToast && window.veToast('AI Deal Insights coming to V2 soon — use the AI Assistant in V1 for now', 'warning')}>+ Ask AI about this deal</button>
          </div>

          <div className="v2-side-card">
            <div className="v2-side-panel-head">
              <span className="v2-side-panel-title">Payment Schedule</span>
              <button
                onClick={() => setModal('payment')}
                style={{ background: 'none', border: 'none', color: '#c9a84c', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
              >+ Add</button>
            </div>
            {payments.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7a99', padding: '8px 0' }}>
                No payments recorded yet.
              </div>
            ) : (
              payments.slice(0, 5).map((p, i) => (
                <div key={i} className="v2-schedule-row">
                  <div>
                    <div className="v2-schedule-milestone">{p.note || p.mode || 'Payment'}</div>
                    <div className="v2-schedule-date">{p.date || ''}</div>
                  </div>
                  <div className="v2-schedule-amount">
                    <div className="v2-schedule-amount-val">{fmtINR(p.amount || 0)}</div>
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
  const [route, setRoute] = useState('dashboard'); // 'dashboard' | 'leads' | 'deals' | 'deal'
  const [selectedDeal, setSelectedDeal] = useState(null);
  const { items, loading, error, refetch } = useLeads();

  const navigate = useCallback((key) => {
    if (key === 'dashboard') { setRoute('dashboard'); setSelectedDeal(null); }
    if (key === 'leads') { setRoute('leads'); setSelectedDeal(null); }
    if (key === 'deals') { setRoute('deals'); setSelectedDeal(null); }
  }, []);

  // Two independent paths to receive sidebar navigation, so a timing quirk
  // in one can't silently break navigation:
  //   1) CustomEvent — works if the listener happened to be attached in time
  //   2) Direct imperative call via window.__voyagePagesNav — no event
  //      dispatch/listener race possible, always available once this
  //      component has rendered once.
  useEffect(() => {
    const handler = (e) => navigate(e.detail?.key);
    window.addEventListener('voyage:nav', handler);
    window.__voyagePagesNav = navigate;
    return () => {
      window.removeEventListener('voyage:nav', handler);
      if (window.__voyagePagesNav === navigate) delete window.__voyagePagesNav;
    };
  }, [navigate]);

  const openDeal = useCallback((deal) => {
    setSelectedDeal(deal);
    setRoute((prev) => {
      // Remember where we came from so "back" returns to the right list.
      window.__voyagePagesPrevRoute = prev === 'deal' ? (window.__voyagePagesPrevRoute || 'leads') : prev;
      return 'deal';
    });
    window.scrollTo(0, 0);
  }, []);

  const goBack = useCallback(() => {
    setRoute(window.__voyagePagesPrevRoute || 'leads');
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
    return (
      <DealDetailV2
        deal={selectedDeal}
        onBack={goBack}
        onDealUpdated={(updated) => { setSelectedDeal(updated); refetch(); }}
      />
    );
  }
  if (route === 'deals') {
    return <LeadsV2 leads={items} onDealClick={openDeal} mode="booked" onLeadCreated={refetch} />;
  }
  if (route === 'leads') {
    return <LeadsV2 leads={items} onDealClick={openDeal} mode="active" onLeadCreated={refetch} />;
  }
  return <DashboardV2 leads={items} onDealClick={openDeal} />;
}
