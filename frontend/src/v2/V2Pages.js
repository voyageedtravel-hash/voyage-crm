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

function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${apiBase()}/api/tasks`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { if (!cancelled) { setTasks(Array.isArray(data) ? data : []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadTick]);

  const refetch = useCallback(() => setReloadTick((t) => t + 1), []);
  return { tasks, loading, refetch };
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
  ...(d.cruiseVendors || []),
  ...(d.insuranceVendors || []),
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
const refundedINR = (d) => sumBy(d.refunds, 'amount');
// Matches V1's dealFinance() exactly: netSell = sell - refunded, then
// GPM and balance are both computed off the *net* figure (a refund is
// cash that left the business, so it reduces both realized profit and
// what's still owed by the client). Forfeit-amount edge case not
// carried over — niche field, not worth the extra complexity here.
const netSellINR = (d) => sellINR(d) - refundedINR(d);
const profitINR = (d) => netSellINR(d) - costINR(d);
// eslint-disable-next-line no-unused-vars
const balanceINR = (d) => netSellINR(d) - paidINR(d);

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

/* ─── CSV export — plain client-side download, no backend involved ── */
const csvEscape = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const downloadCSV = (filename, rows) => {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM so ₹/Excel render correctly
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ─── LEADS PAGE ─────────────────────────────────────── */

function LeadsV2({ leads, onDealClick, mode = 'active', onLeadCreated }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [selectedBulk, setSelectedBulk] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleBulk = (id) => {
    setSelectedBulk((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearBulk = () => setSelectedBulk(new Set());

  const bulkSetPriority = async (priority) => {
    setBulkBusy(true);
    try {
      await Promise.all(Array.from(selectedBulk).map((id) => patchDeal(id, { priority })));
      window.veToast && window.veToast(`${selectedBulk.size} lead${selectedBulk.size !== 1 ? 's' : ''} updated ✓`, 'success');
      clearBulk();
      onLeadCreated && onLeadCreated();
    } catch {
      window.veToast && window.veToast('Some updates failed — try again', 'warning');
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedBulk.size} selected lead${selectedBulk.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(Array.from(selectedBulk).map((id) =>
        fetch(`${apiBase()}/api/leads/${id}`, { method: 'DELETE', headers: authHeaders() })
      ));
      window.veToast && window.veToast(`${selectedBulk.size} lead${selectedBulk.size !== 1 ? 's' : ''} deleted`, 'success');
      clearBulk();
      onLeadCreated && onLeadCreated();
    } catch {
      window.veToast && window.veToast('Some deletions failed — try again', 'warning');
    } finally {
      setBulkBusy(false);
    }
  };

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

          {selectedBulk.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#faf7f0', border: '1px solid #c9a84c', borderRadius: 10, padding: '10px 14px', marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0d1b3e' }}>{selectedBulk.size} selected</span>
              {!isDealsMode && (
                <>
                  <button className="v2-acc-btn-sm" disabled={bulkBusy} onClick={() => bulkSetPriority('High')}>Mark High Priority</button>
                  <button className="v2-acc-btn-sm" disabled={bulkBusy} onClick={() => bulkSetPriority('Low')}>Mark Low Priority</button>
                </>
              )}
              <button className="v2-acc-btn-sm" disabled={bulkBusy} onClick={bulkDelete} style={{ color: '#dc2626', borderColor: '#fecaca' }}>🗑 Delete Selected</button>
              <button onClick={clearBulk} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 12 }}>Clear</button>
            </div>
          )}

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
                  style={{ gridTemplateColumns: '90px 1fr auto' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={selectedBulk.has(l._id)}
                      onChange={() => toggleBulk(l._id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 16, height: 16, marginTop: 6, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div className="v2-lead-avatar" style={{ background: avatarGradient(clientName(l)) }}>
                      {initialsOf(clientName(l))}
                    </div>
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
                  onClick={() => openProposalV2(selected)}
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

// ─── Per-traveller pricing (paxRates) ──────────────────────
// V1 has 4 traveller types (Adult / Child with bed / Child without bed /
// Infant), each with its own Cost + Sell rate per vendor component —
// used so cancelling "2 of 4 travellers" on a component can prorate the
// refund/loss by who's actually cancelling, not just a flat split.
// V2's traveller records only distinguish Adult / Child / Infant (no
// with-bed/without-bed split) — matching that exactly, this is a
// deliberate, documented simplification: 3 rate tiers instead of 4.
// Everything else (the Cost+Sell-per-type shape, how it's used to
// prorate a cancellation) is the same idea as V1, just simpler data.
const PAX_RATE_TYPES = [['adult', 'Adult'], ['child', 'Child'], ['infant', 'Infant']];

function PaxRatesFields({ form, setForm }) {
  const rates = form.paxRates || {};
  const setRate = (key, val) => setForm((f) => ({ ...f, paxRates: { ...(f.paxRates || {}), [key]: val } }));
  return (
    <div style={{ background: '#f9fafc', borderRadius: 10, padding: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#33446b', cursor: 'pointer', marginBottom: form.paxPricing ? 10 : 0 }}>
        <input
          type="checkbox"
          checked={!!form.paxPricing}
          onChange={(e) => setForm((f) => ({ ...f, paxPricing: e.target.checked }))}
        />
        Use per-traveller rates (for accurate cancellation proration)
      </label>
      {form.paxPricing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa7c4', letterSpacing: 0.5 }}></div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa7c4', letterSpacing: 0.5, textAlign: 'center' }}>COST</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa7c4', letterSpacing: 0.5, textAlign: 'center' }}>SELL</div>
          {PAX_RATE_TYPES.map(([key, label]) => (
            <React.Fragment key={key}>
              <div style={{ fontSize: 12, color: '#33446b', alignSelf: 'center' }}>{label}</div>
              <input
                type="number"
                value={rates[key + 'C'] || ''}
                onChange={(e) => setRate(key + 'C', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
              />
              <input
                type="number"
                value={rates[key + 'S'] || ''}
                onChange={(e) => setRate(key + 'S', e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
              />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function ModalShell({ title, onClose, onSubmit, saving, err, children, submitLabel }) {
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
            {saving ? 'Saving…' : (submitLabel || '✓ Add')}
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
  land: 'You extract land package / itinerary details for a travel agency CRM. From the given image(s)/text (DMC quotes, itinerary PDFs/screenshots, emails), output ONLY valid JSON, no markdown: {"vendorName":string,"costPrice":number|null,"itinerary":string}. itinerary must be day-wise plain text, each day starting on a new line as "Day 1: ...", "Day 2: ..." with full activity details preserved. costPrice = total land cost if visible.',
  cruise: 'You extract cruise booking details for a travel agency CRM. From the given image(s)/text (cruise line confirmations, booking screenshots, emails, quotes), output ONLY valid JSON, no markdown: {"vendorName":string,"shipName":string,"cruiseLine":string,"deckNumber":string,"cabinCategory":string,"cabinNumber":string,"portOfEmbarkation":string,"portOfDisembarkation":string,"checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","costPrice":number|null,"itinerary":string}. cabinCategory must be one of: Inside Stateroom, Oceanview (Window), Oceanview (Porthole), Balcony, Veranda, Mini Suite, Suite, Grand Suite — pick the closest match. itinerary = port-by-port day-wise plan as plain text ("Day 1: Embarkation at Barcelona\\nDay 2: At Sea\\nDay 3: Marseille, France" etc). Missing fields = empty string or null.',
  insurance: 'You extract travel insurance policy details for a travel agency CRM. From the given image(s)/text (policy documents, insurance certificates, screenshots, emails), output ONLY valid JSON, no markdown: {"vendorName":string,"policyNumber":string,"policyType":string,"coverageAmount":number|null,"premium":number|null,"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","coveredTravellers":number|null,"sumInsured":string,"costPrice":number|null}. policyType examples: Comprehensive Travel, Trip Cancellation, Medical Only, Baggage Loss, Adventure Sports Cover. premium = the amount charged. costPrice = same as premium if visible. Missing fields = empty string or null.',
};

// Compress a pasted/selected image to a resized JPEG data URL — same
// approach V1 uses (window.__veImgToData) so hotel photos stay small
// enough to store inline in the deal record.
const imgToDataURL = (file, cb, maxW = 760) => {
  try {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const sc = Math.min(1, maxW / img.width);
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.85));
      } catch (e) { /* ignore */ }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  } catch (e) { /* ignore */ }
};

const fileToDataURI = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Same technique V1 uses for hotel photos: resize via canvas to a max width
// so a pasted photo doesn't bloat the deal record, then export as JPEG.
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

/* ─── PROPOSAL PDF — client-side HTML, same mechanism V1 uses
   (window.open + document.write, then browser's own "Save as PDF"
   via window.print()). Simplified from V1's ~500-line builder: no
   cover-photo/gallery picker, no per-tier hotel options, no custom
   day-override editing UI — those need dedicated settings screens
   this pass doesn't build. Everything else (flights, hotels, trains,
   land itinerary, visa, pricing, payment summary, standard
   cancellation policy) uses the deal's real saved data.            */

const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const logEntryStatic = (title) => ({ title, at: new Date().toISOString(), by: 'You' });

const VE_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCABgAS0DASIAAhEBAxEB/8QAHQAAAgMBAQEBAQAAAAAAAAAAAAcFBggECQECA//EAEwQAAEDAwIDBQUFAwYLCQEAAAECAwQABREGBxIhMQgTQVFhFCJxgZEVFjJCUmKh0QkjcoKSsSQzNFNUY2VzoqPBFxgnNUODhbPC0v/EABsBAAEFAQEAAAAAAAAAAAAAAAABAgMEBQYH/8QANREAAQMCBAQFAgUDBQAAAAAAAQACAwQRBRIhMRMiQVEGFGFxkYGhFSPB0fAHMrEzQlLh8f/aAAwDAQACEQMRAD8A39RRRQhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFFHSoqdqbT1tKhPvdvjqT+JLj6QR8s5prnBurjZKATspWiqBct7tp7Qrgn67s7a/wBCXeNR9OEZOa+WzeTR97koYsbN9ual9FR7TI4P7SkgfPNNE0Z2cEpY4bhWvUlqfvWl5luiTnIMl1s9zJbJBacHNKuXUZxkeVLax6y1da23ItyZRNejL7qTFeVwusrxnAWPxJI95JI5g9eRpsR3zIaDncPNZ8HU4P0qr6y005NKb/aeBFyitlLjSiEomM9S2s+Y6oV+U58Cax8bpKiWLjUchbI34I7EK3RzRsdklbdpXZYta2S/SPY2nVxZ4GVQ5KeBz4p8FD1BNWHIAySMCkHdL5YfZ0cI9rdIC220pwps+GT+Uj0qNevF/voCLpdJfsqRgMd+pCOH9oggq+JNcfT/ANQmRNMdXHeQf8eq13YAZDmiNm+q0C7ebQwvgeusJtXkt9IP7zXUy+zIZDrDqHW1dFoUFA/MVl1m62p+5GxaJsDWqb3nBjQEJLEcn80iRgobSM5IyVHwFPPbbR9y0jph1F9uwuV3nO+0y1tJ4I7KuEJDTCPytpAwM8zzJ5mupwPGanE7yPgyM6EnU/RZlbRx02gfmKudFFFdGs5FFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFcVxvFptDHfXW5xITeM8Ul5LY/eaXO4Mjeya89B0NZrTDhYx7Y5cEiSsH9IUgpR+80iLrtxuuJvtt70Xdri/wBTJbmNTl/vUD8gPlWNieJzUg/Jgc8+myvUlIyY88gatDT97dARH1MxrhJubgzygRluJz5cWAP31FL3ziLX/gekro6nwLjzTZ+hVSBY4LfJDF67+0PE4Dd1juRcn0UsBB+SqukK2OBCFqSClQylaTkKHmCOR+VecYh45xWF1hEGe4K6GHAqVwvnzfVM5veWQ4M/cySPT25k1KQ917e6sCbYLtFHipKEugf2Tn91LePCwB7tSbMJXkaoxePcVvqGn6J78DpehPymzbtY6buhCY11ZQ4eXdP5aX/ZVg1OggjIpKG3JebKHUBxJ/KoZH7664D98sq+Oz3JxpAH+SyAXWFfI80/I/Kuow7x4HkNq4reo/ZZlRgltYnX904KKqFq1/AeaLV8ZNqlJ8FErad9UKA5/AgH0r7K1k87lNqti+Ejk/MPdpPwT+I/QV2TsboRGJeKLH+bLJ8pNmy5dVbqibjqWxWrKZtzYS507pKuNZPlwjnVBvl7catjlw1JqEQ4KDlRU6IrI9M5yfhnNV20yLzqRv8A8PtJkxFn/wA5uyFwop5/iQjHeveecJBwedZJ8RSVDslDCXep0CsihbGLzOsr3L3DlOrKLJp2S8nGe/mLEdI9eHmrHyFU247m3S4y1262agbdm9DB05C9vfT6FRylP9bFT8XZ1i4lLuu9RT9QHHvW9k+xwB/7LZyv+upVX+0WSz2G3IgWS1w7dFQAAzFZS2n6AVZjo8Tn1qJgwdmj9VG6WnZ/psv7pEOaD3Y1hMC5S3bNFVz9ovlyXJeI9I0cobSfQqPrVotPZ70whhP3oudw1A5nKm1ERWD6d21gkf0lGm9UNd9V6esRKbndY7LgGe6B43P7KcmrjMOpafnk19XG/wDlRmolk5W/YLlsegdE6bjoZsWlLRBSjopqMji+aiMk/E181peNQ6d0m5ddNabN/fjqSXLe06G3VtfmLeeRUBzCfHGKpL2/lhnXVy1aK05f9XT2+Sm7YwO7bP7bqyEo+Zz6VarHN3Fu7yJF6sto07EPP2YSTMk9PEgJQn5Zq3HLG8Wi+wUbmOabv+6osTtDWWXpORqBxiNAgxVd3JemPLQYzmQOB1soC0qyemPEVXH90JWuVFFjtGq9RtlXClm22tyNGz+047wgj1JIq/612nRqjWsG6RnYcaG8/Hdu7ZbwuT3CwtBTjkVHHCSfDHlTOAxWB+EVdW6SOsmdkvpawuPWyu+aiiDXQsF7a311WeY+mtftvC63jRVotNoaIL6XLiZEvgPLiCW08AxyJBJ5ZqVmaUsuoxCs95trMyCuayp2OvPCsBXQ4PMdOXjTpnsNyrVJjOJCkONKSQfHIpDW+K7rPdyz6WYW99n2Mou94daWpGFgERo5UMc1Ky4R5JHnXO1/haGlr6fyTbXOvXbqr0GJvkgk4xTys9ltFhtaLdZLXDt0RH4WIjKWkD5Afvrvo6CivSgLCwXPHVFFFFKhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFV+0aphXvUc63QCHWoqEqL6SClRKlJOPTKSM/smuPcm+yNPbaXKdCJEtaRGjkciHHFBAI+Gc/KqltAymHeLjFA4QbZBU2PNILyT/xAn+tWTVV+StipGnV1yfYK1HBeF0p6aJpy4cSdEXFmxWZLCxhTTyAtKh6g8jS+uO0doh95L0R3difWStcEAqgvn9prP82f2m8H49KY9FXKuigq2GOdoIUUUz4jmYbJJtNrZu5tNzhOW65pTx+yuq4g6nxWyvo4n4cx4gVMR4efAVf9Qaet+pLSYU9K0lKg4zIaPC7HcHRaFeCh+8ZByDiqVbDPZuL9kvjaUXOKAvvm04bmNE4DyB4c+Sk/lV6EV5xi3hNtI7iQ6s/wt2nxQyNyv3X9W4YxnAr9+xjyFSCg0ywt11aG20JKlrWoJSkeJJPID1qqsakuWrFuRtube1cGkqLa77NCkQGj0PB0VII8kYT+1VakwV0xysalkrQ3Uld896BaLeu4XKZHhRUfiffWEJB+J8fQc6iYo1jqzh+6dqbtduX1vV7aUkqH6mY3JSvMKWUj0NW3T+21ut09F51DOf1JeweITJ6R3bB8mGR7jQ+GT61dq6yh8JwR80+p7LOmxJ7tGqiWLanTttntXe+OSNTXpA5XC7EOd2f9U1ju2h5cIz61e6ir3qWyadi9/d7gzHB/CgnK1n9lI5n6Up9Q7vXq4umJpaH7C0cj2l9IW8oeaU/hT8TmtKuxjD8IZlkcG+g3+FFT0dRVu5Bf16Ju3a+WixQjLvFxjw2R+Z1YGfgPGlpet8YDbbx07bFSm2hlybOcEZhA8yTzx8cUpYFv1FuBfHRpyG5qGUhRQ/d5rykwYys8wXv/AFVDP+LaGOuVCm5o/YmyWiWzd9YXFzVV2bIW2mQ2GoMVX+pjDKQR+pRUr1rMhrsUxXWnZwY+7tXH2CtvgpKUWkdnd2GyoiNQbtblSAnTjb8iCv3VSwVW62AdDhzBef8A6gA9avFi2Itfd97ri7PagcV7yoLSfZIKT/u0nic+LilZptpSlKQlIAAGAB0Ffa2abCIoznlJkd3cb/bZUpKt7tGDKPRcdstNrstuRAs9uiQIqPwsRWktIHySAK7KKK1QANAqm6KKKKVCKiLBpmyaZjymrLARG9rkrlyV5KlvOrOVLUo8yf7gKl6KSwvdLdFFFFKkRRRRQhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhUDd5PHoqEgk8BucfiA8eZIz88VRrJfkab1BZr0+sJhgrtcxR6IQ4oLaWfQLBB+JpnbjQHJ+3M/uUlTsYJmJSPzd0oLI9TgH50pjDZmQ3YzyO+iSW8KA/Mk8woevQg15Z4wqpsPxeCrbtlt9102ExMqKR8R3utBJUlaAtCgpJGQQcg19pHaN11cNCqRYdXqdk2LPBEu6QV+zDlhDw6hPkrnj4dHXFlxZ0REqFJZkMLGUOsrC0qHoRyNd/hWLQYlAJYjr1HULCqqR9O/K8fVf2qHv1kTdW40llQanQ197Hd+PJSFeaVDkR8D4VMUVoyRtkaWu2KrgkG4S0j7cXDVMkTtypTUqIlfGxpuGo+xNgHKVPnkZC+n4sI8k0x2WGY0ZuPHabZZbSEIbbSEpQkcgAB0HpXyTKjQ4q5Mt9thlAypxxQSkD1JpS6v3uhxQuDpFlE57mDPeBDCP6I6rP0HrWfU1lHhcOaVwaB8lTxQS1LrMFymjdbxa7Jb1TbtOZiMJ/O6rGfQDqT6Ck3q3eqZKC4OlGFRGyce3yEgrUP2EHkn4q+lK+53y86iuqZN0mybhKUcI4vD0Qkck/IV26XsF71ddBD0nDjzu7XwSrxJ963wCDzSMf5U8P0JPAD+JXhXA1PimuxiXyuEssD/u6/wDS6CLCoKNnFqzc9l/F5+S7OZfnuTJ1yn5MdhtJkTJ2Ovdo6lI8VHCB50ydLbL3C8NJl7hqRGgHmnTsF4kOjPL2t4YLv+7ThHnxVdLRp/R+1tv9ukvuS7xPWlhy4yR3s2e6ejaAB08m0AJSB05Zq9tKWthKnW+7URzRnOPTNb+DeEKejf5ipPEl7nos6rxaSUZIxlb2CScPtM7JWrW8fbhqbJtE9qULaiGu3LYaYczwhB5AJGcDy5infXn526dqn7Fru37s2VDiItzKY09TQx3ElA/m3M+HEB9U1qPs17qo3Y2Ht12kvBd4gAQLkjx71A5L+Chg/Wu5fEBGHtWG2Ql5Y5XDcXdDRe1Wm2r7ra7C3w3ngw0QguLcXjOEpTzPKuufr/SNo0FH1le73GtNmfZQ+iRPV3OUqGR7quecHpjNZP3Ebc7RPbxtWg2VLd0foke0XNafwLdBCnAT5khDfwCqSN91Jce0f20rVpu8y3G9Pu3f7PhwUKIbjxWiriCU9ApQbOT158qcyAOGp9Smvmy7LZ7fay2qnOPnT8fVWoY7H+NmWiyPvsJ8/fxz+FWnQm/u1O4tyFr01quOq5nI+zpaVR5GR4cCwCT6DnV7slis+nLHHs1htsa3QI6A21GjNhCEADA5D++sddu3bqzwNP2TdSyRUW+9Mzkw5UiN/NLeCgS2rIweNJTyV1wajY1j3Zdk97i1t0/9e9ora3bTVi9OazvEu2z0tpeShUJ1SXEHopKgMKHhy8aY9kvVr1Fp6FfbLNam2+ayl+PIaVlLiFDIIrG9hsTva/7GTarw419/9NvLjRrmtISXlpSCkLI/K4kgHyIzVN7LO/52in3PardN9222uKt5cdySk5gPoyVsEdeFWDw+Gf6VP4FwbbhM41iCditqbhbsaG2vatytY3j2Ndye7iIy20p1x5XLolIJ8QM+tWh+6Q4lgcvM1wxYjUcyXVvjgLaAniJUD0wOorLOz2kLvvxvW52jNfRFs2OMos6StDwOA0kkCQofUjzUSfAVO9qvVtyvP3f2B0hJ4L9rKQluW4g/5NCCvfUry4sH5A0wxi4aN+qkzaXTB0H2i9ptyNZp0tpPUhl3Nba3W2lx1thxKfxFJUMHlz+FNWvLfd3Qtz7Lnahs150pIkLt6O6uNsddVkuJThLzKvPJyPgoeVegVz3esLHZnk7xW4+1W1FqNxaR4lWMBs+oWQk/OnSRAWLdimRyXuHbhT2tNxtD7d2tNw1pqa32Zlee79pcwtzH6UD3lfIUpXe2LtQoLetVu1leIiCczbfY3nGCB4hWBkVlDs76ck9pHtTztR7nyV3lmCyblJjvK9xxRXwtshPQNpP5RjkkV6VRIcSBCRDhRWY0dscKGWUBCEjyAHIUSRtjNjqU5jy8XGyW223aC2t3Vui7TpO/qXdUIU4u2y2FMSEpT1PCoeGag9Z9qzZ3Qet5+ktQ3a5N3WC4GnmWYDjgCiAQAQOfUdKaLOkNMR9XfemPYYDN59nVFM5plKHFNlXEUkjqMjxrzP32mQ7f/KIXCfPeQxEYvsJ1510+6hKQ2So+g60sMbXuKbK8sAK2P/3ztleLBd1OP/hH/wCFMbbXeLRW7DM5zSD9wcEEpD4mQnIxBVnGOMDPTwqMG+mwx5jcbSJ8eUpur5p+86f1Bp5i+abnQp1tkpKmpURQLbgBxkEdeYNROAA2UgPqpWqpuDuLpXbDSI1LrGcuFbi+iN3qGlOHjVnhGE8/A1aO9a/ziP7QrM3bvWB2UkqBGDe4gBHwXRG3M4Aoe6wJCsjHbA2QlNlyLfLpIQDwlTNpkOAHyyEnnXdbe1TtBdr3EtMO5XgyZbyWGkrtEhAKlHAySnA5+NIzsWbl7baS2JuNt1bq+xWqcu7uupjz5CW1lBQnCsHw68/StWab3C211fdPs/S+qrBd5iUF3uYT6HVhI6qwPCnyMDCRZMjcXAFVncDtG7U7ZawXpjV99fiXJDKH1NIircAQr8JyBjwqtnth7IJUAu73lCSAe8VaJARj48NY/wC3TlPaukkEjNpi/wD6r0Y0jBhPbb2EOw46wq2x88TaTn+aT6Uro2tY13dI15c4t7Kt6O372g15LbiaY17aJctw4TGW73LpPkErwSfQUx6yf2utgNIXPaW67kaassa1aksyBKcdhIDQlMggKStKcDiA94KGCMHzqrdlPtNqG3E/TG4lykTHrQ40mDMdVxOOMLCsIWonKikoIBPPBFJwszczUvEs7K5bYUlK0FCgClQwQfEUmmrR9jXqZptwn/A1d5GKvzxlklvB8eHmg/0R505qq2s9PSLrEYutpSj7YgcSo4WcJfQrHGyo+AUAMHwIBrmvEWENxGmygczdR+y06CqNPJfoVUF25p9hTTzSVIUMEHxqmuaXmaUuXt2k77cbIVq4i1HUFsLP7TSvdP7jV9tc6JdramZFC0DiLbjTgw4ytPJTax4KSeRHz8a/N0iCTbVtYyoe8n4ivK300tLd8Di147LpWTNfYPFwVX4+4+vYbXDKesk7lyWuM40o/HhURXHcd1dcvAoYctMFP6mY63Vf8asD6VzOx+JOcfKoiVFCScis1/jHGGgt4yuDCKQnNkUHerpeL48Hb1dJdxWk5SJChwJPogAJH0qEcSEsvyH3m48ZhHePyXl8LbKP1LV4D95PIZNS91kQbbDEqe6ttpTgZbQ02XXX3T+Fplsc3HFeCR8Tgc6Zmgdqi+zF1ZuJAbiojK9pg6fdWFtQ8Dk9KPR1/Hgfcb6JGedW8Ewaux+Tj1DzkG7j+iSrr4MPbkjHN2CrGgtqJ2uozdyvzE2z6UcGUxl5Ym3dPm54sRz4Nj31jmogci2dRay0ttvpYwLfGjR49vZCUxo6OBqOnolOEj8ROAED3lEj41G6h1vOuC1RbQpUOFkhUhXJx0en6E+vX4VWdtdOo19fmtbXFknTdufV9isLHKc+k4VNWD1SCClv5r8RXodDUwsk/DcIbt/c/t+5XO1Eb3N8zWHfYKx7e6KvM7Uq9zNwkqXfpCCi3W5w8SbPHUPwADl3yvzqHT8IOM5aVAAHSiuyhiETAwLFe8vNyqjufoWBuTtNe9GXFI4J8ZSG1nq26OaFg+GFAfLNeZe0G7+pezlrrV1qlwn1uPRH4L0M8u6mt5DTmPIHr6EV6xUlNXdlfaPW26rmv75bZ6rm6628+0zKKGHloxgrQBzzwjPnVyGUNBa7ZV5Yy4hzd1E9krbGRonY8X/UDKjqTVCzc563B74SvJQg/I8R9VVjC/WSf2c+29BuV7iPC1wrz9oxnynlIiOKOVJPiUhagR1HD616nNtoaaS02kJQkBKUgYAA6Cq7rPQOjtwrCbNrLT0K8Q88SUSUZKD5pUOaT8DQyaziT1Q+IFoA6KZtl0t95s8a62qYzMhSmw8zIZVxIcQRkEEVjbt97g21GlrDtpCkJfuciWm4SmGzlTTaUkNggeKio4HWnRauzHpDTUVyHo/WGvdNwHVFSoNsvjiWRnrwpUDw/KpPR/Zu2l0bqM6jj6fcu99K+8N1vchU2RxfqyvkD64prC1jsyc9pc3Kq12Qds7ptv2eGE3+OuNdbxIVcXo6xhTKFABtCh+rhGT8ayN23bbCidqx1cWK20ZlujOv8Ax3iySkqPqRjJ9K9N6Uu4nZw2x3R1qjVWrIVweuKGUMBTEtTSeFByPdFPimyyF5TJIrsDQrjBuFl0Xs3EuU1bUG1Wq0tuuEAJS22hoHl9PrWNtqNDbt75bk3/tFWPWUfSDkuU7BtSpMH2tfsyfdwgK5JSByz1zmtkaz2907rzb1zRWoBMXZ3Q2l1piQppTiUYwlShzI5DI8cVKaZ01ZtH6Rt+mdPQkQ7ZAZDEdhHRKR/efEn1pjZMoJG5UhbewKyTvV2cd8tbbcSJGod07fqx+0JXNhwPslEZxagn3kocTzBKQeXQnFLTswX87hbL647Nl1mmI/cobsqzuPE4Q4CCtrHUYWEqx/Sr0XpNNdl7aWLut/2i223XO3X0TPb0uQp7jTaHScqw2PdweeR0OTUjZ+Qtd9Ex0XNmCxl2Y9SvbC9qiXprcaM5ZTPZNqkqkp4Qy5xBTayf0KPIK6e8K9MEOIdaS40tK0KAUlSTkEHxBqo662s2/3Kt6YmtdLQLsEDCHXkYdR/RWMKHwzVFhdmfS1pipg2LXO4lqt6T7kKJf3A0geScgkD50yR4kNzoURsMYt0WUtvtQ31/8AlPXrW7ebkuAm/wA1CYq5Ky0AELwOEnGPSqlv9AjzP5ReXb5DKXo8m829LjbgylYUlrIIPUHyrd2hOzptTt7qr70WSxPSL9lSvtW4ylyX+JX4lcSjjJ88eNQWveydtVuLuLM1tfzfUXaWUKWuJPLSUlCQlJSAORwBUwnaHXHayYYnEW9UwE7R7WpTwp260sAPAWtn/wDmuy86Eslx2un6Dtrf2FbJUZcZItSQwY6VcyW+Hkk8z0pVDsj7chYI1NuCB+n7ySP785q/bcbRab2vcnrsFy1DMM0IDn2vc3ZnDw9OHjJ4arH3U49kmU9h7RicZ3G16cf7Rx/0qu9q/QsLbrsIW7SVtuNwuEeHe43DIuDvevL4u8J4lePWtjVTNztsdM7t6F+6erBLNv8AaG5X+CPd0vjRnHveXM05shzAuSOZcEBZb7Dm3uh9UbGXe5ak0dZbrLReFtJkT4bbywkNowAVA8uZ5fGtaWLQGhtMXFVw05o+x2mWpBbL8GC2yspPhxJAOPSkxB7GO1dqirj2q+a4gNrVxlEW+OtJKvMhOAT4VJQOyhoe3XSNOZ1huApyO6h5KXL+6pKikggKHiDjmPEU6RzXEm6SNpa0AhZA7d7ak9qZSyMJXZ4xB88FQr0b0by240+P9mxv/qTS03S7MW2u72sk6n1UbwiemMmLmFK7pJQkkjlwnnz61ys9l3SLMFENOu9yfZ0IDaWvvG8EhIGMYHhjlSve1zGt7JrWFri7uq52x929PaQ2Gu2jWrmw5qK/NiEzDacCnGmyQVuLH5RjkM9SRilT2VOzG9ctu7hqvX0ORbxdVtG3RXElLvcoCv5xST+HiK+QPPAz41pLSfZs2b0de03q36PYm3RJ4hPurq5rwPnxOE8/WmxTeKGtytSmPM7M5FFFFQqVUbVWm5sO5u6q01H76SpIFwtqVcImpSOS0eAeSOQP5h7p8CIiBdYN4tqZ1ve71okoUCkoU2ocihaTzSodCk8xTQqjas0Aq4XBeotKzGrRf+EBxSkZjTwOiJCB19Fj3h5kcq5fG8C80DNT6P7d1oUdZwyGv2VLnMcEpaR0PMVVb9cEwnI0CJDeuV3nKLcC2RiA7KX44J5IQOqnFe6kevKu+43TWcq9x9NQ9CXBvUroIKH+cBlIOC+qSOSmvID3z0wKZui9vrZoKFLvMl1+96hkoBnXVxvLruOYbaQOTbQzyQn4kk868+wrwXNWVDn1QyxtOvc+i6CpxhkMQEZu4qB242rGlXTrPXUyPctTlshBbB9mtTZ6sxknx/U4feWfIYFSWo78q7q9laymKk5CMfjPmr+FVnU+vtRzn1MM6G1i5HSo49ntSiPqSM/H6VBxb/qJxfCjbHXLmeQ44CGgT4AlTnL4+FdBjFVVPjFBhsDmxjS9rXVGkjjDuPUPBd2uuiZZJOtNTMaEiOuNRn2xJvUls4UzDyR3SVeC3iCn0SFnyp9RY0W3W5mHEZbjxo7aW220DCUISMAAeQAqs7f6Wk6b086/diyu93J32u4ONHKUrIwlpB/Q2kBA+BPjVtrrPD+Etw6lDSOd2pWXX1ZqZSeg2XEu721tXCuY0CTgDPWv5rvlrbOFy0j+qr+FSOB5V+e7bPVCfpW2b9FS0UYdSWUHBnJ/sq/hR95LL4zkD4pUP+lSXdNf5tH0oLLR6toP9UUln90aKN+8ll/05B+CVH/pQNSWUnAmpP8AUV/CpINNgcm0D5Cvvdt/oT9KLP7hLouNq8W55aUNyUlSjhIKSM/UV+rk3cXYRTa5DDD+RhbzZWnHwBH99dYSkdABX3wpSCRYpL2OiVMfUOvLtuDL0dFvdmiSoba33pPsCnApPEkJAQXOR97qTVu1NerjpbQBuD77Mua1wIW6G+7Qsk8yE5OPhmq1pnReprd2jNV6wuAhCyTojbEENulTvFkFZUnGEj3R4mpjdawX/U218606ZTFN0cKFMe0uFtAIPUkA1kMpqllLK0OJkOa2vwrhkidKy45dL/qoC07gXuPaY921Dc9OORXkJdLURakuNBWORKjjln600Q4juA6VAJ4eLJ8qQI7N1uskrTGoNNsxX7nbENGfb7m6t6NMcSAS6CrPA4FZIOMenIUyty7VrPUW2ztj0k5DgXGfwsvyJDp4YzZI4yMDKzjIxyzTMOjrIA9s5zaC3x3RUmF5Bj07/wDi4Wt1oUjXabQzbXzaVL7hN5JHcLe8W0nOcgEEnpg9c8qtGrL1M0/pd69RY6JDcbC30Kzybz7yhjy6/DNKRvs4yoWnxFhbo6lXKaSVNl9tgsFfq2ED3SeuDnHjTX0lFvv3DiQdXx4xuCWizIS053rbg6ZyQM5HmKfSsreeOc7jQjoUkhgFnM6bg9V/G462tULQiNTIWHmnUp7lpJ95xxRwlsepUQK7Lrc51t0JJur6Gm5jMUuqQDlCV46eoBpe6a2tv1v15GF3nRH9L2eQ5KtkdClKcccV/i+9BGB3YJxjOTg8sVfNdwLtdNuLxbrEyy9cX46m2G33O7QpR8CrwHXnToBWPie6XR1rADv3+p2TXiJrwG6j+aJP2vc3Vt5LPDuZoS2OvuFIhSYLq3WjxkBKj3gBPTy607rhcHLRphyfJWh5xhkKWoDhClY5nHgM1mexbX7qWS3x2l7Q6BuMqOSsTZk/iecXxFYUSE9c4x8Kfur4Op7rtLJhwIUNy+vR0ZjF8tslzI4kheDgdcHFR0nmxTPDwc9tL97fupajgmQZDy3Vjtc0XKzRZ6UhIfbS4ADnGRml5ujuTK0fdrXYoT1vtz9ySpQud2CvZmQCAfw/iV+z6iuPTs3e62W63WqRoTT/ALLHShlTpvJKwgYGcBHM48PGpXc61a7urMVrTVh0nfYHCfaYN7Cgvj8FNqwRjHIg8/Wp5HTS0ul2vFunyoo2sbLzWI912aCuWobi6+7cdY6c1DDKAUKtkctLbV6++oY/fVykzI0RCVSHUthRwnPifKkvtZt3razbiuajvNm0/piAI6mTbbO6pz2lRxhSsjCQME8uZOOlO+pcPdK6H81uU/KbUtY1/IbhRh1BaR1l/wDLX/Cvn3htH+l/8tf8KkuBH6E/SjgR+hP0q5Z3f+fKg0UeL9az0lf8Cv4V+/tq24J9owAMklCgAPpXbwI/Qn6V9CUjokfSizu6NFyM3SBIOGZKFn9nJrsoop6Rf//Z";

function fmtDV2(d) {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x) ? escHtml(d) : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Same destination-vibe fallback cover logic as V1's pickFallbackCover() —
// V2 has no Unsplash gallery-search UI, so this (verified, curated) set of
// fallback photos is what always renders, matched to the destination text.
function pickFallbackCoverV2(deal) {
  const _d = ((deal && deal.destination) || '').toLowerCase();
  const F = {
    mountain: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85',
    beach: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1400&q=85',
    city: 'https://images.unsplash.com/photo-1508062878650-88b52897f298?w=1400&q=85',
    cruise: 'https://images.unsplash.com/photo-1554254648-2d58a1bc3fd5?w=1400&q=85',
    europe: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1400&q=85',
    nordic: 'https://images.unsplash.com/photo-1663428520845-056989f8a664?w=1400&q=85',
    tropicboat: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1400&q=85',
  };
  if (/cruise|ship|msc|cordelia/.test(_d)) return F.cruise;
  if (/kashmir|himachal|spiti|manali|shimla|leh|ladakh|nepal|bhutan|uttarakhand|mussoorie|nainital|darjeeling|gangtok|sikkim|swiss|alps/.test(_d)) return F.mountain;
  if (/norway|finland|sweden|denmark|iceland|scandinavia|lofoten|fjord/.test(_d)) return F.nordic;
  if (/paris|france|italy|europe|london|spain|portugal|amsterdam|prague|vienna|rome/.test(_d)) return F.europe;
  if (/dubai|city|kuala|singapore|hong kong|tokyo|delhi|mumbai/.test(_d)) return F.city;
  if (/thailand|phuket|krabi|pattaya|bangkok|goa|andaman/.test(_d)) return F.tropicboat;
  return F.beach;
}

function buildProposalHTMLV2(deal) {
  const cover = pickFallbackCoverV2(deal);

  const _tiers = (deal.useTiers ? (deal.tiers || []) : []).filter((t) =>
    t.enabled && (Number(t.totalPrice) > 0 || (t.hotels || []).some((h) => h.hotelName || h.photoUrl)));
  const pax = `${deal.adults || 0} Adults${Number(deal.children) > 0 ? `, ${deal.children} Children` : ''}${Number(deal.infants) > 0 ? `, ${deal.infants} Infants` : ''}`;
  const hotels = (deal.hotelVendors || []).filter((h) => h.hotelName || h.city);
  const nightsTotal = hotels.reduce((s, h) => s + (Number(h.nights) || 0), 0);
  const flights = (deal.flightVendors || []).filter((f) => (f.sectors || []).some((s) => s.from || s.to));
  const trains = (deal.trainVendors || []).filter((t) => (t.segments || []).some((s) => s.from || s.to));
  const ref = deal.dealNumber || ('VE' + String(Date.now()).slice(-6));
  const showF = flights.length > 0;
  const showH = true;
  const sell = sellINR(deal);
  const totalPax = (Number(deal.adults) || 0) + (Number(deal.children) || 0);

  const dayHdr = /^(?:day[\s-]*\d+|\d+(?:st|nd|rd|th)?\s+day)\b/i;
  const parseDaysV2 = (text) => {
    const raw = (text || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const firstHdr = raw.findIndex((l) => dayHdr.test(l));
    if (firstHdr < 0) return raw;
    const out = []; let cur = null;
    raw.slice(firstHdr).forEach((l) => {
      if (dayHdr.test(l)) { if (cur !== null) out.push(cur); cur = l; }
      else { cur = cur === null ? l : cur + '\n' + l; }
    });
    if (cur !== null) out.push(cur);
    return out;
  };
  const allDayLines = (deal.landVendors || []).filter((l) => l.itinerary).map((l) => parseDaysV2(l.itinerary)).reduce((a, b) => a.concat(b), []);

  const dayIconV2 = (t) => {
    const s = (t || '').toLowerCase();
    if (/beach|island|boat|snorkel|cruise|speed/.test(s)) return '🏖️';
    if (/temple|pagoda|heritage|fort|palace|museum|ancient/.test(s)) return '🛕';
    if (/cable|hill|mountain|trek|peak/.test(s)) return '🚡';
    if (/safari|wildlife|zoo|national park/.test(s)) return '🦁';
    if (/arrival|airport pickup|check-in|welcome/.test(s)) return '🛬';
    if (/departure|check-out|drop/.test(s)) return '🛫';
    if (/shopping|market|city tour|downtown/.test(s)) return '🏙️';
    if (/leisure|relax|free day|own/.test(s)) return '🌴';
    return '📍';
  };

  const statsRibbon = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px">
    ${nightsTotal ? `<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${nightsTotal}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">NIGHTS</div></div>` : ''}
    ${_tiers.length ? `<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${_tiers.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">STAY OPTIONS</div></div>`
      : (showH && hotels.length ? `<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${hotels.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">PREMIUM STAY${hotels.length > 1 ? 'S' : ''}</div></div>` : '')}
    ${showF && flights.length ? `<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${flights.reduce((s, f) => s + ((f.sectors || []).filter((x) => x.from || x.to).length) + ((f.returnSectors || []).filter((x) => x.from || x.to).length), 0)}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">FLIGHT SECTORS</div></div>` : ''}
    ${allDayLines.length ? `<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${allDayLines.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">CURATED DAYS</div></div>` : ''}
    <div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${totalPax || '–'}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">TRAVELLER${totalPax > 1 ? 'S' : ''}</div></div>
  </div>`;

  const hlItems = [];
  if (showF && flights.length) hlItems.push('✈️ Flights handpicked for the best timings & baggage');
  if (showH && hotels.length) hlItems.push(`🏨 ${hotels.length} premium stay${hotels.length > 1 ? 's' : ''} with breakfast included`);
  if (allDayLines.length) hlItems.push(`🗺️ ${allDayLines.length}-day fully curated experience — zero planning stress`);
  hlItems.push('🤝 Dedicated Voyage-Ed trip manager on WhatsApp, before & during your trip');
  const highlightsHTML = `<div style="background:linear-gradient(135deg,#fdf9ee,#fff);border-left:4px solid #c9961a;border-radius:0 14px 14px 0;padding:16px 20px;margin:0 0 18px">
    <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:8px">WHY YOU'LL LOVE THIS TRIP</div>
    <div style="font-size:12.5px;line-height:2.1;color:#33415e">${hlItems.join('<br>')}</div>
  </div>`;

  const timelineHTML = allDayLines.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:14px 16px;margin-bottom:16px">
    ${allDayLines.map((d, i) => `<div style="text-align:center;min-width:50px"><div style="font-size:19px">${dayIconV2(d)}</div><div style="font-size:8.5px;color:#7d8bab;font-weight:800;letter-spacing:.5px">DAY ${i + 1}</div></div>`).join('<div style="color:#c9961a;font-weight:800">›</div>')}
  </div>` : '';

  const totRec = sumBy(deal.clientPayments, 'amount');
  const totRef = sumBy(deal.refunds, 'amount');
  const payBlock = (sell > 0 && totRec > 0) ? `<div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;margin-top:16px">
    <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:10px">PAYMENT SUMMARY</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
      <div style="flex:1;min-width:130px;background:#f0faf4;border-radius:10px;padding:10px 14px"><div style="color:#15803d;font-weight:800;font-size:16px">₹${totRec.toLocaleString('en-IN')}</div><div style="color:#5a6b8c;font-size:10px">RECEIVED — thank you! 🙏</div></div>
      ${totRef > 0 ? `<div style="flex:1;min-width:130px;background:#fdf1f1;border-radius:10px;padding:10px 14px"><div style="color:#b91c1c;font-weight:800;font-size:16px">− ₹${totRef.toLocaleString('en-IN')}</div><div style="color:#5a6b8c;font-size:10px">REFUNDED</div></div>` : ''}
      <div style="flex:1;min-width:130px;background:#fff7ed;border-radius:10px;padding:10px 14px"><div style="color:#c2660a;font-weight:800;font-size:16px">₹${Math.max(0, (sell - totRef) - (totRec - totRef)).toLocaleString('en-IN')}</div><div style="color:#5a6b8c;font-size:10px">BALANCE — due before travel</div></div>
    </div>
  </div>` : '';

  const acceptMsg = 'I, ' + (deal.clientName || 'the Client') + ', have read and ACCEPT the Booking Policy, Cancellation Policy and Terms & Conditions (Clauses 1-16) of Voyage-Ed proposal Ref: ' + ref + '.';
  const acceptWA = 'https://wa.me/917009659048?text=' + encodeURIComponent(acceptMsg);
  const STATIC_CANCEL_TABLE = `<table style="width:100%;border-collapse:collapse;margin:2px 0 8px;font-size:11px">
      <tr><th style="background:#0d1b3e;color:#fff;padding:7px 12px;text-align:left;border-radius:8px 0 0 0">Days Before Departure</th><th style="background:#0d1b3e;color:#fff;padding:7px 12px;text-align:left;border-radius:0 8px 0 0">Cancellation Charge</th></tr>
      <tr><td style="padding:7px 12px;border:1px solid #e3eaf7">30 – 16 days</td><td style="padding:7px 12px;border:1px solid #e3eaf7;font-weight:700;color:#0d1b3e">50% of the total cost</td></tr>
      <tr><td style="padding:7px 12px;border:1px solid #e3eaf7;background:#f8fafd">15 – 8 days</td><td style="padding:7px 12px;border:1px solid #e3eaf7;background:#f8fafd;font-weight:700;color:#0d1b3e">75% of the total cost</td></tr>
      <tr><td style="padding:7px 12px;border:1px solid #e3eaf7">7 – 0 days</td><td style="padding:7px 12px;border:1px solid #e3eaf7;font-weight:700;color:#b91c1c">100% of the total cost (no refund)</td></tr>
    </table>
    • Visa fee & service charges are <b style="color:#0d1b3e">non-refundable</b>.<br>
    • No refund, either in part or in full, will be made for any <b style="color:#0d1b3e">unused part of the services</b> provided in the package.<br>
    • Overseas Insurance Policy after issuance is non-refundable (Travel Insurance Charges: <b style="color:#0d1b3e">₹1,000 per person</b>).`;

  const legalTC = `
  <div style="margin-top:26px">
    <h2 style="font-size:18px;color:#0d1b3e;margin:0 0 10px">⚖️ Terms &amp; Conditions of Service (Legal)</h2>
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;font-size:10px;line-height:1.75;color:#4a5772">
      <b style="color:#0d1b3e">1. Definitions &amp; Parties.</b> In these Terms, "the Company" means <b>Voyage-Ed Travels</b>, having its office at GMADA Aerocity, Mohali, Punjab, India; "the Client" means the person(s) named in this proposal and all travellers on whose behalf the booking is made; "Suppliers" means airlines, hotels, cruise lines, transport operators, insurers and other third-party service providers; "Total Cost" means the total package price stated in this proposal. These Terms constitute a legally binding agreement between the Company and the Client.<br>
      <b style="color:#0d1b3e">2. Acceptance &amp; Authority.</b> Acceptance of this proposal — by digital acceptance below, written or electronic confirmation, or payment of any deposit — constitutes unconditional acceptance of these Terms by the Client on behalf of all travellers in the booking, and the Client warrants that they have authority to bind all such travellers.<br>
      <b style="color:#0d1b3e">3. Role of the Company.</b> The Company acts solely as an agent of the Suppliers. All services are additionally governed by the Suppliers' own tariffs, terms and conditions of carriage/service, which are deemed incorporated herein by reference. The Company shall not be liable for any act, omission, default or insolvency of any Supplier.<br>
      <b style="color:#0d1b3e">4. Booking &amp; Payment.</b> A non-refundable deposit of ₹20,000 per person — or the actual hotel, flight and land component minimum due, whichever is higher — is required to initiate a booking. Where the date of travel is less than 7 (seven) days away, a non-refundable deposit of 50% of the Total Cost shall apply. Full payment is required upon confirmation of all services and prior to departure from India. Time is of the essence: failure to pay any amount by its due date entitles the Company to treat the booking as cancelled by the Client, and the Cancellation Policy shall apply.<br>
      <b style="color:#0d1b3e">5. Cancellation &amp; Refunds.</b> The Cancellation Policy stated in this proposal (the standard slab: 30–16 days before departure — 50%; 15–8 days — 75%; 7–0 days — 100% of the Total Cost) forms an integral part of this Agreement. All cancellations must be communicated in writing and take effect from the date of receipt by the Company. Visa fees and service charges are non-refundable in all circumstances. No refund shall be payable, in whole or in part, for any unused, partially used or forfeited service. Travel insurance, once issued, is non-refundable (insurance charge: ₹1,000 per person). Failure to travel / no-show shall be treated as a cancellation attracting 100% charges.<br>
      <b style="color:#0d1b3e">6. Refund Processing.</b> Refunds, where due, shall be processed only after realisation of the corresponding amounts from the respective Suppliers and in accordance with their policies, ordinarily within 30–45 working days of receipt. Refunds shall be made to the same account/instrument from which payment was received.<br>
      <b style="color:#0d1b3e">7. Amendments &amp; Transfers.</b> Any change requested by the Client (dates, names, itinerary, room category or otherwise) is treated as a fresh booking, subject to availability and revised pricing; changes within the cancellation window attract applicable cancellation charges. Bookings are non-transferable except with the Company's prior written consent and payment of applicable Supplier charges.<br>
      <b style="color:#0d1b3e">8. Travel Documents, Visas &amp; Permits.</b> The Client is solely responsible for holding valid passports (minimum 6 months' validity from the date of return travel), visas, permits, and health/vaccination documentation for all travellers. Photocopies of passport (first and address page) are mandatory for all destinations. Grant, refusal or delay of any visa is at the sole discretion of the concerned Embassy/authority; the Company assumes no liability therefor, and cancellation charges shall apply in case of visa refusal or delayed issuance.<br>
      <b style="color:#0d1b3e">9. Prices &amp; Taxes.</b> All prices are subject to availability, rate of exchange, fuel and Supplier surcharges, and statutory levies (including GST as per government norms) prevailing at the time of booking and may be revised accordingly until full payment. Mandatory gala dinner supplements on special dates (24/31 December, 14 February) may be payable by the Client directly at the hotel.<br>
      <b style="color:#0d1b3e">10. Itinerary Changes by the Company.</b> The Company reserves the right to modify, re-sequence or substitute any part of the itinerary or services due to force majeure, weather, operational requirements, safety considerations or non-availability, with suitable alternatives of comparable standard being provided where reasonably possible; no compensation shall be payable for such modification.<br>
      <b style="color:#0d1b3e">11. Force Majeure.</b> The Company shall not be liable for any delay, alteration, curtailment, cancellation, loss or damage arising from acts of God, weather, natural calamity, epidemic/pandemic, strikes, riots, civil disturbance, war, terrorism, government or regulatory action, airspace or border closures, technical or operational failure of Suppliers, or any other cause beyond its reasonable control. Any additional cost so arising (including extended stay, re-routing or repatriation) shall be borne by the Client.<br>
      <b style="color:#0d1b3e">12. Limitation of Liability &amp; Indemnity.</b> To the maximum extent permitted by law, the Company's aggregate liability under or in connection with this Agreement, howsoever arising, shall not exceed the amount actually received by the Company for the booking. The Company shall not be liable for any indirect, incidental or consequential loss, loss of enjoyment, or loss of baggage/personal effects. The Client shall indemnify and hold harmless the Company against all claims, losses and expenses arising from the Client's breach of these Terms, unlawful conduct, or inaccurate information supplied.<br>
      <b style="color:#0d1b3e">13. Health, Insurance &amp; Conduct.</b> The Client warrants fitness to travel and shall disclose any medical condition relevant to the services booked. Comprehensive travel insurance is strongly recommended and is the Client's responsibility. The Company or its Suppliers may decline or terminate services, without refund, in case of unlawful, unsafe or abusive conduct. Check-in/check-out timings, baggage allowances and on-board rules are as per the respective Suppliers.<br>
      <b style="color:#0d1b3e">14. Complaints &amp; Notices.</b> Any complaint regarding the services must be notified to the Company in writing at enquiry@voyage-ed.com within 14 (fourteen) days of completion of travel, failing which the claim shall be deemed waived. All notices under this Agreement shall be in writing to the addresses/e-mail stated in this proposal.<br>
      <b style="color:#0d1b3e">15. Severability &amp; Waiver.</b> If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force. No failure or delay by the Company in exercising any right shall operate as a waiver thereof.<br>
      <b style="color:#0d1b3e">16. Governing Law, Jurisdiction &amp; Entire Agreement.</b> This Agreement shall be governed by and construed in accordance with the laws of India. Subject to an attempt at amicable resolution, all disputes shall be subject to the exclusive jurisdiction of the competent courts at Mohali / Chandigarh, Punjab, India. This proposal together with these Terms constitutes the entire agreement between the parties and supersedes all prior communications relating to this booking.
    </div>
  </div>
  <div id="ve-accept" style="margin-top:16px;background:linear-gradient(135deg,#fdf9ee,#fff);border:2px solid #c9961a;border-radius:16px;padding:18px 22px">
    <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:8px">✍️ CLIENT ACCEPTANCE</div>
    <div class="ve-interactive">
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:12px;color:#33415e;cursor:pointer;line-height:1.6">
        <input type="checkbox" id="veAgree" style="width:18px;height:18px;margin-top:2px;accent-color:#c9961a"/>
        <span>I, <b style="color:#0d1b3e">${escHtml(deal.clientName) || 'the undersigned Client'}</b>, confirm that I have read, understood and unconditionally accept the Booking &amp; Payment Policy, the Cancellation Policy and the Terms &amp; Conditions of Service (Clauses 1–16) stated in this proposal (Ref: <b>${escHtml(ref)}</b>). I understand that my submission constitutes a legally binding acceptance of these terms.</span>
      </label>
      <button id="veAccBtn" style="margin-top:12px;background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;border:none;border-radius:10px;padding:12px 26px;font-size:13px;font-weight:800;cursor:pointer">✅ Accept &amp; Submit</button>
      <div id="veAccMsg" style="font-size:12px;margin-top:10px;font-weight:700"></div>
      <div style="font-size:10.5px;color:#7d8bab;margin-top:8px">Ya ek tap me: <a href="${acceptWA}" style="color:#15803d;font-weight:800">WhatsApp par accept karein →</a></div>
    </div>
    <div class="ve-printsign" style="display:none">
      <a href="${acceptWA}" style="display:block;text-decoration:none;background:linear-gradient(135deg,#15803d,#22a04e);border-radius:14px;padding:16px 20px;text-align:center;margin:4px 0 12px">
        <span style="color:#fff;font-size:16px;font-weight:800;letter-spacing:.5px">✅ &nbsp;TAP HERE TO ACCEPT THIS PROPOSAL</span><br>
        <span style="color:#d7f5e0;font-size:10.5px">Ek tap me WhatsApp khulega — ready-typed acceptance message ke saath — bas Send dabayein.<br>By sending, you accept the Booking Policy, Cancellation Policy &amp; Terms (Clauses 1–16) · Ref: ${escHtml(ref)}</span>
      </a>
      <div style="font-size:10px;color:#7d8bab;text-align:center;margin-bottom:10px">Ya WhatsApp par likh bhejein: <b style="color:#33415e">"I ACCEPT ${escHtml(ref)}"</b> → <b style="color:#33415e">+91 70096 59048</b> · Ya QR scan karein (footer)</div>
      <div style="font-size:11px;color:#33415e;line-height:2.2;border-top:1px dashed #e3d9be;padding-top:8px">
        For physical signing: &nbsp; Client Signature: ______________________________ &nbsp;&nbsp; Name: ${escHtml(deal.clientName) || '____________________'} &nbsp;&nbsp; Date: ________________
      </div>
    </div>
  </div>
  <script>
    (function(){
      var btn=document.getElementById("veAccBtn"); if(!btn) return;
      var VE_REF=${JSON.stringify(String(ref || ''))}, VE_CLIENT=${JSON.stringify(String(deal.clientName || 'Client'))}, VE_DEST=${JSON.stringify(String(deal.destination || ''))}, VE_PRICE=${JSON.stringify(sell > 0 ? ('Rs. ' + sell.toLocaleString('en-IN')) : 'On request')}, VE_PMODE="STATIC/STANDARD", VE_POLICY=${JSON.stringify('30-16 days before departure: 50% of total cost | 15-8 days: 75% of total cost | 7-0 days: 100% of total cost (no refund) | Visa fee & service charges non-refundable | No refund for unused services | Insurance non-refundable after issuance (Rs.1,000/person)')};
      btn.addEventListener("click",function(){
        var chk=document.getElementById("veAgree"), msg=document.getElementById("veAccMsg");
        if(!chk.checked){ msg.style.color="#b91c1c"; msg.textContent="⚠️ Please tick the acceptance checkbox first."; return; }
        btn.disabled=true; btn.textContent="Submitting...";
        var hashP = (window.crypto&&crypto.subtle) ? crypto.subtle.digest("SHA-256", new TextEncoder().encode(VE_POLICY+"|"+VE_REF)).then(function(buf){ return Array.prototype.map.call(new Uint8Array(buf),function(b){return ("0"+b.toString(16)).slice(-2);}).join(""); }).catch(function(){return "unavailable";}) : Promise.resolve("unavailable");
        hashP.then(function(policyHash){
        var body={ _subject: "PROPOSAL ACCEPTED - " + VE_REF + " - " + VE_CLIENT,
          type:"Proposal T&C Acceptance", reference:VE_REF, client:VE_CLIENT, destination:VE_DEST,
          packagePrice:VE_PRICE, policyMode:VE_PMODE, cancellationPolicyAccepted:VE_POLICY,
          policyHashSHA256:policyHash,
          acceptedAtISO:new Date().toISOString(), acceptedFrom:(navigator.userAgent||"").slice(0,120) };
        return fetch("https://formspree.io/f/xbdwrzaq",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
        .then(function(){ msg.style.color="#15803d"; msg.textContent="✅ Thank you! Your acceptance has been recorded and sent to Voyage-Ed Travels (Ref: "+VE_REF+")."; btn.textContent="✅ Accepted"; }); })
        .catch(function(){ msg.style.color="#b91c1c";
          var mailto="mailto:enquiry@voyage-ed.com?subject="+encodeURIComponent("PROPOSAL ACCEPTED - "+VE_REF+" - "+VE_CLIENT)+"&body="+encodeURIComponent("I accept the T&C, Booking Policy and Cancellation Policy of proposal "+VE_REF+".%0ACancellation policy accepted: "+VE_POLICY+"%0AAccepted at: "+new Date().toString());
          msg.innerHTML="⚠️ Could not auto-submit. <a href='"+mailto+"' style='color:#0d1b3e'>Click here to send your acceptance by email</a>."; btn.disabled=false; btn.textContent="✅ Accept & Submit"; });
      });
    })();
  </script>
  `;
  const qrURL = 'https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=' + encodeURIComponent(acceptWA);

  const sectorRowV2 = (s) => {
    const _code = String(s.airlineCode || '').trim().toUpperCase();
    const _name = String(s.airlineName || '').trim();
    return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px dashed #d8e2f3">
      <div style="min-width:72px;max-width:86px;text-align:center">
        <div style="font-size:14px;font-weight:800;color:#c9961a;letter-spacing:1px">${escHtml(_code) || (_name ? escHtml(_name.split(' ')[0]) : '✈')}</div>
        <div style="font-size:9.5px;color:#7d8bab;line-height:1.3">${escHtml(_name)}</div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:10px">
        <div><div style="font-size:17px;font-weight:800;color:#0d1b3e">${escHtml(s.from)}</div><div style="font-size:9px;color:#7d8bab">${escHtml(s.fromName)}</div><div style="font-size:11px;font-weight:700;color:#334e82">${escHtml(s.depTime)}</div></div>
        <div style="flex:1;text-align:center;color:#c9961a;font-size:11px">──────✈──────<div style="font-size:9px;color:#7d8bab">${fmtDV2(s.date)}</div></div>
        <div style="text-align:right"><div style="font-size:17px;font-weight:800;color:#0d1b3e">${escHtml(s.to)}</div><div style="font-size:9px;color:#7d8bab">${escHtml(s.toName)}</div><div style="font-size:11px;font-weight:700;color:#334e82">${escHtml(s.arrTime)}</div></div>
      </div>
    </div>`;
  };

  const detectFlightTypeV2 = (f) => {
    const norm = (x) => String(x || '').trim().toLowerCase();
    const secs = (f.sectors || []).filter((s) => s.from || s.to);
    const rets = (f.returnSectors || []).filter((s) => s.from || s.to);
    if (rets.length) return 'ROUND TRIP';
    if (secs.length >= 2) {
      const first = secs[0], last = secs[secs.length - 1];
      const returnsHome = norm(first.from) && norm(last.to) === norm(first.from);
      if (secs.length === 2 && returnsHome && norm(secs[0].to) === norm(secs[1].from)) return 'ROUND TRIP';
      return returnsHome ? 'MULTI-CITY' : (f.flightType === 'return' ? 'ROUND TRIP' : 'MULTI-CITY');
    }
    if (f.flightType === 'return') return 'ROUND TRIP';
    return 'ONE WAY';
  };

  const flightBlocks = showF ? flights.map((f) => {
    const visSecs = (f.sectors || []).filter((s) => s.from || s.to);
    const visRets = (f.returnSectors || []).filter((s) => s.from || s.to);
    const noTimes = [...visSecs, ...visRets].every((s) => !s.depTime && !s.arrTime);
    return `
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
      <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;padding:10px 18px;font-size:12px;font-weight:700;letter-spacing:1px">✈️ FLIGHT · ${detectFlightTypeV2(f)}</div>
      ${visSecs.map(sectorRowV2).join('')}
      ${visRets.map((s) => `<div style="background:#f8fafd;font-size:10px;color:#7d8bab;padding:4px 18px;font-weight:700;letter-spacing:1px">RETURN</div>` + sectorRowV2(s)).join('')}
      ${noTimes ? `<div style="background:#fdf9ee;font-size:10px;color:#8a6d1a;padding:7px 18px">🕐 Exact departure &amp; arrival timings will be confirmed on your final ticket.</div>` : ''}
    </div>`;
  }).join('') : '';

  const trainBlocks = trains.map((tv) => {
    const trainSegRow = (s) => `
      <div style="padding:14px 18px;border-top:1px solid #f0f4fa">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <div style="font-size:13px;font-weight:800;color:#0d1b3e">${escHtml(s.trainNo || '')}${s.trainName ? ` <span style="font-weight:600;color:#5a6b8c">${escHtml(s.trainName)}</span>` : ''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${s.classOfTravel ? `<span style="background:#eef3fc;color:#334e82;font-size:9.5px;font-weight:800;border-radius:20px;padding:3px 9px">${escHtml(s.classOfTravel)}</span>` : ''}
            ${s.pnr ? `<span style="background:#f0faf4;color:#15803d;font-size:9.5px;font-weight:800;border-radius:20px;padding:3px 9px">PNR ${escHtml(s.pnr)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:96px">
            <div style="font-size:22px;font-weight:800;color:#0d1b3e;line-height:1">${escHtml(s.from || '—')}</div>
            <div style="font-size:10.5px;color:#5a6b8c">${escHtml(s.fromStation || '')}</div>
            <div style="font-size:14px;font-weight:800;color:#c9961a;margin-top:4px">${escHtml(s.depTime || '—')}</div>
            <div style="font-size:10px;color:#8b98b4">${escHtml(s.date || '')}</div>
          </div>
          <div style="flex:0 0 60px;text-align:center;color:#c9961a;font-size:16px">🚆</div>
          <div style="flex:1;min-width:96px;text-align:right">
            <div style="font-size:22px;font-weight:800;color:#0d1b3e;line-height:1">${escHtml(s.to || '—')}</div>
            <div style="font-size:10.5px;color:#5a6b8c">${escHtml(s.toStation || '')}</div>
            <div style="font-size:14px;font-weight:800;color:#c9961a;margin-top:4px">${escHtml(s.arrTime || '—')}</div>
          </div>
        </div>
      </div>`;
    const outSegs = (tv.segments || []).filter((s) => s.from || s.to);
    const retSegs = (tv.returnSegments || []).filter((s) => s.from || s.to);
    const label = tv.tripType === 'return' ? 'RETURN' : tv.tripType === 'multi-city' ? 'MULTI-LEG' : 'ONE WAY';
    return `
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
      <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;padding:10px 18px;font-size:12px;font-weight:700;letter-spacing:1px">🚆 TRAIN · ${label}${tv.isInternational ? ' · INTERNATIONAL' : ''}${tv.name ? ` · ${escHtml(tv.name)}` : ''}</div>
      ${outSegs.map(trainSegRow).join('')}
      ${retSegs.map((s) => `<div style="background:#f8fafd;font-size:10px;color:#7d8bab;padding:4px 18px;font-weight:700;letter-spacing:1px">RETURN</div>` + trainSegRow(s)).join('')}
    </div>`;
  }).join('');

  const hotelBlocks = showH ? hotels.map((h) => `
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;padding:20px 22px;margin-bottom:14px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
      ${h.photoUrl ? `<img src="${escHtml(h.photoUrl)}" style="width:100%;height:auto;max-height:260px;object-fit:contain;background:#f4f7fc;border-radius:12px;margin-bottom:14px;display:block" onerror="this.style.display='none'"/>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800">🏨 ${escHtml((h.city || '').toUpperCase())}${h.country ? ' · ' + escHtml(h.country.toUpperCase()) : ''}</div>
          <div style="font-size:18px;font-weight:800;color:#0d1b3e;margin:4px 0 2px">${escHtml(h.hotelName) || 'Hotel'}</div>
          <div style="font-size:12px;color:#5a6b8c">${escHtml(h.roomCategory)} · Breakfast included</div>
          ${h.starRating ? `<div style="font-size:13px;color:#f0c842;margin-top:3px">${'★'.repeat(Number(h.starRating) || 0)}<span style="color:#c9ccd4">${'★'.repeat(Math.max(0, 5 - (Number(h.starRating) || 0)))}</span></div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="background:#f0f5fd;border-radius:10px;padding:8px 14px;font-size:11px;color:#334e82">
            <b>${(() => { let n = Number(h.nights); if (!n && h.checkIn && h.checkOut) { n = Math.round((new Date(h.checkOut) - new Date(h.checkIn)) / 86400000); } return n > 0 ? n : 1; })()} night${(() => { let n = Number(h.nights); if (!n && h.checkIn && h.checkOut) { n = Math.round((new Date(h.checkOut) - new Date(h.checkIn)) / 86400000); } return n === 1 ? '' : 's'; })()}</b><br>
            ${h.checkIn ? 'In: ' + fmtDV2(h.checkIn) : ''}<br>${h.checkOut ? 'Out: ' + fmtDV2(h.checkOut) : ''}
          </div>
        </div>
      </div>
    </div>`).join('') : '';

  const landBlocks = showH ? (function () {
    const allDays = allDayLines;
    const N = allDays.length;
    const _hp = (x) => { const t = Date.parse(x); return isNaN(t) ? null : t; };
    const _hn = (deal.hotelVendors || []).map((h) => ({ h, ci: _hp(h.checkIn), co: _hp(h.checkOut) })).filter((x) => x.ci !== null && x.co !== null && x.co > x.ci);
    const _t0 = _hn.length ? Math.min.apply(null, _hn.map((x) => x.ci)) : null;
    const overnightFor = (i) => { if (_t0 === null) return null; const t = _t0 + i * 86400000; const f = _hn.find((x) => t >= x.ci && t < x.co); return f ? f.h : null; };
    const mealsOfV2 = (d) => { const c = []; if (/breakfast/i.test(d)) c.push('🍳 Breakfast'); if (/\blunch/i.test(d)) c.push('🥗 Lunch'); if (/dinner/i.test(d)) c.push('🍽 Dinner'); return c; };
    const tagsOfV2 = (d) => {
      const t = [];
      if (/temple|monastery|pagoda|shakti|church|cathedral|mosque|gurudwara/i.test(d)) t.push('🛕 Temples');
      if (/beach|island/i.test(d)) t.push('🏖 Beach');
      if (/waterfall|falls\b/i.test(d)) t.push('💦 Waterfalls');
      if (/trek|hiking|hike\b|canyon/i.test(d)) t.push('🥾 Trek');
      if (/cruise|boat|ferry|kayak/i.test(d)) t.push('🚤 Boat');
      if (/safari|wildlife|national park/i.test(d)) t.push('🦁 Wildlife');
      if (/shopping|bazaar|market/i.test(d)) t.push('🛍 Shopping');
      if (!t.length && /transfer|proceed to|drive to|drop/i.test(d)) t.push('🚗 Transfer Day');
      return t.slice(0, 3);
    };
    const _bC = allDays.filter((d) => /breakfast/i.test(d)).length, _lC = allDays.filter((d) => /\blunch/i.test(d)).length, _dC = allDays.filter((d) => /dinner/i.test(d)).length;
    const mealSummary = (_bC || _lC || _dC) ? `<div style="margin:-2px 0 14px;display:flex;gap:8px;flex-wrap:wrap">${[_bC ? `🍳 ${_bC} Breakfast${_bC > 1 ? 's' : ''}` : '', _lC ? `🥗 ${_lC} Lunch${_lC > 1 ? 'es' : ''}` : '', _dC ? `🍽 ${_dC} Dinner${_dC > 1 ? 's' : ''}` : ''].filter(Boolean).map((x) => `<span style="background:#f0faf4;border:1px solid #cfe9d6;color:#15803d;font-size:10px;font-weight:800;border-radius:20px;padding:5px 12px">${x} included</span>`).join('')}</div>` : '';
    const _cards = allDays.map((d, i) => {
      const lines = String(d).split('\n');
      let head = lines[0] || '';
      const m = head.match(/^((?:day[\s-]*\d+|\d+(?:st|nd|rd|th)?\s+day)[:\-\s]*)(.*)$/i);
      let rest = m ? m[2] : head;
      let chip = ''; const dm = rest.match(/^\s*\(([^)]{3,30})\)\s*[:\-–]?\s*(.*)$/);
      if (dm) { chip = dm[1]; rest = dm[2] || rest; }
      let title = rest, body = lines.slice(1).join(' ');
      const tSplit = rest.split(/\s[-–—]\s|:\s/);
      if (tSplit.length > 1 && tSplit[0].length < 70) { title = tSplit[0]; body = (rest.slice(title.length).replace(/^[\s:\-–—]+/, '') + ' ' + body).trim(); }
      return `
      <div style="display:flex;gap:0;position:relative">
        <div style="width:66px;display:flex;flex-direction:column;align-items:center;flex-shrink:0">
          <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#c9961a,#f0c842);box-shadow:0 3px 10px rgba(201,150,26,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0d1b3e;font-weight:800;z-index:1">
            <div style="font-size:7.5px;letter-spacing:1px">DAY</div><div style="font-size:17px;line-height:1">${i + 1}</div>
          </div>
          ${i < N - 1 ? `<div style="flex:1;width:2px;background:linear-gradient(#e8d9a8,#f3ecd2);margin:4px 0"></div>` : ''}
        </div>
        <div style="flex:1;background:#fff;border:1px solid #e3eaf7;border-left:3px solid #e8d089;border-radius:14px;padding:13px 17px;margin:0 0 16px 6px;box-shadow:0 2px 10px rgba(13,27,62,.05)">
          <div style="display:flex;align-items:flex-start;gap:8px 10px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px;font-family:Georgia,'Times New Roman',serif;font-size:14.5px;font-weight:700;color:#0d1b3e;line-height:1.4">${i === 0 && /arriv|pick|airport|welcome/i.test(d) ? '🛬' : i === N - 1 && /depart|drop|airport|onward journey/i.test(d) ? '🛫' : dayIconV2(d)} ${escHtml(title)}</div>
            ${chip ? `<div style="background:#fdf6e5;border:1px solid #ecd9a0;color:#8a6d1a;font-size:9.5px;font-weight:800;letter-spacing:.5px;border-radius:20px;padding:4px 11px;white-space:nowrap">📅 ${escHtml(chip)}</div>` : ''}
          </div>
          ${(function () { const mm = mealsOfV2(d), tt = tagsOfV2(d); if (!mm.length && !tt.length) return ''; return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">${mm.map((x) => `<span style="background:#f0faf4;border:1px solid #cfe9d6;color:#15803d;font-size:9px;font-weight:800;border-radius:20px;padding:3px 9px">${x}</span>`).join('')}${tt.map((x) => `<span style="background:#eef3fc;border:1px solid #d4e0f5;color:#334e82;font-size:9px;font-weight:800;border-radius:20px;padding:3px 9px">${x}</span>`).join('')}</div>`; })()}
          ${(function () {
      if (!body) return '';
      const hi = (t) => escHtml(t).replace(/(breakfast|lunch|dinner|check[- ]?in|check[- ]?out|transfer|overnight(?:\s+night)?\s+stay|pick[- ]?up|drop(?:\s+off)?|sightseeing|excursion|visit|explore)/gi, '<b style="color:#8a6d1a;font-weight:700">$1</b>');
      // Lookbehind regex support in Safari only landed in 16.4 (Mar 2023) —
      // on an older iOS/Safari this would throw a SyntaxError the moment
      // the script parses, breaking the entire page (not just this one
      // proposal). Rewritten with a capturing split + lookahead only,
      // which has been safe in every JS engine since ES3.
      const sents = body.split(/([.!?]\s+(?=[A-Z]))/).reduce((acc, cur, idx) => {
        if (idx % 2 === 1) { acc[acc.length - 1] = (acc[acc.length - 1] || '') + cur; }
        else if (cur) { acc.push(cur); }
        return acc;
      }, []).map((x) => x.trim()).filter(Boolean);
      if (body.length > 170 && sents.length >= 3) {
        return '<div style="margin-top:8px">' + sents.map((x) => {
          if (/^tips?\s*[:\-–]/i.test(x)) return '<div style="margin:6px 0;background:linear-gradient(135deg,#fdf6e5,#fffdf6);border:1px dashed #c9961a;border-radius:9px;padding:7px 11px;font-size:11px;color:#8a6d1a;font-weight:600">💡 <b>Voyage-Ed Tip:</b> ' + hi(x.replace(/^tips?\s*[:\-–]\s*/i, '')) + '</div>';
          return '<div style="display:flex;gap:8px;font-size:11.5px;line-height:1.65;color:#5a6b8c;margin-bottom:4px"><span style="color:#c9961a;font-weight:800;flex-shrink:0">›</span><span>' + hi(x) + '</span></div>';
        }).join('') + '</div>';
      }
      if (/^tips?\s*[:\-–]/i.test(body)) return '<div style="margin-top:8px;background:linear-gradient(135deg,#fdf6e5,#fffdf6);border:1px dashed #c9961a;border-radius:9px;padding:7px 11px;font-size:11px;color:#8a6d1a;font-weight:600">💡 <b>Voyage-Ed Tip:</b> ' + hi(body.replace(/^tips?\s*[:\-–]\s*/i, '')) + '</div>';
      return '<div style="font-size:12px;line-height:1.7;color:#5a6b8c;margin-top:6px">' + hi(body) + '</div>';
    })()}
          ${(function () { const oh = overnightFor(i); if (!oh || !(oh.hotelName || oh.city)) return ''; const st = oh.starRating ? ' ⭐' + escHtml(String(oh.starRating)) : ''; return `<div style="margin-top:9px;background:#f4f7fc;border:1px solid #e0e9f7;border-radius:9px;padding:6px 11px;font-size:10.5px;color:#334e82;font-weight:700">🏨 Overnight: ${escHtml(oh.hotelName || '')}${oh.city ? ', ' + escHtml(oh.city) : ''}${st}${oh.roomCategory ? ` · <span style="font-weight:600;color:#7d8bab">${escHtml(oh.roomCategory)}</span>` : ''}</div>`; })()}
        </div>
      </div>`;
    }).join('');
    return mealSummary + _cards;
  })() : '';

  const tierOptionsBlock = _tiers.length ? (() => {
    const cols = _tiers.map((t, i) => {
      const tot = Number(t.totalPrice) || 0;
      const pp = totalPax > 0 && tot > 0 ? Math.round(tot / totalPax) : 0;
      const feat = t.booked || (_tiers.length === 3 && i === 1);
      const badge = t.booked ? '✓ YOUR CHOICE' : (_tiers.length === 3 && i === 1 ? 'MOST POPULAR' : '');
      const hs = (t.hotels || []).filter((h) => h.hotelName || h.photoUrl).map((h) => `
        <div style="margin-bottom:10px">
          ${h.photoUrl ? `<img src="${escHtml(h.photoUrl)}" style="width:100%;height:auto;max-height:150px;object-fit:contain;background:#f4f7fc;border-radius:9px;margin-bottom:7px;display:block" onerror="this.style.display='none'"/>` : ''}
          <div style="font-size:14px;font-weight:800;color:#0d1b3e;line-height:1.3">${escHtml(h.hotelName) || 'Hotel'}</div>
          <div style="font-size:11px;color:#5a6b8c;margin-top:2px">${escHtml(h.city)}${h.roomCategory ? ' · ' + escHtml(h.roomCategory) : ''}</div>
        </div>`).join('') || `<div style="color:#9aa7c4;font-size:11px;padding:14px 0">Hotel details on request</div>`;
      return `
      <div style="flex:1;min-width:180px;border:${feat ? '2px solid #1a3060' : '1px solid #e3eaf7'};border-radius:14px;overflow:hidden;background:#fff;${feat ? 'box-shadow:0 6px 20px rgba(13,27,62,.14)' : ''}">
        <div style="background:${t.booked ? 'linear-gradient(135deg,#15803d,#1a9e4b)' : feat ? 'linear-gradient(135deg,#0d1b3e,#1a3060)' : '#0d1b3e'};color:#fff;padding:11px 13px;text-align:center">
          <div style="font-size:14px;font-weight:800;letter-spacing:.4px">${escHtml(t.label || (t.star + '-Star'))}</div>
          <div style="color:#f0c842;font-size:12px;margin-top:2px">${'★'.repeat(Number(t.star) || 0)}<span style="color:rgba(255,255,255,.3)">${'★'.repeat(Math.max(0, 5 - (Number(t.star) || 0)))}</span></div>
          ${badge ? `<div style="font-size:9px;letter-spacing:1px;font-weight:800;margin-top:3px">${badge}</div>` : ''}
        </div>
        <div style="padding:13px">${hs}</div>
        ${tot > 0 ? `<div style="padding:12px 13px;border-top:1px dashed #e3eaf7;text-align:center;background:#f8fafd">
          <div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">PRICE PER PERSON</div>
          <div style="font-size:23px;font-weight:800;color:#0d1b3e;margin:2px 0;font-family:Georgia,serif">₹${(pp || tot).toLocaleString('en-IN')}</div>
          <div style="font-size:10.5px;color:#5a6b8c">Total ₹${tot.toLocaleString('en-IN')}${totalPax > 1 ? ' · ' + pax : ''}</div>
        </div>` : ''}
      </div>`;
    }).join('');
    return `
    <h2 style="font-size:22px;color:#0d1b3e;margin:22px 0 6px">🏨 Choose Your Stay</h2>
    <div style="font-size:12px;color:#5a6b8c;margin-bottom:14px">Same itinerary, same inclusions — sirf hotel category aur price alag hai. Jo pasand aaye wo choose kijiye.</div>
    <div style="display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;margin-bottom:6px">${cols}</div>
    <div style="font-size:10.5px;color:#8894b0;margin-bottom:16px">* All options include the same flights, transfers and sightseeing. GST extra as applicable.</div>`;
  })() : '';

  const _perPax = totalPax > 0 ? Math.round(sell / totalPax) : 0;
  const _tierMin = _tiers.length ? Math.min(...(_tiers.map((t) => Number(t.totalPrice) || 0).filter((v) => v > 0)).concat([Infinity])) : Infinity;
  const _fromPP = (_tierMin !== Infinity && totalPax > 0) ? Math.round(_tierMin / totalPax) : 0;
  const quoteVTDisplay = new Date(Date.now() + 7 * 864e5).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const priceBlock = sell > 0 ? `
    <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:18px;padding:26px 28px;color:#fff;margin:8px 0 18px">
      <div style="font-size:10px;letter-spacing:2px;color:#f0c842;font-weight:800;margin-bottom:6px">${_fromPP ? 'STARTING FROM · PER PERSON' : 'PRICE PER PERSON'}</div>
      <div style="font-size:34px;font-weight:800">₹${(_fromPP || _perPax || sell).toLocaleString('en-IN')}<span style="font-size:13px;font-weight:600;opacity:.8"> /- all inclusive</span></div>
      ${_fromPP
      ? `<div style="font-size:12px;opacity:.85;margin-top:4px">${_tiers.length} stay options below${totalPax > 1 ? ' · ' + pax : ''}</div>`
      : (totalPax > 1 ? `<div style="font-size:12px;opacity:.85;margin-top:4px">Total package ₹${sell.toLocaleString('en-IN')} · ${pax}</div>` : '')}
      <div style="font-size:10px;opacity:.6;margin-top:10px">*Subject to availability at the time of booking. Prices may vary with currency fluctuation. Quote valid till <b>${quoteVTDisplay}</b>.</div>
    </div>` : `
    <div style="background:#fdf6e5;border:1px solid #ecd9a0;border-radius:14px;padding:16px 22px;margin:8px 0 18px;text-align:center">
      <div style="font-size:13px;color:#8a6d1a;font-weight:700">💬 Best price guaranteed — contact us for your personalised quote</div>
    </div>`;

  const visaIncludedInDealV2 = (deal.visaVendors || []).some((v) => (Number(v.sellingPrice) || 0) > 0 || (Number(v.costPrice) || 0) > 0);
  const autoIncTextV2 = () => {
    const L = [];
    if ((deal.flightVendors || []).some((f) => (f.sectors || []).concat(f.returnSectors || []).some((x) => x.from || x.to))) L.push('Flights as mentioned above');
    if ((deal.hotelVendors || []).some((h) => h.hotelName || h.city)) { L.push('Hotel stays with breakfast'); L.push('All transfers & sightseeing as per itinerary'); }
    if (visaIncludedInDealV2) L.push('Visa fees & visa assistance');
    L.push('Dedicated trip manager on WhatsApp');
    L.push('All taxes included — no hidden charges');
    return L.join('\n');
  };
  const autoExcTextV2 = () => {
    const L = ['Meals other than specified'];
    if (!visaIncludedInDealV2) L.push('Visa fees (unless mentioned)');
    L.push('Travel insurance & personal expenses');
    L.push('Anything not mentioned in inclusions');
    return L.join('\n');
  };

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Voyage-Ed Proposal — ${escHtml(deal.destination)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:#eef2f9;color:#1a2c52}
.page{max-width:820px;margin:0 auto;background:#f7fafd}
h1,h2,.serif{font-family:'Playfair Display',serif}
@media print{ body{background:#fff} .noprint{display:none} .ve-interactive{display:none!important} .ve-printsign{display:block!important} }
</style></head><body>
<div class="page">
  <div id="veHero" style="position:relative;height:96vh;min-height:640px;background:url('${cover}') center/cover no-repeat;display:flex;flex-direction:column;justify-content:flex-end">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,21,48,.25),rgba(10,21,48,.78) 75%)"></div>
    <div style="position:absolute;top:26px;left:28px;background:#fff;border-radius:12px;padding:8px 16px"><img src="${VE_LOGO}" style="height:42px;display:block" alt="Voyage-Ed Travels"/></div>
    <div style="position:relative;padding:34px 40px 40px;color:#fff">
      <h1 style="font-size:52px;line-height:1.05;margin-bottom:8px">Trip to ${escHtml(deal.destination) || 'Your Dream Destination'}</h1>
      <div style="font-size:11px;letter-spacing:4px;color:#f0c842;font-weight:700;margin-bottom:8px">LEARN · TRAVEL · EXPLORE</div>
      <div style="font-size:13px;opacity:.85;margin-bottom:16px">Reference: <b>${ref}</b></div>
      <div style="border-top:2px solid rgba(255,255,255,.5);padding-top:16px;font-size:14px;line-height:2">
        📍 <b>${escHtml(deal.destination)}</b>${nightsTotal ? ` — ${nightsTotal} nights / ${nightsTotal + 1} days` : ''}<br>
        📅 <b>${escHtml(deal.travelDates) || 'Dates to be confirmed'}</b><br>
        👥 <b>${deal.rooms || 1} room${Number(deal.rooms) === 1 ? '' : 's'}, ${pax}</b>
      </div>
    </div>
    <div style="position:relative;background:rgba(10,21,48,.85);padding:12px 40px;color:#fff;font-size:12px">Specially crafted for <b style="color:#f0c842">${escHtml(deal.clientName) || 'our valued guest'}</b> by <b style="color:#f0c842">VOYAGE-ED TRAVELS</b> &nbsp;·&nbsp; 📞 +91 70096 59048</div>
  </div>

  <div style="padding:34px 36px">
    ${statsRibbon}
    ${priceBlock}
    ${highlightsHTML}
    ${showF ? `<h2 style="font-size:22px;color:#0d1b3e;margin:6px 0 14px">✈️ Your Flights</h2>${flightBlocks}` : ''}
    ${trains.length ? `<h2 style="font-size:22px;color:#0d1b3e;margin:6px 0 14px">🚆 Your Trains</h2>${trainBlocks}` : ''}
    ${tierOptionsBlock}
    ${showH && hotels.length && !tierOptionsBlock ? `<h2 style="font-size:22px;color:#0d1b3e;margin:20px 0 14px">🏨 Your Stays</h2>${hotelBlocks}` : ''}
    ${landBlocks ? `<h2 style="font-size:22px;color:#0d1b3e;margin:20px 0 14px">🗓️ Day-wise Journey</h2>${timelineHTML}${landBlocks}` : ''}

    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:22px">
      <div style="flex:1;min-width:250px">
        <h2 style="font-size:16px;color:#15803d;margin:0 0 8px">✅ What's Included</h2>
        <div style="background:#fff;border:1px solid #d3ecd9;border-radius:14px;padding:14px 18px;font-size:12px;line-height:2;color:#33415e">
          ${autoIncTextV2().split(/\n+/).map((x) => x.trim()).filter(Boolean).map((x) => '✅ ' + escHtml(x)).join('<br>')}
        </div>
      </div>
      <div style="flex:1;min-width:250px">
        <h2 style="font-size:16px;color:#b4540a;margin:0 0 8px">ℹ️ Not Included</h2>
        <div style="background:#fff;border:1px solid #f3e3cf;border-radius:14px;padding:14px 18px;font-size:12px;line-height:2;color:#33415e">
          ${autoExcTextV2().split(/\n+/).map((x) => x.trim()).filter(Boolean).map((x) => '✖ ' + escHtml(x)).join('<br>')}
        </div>
      </div>
    </div>
    <h2 style="font-size:18px;color:#0d1b3e;margin:24px 0 10px">📋 Booking Terms &amp; Cancellation Policy</h2>
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;font-size:11.5px;line-height:1.9;color:#4a5772">
      <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:6px">BOOKING &amp; PAYMENT POLICY</div>
      • A <b style="color:#0d1b3e">non-refundable deposit of ₹20,000 per person</b> is required to initiate a booking, OR the actual hotel, flight &amp; land component minimum due — whichever is higher.<br>
      • If the date of travel is <b style="color:#0d1b3e">less than 7 days</b> away, a non-refundable deposit of <b style="color:#0d1b3e">50% of the total cost</b> shall be applicable.<br>
      • <b style="color:#0d1b3e">Full payment</b> is required on confirmation of all services and before departure from India.<br>
      • Payments accepted via bank transfer, UPI, or card — we never ask for payments to personal accounts.<br>
      • Photocopies of the passport (<b style="color:#0d1b3e">first &amp; address page</b>) are mandatory for all destinations.<br>
      <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800;margin:12px 0 6px">CANCELLATION POLICY</div>
      ${STATIC_CANCEL_TABLE}<br>
      <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800;margin:12px 0 6px">AMENDMENTS &amp; IMPORTANT</div>
      • Any change is treated as a new booking, subject to availability and revised pricing. Changes within the cancellation window attract applicable charges.<br>
      • Passport must be valid for at least 6 months from travel date. Visa granting is at the Embassy's discretion; rejection/delay is not our liability.<br>
      • Gala dinner charges on special dates (24/31 Dec, 14 Feb) may be payable directly at the hotel. Itinerary may be modified due to force majeure, weather, or availability — suitable alternatives will be arranged.
    </div>
    <div style="font-size:10px;color:#8a97b5;margin-top:12px;line-height:1.7">This itinerary is a preliminary proposal. All services &amp; prices are subject to availability and currency fluctuation at the time of booking. GST is applicable as per government norms.</div>

    ${payBlock}
    ${legalTC}
    <div style="margin-top:22px;display:flex;justify-content:flex-end"><div style="text-align:right">
      <div style="font-family:'Playfair Display',serif;font-size:17px;color:#0d1b3e;font-style:italic">Warm regards,</div>
      <div style="font-size:12.5px;font-weight:800;color:#0d1b3e;margin-top:2px">Vishal Sharma &amp; Sahitya Singh</div>
      <div style="font-size:10.5px;color:#7d8bab">Founders · Voyage-Ed Travels</div>
    </div></div>
    <div style="margin-top:26px;background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px;color:#fff;flex-wrap:wrap">
      <div style="background:#fff;border-radius:10px;padding:6px 12px"><img src="${VE_LOGO}" style="height:34px;display:block"/></div>
      <div style="flex:1;font-size:12px;line-height:1.8"><b style="color:#f0c842">Ready to make it happen?</b><br>📞 +91 70096 59048 · ✉️ enquiry@voyage-ed.com · 🌐 voyage-ed.com<br>GMADA Aerocity, Mohali · Learn · Travel · Explore</div>
      <div style="text-align:center"><img src="${qrURL}" style="height:76px;width:76px;border-radius:8px;background:#fff;padding:4px;display:block"/><div style="font-size:8.5px;opacity:.85;margin-top:4px">Scan to confirm<br>on WhatsApp</div></div>
    </div>
  </div>
</div>
<div class="noprint" style="position:fixed;bottom:18px;right:18px"><button onclick="window.print()" style="background:linear-gradient(135deg,#f0c842,#c9961a);border:none;color:#0d1b3e;font-weight:800;padding:13px 22px;border-radius:12px;cursor:pointer;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25)">🖨 Save as PDF</button></div>
</body></html>`;
}


function openProposalV2(deal) {
  const w = window.open('', '_blank');
  if (!w) { window.veToast && window.veToast('Popup blocked — allow popups for this site', 'warning'); return; }
  try {
    const html = buildProposalHTMLV2(deal);
    w.document.write(html);
    w.document.close();
  } catch (err) {
    // Surface the real error instead of leaving a silent blank tab —
    // this is exactly what was happening before: any exception inside
    // buildProposalHTMLV2 meant document.write() never ran at all.
    w.document.write(
      '<div style="font-family:monospace;padding:40px;max-width:700px;margin:0 auto">' +
      '<h2 style="color:#b91c1c">Proposal generation failed</h2>' +
      '<p style="color:#4a5772">Something in this deal\'s data broke the proposal builder. Please share this with support:</p>' +
      '<pre style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:12px;color:#7f1d1d">' +
      String((err && err.stack) || err) +
      '</pre></div>'
    );
    w.document.close();
    window.veToast && window.veToast('Could not generate proposal — see the error in the new tab', 'warning');
    console.error('buildProposalHTMLV2 failed:', err);
  }
}

/* ─── COMBINED PROPOSAL — one PDF spanning several destinations
   under the same enquiry (e.g. client asked about both Dubai and
   Singapore for the same trip window). Reuses the same brand styling
   as the single-deal proposal but loops a per-destination section
   for each linked deal, with one shared price total and one shared
   terms/acceptance block. ──────────────────────────────────────── */

function buildCombinedProposalHTMLV2(deals) {
  const primary = deals[0];
  const ref = 'VE-COMBINED-' + String(Date.now()).slice(-6);
  const totalSell = deals.reduce((s, d) => s + sellINR(d), 0);
  const totalPaid = deals.reduce((s, d) => s + paidINR(d), 0);
  const destinations = deals.map((d) => destination(d) || 'Destination').join(' + ');

  const destSection = (d, idx) => {
    const flights = (d.flightVendors || []).filter((f) => (f.sectors || []).some((s) => s.from || s.to));
    const hotels = (d.hotelVendors || []).filter((h) => h.hotelName || h.city);
    const visas = (d.visaVendors || []).filter((v) => v.name);
    const dSell = sellINR(d);

    const flightRows = flights.map((f) => {
      const legs = [...(f.sectors || []), ...(f.returnSectors || [])].filter((s) => s.from || s.to);
      return legs.map((s) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #f0f2f7;font-size:11.5px">
        <div><b style="color:#0d1b3e">${escHtml((s.from || '').toUpperCase())}</b> → <b style="color:#0d1b3e">${escHtml((s.to || '').toUpperCase())}</b> <span style="color:#6b7a99">${escHtml(f.name || '')}</span></div>
        <div style="color:#5a6b8c">${escHtml(s.date || '')} · ${escHtml(s.depTime || '')}-${escHtml(s.arrTime || '')}</div>
      </div>`).join('');
    }).join('');

    const hotelRows = hotels.map((h) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #f0f2f7;font-size:11.5px">
      <div><b style="color:#0d1b3e">${escHtml(h.hotelName || 'Hotel')}</b> ${h.starRating ? '★'.repeat(Number(h.starRating) || 0) : ''} <span style="color:#6b7a99">${escHtml(h.city || '')}</span></div>
      <div style="color:#5a6b8c">${escHtml(h.checkIn || '')} → ${escHtml(h.checkOut || '')}</div>
    </div>`).join('');

    const visaRows = visas.map((v) => `<div style="font-size:11.5px;color:#33415e;padding:4px 0">🛂 ${escHtml(v.name)} — ${escHtml(v.visaStatus || 'Not Applied')}</div>`).join('');

    return `<div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:18px 22px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#0d1b3e">Destination ${idx + 1}: ${escHtml(destination(d) || 'Trip')}</div>
        <div style="font-size:15px;font-weight:800;color:#c9961a">₹${dSell.toLocaleString('en-IN')}</div>
      </div>
      <div style="font-size:11px;color:#6b7a99;margin-bottom:10px">${escHtml(d.travelDates || 'Dates flexible')}</div>
      ${flightRows || ''}
      ${hotelRows || ''}
      ${visaRows || ''}
    </div>`;
  };

  return `<!doctype html><html><head><meta charset="utf-8"><title>Voyage-Ed Combined Proposal — ${escHtml(clientName(primary))}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;background:#f4f6fb;color:#33415e}@media print{.noprint{display:none}}</style></head><body>
<div style="max-width:820px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);padding:44px 40px 30px;color:#fff">
    <div style="font-size:10px;letter-spacing:3px;color:#f0c842;font-weight:800">VOYAGE-ED TRAVELS · COMBINED PROPOSAL</div>
    <div style="font-family:Georgia,serif;font-size:30px;font-weight:700;margin-top:10px">${escHtml(destinations)}</div>
    <div style="font-size:13px;opacity:.85;margin-top:8px">${deals.length} linked destinations for one enquiry · Prepared for ${escHtml(clientName(primary))}</div>
  </div>
  <div style="background:rgba(10,21,48,.9);padding:12px 40px;color:#fff;font-size:12px">Ref: ${escHtml(ref)} &nbsp;·&nbsp; 📞 +91 70096 59048</div>

  <div style="padding:34px 36px">
    <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:16px;padding:20px 24px;margin-bottom:22px;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div><div style="font-size:10px;letter-spacing:2px;color:#f0c842;font-weight:800">COMBINED PACKAGE PRICE</div><div style="font-size:30px;font-weight:800;margin-top:4px">₹${totalSell.toLocaleString('en-IN')}</div><div style="font-size:11px;opacity:.75;margin-top:2px">Across ${deals.length} destinations</div></div>
      <div style="text-align:right;font-size:11px;opacity:.85">Valid for 7 days from today</div>
    </div>

    ${deals.map((d, i) => destSection(d, i)).join('')}

    ${totalPaid > 0 ? `<div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;margin-bottom:18px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:10px">PAYMENT SUMMARY (COMBINED)</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
        <div style="flex:1;min-width:130px;background:#f0faf4;border-radius:10px;padding:10px 14px"><div style="color:#15803d;font-weight:800;font-size:16px">₹${totalPaid.toLocaleString('en-IN')}</div><div style="color:#5a6b8c;font-size:10px">RECEIVED across all destinations</div></div>
        <div style="flex:1;min-width:130px;background:#fff7ed;border-radius:10px;padding:10px 14px"><div style="color:#c2660a;font-weight:800;font-size:16px">₹${Math.max(0, totalSell - totalPaid).toLocaleString('en-IN')}</div><div style="color:#5a6b8c;font-size:10px">BALANCE — due before travel</div></div>
      </div>
    </div>` : ''}

    <h2 style="font-size:16px;color:#0d1b3e;margin:20px 0 10px">📋 Booking Terms — same policy applies to every destination above</h2>
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;font-size:11.5px;line-height:1.9;color:#4a5772">
      • A <b style="color:#0d1b3e">non-refundable deposit of ₹20,000 per person</b> per destination is required to initiate booking.<br>
      • <b style="color:#0d1b3e">Full payment</b> required on confirmation of all services and before departure.<br>
      • Standard cancellation slab applies per destination: 30–16 days — 50%; 15–8 days — 75%; 7–0 days — 100% of that destination's cost.<br>
      • Visa fees and service charges are non-refundable.
    </div>

    <div style="margin-top:22px;display:flex;justify-content:flex-end"><div style="text-align:right">
      <div style="font-family:Georgia,serif;font-size:16px;color:#0d1b3e;font-style:italic">Warm regards,</div>
      <div style="font-size:12.5px;font-weight:800;color:#0d1b3e;margin-top:2px">Vishal Sharma &amp; Sahitya Singh</div>
      <div style="font-size:10.5px;color:#7d8bab">Founders · Voyage-Ed Travels</div>
    </div></div>
    <div style="margin-top:26px;background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:16px;padding:20px 24px;color:#fff">
      <b style="color:#f0c842">Ready to make it happen?</b><br>
      <span style="font-size:12px">📞 +91 70096 59048 · ✉️ enquiry@voyage-ed.com · 🌐 voyage-ed.com</span>
    </div>
  </div>
</div>
<div class="noprint" style="position:fixed;bottom:18px;right:18px"><button onclick="window.print()" style="background:linear-gradient(135deg,#f0c842,#c9961a);border:none;color:#0d1b3e;font-weight:800;padding:13px 22px;border-radius:12px;cursor:pointer;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25)">🖨 Save as PDF</button></div>
</body></html>`;
}

function openCombinedProposalV2(deals) {
  const w = window.open('', '_blank');
  if (!w) { window.veToast && window.veToast('Popup blocked — allow popups for this site', 'warning'); return; }
  try {
    const html = buildCombinedProposalHTMLV2(deals);
    w.document.write(html);
    w.document.close();
  } catch (err) {
    w.document.write(
      '<div style="font-family:monospace;padding:40px;max-width:700px;margin:0 auto">' +
      '<h2 style="color:#b91c1c">Combined proposal generation failed</h2>' +
      '<pre style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:12px;color:#7f1d1d">' +
      String((err && err.stack) || err) +
      '</pre></div>'
    );
    w.document.close();
    window.veToast && window.veToast('Could not generate combined proposal — see the error in the new tab', 'warning');
    console.error('buildCombinedProposalHTMLV2 failed:', err);
  }
}

function LinkDestinationsModal({ deal, allLeads, onClose, onSaved }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set((allLeads || []).filter((l) => l.enquiryId && l.enquiryId === deal.enquiryId && l._id !== deal._id).map((l) => l._id)));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const candidates = useMemo(() => {
    const myPhone = (deal.contactNo || '').replace(/[^\d]/g, '');
    return (allLeads || []).filter((l) => {
      if (l._id === deal._id) return false;
      const lPhone = (l.contactNo || '').replace(/[^\d]/g, '');
      const sameClient = (myPhone && lPhone && myPhone === lPhone) || (clientName(l).toLowerCase() === clientName(deal).toLowerCase() && clientName(deal) !== 'Unknown');
      return sameClient;
    });
  }, [allLeads, deal]);

  const toggle = (id) => setSelectedIds((s) => { const n2 = new Set(s); n2.has(id) ? n2.delete(id) : n2.add(id); return n2; });

  const submit = async () => {
    if (selectedIds.size === 0) { setErr('Select at least one other destination to link'); return; }
    setSaving(true);
    setErr('');
    try {
      const eid = deal.enquiryId || ('enq_' + Date.now());
      let updatedSelf = deal;
      if (!deal.enquiryId) {
        updatedSelf = await patchDeal(deal._id, { enquiryId: eid, auditLog: [...(deal.auditLog || []), logEntryStatic('Linked to combined enquiry')] });
      }
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const other = candidates.find((c) => c._id === id);
          return patchDeal(id, { enquiryId: eid, auditLog: [...(other?.auditLog || []), logEntryStatic('Linked to combined enquiry')] });
        })
      );
      window.veToast && window.veToast(`Linked ${selectedIds.size + 1} destinations ✓`, 'success');
      onSaved(updatedSelf);
    } catch (e) {
      setErr('Could not link — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="🔗 Link Destinations" onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel="✓ Link">
      <div style={{ fontSize: 12, color: '#6b7a99' }}>
        Select other enquiries from the same client to combine into one proposal (e.g. this client is also considering another destination for the same trip).
      </div>
      {candidates.length === 0 ? (
        <div style={{ fontSize: 13, color: '#6b7a99', padding: '12px 0' }}>No other enquiries found for this client (matched by phone number or name).</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {candidates.map((c) => (
            <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafc', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedIds.has(c._id)} onChange={() => toggle(c._id)} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d1b3e' }}>{destination(c) || 'Enquiry'}</div>
                <div style={{ fontSize: 11, color: '#6b7a99' }}>{stageOf(c)} · {fmtINR(sellINR(c))}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function AddFlightModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (editing) {
      const first = (editing.sectors || [])[0] || {};
      return {
        name: editing.name || '', currency: editing.currency || 'INR',
        costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
        sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
        exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
        from: first.from || '', fromName: first.fromName || '', to: first.to || '', toName: first.toName || '',
        date: first.date || '', depTime: first.depTime || '', arrTime: first.arrTime || '',
        paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
      };
    }
    return {
      name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
      from: '', fromName: '', to: '', toName: '', date: '', depTime: '', arrTime: '',
      paxPricing: false, paxRates: {},
    };
  });
  // Pre-seed with the existing multi-sector data when editing, so a
  // round-trip entry keeps ALL its legs unless the user re-scans.
  const [aiSectors, setAiSectors] = useState(() => editing ? (editing.sectors || null) : null);
  const [aiReturnSectors, setAiReturnSectors] = useState(() => editing ? (editing.returnSectors || null) : null);
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const processFiles = async (files) => {
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
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter((x) => x.type && (x.type.indexOf('image') === 0 || x.type === 'application/pdf'))
      .map((x) => x.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) { setErr('Airline name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const usingAI = Array.isArray(aiSectors) && aiSectors.length > 0;
      // The visible form always represents leg #1 — sync any edits made
      // to it back into aiSectors[0] before saving, so editing an
      // existing (possibly multi-leg) flight doesn't silently ignore
      // changes typed into the form.
      const firstLeg = {
        from: form.from, fromName: form.fromName, to: form.to, toName: form.toName,
        date: form.date, depTime: form.depTime, arrTime: form.arrTime,
      };
      const finalSectors = usingAI ? [firstLeg, ...aiSectors.slice(1)] : [firstLeg];
      const vendorFields = {
        name: form.name,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        flightType: aiReturnSectors && aiReturnSectors.length ? 'return' : 'oneway',
        sectors: finalSectors,
        returnSectors: aiReturnSectors || [],
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };

      if (editing) {
        const updatedList = (deal.flightVendors || []).map((f) => f.id === editing.id ? { ...f, ...vendorFields } : f);
        const updated = await patchDeal(deal._id, { flightVendors: updatedList });
        window.veToast && window.veToast('Flight updated ✓', 'success');
        onSaved(updated);
        return;
      }

      const newVendor = { id: 'fl_' + Date.now(), ...vendorFields, payments: [] };
      const updated = await patchDeal(deal._id, { flightVendors: [...(deal.flightVendors || []), newVendor] });
      window.veToast && window.veToast('Flight added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Flight' : '+ Add Flight'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      {!editing && (
        <div tabIndex={0} onPaste={handlePaste} style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14, cursor: 'text', outline: 'none' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
            <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
            <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
              {extracting ? 'Reading file…' : 'Click here, then paste (Ctrl+V) — or choose a screenshot/PDF'}
            </span>
            <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
          </label>
          {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
        </div>
      )}
      {editing && (aiSectors || []).length + (aiReturnSectors || []).length > 1 && (
        <div style={{ fontSize: 11, color: '#6b7a99', background: '#f9fafc', borderRadius: 8, padding: '8px 12px' }}>
          This flight has {(aiSectors || []).length + (aiReturnSectors || []).length} legs total. The fields below edit leg 1 only — other legs are kept as-is.
        </div>
      )}
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
      <PaxRatesFields form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddTrainModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (editing) {
      const first = (editing.segments || [])[0] || {};
      return {
        name: editing.name || '', currency: editing.currency || 'INR',
        costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
        sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
        exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
        trainNo: first.trainNo || '', trainName: first.trainName || '',
        from: first.from || '', fromStation: first.fromStation || '', to: first.to || '', toStation: first.toStation || '',
        date: first.date || '', depTime: first.depTime || '', arrTime: first.arrTime || '',
        classOfTravel: first.classOfTravel || '3A', pnr: first.pnr || '',
        paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
      };
    }
    return {
      name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
      trainNo: '', trainName: '', from: '', fromStation: '', to: '', toStation: '',
      date: '', depTime: '', arrTime: '', classOfTravel: '3A', pnr: '',
      paxPricing: false, paxRates: {},
    };
  });
  const [aiSegments, setAiSegments] = useState(() => editing ? (editing.segments || null) : null);
  const [aiReturnSegments, setAiReturnSegments] = useState(() => editing ? (editing.returnSegments || null) : null);
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const processFiles = async (files) => {
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
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter((x) => x.type && (x.type.indexOf('image') === 0 || x.type === 'application/pdf'))
      .map((x) => x.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const submit = async () => {
    if (!form.name.trim() && !form.trainName.trim()) { setErr('Train name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const firstLeg = {
        trainNo: form.trainNo, trainName: form.trainName,
        from: form.from, fromStation: form.fromStation, to: form.to, toStation: form.toStation,
        date: form.date, depTime: form.depTime, arrTime: form.arrTime,
        classOfTravel: form.classOfTravel, pnr: form.pnr,
      };
      const finalSegments = (aiSegments && aiSegments.length) ? [firstLeg, ...aiSegments.slice(1)] : [firstLeg];
      const vendorFields = {
        name: form.name || form.trainName,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        tripType: aiReturnSegments && aiReturnSegments.length ? 'return' : 'one-way',
        isInternational: false,
        segments: finalSegments,
        returnSegments: aiReturnSegments || [],
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };

      if (editing) {
        const updatedList = (deal.trainVendors || []).map((t) => t.id === editing.id ? { ...t, ...vendorFields } : t);
        const updated = await patchDeal(deal._id, { trainVendors: updatedList });
        window.veToast && window.veToast('Train updated ✓', 'success');
        onSaved(updated);
        return;
      }

      const newVendor = { id: 'tr_' + Date.now(), ...vendorFields, payments: [] };
      const updated = await patchDeal(deal._id, { trainVendors: [...(deal.trainVendors || []), newVendor] });
      window.veToast && window.veToast('Train added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Train' : '+ Add Train'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      {!editing && (
        <div tabIndex={0} onPaste={handlePaste} style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14, cursor: 'text', outline: 'none' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
            <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
            <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
              {extracting ? 'Reading file…' : 'Click here, then paste (Ctrl+V) — or choose a screenshot/PDF'}
            </span>
            <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
          </label>
          {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
        </div>
      )}
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
      <PaxRatesFields form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddHotelModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => editing ? {
    hotelName: editing.hotelName || '', currency: editing.currency || 'INR',
    costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
    sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
    exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
    country: editing.country || '', city: editing.city || '', starRating: editing.starRating || '4',
    roomCategory: editing.roomCategory || '', checkIn: editing.checkIn || '', checkOut: editing.checkOut || '',
    confirmationNo: editing.confirmationNo || '', photoUrl: editing.photoUrl || '',
    paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
  } : {
    hotelName: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    country: '', city: '', starRating: '4', roomCategory: '', checkIn: '', checkOut: '', confirmationNo: '',
    photoUrl: '', paxPricing: false, paxRates: {},
  });
  const [extraHotels, setExtraHotels] = useState([]); // any additional hotels found beyond the first
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const processFiles = async (files) => {
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
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter((x) => x.type && (x.type.indexOf('image') === 0 || x.type === 'application/pdf'))
      .map((x) => x.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const submit = async () => {
    if (!form.hotelName.trim()) { setErr('Hotel name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const vendorFields = {
        hotelName: form.hotelName,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        country: form.country, city: form.city,
        starRating: form.starRating, roomCategory: form.roomCategory,
        checkIn: form.checkIn, checkOut: form.checkOut, confirmationNo: form.confirmationNo,
        photoUrl: form.photoUrl,
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };

      if (editing) {
        const updatedList = (deal.hotelVendors || []).map((h) => h.id === editing.id ? { ...h, ...vendorFields } : h);
        const updated = await patchDeal(deal._id, { hotelVendors: updatedList });
        window.veToast && window.veToast('Hotel updated ✓', 'success');
        onSaved(updated);
        return;
      }

      const newVendor = { id: 'ht_' + Date.now(), ...vendorFields, payments: [] };
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
    <ModalShell title={editing ? '✎ Edit Hotel' : '+ Add Hotel'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      {!editing && (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14, cursor: 'text', outline: 'none' }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
            <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
            <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
              {extracting ? 'Reading file…' : 'Click here, then paste (Ctrl+V) — or choose a screenshot/PDF'}
            </span>
            <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
          </label>
          {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
        </div>
      )}
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
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Hotel Photo</div>
        <div
          onPaste={(e) => {
            const it = Array.from(e.clipboardData.items || []).find((x) => x.type && x.type.indexOf('image') === 0);
            if (it) {
              e.preventDefault();
              const f = it.getAsFile();
              if (f) imgToDataURL(f, (d) => setForm((form2) => ({ ...form2, photoUrl: d })));
            } else {
              const t = e.clipboardData.getData('text');
              if (t && t.trim()) setForm((form2) => ({ ...form2, photoUrl: t.trim() }));
            }
          }}
          tabIndex={0}
          style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'text', minHeight: 44 }}
        >
          {form.photoUrl ? (
            <>
              <img src={form.photoUrl} alt="hotel" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6 }} />
              <span style={{ fontSize: 11.5, color: '#059669', flex: 1 }}>Photo attached ✓</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>Remove</button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#6b7a99' }}>Click here, then paste (Ctrl+V) a copied photo — or paste a photo URL</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) imgToDataURL(f, (d) => setForm((form2) => ({ ...form2, photoUrl: d })));
            e.target.value = '';
          }}
          style={{ fontSize: 11, marginTop: 6 }}
        />
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
      <PaxRatesFields form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddLandModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => editing ? {
    name: editing.name || '', currency: editing.currency || 'INR',
    costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
    sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
    exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
    confirmationNo: editing.confirmationNo || '', itinerary: editing.itinerary || '',
    paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
  } : {
    name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    confirmationNo: '', itinerary: '', paxPricing: false, paxRates: {},
  });
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const processFiles = async (files) => {
    if (!files.length) return;
    setExtracting(true);
    setErr('');
    try {
      const j = await runAIExtract('land', files);
      if (!j.itinerary) throw new Error('No itinerary details found in this file');
      setForm((f) => ({
        ...f,
        name: j.vendorName || f.name,
        costPrice: j.costPrice != null ? String(j.costPrice) : f.costPrice,
        itinerary: j.itinerary,
      }));
      setAiSummary('✓ Itinerary extracted — review the day-wise plan below before saving.');
      window.veToast && window.veToast('Itinerary extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read this file — try a clearer scan');
    } finally {
      setExtracting(false);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter((x) => x.type && (x.type.indexOf('image') === 0 || x.type === 'application/pdf'))
      .map((x) => x.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) { setErr('Vendor / package name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const vendorFields = {
        name: form.name,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        itinerary: form.itinerary,
        confirmationNo: form.confirmationNo,
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };

      if (editing) {
        const updatedList = (deal.landVendors || []).map((l) => l.id === editing.id ? { ...l, ...vendorFields } : l);
        const updated = await patchDeal(deal._id, { landVendors: updatedList });
        window.veToast && window.veToast('Land package updated ✓', 'success');
        onSaved(updated);
        return;
      }

      const newVendor = { id: 'ld_' + Date.now(), ...vendorFields, payments: [] };
      const updated = await patchDeal(deal._id, { landVendors: [...(deal.landVendors || []), newVendor] });
      window.veToast && window.veToast('Land package added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Land Package' : '+ Add Land Package / Itinerary'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      {!editing && (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14, cursor: 'text', outline: 'none' }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
            <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
            <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
              {extracting ? 'Reading itinerary…' : 'Click here, then paste (Ctrl+V) — or choose a DMC quote/itinerary file'}
            </span>
            <input type="file" accept="image/*,.pdf" onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
          </label>
          {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
        </div>
      )}
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Vendor / Package Name *</div>
        <input value={form.name} onChange={set('name')} placeholder="e.g. ABC DMC — Bali 5N Land Package" style={inputStyle} />
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Confirmation No.</div>
        <input value={form.confirmationNo} onChange={set('confirmationNo')} style={inputStyle} />
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Day-wise Itinerary</div>
        <textarea
          value={form.itinerary}
          onChange={set('itinerary')}
          rows={8}
          placeholder={'Day 1: Arrival, transfer to hotel\nDay 2: City tour...'}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
      <PaxRatesFields form={form} setForm={setForm} />
    </ModalShell>
  );
}

function AddVisaModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => editing ? {
    name: editing.name || '', currency: editing.currency || 'INR',
    costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
    sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
    exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
    visaStatus: editing.visaStatus || 'Not Applied',
    paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
  } : {
    name: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '', visaStatus: 'Not Applied',
    paxPricing: false, paxRates: {},
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) { setErr('Visa name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      const vendorFields = {
        name: form.name,
        currency: form.currency,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        visaStatus: form.visaStatus,
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };

      if (editing) {
        const updatedList = (deal.visaVendors || []).map((v) => v.id === editing.id ? { ...v, ...vendorFields } : v);
        const updated = await patchDeal(deal._id, { visaVendors: updatedList });
        window.veToast && window.veToast('Visa updated ✓', 'success');
        onSaved(updated);
        return;
      }

      const newVendor = { id: 'vs_' + Date.now(), ...vendorFields, payments: [] };
      const updated = await patchDeal(deal._id, { visaVendors: [...(deal.visaVendors || []), newVendor] });
      window.veToast && window.veToast('Visa added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Visa' : '+ Add Visa'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
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
      <PaxRatesFields form={form} setForm={setForm} />
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

const CRUISE_CABIN_CATEGORIES = [
  'Inside Stateroom', 'Oceanview (Window)', 'Oceanview (Porthole)',
  'Balcony', 'Veranda', 'Mini Suite', 'Suite', 'Grand Suite', 'Other',
];

function AddCruiseModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => editing ? {
    name: editing.name || '', shipName: editing.shipName || '', cruiseLine: editing.cruiseLine || '',
    deckNumber: editing.deckNumber || '', cabinCategory: editing.cabinCategory || CRUISE_CABIN_CATEGORIES[0],
    cabinNumber: editing.cabinNumber || '', portOfEmbarkation: editing.portOfEmbarkation || '',
    portOfDisembarkation: editing.portOfDisembarkation || '',
    checkIn: editing.checkIn || '', checkOut: editing.checkOut || '',
    currency: editing.currency || 'INR',
    costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
    sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
    exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
    itinerary: editing.itinerary || '',
    photoUrl: editing.photoUrl || '', mapUrl: editing.mapUrl || '',
    paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
  } : {
    name: '', shipName: '', cruiseLine: '', deckNumber: '', cabinCategory: CRUISE_CABIN_CATEGORIES[0],
    cabinNumber: '', portOfEmbarkation: '', portOfDisembarkation: '',
    checkIn: '', checkOut: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    itinerary: '', photoUrl: '', mapUrl: '', paxPricing: false, paxRates: {},
  });
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true); setErr('');
    try {
      const j = await runAIExtract('cruise', files);
      setForm((f) => ({
        ...f,
        name: j.vendorName || j.cruiseLine || f.name,
        shipName: j.shipName || f.shipName,
        cruiseLine: j.cruiseLine || f.cruiseLine,
        deckNumber: j.deckNumber || f.deckNumber,
        cabinCategory: j.cabinCategory || f.cabinCategory,
        cabinNumber: j.cabinNumber || f.cabinNumber,
        portOfEmbarkation: j.portOfEmbarkation || f.portOfEmbarkation,
        portOfDisembarkation: j.portOfDisembarkation || f.portOfDisembarkation,
        checkIn: j.checkIn || f.checkIn,
        checkOut: j.checkOut || f.checkOut,
        costPrice: j.costPrice != null ? String(j.costPrice) : f.costPrice,
        itinerary: j.itinerary || f.itinerary,
      }));
      setAiSummary('✓ Cruise details extracted — review before saving.');
      window.veToast && window.veToast('Cruise booking extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read — try a clearer scan');
    } finally { setExtracting(false); e.target.value = ''; }
  };

  const submit = async () => {
    if (!form.name.trim() && !form.shipName.trim()) { setErr('Cruise line or ship name required'); return; }
    setSaving(true); setErr('');
    try {
      const vendorFields = {
        name: form.name || form.cruiseLine || form.shipName, shipName: form.shipName, cruiseLine: form.cruiseLine,
        deckNumber: form.deckNumber, cabinCategory: form.cabinCategory, cabinNumber: form.cabinNumber,
        portOfEmbarkation: form.portOfEmbarkation, portOfDisembarkation: form.portOfDisembarkation,
        checkIn: form.checkIn, checkOut: form.checkOut, itinerary: form.itinerary,
        photoUrl: form.photoUrl, mapUrl: form.mapUrl,
        currency: form.currency, costPrice: Number(form.costPrice) || 0, sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };
      if (editing) {
        const updatedList = (deal.cruiseVendors || []).map((c) => c.id === editing.id ? { ...c, ...vendorFields } : c);
        const updated = await patchDeal(deal._id, { cruiseVendors: updatedList });
        window.veToast && window.veToast('Cruise updated ✓', 'success'); onSaved(updated); return;
      }
      const newVendor = { id: 'cr_' + Date.now(), ...vendorFields, payments: [] };
      const updated = await patchDeal(deal._id, { cruiseVendors: [...(deal.cruiseVendors || []), newVendor] });
      window.veToast && window.veToast('Cruise added ✓', 'success'); onSaved(updated);
    } catch (e) { setErr('Could not save — check connection.'); setSaving(false); }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Cruise' : '+ Add Cruise'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      {!editing && (
        <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
            <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
            <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
              {extracting ? 'Reading file…' : 'Scan a cruise booking confirmation — AI fills the form below'}
            </span>
            <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
          </label>
          {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Cruise Line *</div>
          <input value={form.cruiseLine} onChange={set('cruiseLine')} placeholder="e.g. MSC Cruises" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Ship Name</div>
          <input value={form.shipName} onChange={set('shipName')} placeholder="e.g. MSC World Europa" style={inputStyle} />
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Vendor / Agent Name</div>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Akbar Travels" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Cabin Category</div>
          <select value={form.cabinCategory} onChange={set('cabinCategory')} style={inputStyle}>
            {CRUISE_CABIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Deck Number</div>
          <input value={form.deckNumber} onChange={set('deckNumber')} placeholder="e.g. Deck 12" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Cabin Number</div>
          <input value={form.cabinNumber} onChange={set('cabinNumber')} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Port of Embarkation</div>
          <input value={form.portOfEmbarkation} onChange={set('portOfEmbarkation')} placeholder="e.g. Barcelona" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Port of Disembarkation</div>
          <input value={form.portOfDisembarkation} onChange={set('portOfDisembarkation')} placeholder="e.g. Genoa" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Embarkation Date</div>
          <input type="date" value={form.checkIn} onChange={set('checkIn')} style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Disembarkation Date</div>
          <input type="date" value={form.checkOut} onChange={set('checkOut')} style={inputStyle} />
        </div>
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
      <PaxRatesFields form={form} setForm={setForm} />
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Port-by-Port Itinerary</div>
        <textarea value={form.itinerary} onChange={set('itinerary')} rows={4} placeholder="Day 1: Embarkation at Barcelona&#10;Day 2: At Sea&#10;Day 3: Marseille, France" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>🚢 Ship / Cabin Photo</div>
          <div
            onPaste={(e) => {
              const it = Array.from(e.clipboardData.items || []).find((x) => x.type && x.type.indexOf('image') === 0);
              if (it) { e.preventDefault(); const f = it.getAsFile(); if (f) imgToDataURL(f, (d) => setForm((prev) => ({ ...prev, photoUrl: d }))); }
            }}
            style={{ border: '1px dashed #c9a84c', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer', minHeight: 60, background: '#faf7f0' }}
            tabIndex={0}
          >
            {form.photoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <img src={form.photoUrl} alt="ship" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                <button type="button" onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>Remove</button>
              </div>
            ) : (
              <div>
                <label style={{ cursor: 'pointer', fontSize: 11.5, color: '#6b7a99' }}>
                  Paste (Ctrl+V) or{' '}
                  <span style={{ color: '#c9a84c', fontWeight: 600 }}>click to upload</span>
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) imgToDataURL(f, (d) => setForm((prev) => ({ ...prev, photoUrl: d }))); }} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>🗺️ Itinerary / Route Map</div>
          <div
            onPaste={(e) => {
              const it = Array.from(e.clipboardData.items || []).find((x) => x.type && x.type.indexOf('image') === 0);
              if (it) { e.preventDefault(); const f = it.getAsFile(); if (f) imgToDataURL(f, (d) => setForm((prev) => ({ ...prev, mapUrl: d }))); }
            }}
            style={{ border: '1px dashed #0d4f8b', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer', minHeight: 60, background: '#f4f8fc' }}
            tabIndex={0}
          >
            {form.mapUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <img src={form.mapUrl} alt="route map" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                <button type="button" onClick={() => setForm((f) => ({ ...f, mapUrl: '' }))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>Remove</button>
              </div>
            ) : (
              <div>
                <label style={{ cursor: 'pointer', fontSize: 11.5, color: '#6b7a99' }}>
                  Paste (Ctrl+V) or{' '}
                  <span style={{ color: '#0d4f8b', fontWeight: 600 }}>click to upload</span>
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) imgToDataURL(f, (d) => setForm((prev) => ({ ...prev, mapUrl: d }))); }} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

const INSURANCE_POLICY_TYPES = [
  'Comprehensive Travel', 'Trip Cancellation', 'Medical Only',
  'Baggage Loss', 'Adventure Sports Cover', 'Student Travel', 'Senior Citizen', 'Other',
];

function AddInsuranceModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => editing ? {
    name: editing.name || '', policyNumber: editing.policyNumber || '',
    policyType: editing.policyType || INSURANCE_POLICY_TYPES[0],
    coverageAmount: editing.coverageAmount != null ? String(editing.coverageAmount) : '',
    sumInsured: editing.sumInsured || '',
    startDate: editing.startDate || '', endDate: editing.endDate || '',
    coveredTravellers: editing.coveredTravellers != null ? String(editing.coveredTravellers) : '',
    currency: editing.currency || 'INR',
    costPrice: editing.costPrice != null ? String(editing.costPrice) : '',
    sellingPrice: editing.sellingPrice != null ? String(editing.sellingPrice) : '',
    exchangeRate: editing.exchangeRate != null ? String(editing.exchangeRate) : '',
    paxPricing: !!editing.paxPricing, paxRates: editing.paxRates || {},
  } : {
    name: '', policyNumber: '', policyType: INSURANCE_POLICY_TYPES[0],
    coverageAmount: '', sumInsured: '', startDate: '', endDate: '',
    coveredTravellers: '', currency: 'INR', costPrice: '', sellingPrice: '', exchangeRate: '',
    paxPricing: false, paxRates: {},
  });
  const [aiSummary, setAiSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtracting(true); setErr('');
    try {
      const j = await runAIExtract('insurance', files);
      setForm((f) => ({
        ...f,
        name: j.vendorName || f.name,
        policyNumber: j.policyNumber || f.policyNumber,
        policyType: j.policyType || f.policyType,
        coverageAmount: j.coverageAmount != null ? String(j.coverageAmount) : f.coverageAmount,
        sumInsured: j.sumInsured || f.sumInsured,
        startDate: j.startDate || f.startDate,
        endDate: j.endDate || f.endDate,
        coveredTravellers: j.coveredTravellers != null ? String(j.coveredTravellers) : f.coveredTravellers,
        costPrice: (j.costPrice || j.premium) != null ? String(j.costPrice || j.premium) : f.costPrice,
      }));
      setAiSummary('✓ Policy details extracted — review before saving.');
      window.veToast && window.veToast('Insurance details extracted ✓', 'success');
    } catch (ex) {
      setErr(ex.message || 'Could not read — try a clearer scan');
    } finally { setExtracting(false); e.target.value = ''; }
  };

  const submit = async () => {
    if (!form.name.trim()) { setErr('Insurance provider name required'); return; }
    setSaving(true); setErr('');
    try {
      const vendorFields = {
        name: form.name, policyNumber: form.policyNumber, policyType: form.policyType,
        coverageAmount: Number(form.coverageAmount) || 0, sumInsured: form.sumInsured,
        startDate: form.startDate, endDate: form.endDate,
        coveredTravellers: Number(form.coveredTravellers) || 0,
        currency: form.currency, costPrice: Number(form.costPrice) || 0, sellingPrice: Number(form.sellingPrice) || 0,
        exchangeRate: form.currency === 'INR' ? 1 : (Number(form.exchangeRate) || 0),
        paxPricing: form.paxPricing, paxRates: form.paxPricing ? form.paxRates : {},
      };
      if (editing) {
        const updatedList = (deal.insuranceVendors || []).map((i) => i.id === editing.id ? { ...i, ...vendorFields } : i);
        const updated = await patchDeal(deal._id, { insuranceVendors: updatedList });
        window.veToast && window.veToast('Insurance updated ✓', 'success'); onSaved(updated); return;
      }
      const newVendor = { id: 'ins_' + Date.now(), ...vendorFields, payments: [] };
      const updated = await patchDeal(deal._id, { insuranceVendors: [...(deal.insuranceVendors || []), newVendor] });
      window.veToast && window.veToast('Insurance added ✓', 'success'); onSaved(updated);
    } catch (e) { setErr('Could not save — check connection.'); setSaving(false); }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Insurance' : '+ Add Insurance'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      {!editing && (
        <div style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
            <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '✨'}</span>
            <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
              {extracting ? 'Reading file…' : 'Scan an insurance policy document — AI fills the form below'}
            </span>
            <input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={extracting} style={{ display: 'none' }} />
          </label>
          {aiSummary && <div style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>{aiSummary}</div>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Insurance Provider *</div>
          <input value={form.name} onChange={set('name')} placeholder="e.g. TATA AIG" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Policy Number</div>
          <input value={form.policyNumber} onChange={set('policyNumber')} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Policy Type</div>
          <select value={form.policyType} onChange={set('policyType')} style={inputStyle}>
            {INSURANCE_POLICY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Covered Travellers</div>
          <input type="number" value={form.coveredTravellers} onChange={set('coveredTravellers')} placeholder="e.g. 4" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Sum Insured</div>
          <input value={form.sumInsured} onChange={set('sumInsured')} placeholder="e.g. USD 50,000" style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Coverage / Claim Limit</div>
          <input type="number" value={form.coverageAmount} onChange={set('coverageAmount')} placeholder="0" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Coverage Start</div>
          <input type="date" value={form.startDate} onChange={set('startDate')} style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Coverage End</div>
          <input type="date" value={form.endDate} onChange={set('endDate')} style={inputStyle} />
        </div>
      </div>
      <CurrencyCostRow form={form} setForm={setForm} />
      <PaxRatesFields form={form} setForm={setForm} />
    </ModalShell>
  );
}

const REFUND_MODES = ['Bank Transfer', 'UPI', 'Cash'];
const VENDOR_MODES = ['UPI', 'Bank Transfer', 'Cash collected by vendor', 'Cash deposited by us in vendor account', 'Cheque', 'Other'];

// ─── Add a payment to ONE specific vendor line item (e.g. this
// exact hotel booking, not the whole deal). Matches V1: each vendor
// component (flightVendors[i], hotelVendors[i], etc) carries its
// own payments[] array, and "vendor due" = that component's cost
// price minus what's been paid from THIS array — separate from
// deal.clientPayments[] (money FROM the client) which was already
// wired earlier. This is money WE pay OUT to the supplier. ───────

function AddVendorPaymentModal({ deal, arrayKey, vendorId, vendorLabel, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', mode: VENDOR_MODES[0], date: new Date().toISOString().slice(0, 10), note: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true);
    setErr('');
    try {
      const newPayment = { amount: Number(form.amount), mode: form.mode, date: form.date, note: form.note };
      const updatedList = (deal[arrayKey] || []).map((v) =>
        v.id === vendorId ? { ...v, payments: [...(v.payments || []), newPayment] } : v
      );
      const updated = await patchDeal(deal._id, {
        [arrayKey]: updatedList,
        auditLog: [...(deal.auditLog || []), logEntryStatic(`Paid ${vendorLabel}: ₹${Number(form.amount).toLocaleString('en-IN')}`)],
      });
      window.veToast && window.veToast('Vendor payment recorded ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`💸 Pay ${vendorLabel}`} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel="✓ Record Payment">
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Amount Paid (₹) *</div>
        <input type="number" value={form.amount} onChange={set('amount')} placeholder="0" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Mode</div>
          <select value={form.mode} onChange={set('mode')} style={inputStyle}>
            {VENDOR_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
          <input type="date" value={form.date} onChange={set('date')} style={inputStyle} />
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Note</div>
        <input value={form.note} onChange={set('note')} placeholder="e.g. Advance to confirm booking" style={inputStyle} />
      </div>
    </ModalShell>
  );
}

const REFUND_REASONS = ['Service Issue', 'Visa Rejection', 'Travel Plan Cancelled', 'Goodwill / Adjustment', 'Other'];
const REFUND_APPROVERS = ['Vishal Sharma', 'Sahitya Singh'];

function AddRefundModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: '', mode: REFUND_MODES[0], reason: REFUND_REASONS[0], approvedBy: REFUND_APPROVERS[0],
    date: '', refNo: '', note: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true);
    setErr('');
    try {
      const newRefund = {
        amount: Number(form.amount), mode: form.mode, reason: form.reason, approvedBy: form.approvedBy,
        date: form.date || new Date().toISOString().slice(0, 10), refNo: form.refNo, note: form.note,
      };
      const updated = await patchDeal(deal._id, { refunds: [...(deal.refunds || []), newRefund] });
      window.veToast && window.veToast('Refund recorded ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="− Record Refund to Client" onClose={onClose} onSubmit={submit} saving={saving} err={err}>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Amount Refunded (₹) *</div>
        <input type="number" value={form.amount} onChange={set('amount')} placeholder="0" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Mode</div>
          <select value={form.mode} onChange={set('mode')} style={inputStyle}>
            {REFUND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
          <input type="date" value={form.date} onChange={set('date')} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Reason</div>
          <select value={form.reason} onChange={set('reason')} style={inputStyle}>
            {REFUND_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Approved By</div>
          <select value={form.approvedBy} onChange={set('approvedBy')} style={inputStyle}>
            {REFUND_APPROVERS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Reference No. (optional)</div>
        <input value={form.refNo} onChange={set('refNo')} style={inputStyle} />
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Note</div>
        <input value={form.note} onChange={set('note')} placeholder="e.g. Hotel cancelled, partial refund" style={inputStyle} />
      </div>
    </ModalShell>
  );
}

const CANCEL_REASONS = ['Client Request', 'Visa Rejection', 'Medical Emergency', 'Vendor Cancellation', 'Weather / Force Majeure', 'Other'];

function AddCancellationModal({ deal, onClose, onSaved }) {
  const allComponents = useMemo(() => {
    const list = [];
    (deal.flightVendors || []).forEach((v) => list.push({ kind: 'flight', id: v.id, label: `✈ ${v.name || 'Flight'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));
    (deal.trainVendors || []).forEach((v) => list.push({ kind: 'train', id: v.id, label: `🚆 ${v.name || 'Train'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));
    (deal.hotelVendors || []).forEach((v) => list.push({ kind: 'hotel', id: v.id, label: `🏨 ${v.hotelName || 'Hotel'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));
    (deal.visaVendors || []).forEach((v) => list.push({ kind: 'visa', id: v.id, label: `🛂 ${v.name || 'Visa'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));
    (deal.landVendors || []).forEach((v) => list.push({ kind: 'land', id: v.id, label: `🗺 ${v.name || 'Land Package'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));
    (deal.cruiseVendors || []).forEach((v) => list.push({ kind: 'cruise', id: v.id, label: `🚢 ${v.shipName || v.cruiseLine || 'Cruise'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));
    (deal.insuranceVendors || []).forEach((v) => list.push({ kind: 'insurance', id: v.id, label: `🛡 ${v.name || 'Insurance'}`, paxPricing: v.paxPricing, paxRates: v.paxRates, currency: v.currency, exchangeRate: v.exchangeRate }));

    return list;
  }, [deal]);

  const travellerRateKey = (t) => {
    const type = (t.type || 'Adult').toLowerCase();
    if (type.startsWith('child')) return 'child';
    if (type.startsWith('infant')) return 'infant';
    return 'adult';
  };

  const [scope, setScope] = useState('components'); // 'full' | 'components'
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [refundMode, setRefundMode] = useState(REFUND_MODES[0]);
  const [approvedBy, setApprovedBy] = useState(REFUND_APPROVERS[0]);
  const [refNo, setRefNo] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const addLine = () => setLines((ls) => [...ls, {
    id: 'cl_' + Date.now() + '_' + ls.length,
    compKind: '', compId: '', label: '', travellerIds: [],
    vendorRetained: '', vendorPenaltyToClient: '', myProfit: '', clientRefund: '',
  }]);
  const updateLine = (id, key, val) => setLines((ls) => ls.map((l) => l.id === id ? { ...l, [key]: val } : l));
  const removeLine = (id) => setLines((ls) => ls.filter((l) => l.id !== id));
  const toggleLineTraveller = (id, tid) => setLines((ls) => ls.map((l) =>
    l.id === id ? { ...l, travellerIds: (l.travellerIds || []).includes(tid) ? l.travellerIds.filter((x) => x !== tid) : [...(l.travellerIds || []), tid] } : l
  ));

  // Suggest vendor-loss / client-refund from the selected travellers'
  // per-type rates (same lookup V1 uses: traveller.type -> paxRates
  // {adultC/S, childC/S, infantC/S}). This only FILLS the two fields —
  // the person can still adjust before saving, so a misjudged rate
  // never silently becomes the final number.
  const suggestFromPaxRates = (line) => {
    const comp = allComponents.find((c) => c.kind === line.compKind && c.id === line.compId);
    if (!comp || !comp.paxPricing || !(line.travellerIds || []).length) return;
    const travellers = (deal.travellers || []).filter((t) => line.travellerIds.includes(t.id));
    let costSum = 0, sellSum = 0;
    travellers.forEach((t) => {
      const key = travellerRateKey(t);
      costSum += Number((comp.paxRates || {})[key + 'C']) || 0;
      sellSum += Number((comp.paxRates || {})[key + 'S']) || 0;
    });
    const costINRVal = toINR(costSum, comp.currency, comp.exchangeRate);
    const sellINRVal = toINR(sellSum, comp.currency, comp.exchangeRate);
    updateLine(line.id, 'vendorRetained', String(costINRVal));
    updateLine(line.id, 'clientRefund', String(sellINRVal));
    window.veToast && window.veToast(`Suggested from ${travellers.length} traveller rate${travellers.length !== 1 ? 's' : ''} — review before saving`, 'info');
  };

  // Exact same formula as V1's cancelCompute(): what we keep from the
  // client (penalty + our extra profit) minus what we lose to the vendor.
  const netProfitOf = (l) => (Number(l.vendorPenaltyToClient) || 0) + (Number(l.myProfit) || 0) - (Number(l.vendorRetained) || 0);

  const totals = useMemo(() => {
    return lines.reduce((acc, l) => ({
      refund: acc.refund + (Number(l.clientRefund) || 0),
      penalty: acc.penalty + (Number(l.vendorPenaltyToClient) || 0),
      vendorLoss: acc.vendorLoss + (Number(l.vendorRetained) || 0),
      netProfit: acc.netProfit + netProfitOf(l),
    }), { refund: 0, penalty: 0, vendorLoss: 0, netProfit: 0 });
  }, [lines]);

  const submit = async () => {
    if (lines.length === 0) { setErr('Add at least one component line'); return; }
    setSaving(true);
    setErr('');
    try {
      const finalLines = lines.map((l) => ({
        ...l,
        vendorRetained: Number(l.vendorRetained) || 0,
        vendorPenaltyToClient: Number(l.vendorPenaltyToClient) || 0,
        myProfit: Number(l.myProfit) || 0,
        clientRefund: Number(l.clientRefund) || 0,
        netProfit: netProfitOf(l),
      }));
      const newCancellation = {
        id: 'cxl_' + Date.now(),
        scope, reason, date, refundMode, approvedBy, refNo, note,
        status: 'Refund Approved',
        lines: finalLines,
      };
      const updated = await patchDeal(deal._id, {
        cancellations: [...(deal.cancellations || []), newCancellation],
        auditLog: [...(deal.auditLog || []), { title: `Cancellation recorded — ${reason}`, at: new Date().toISOString(), by: 'You' }],
      });
      window.veToast && window.veToast('Cancellation recorded ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="− Record Cancellation" onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel="✓ Record">
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, fontSize: 11.5, color: '#7f1d1d' }}>
        This records the cancellation for accounting/audit purposes with the same
        profit formula V1 uses. It does <b>not</b> automatically change the deal's
        selling price or component costs — reduce or remove the affected
        component yourself (✎ Edit / ✕ Remove) if the booking itself changed.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Scope</div>
          <select value={scope} onChange={(e) => setScope(e.target.value)} style={inputStyle}>
            <option value="components">Specific component(s)</option>
            <option value="full">Full booking</option>
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Reason</div>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
            {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Approved By</div>
          <select value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} style={inputStyle}>
            {REFUND_APPROVERS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e8ecf5', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="v2-detail-field-label" style={{ marginBottom: 0 }}>Affected Components</div>
          <button className="v2-acc-btn-sm" onClick={addLine} type="button">+ Add Line</button>
        </div>
        {lines.length === 0 && <div style={{ fontSize: 12, color: '#6b7a99' }}>No lines added yet.</div>}
        {lines.map((l) => (
          <div key={l.id} style={{ background: '#f9fafc', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8, marginBottom: 8 }}>
              <select
                value={l.compId ? `${l.compKind}|${l.compId}` : ''}
                onChange={(e) => {
                  const [kind, id] = e.target.value.split('|');
                  const comp = allComponents.find((c) => c.kind === kind && c.id === id);
                  updateLine(l.id, 'compKind', kind);
                  updateLine(l.id, 'compId', id);
                  updateLine(l.id, 'label', comp ? comp.label : '');
                }}
                style={{ ...inputStyle, padding: '8px 10px' }}
              >
                <option value="">Select component…</option>
                {allComponents.map((c) => <option key={c.kind + c.id} value={`${c.kind}|${c.id}`}>{c.label}</option>)}
              </select>
              <button onClick={() => removeLine(l.id)} type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            {(() => {
              const comp = allComponents.find((c) => c.kind === l.compKind && c.id === l.compId);
              if (!comp || !comp.paxPricing) return null;
              return (
                <div style={{ background: '#fff', border: '1px solid #e8ecf5', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#c9a84c', marginBottom: 6, letterSpacing: 0.5 }}>WHO'S CANCELLING? (per-traveller rates set on this vendor)</div>
                  {(deal.travellers || []).length === 0 ? (
                    <div style={{ fontSize: 11, color: '#9aa7c4' }}>No travellers added to this deal yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {(deal.travellers || []).map((t) => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, background: (l.travellerIds || []).includes(t.id) ? '#fdf6e5' : '#f4f6fb', border: '1px solid ' + ((l.travellerIds || []).includes(t.id) ? '#ecd9a0' : '#e8ecf5'), borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={(l.travellerIds || []).includes(t.id)} onChange={() => toggleLineTraveller(l.id, t.id)} style={{ margin: 0 }} />
                          {t.firstName || t.salutation || 'Traveller'} ({t.type || 'Adult'})
                        </label>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="v2-acc-btn-sm"
                    disabled={!(l.travellerIds || []).length}
                    onClick={() => suggestFromPaxRates(l)}
                  >✨ Suggest Vendor Loss / Refund from rates</button>
                </div>
              );
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#6b7a99', marginBottom: 4 }}>Vendor Loss (₹)</div>
                <input type="number" value={l.vendorRetained} onChange={(e) => updateLine(l.id, 'vendorRetained', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '7px 10px' }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#6b7a99', marginBottom: 4 }}>Penalty to Client (₹)</div>
                <input type="number" value={l.vendorPenaltyToClient} onChange={(e) => updateLine(l.id, 'vendorPenaltyToClient', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '7px 10px' }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#6b7a99', marginBottom: 4 }}>Extra Profit Kept (₹)</div>
                <input type="number" value={l.myProfit} onChange={(e) => updateLine(l.id, 'myProfit', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '7px 10px' }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#6b7a99', marginBottom: 4 }}>Refund to Client (₹)</div>
                <input type="number" value={l.clientRefund} onChange={(e) => updateLine(l.id, 'clientRefund', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '7px 10px' }} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: netProfitOf(l) >= 0 ? '#059669' : '#dc2626' }}>
              Net {netProfitOf(l) >= 0 ? 'profit' : 'loss'} on this line: {fmtINR(Math.abs(netProfitOf(l)))}
            </div>
          </div>
        ))}
        {lines.length > 0 && (
          <div style={{ background: '#faf7f0', border: '1px solid #c9a84c', borderRadius: 10, padding: 12, fontSize: 12, display: 'grid', gap: 4 }}>
            <div>Total refund to client: <b>{fmtINR(totals.refund)}</b></div>
            <div>Total penalty collected: <b>{fmtINR(totals.penalty)}</b></div>
            <div>Total vendor loss: <b>{fmtINR(totals.vendorLoss)}</b></div>
            <div style={{ color: totals.netProfit >= 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>
              Net {totals.netProfit >= 0 ? 'profit' : 'loss'} from this cancellation: {fmtINR(Math.abs(totals.netProfit))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Refund Mode</div>
          <select value={refundMode} onChange={(e) => setRefundMode(e.target.value)} style={inputStyle}>
            {REFUND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Reference No.</div>
          <input value={refNo} onChange={(e) => setRefNo(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Note</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
      </div>
    </ModalShell>
  );
}

function ScanTicketModal({ deal, onClose, onSaved }) {
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const processFiles = async (files) => {
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
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter((x) => x.type && (x.type.indexOf('image') === 0 || x.type === 'application/pdf'))
      .map((x) => x.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
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
      <div
        tabIndex={0}
        onPaste={handlePaste}
        style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14, cursor: 'text', outline: 'none' }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '🎫'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading ticket…' : 'Click here, then paste (Ctrl+V) — or choose the e-ticket file'}
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

function AddTravellerModal({ deal, editing, onClose, onSaved }) {
  const [form, setForm] = useState(() => editing ? {
    firstName: editing.firstName || '', lastName: editing.lastName || '',
    salutation: editing.salutation || 'Mr', type: editing.type || 'Adult', dob: editing.dob || '',
    idType: editing.idType || 'Passport', passportNo: editing.passportNo || '',
    passportIssue: editing.passportIssue || '', passportExpiry: editing.passportExpiry || '',
    nationality: editing.nationality || 'Indian',
  } : {
    firstName: '', lastName: '', salutation: 'Mr', type: 'Adult', dob: '',
    idType: 'Passport', passportNo: '', passportIssue: '', passportExpiry: '', nationality: 'Indian',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.firstName.trim()) { setErr('First name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      if (editing) {
        const updatedList = (deal.travellers || []).map((t) => t.id === editing.id ? { ...t, ...form } : t);
        const updated = await patchDeal(deal._id, {
          travellers: updatedList,
          auditLog: [...(deal.auditLog || []), logEntryStatic(`Traveller updated: ${form.firstName} ${form.lastName}`)],
        });
        window.veToast && window.veToast('Traveller updated ✓', 'success');
        onSaved(updated);
        return;
      }
      const newTraveller = { id: 'tv_' + Date.now(), isLead: false, ...form };
      const updated = await patchDeal(deal._id, {
        travellers: [...(deal.travellers || []), newTraveller],
        auditLog: [...(deal.auditLog || []), logEntryStatic(`Traveller added: ${form.firstName} ${form.lastName}`)],
      });
      window.veToast && window.veToast('Traveller added ✓', 'success');
      onSaved(updated);
    } catch (e) {
      setErr('Could not save — check connection and try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? '✎ Edit Traveller' : '+ Add Traveller'} onClose={onClose} onSubmit={submit} saving={saving} err={err} submitLabel={editing ? '✓ Save Changes' : '✓ Add'}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Title</div>
          <select value={form.salutation} onChange={set('salutation')} style={inputStyle}>
            {['Mr', 'Mrs', 'Ms', 'Mstr', 'Miss'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>First Name *</div>
          <input value={form.firstName} onChange={set('firstName')} style={inputStyle} />
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Last Name</div>
          <input value={form.lastName} onChange={set('lastName')} placeholder="LNU if none" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Type</div>
          <select value={form.type} onChange={set('type')} style={inputStyle}>
            {['Adult', 'Child', 'Infant'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date of Birth</div>
          <input type="date" value={form.dob} onChange={set('dob')} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>ID Type</div>
          <select value={form.idType} onChange={set('idType')} style={inputStyle}>
            {['Passport', 'Aadhaar', 'Other'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>{form.idType} No.</div>
          <input value={form.passportNo} onChange={set('passportNo')} style={inputStyle} />
        </div>
      </div>
      {form.idType === 'Passport' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Issue Date</div>
            <input type="date" value={form.passportIssue} onChange={set('passportIssue')} style={inputStyle} />
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Expiry Date</div>
            <input type="date" value={form.passportExpiry} onChange={set('passportExpiry')} style={inputStyle} />
          </div>
        </div>
      )}
      <div>
        <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Nationality</div>
        <input value={form.nationality} onChange={set('nationality')} style={inputStyle} />
      </div>
    </ModalShell>
  );
}

function ScanTravellerModal({ deal, onClose, onSaved }) {
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null); // travellers array pending confirmation
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const processFiles = async (files) => {
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
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items || []);
    const files = items
      .filter((x) => x.type && (x.type.indexOf('image') === 0 || x.type === 'application/pdf'))
      .map((x) => x.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      processFiles(files);
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
      <div
        tabIndex={0}
        onPaste={handlePaste}
        style={{ background: '#faf7f0', border: '1px dashed #c9a84c', borderRadius: 10, padding: 14, cursor: 'text', outline: 'none' }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: extracting ? 'wait' : 'pointer' }}>
          <span style={{ fontSize: 20 }}>{extracting ? '⏳' : '🛂'}</span>
          <span style={{ fontSize: 12.5, color: '#0d1b3e', fontWeight: 600 }}>
            {extracting ? 'Reading document(s)…' : 'Click here, then paste (Ctrl+V) — or choose passport/Aadhaar photos'}
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

function DealDetailV2({ deal: initialDeal, allLeads, onBack, onDealUpdated }) {
  const [deal, setDeal] = useState(initialDeal);
  const [modal, setModal] = useState(null); // null | 'flight' | 'hotel' | 'visa' | 'payment' | 'refund' | ...
  const [editingVendor, setEditingVendor] = useState(null); // vendor object being edited, if any
  const [payingVendor, setPayingVendor] = useState(null); // { arrayKey, vendorId, label } for the Pay Vendor modal
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState(null);
  const [savingClient, setSavingClient] = useState(false);
  const [busy, setBusy] = useState(false); // stage-change / delete in flight
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);

  useEffect(() => { setDeal(initialDeal); }, [initialDeal]);

  const handleSaved = (updated) => {
    // Modals each save their own specific field (flightVendors, clientPayments,
    // etc) via patchDeal before calling this — figure out a human label from
    // which modal/edit-vs-add was active, then fire one small follow-up patch
    // to append it to the audit trail. Fire-and-forget: the real save already
    // succeeded, so a logging hiccup shouldn't block the UI or show an error.
    const isEdit = !!editingVendor;
    const labelMap = {
      flight: isEdit ? 'Flight updated' : 'Flight added',
      train: isEdit ? 'Train updated' : 'Train added',
      hotel: isEdit ? 'Hotel updated' : 'Hotel added',
      visa: isEdit ? 'Visa updated' : 'Visa added',
      land: isEdit ? 'Land package updated' : 'Land package added',
      cruise: isEdit ? 'Cruise updated' : 'Cruise added',
      insurance: isEdit ? 'Insurance updated' : 'Insurance added',
      payment: 'Payment recorded',
      refund: 'Refund recorded',
      scanTraveller: 'Traveller(s) scanned from passport/ID',
      ticket: 'E-ticket scanned',
      attachment: 'Document uploaded',
    };
    const label = labelMap[modal];

    setDeal(updated);
    setModal(null);
    setEditingVendor(null);
    setPayingVendor(null);
    onDealUpdated && onDealUpdated(updated);

    if (label) {
      patchDeal(updated._id, { auditLog: [...(updated.auditLog || []), logEntry(label)] })
        .then((withLog) => { setDeal(withLog); onDealUpdated && onDealUpdated(withLog); })
        .catch(() => { /* logging is best-effort — the actual save above already succeeded */ });
    }
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
      const updated = await patchDeal(deal._id, {
        ...clientForm,
        auditLog: [...(deal.auditLog || []), logEntry('Client details updated')],
      });
      window.veToast && window.veToast('Saved ✓', 'success');
      setEditingClient(false);
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
    } catch (e) {
      window.veToast && window.veToast('Could not save — try again', 'warning');
    } finally {
      setSavingClient(false);
    }
  };

  // Small helper so every action that touches the deal leaves a real,
  // timestamped trail — the Activity sidebar reads deal.auditLog directly,
  // no separate log service or backend change needed (Lead schema is
  // already strict:false, so this array just rides along like any other).
  const logEntry = (title) => ({ title, at: new Date().toISOString(), by: 'You' });

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const dataUrl = await fileToDataURI(file);
      const newAttachment = { id: 'att_' + Date.now(), name: file.name, dataUrl, addedAt: new Date().toISOString() };
      const updated = await patchDeal(deal._id, {
        attachments: [...(deal.attachments || []), newAttachment],
        auditLog: [...(deal.auditLog || []), logEntry(`Document uploaded: ${file.name}`)],
      });
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
      window.veToast && window.veToast('Document uploaded ✓', 'success');
    } catch (ex) {
      window.veToast && window.veToast('Could not upload — try again', 'warning');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const removeAttachment = async (attId) => {
    if (!window.confirm('Remove this document?')) return;
    setBusy(true);
    try {
      const filtered = (deal.attachments || []).filter((a) => a.id !== attId);
      const updated = await patchDeal(deal._id, {
        attachments: filtered,
        auditLog: [...(deal.auditLog || []), logEntry('Document removed')],
      });
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
      window.veToast && window.veToast('Document removed', 'success');
    } catch (ex) {
      window.veToast && window.veToast('Could not remove — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const deletePayment = async (payment) => {
    if (!window.confirm('Delete this payment record? This does not undo the payment itself — use it only to fix a mistaken entry.')) return;
    setBusy(true);
    try {
      const idx = (deal.clientPayments || []).indexOf(payment);
      const filtered = (deal.clientPayments || []).filter((_, i) => i !== idx);
      const updated = await patchDeal(deal._id, {
        clientPayments: filtered,
        auditLog: [...(deal.auditLog || []), logEntry('Payment record deleted')],
      });
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
      window.veToast && window.veToast('Payment deleted', 'success');
    } catch (ex) {
      window.veToast && window.veToast('Could not delete — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const deleteRefund = async (refund) => {
    if (!window.confirm('Delete this refund record? This does not undo the refund itself — use it only to fix a mistaken entry.')) return;
    setBusy(true);
    try {
      const idx = (deal.refunds || []).indexOf(refund);
      const filtered = (deal.refunds || []).filter((_, i) => i !== idx);
      const updated = await patchDeal(deal._id, {
        refunds: filtered,
        auditLog: [...(deal.auditLog || []), logEntry('Refund record deleted')],
      });
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
      window.veToast && window.veToast('Refund deleted', 'success');
    } catch (ex) {
      window.veToast && window.veToast('Could not delete — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const deleteCancellation = async (cancellation) => {
    if (!window.confirm('Delete this cancellation record? This is just a recording tool — deleting it does not change anything already booked, refunded, or charged.')) return;
    setBusy(true);
    try {
      const filtered = (deal.cancellations || []).filter((c) => c.id !== cancellation.id);
      const updated = await patchDeal(deal._id, {
        cancellations: filtered,
        auditLog: [...(deal.auditLog || []), logEntry('Cancellation record deleted')],
      });
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
      window.veToast && window.veToast('Cancellation record deleted', 'success');
    } catch (ex) {
      window.veToast && window.veToast('Could not delete — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  // ─── Tiered pricing (3★/4★/5★ stay options) ────────────
  // Same shape V1 uses: deal.tiers[] with {star, label, enabled, booked,
  // hotels[], totalPrice}. bookedTierOf()/sellINR() already read this —
  // marking a tier 'booked' here is what actually drives the deal's
  // selling price once tiered pricing is switched on, exactly like V1.
  const defaultTiersV2 = () => ([
    { id: 'tier_3', star: 3, label: '3-Star', enabled: false, booked: false, hotels: [], totalPrice: '' },
    { id: 'tier_4', star: 4, label: '4-Star', enabled: false, booked: false, hotels: [], totalPrice: '' },
    { id: 'tier_5', star: 5, label: '5-Star', enabled: false, booked: false, hotels: [], totalPrice: '' },
  ]);

  const patchTiers = async (nextTiers, nextUseTiers, activityLabel) => {
    setSavingTiers(true);
    try {
      const updated = await patchDeal(deal._id, {
        tiers: nextTiers,
        useTiers: nextUseTiers,
        auditLog: activityLabel ? [...(deal.auditLog || []), logEntry(activityLabel)] : (deal.auditLog || []),
      });
      setDeal(updated);
      onDealUpdated && onDealUpdated(updated);
    } catch (ex) {
      window.veToast && window.veToast('Could not save — try again', 'warning');
    } finally {
      setSavingTiers(false);
    }
  };

  const toggleUseTiers = () => {
    const next = !deal.useTiers;
    const tiers = (deal.tiers && deal.tiers.length) ? deal.tiers : defaultTiersV2();
    patchTiers(tiers, next, next ? 'Switched to tiered pricing' : 'Switched off tiered pricing');
  };

  const updateTier = (tierId, key, val) => {
    const next = (deal.tiers || []).map((t) => t.id === tierId ? { ...t, [key]: val } : t);
    patchTiers(next, deal.useTiers, null);
  };

  const markTierBooked = (tierId) => {
    const next = (deal.tiers || []).map((t) => ({ ...t, booked: t.id === tierId }));
    const booked = next.find((t) => t.id === tierId);
    patchTiers(next, deal.useTiers, `Booked the ${booked?.label || 'selected'} option`);
  };

  const addTierHotel = (tierId) => {
    const next = (deal.tiers || []).map((t) => t.id === tierId
      ? { ...t, hotels: [...(t.hotels || []), { id: 'th_' + Date.now(), hotelName: '', city: '', photoUrl: '', roomCategory: '' }] }
      : t);
    patchTiers(next, deal.useTiers, null);
  };

  const updateTierHotel = (tierId, hotelId, key, val) => {
    const next = (deal.tiers || []).map((t) => t.id === tierId
      ? { ...t, hotels: (t.hotels || []).map((h) => h.id === hotelId ? { ...h, [key]: val } : h) }
      : t);
    patchTiers(next, deal.useTiers, null);
  };

  const removeTierHotel = (tierId, hotelId) => {
    const next = (deal.tiers || []).map((t) => t.id === tierId
      ? { ...t, hotels: (t.hotels || []).filter((h) => h.id !== hotelId) }
      : t);
    patchTiers(next, deal.useTiers, null);
  };

  const changeStage = async (newStage, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const updated = await patchDeal(deal._id, {
        stage: newStage,
        status: newStage,
        auditLog: [...(deal.auditLog || []), logEntry(`Deal marked ${newStage}`)],
      });
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
      const updated = await patchDeal(deal._id, {
        [arrayKey]: filtered,
        auditLog: [...(deal.auditLog || []), logEntry(`${label[0].toUpperCase()}${label.slice(1)} removed`)],
      });
      window.veToast && window.veToast(`${label} removed`, 'success');
      handleSaved(updated);
    } catch (e) {
      window.veToast && window.veToast('Could not remove — try again', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const linkedDeals = useMemo(() => {
    if (!deal.enquiryId) return [deal];
    const others = (allLeads || []).filter((l) => l.enquiryId === deal.enquiryId && l._id !== deal._id);
    return [deal, ...others];
  }, [deal, allLeads]);

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
  const refunded = refundedINR(deal);
  const netSell = sell - refunded;
  const profit = netSell - cost;
  const marginPct = netSell > 0 ? Math.round((profit / netSell) * 1000) / 10 : 0;
  const balance = netSell - paid;
  const collectionPct = netSell > 0 ? Math.round((paid / netSell) * 1000) / 10 : 0;

  const isVIP = (deal.priority === 'High' || deal.priority === 'Urgent');
  const isBooked = isBookedStage(deal);

  const flights = deal.flightVendors || [];
  const trains = deal.trainVendors || [];
  const hotels = deal.hotelVendors || [];
  const visas = deal.visaVendors || [];
  const cruises = deal.cruiseVendors || [];
  const insurances = deal.insuranceVendors || [];
  const payments = deal.clientPayments || [];
  const refunds = deal.refunds || [];
  const travellers = deal.travellers || [];
  const landPackages = deal.landVendors || [];

  const askAI = async () => {
    setAiLoading(true);
    setAiInsight('');
    try {
      const summary = [
        `Client: ${clientName(deal)}`,
        `Destination: ${destination(deal) || 'not set'}`,
        `Travel dates: ${deal.travelDates || 'not set'}`,
        `Stage: ${stageOf(deal)}`,
        `Selling price: ₹${sell}`,
        `Vendor cost: ₹${cost}`,
        `Profit: ₹${profit} (${marginPct}% margin)`,
        `Client paid so far: ₹${paid}`,
        `Balance due: ₹${balance}`,
        `Components: ${flights.length} flight(s), ${trains.length} train(s), ${hotels.length} hotel(s), ${visas.length} visa(s), ${landPackages.length} land package(s)`,
        `Travellers on file: ${travellers.length}`,
      ].join('\n');
      const res = await fetch(`${apiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: 'You are a sharp travel-agency deal analyst. Given a deal summary, respond with 2-4 short, concrete, actionable bullet points (start each with "•") — flag margin risk, missing balance collection, missing components (e.g. no visa added yet for an international destination), or anything that looks off. No preamble, no sign-off, just the bullets. Keep each bullet under 20 words.',
          messages: [{ role: 'user', content: summary }],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error((data.error && (data.error.message || data.error)) || 'AI error');
      const text = (data.content || []).map((c) => c.text || '').join('').trim();
      setAiInsight(text || 'No specific concerns — deal looks fine.');
    } catch (e) {
      window.veToast && window.veToast('Could not get AI insight — try again', 'warning');
    } finally {
      setAiLoading(false);
    }
  };

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
            <button className="v2-hero-btn" onClick={() => setModal('link')}>🔗 Link Destinations</button>
            {linkedDeals.length > 1 && (
              <button className="v2-hero-btn" onClick={() => openCombinedProposalV2(linkedDeals)}>📚 Combined Proposal ({linkedDeals.length})</button>
            )}
            <button className="v2-hero-btn gold" onClick={() => openProposalV2(deal)}>📄 Proposal PDF</button>
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
          <div className="v2-fin-sub">{refunded > 0 ? `Net of ${fmtINRFull(refunded)} refunded` : 'Client final quote'}</div>
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

      {/* Stay Options (Tiered Pricing) */}
      <div className="v2-acc" style={{ marginBottom: 24 }}>
        <div className="v2-acc-head">
          <div className="v2-acc-icon">🏆</div>
          <div className="v2-acc-title-block">
            <h3 className="v2-acc-title">Stay Options (3★ / 4★ / 5★)</h3>
            <div className="v2-acc-meta">
              {deal.useTiers ? 'Tiered pricing is ON — the booked tier sets the selling price' : 'Off — selling price comes from individual components'}
            </div>
          </div>
          <div className="v2-acc-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#33446b', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!deal.useTiers} onChange={toggleUseTiers} disabled={savingTiers} />
              Use tiered pricing
            </label>
          </div>
        </div>
        {deal.useTiers && (
          <div className="v2-acc-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {(deal.tiers && deal.tiers.length ? deal.tiers : defaultTiersV2()).map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: t.booked ? '2px solid #c9a84c' : '1px solid #e8ecf5',
                    borderRadius: 14, padding: 16,
                    background: t.booked ? '#faf7f0' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: '#0d1b3e', fontSize: 14 }}>{'★'.repeat(t.star)} {t.label}</div>
                    {t.booked && <span className="v2-chip vip">BOOKED</span>}
                  </div>

                  {(t.hotels || []).map((h) => (
                    <div key={h.id} style={{ background: '#f9fafc', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      {h.photoUrl && <img src={h.photoUrl} alt={h.hotelName} style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
                      <input
                        value={h.hotelName}
                        onChange={(e) => updateTierHotel(t.id, h.id, 'hotelName', e.target.value)}
                        placeholder="Hotel name"
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, marginBottom: 6 }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={h.city}
                          onChange={(e) => updateTierHotel(t.id, h.id, 'city', e.target.value)}
                          placeholder="City"
                          style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, flex: 1 }}
                        />
                        <button onClick={() => removeTierHotel(t.id, h.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                      <div
                        onPaste={(e) => {
                          const it = Array.from(e.clipboardData.items || []).find((x) => x.type && x.type.indexOf('image') === 0);
                          if (it) {
                            e.preventDefault();
                            const f = it.getAsFile();
                            if (f) imgToDataURL(f, (d) => updateTierHotel(t.id, h.id, 'photoUrl', d));
                          }
                        }}
                        tabIndex={0}
                        style={{ fontSize: 10.5, color: '#6b7a99', marginTop: 6, cursor: 'text', border: '1px dashed #d4dcec', borderRadius: 6, padding: 6, textAlign: 'center' }}
                      >
                        {h.photoUrl ? 'Click, paste to replace photo' : 'Click here, paste (Ctrl+V) a photo'}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addTierHotel(t.id)} className="v2-acc-btn-sm" style={{ width: '100%', marginBottom: 10 }}>+ Add Hotel</button>

                  <div className="v2-detail-field-label" style={{ marginBottom: 4 }}>Total Price (₹)</div>
                  <input
                    type="number"
                    value={t.totalPrice}
                    onChange={(e) => updateTier(t.id, 'totalPrice', e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />

                  <button
                    onClick={() => markTierBooked(t.id)}
                    disabled={savingTiers || t.booked}
                    className={t.booked ? 'v2-acc-btn-sm' : 'v2-acc-btn-primary'}
                    style={{ width: '100%' }}
                  >
                    {t.booked ? '✓ This is booked' : 'Mark as Booked'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="v2-acc-btn-sm" onClick={() => { setEditingVendor(null); setModal('traveller'); }}>+ Add</button>
                    <button className="v2-acc-btn-sm" onClick={() => setModal('scanTraveller')}>🛂 Scan Passport / ID</button>
                  </div>
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setEditingVendor(t); setModal('traveller'); }}
                            disabled={busy}
                            style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 13 }}
                          >✎</button>
                          <button
                            onClick={() => deleteVendor('travellers', t.id, 'traveller')}
                            disabled={busy}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                          >✕</button>
                        </div>
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
                    <button className="v2-acc-btn-primary" onClick={() => openProposalV2(deal)}>📄 Proposal PDF</button>
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
                  const fCost = toINR(f.costPrice, f.currency, f.exchangeRate);
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
                          onClick={() => { setEditingVendor(f); setModal('flight'); }}
                          disabled={busy}
                          title="Edit"
                          style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✎</button>
                        <button
                          onClick={() => deleteVendor('flightVendors', f.id, 'flight')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}
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
                      {fCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${fPaid >= fCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (fPaid / fCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(fPaid)}</b> / {fmtINRFull(fCost)}</span>
                            <span className={`v2-pay-status ${fPaid >= fCost ? 'paid' : 'due'}`}>
                              {fPaid >= fCost ? '✓ Fully Paid' : `${fmtINRFull(fCost - fPaid)} due`}
                            </span>
                            <button
                              className="v2-acc-btn-sm"
                              onClick={() => { setPayingVendor({ arrayKey: 'flightVendors', vendorId: f.id, label: f.name || 'Flight' }); setModal('payVendor'); }}
                            >💸 Pay</button>
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
                  const tCost = toINR(t.costPrice, t.currency, t.exchangeRate);
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
                          onClick={() => { setEditingVendor(t); setModal('train'); }}
                          disabled={busy}
                          title="Edit"
                          style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✎</button>
                        <button
                          onClick={() => deleteVendor('trainVendors', t.id, 'train')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}
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
                      {tCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${tPaid >= tCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (tPaid / tCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(tPaid)}</b> / {fmtINRFull(tCost)}</span>
                            <span className={`v2-pay-status ${tPaid >= tCost ? 'paid' : 'due'}`}>
                              {tPaid >= tCost ? '✓ Fully Paid' : `${fmtINRFull(tCost - tPaid)} due`}
                            </span>
                            <button
                              className="v2-acc-btn-sm"
                              onClick={() => { setPayingVendor({ arrayKey: 'trainVendors', vendorId: t.id, label: t.name || 'Train' }); setModal('payVendor'); }}
                            >💸 Pay</button>
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
                  const hCost = toINR(h.costPrice, h.currency, h.exchangeRate);
                  const hPaid = sumBy(h.payments, 'amount');
                  return (
                    <div key={h.id || i} className="v2-hotel-card">
                      <div className="v2-hotel-head">
                        {h.photoUrl ? (
                          <img src={h.photoUrl} alt={h.hotelName} style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                        ) : (
                          <div className="v2-hotel-code">{(h.hotelName || 'H').slice(0, 2).toUpperCase()}</div>
                        )}
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
                          onClick={() => { setEditingVendor(h); setModal('hotel'); }}
                          disabled={busy}
                          title="Edit"
                          style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✎</button>
                        <button
                          onClick={() => deleteVendor('hotelVendors', h.id, 'hotel')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}
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
                      {hCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${hPaid >= hCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (hPaid / hCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(hPaid)}</b> / {fmtINRFull(hCost)}</span>
                            <span className={`v2-pay-status ${hPaid >= hCost ? 'paid' : 'due'}`}>
                              {hPaid >= hCost ? '✓ Fully Paid' : `${fmtINRFull(hCost - hPaid)} due`}
                            </span>
                            <button
                              className="v2-acc-btn-sm"
                              onClick={() => { setPayingVendor({ arrayKey: 'hotelVendors', vendorId: h.id, label: h.hotelName || 'Hotel' }); setModal('payVendor'); }}
                            >💸 Pay</button>
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
                  const vCost = toINR(v.costPrice, v.currency, v.exchangeRate);
                  const vPaid = sumBy(v.payments, 'amount');
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
                          onClick={() => { setEditingVendor(v); setModal('visa'); }}
                          disabled={busy}
                          title="Edit"
                          style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✎</button>
                        <button
                          onClick={() => deleteVendor('visaVendors', v.id, 'visa')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}
                        >✕</button>
                      </div>
                      {vCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${vPaid >= vCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (vPaid / vCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(vPaid)}</b> / {fmtINRFull(vCost)}</span>
                            <span className={`v2-pay-status ${vPaid >= vCost ? 'paid' : 'due'}`}>
                              {vPaid >= vCost ? '✓ Fully Paid' : `${fmtINRFull(vCost - vPaid)} due`}
                            </span>
                            <button
                              className="v2-acc-btn-sm"
                              onClick={() => { setPayingVendor({ arrayKey: 'visaVendors', vendorId: v.id, label: v.name || 'Visa' }); setModal('payVendor'); }}
                            >💸 Pay</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Land Package / Itinerary */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">🗺</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Land Package / Itinerary</h3>
                <div className="v2-acc-meta">
                  {landPackages.length > 0 ? `${landPackages.length} ${landPackages.length === 1 ? 'package' : 'packages'}` : 'None added yet'}
                </div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-primary" onClick={() => setModal('land')}>+ Add Land Package</button>
              </div>
            </div>
            {landPackages.length > 0 && (
              <div className="v2-acc-body">
                {landPackages.map((l, i) => {
                  const lSell = toINR(l.sellingPrice, l.currency, l.exchangeRate);
                  const lCost = toINR(l.costPrice, l.currency, l.exchangeRate);
                  const lPaid = sumBy(l.payments, 'amount');
                  return (
                    <div key={l.id || i} className="v2-hotel-card">
                      <div className="v2-hotel-head">
                        <div className="v2-hotel-code">{(l.name || 'LD').slice(0, 2).toUpperCase()}</div>
                        <div className="v2-hotel-info">
                          <div className="v2-hotel-name">{l.name || 'Land Package'}</div>
                          <div className="v2-hotel-meta">{l.confirmationNo ? `Confirmation: ${l.confirmationNo}` : 'DMC / Land Vendor'}</div>
                        </div>
                        <div className="v2-hotel-price">
                          <div className="v2-hotel-price-val">{fmtINRFull(lSell)}</div>
                        </div>
                        <button
                          onClick={() => { setEditingVendor(l); setModal('land'); }}
                          disabled={busy}
                          title="Edit"
                          style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}
                        >✎</button>
                        <button
                          onClick={() => deleteVendor('landVendors', l.id, 'land package')}
                          disabled={busy}
                          title="Remove"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}
                        >✕</button>
                      </div>
                      {l.itinerary && (
                        <div style={{ background: '#f9fafc', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, color: '#33446b', whiteSpace: 'pre-line', lineHeight: 1.6, marginTop: 12 }}>
                          {l.itinerary}
                        </div>
                      )}
                      {lCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${lPaid >= lCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (lPaid / lCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(lPaid)}</b> / {fmtINRFull(lCost)}</span>
                            <span className={`v2-pay-status ${lPaid >= lCost ? 'paid' : 'due'}`}>
                              {lPaid >= lCost ? '✓ Fully Paid' : `${fmtINRFull(lCost - lPaid)} due`}
                            </span>
                            <button
                              className="v2-acc-btn-sm"
                              onClick={() => { setPayingVendor({ arrayKey: 'landVendors', vendorId: l.id, label: l.name || 'Land Package' }); setModal('payVendor'); }}
                            >💸 Pay</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cruise */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">🚢</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Cruise</h3>
                <div className="v2-acc-meta">{cruises.length} booking{cruises.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-primary" onClick={() => setModal('cruise')}>+ Add Cruise</button>
              </div>
            </div>
            {cruises.length > 0 && (
              <div className="v2-acc-body">
                {cruises.map((c, i) => {
                  const cCost = toINR(c.costPrice, c.currency, c.exchangeRate);
                  const cSell = toINR(c.sellingPrice, c.currency, c.exchangeRate);
                  const cPaid = sumBy(c.payments, 'amount');
                  return (
                    <div key={c.id || i} className="v2-hotel-card">
                      {(c.photoUrl || c.mapUrl) && (
                        <div style={{ display: 'flex', gap: 10, padding: '14px 14px 0' }}>
                          {c.photoUrl && <img src={c.photoUrl} alt={c.shipName || 'Cruise'} style={{ flex: 1, maxHeight: 180, objectFit: 'cover', borderRadius: 10, background: '#f4f7fc' }} onerror="this.style.display='none'" />}
                          {c.mapUrl && <img src={c.mapUrl} alt="Route map" style={{ flex: 1, maxHeight: 180, objectFit: 'contain', borderRadius: 10, background: '#f4f8fc' }} onerror="this.style.display='none'" />}
                        </div>
                      )}
                      <div className="v2-hotel-head">
                        <div className="v2-hotel-code" style={{ background: '#0d4f8b' }}>🚢</div>
                        <div className="v2-hotel-info">
                          <div className="v2-hotel-name">{c.shipName || c.cruiseLine || 'Cruise Ship'}</div>
                          <div className="v2-hotel-meta">{c.cabinCategory} · Deck {c.deckNumber || '—'} · Cabin {c.cabinNumber || '—'}</div>
                          <div className="v2-hotel-meta">{c.portOfEmbarkation || '—'} → {c.portOfDisembarkation || '—'} · {c.checkIn || ''} → {c.checkOut || ''}</div>
                        </div>
                        <div className="v2-hotel-price">
                          <div className="v2-hotel-price-val">{fmtINRFull(cSell)}</div>
                        </div>
                        <button onClick={() => { setEditingVendor(c); setModal('cruise'); }} disabled={busy} title="Edit" style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}>✎</button>
                        <button onClick={() => deleteVendor('cruiseVendors', c.id, 'cruise')} disabled={busy} title="Remove" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}>✕</button>
                      </div>
                      {c.itinerary && (
                        <div style={{ padding: '10px 14px', fontSize: 12, color: '#5a6b8c', borderTop: '1px solid #f0f2f7', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{c.itinerary}</div>
                      )}
                      {cCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${cPaid >= cCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (cPaid / cCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(cPaid)}</b> / {fmtINRFull(cCost)}</span>
                            <span className={`v2-pay-status ${cPaid >= cCost ? 'paid' : 'due'}`}>{cPaid >= cCost ? '✓ Fully Paid' : `${fmtINRFull(cCost - cPaid)} due`}</span>
                            <button className="v2-acc-btn-sm" onClick={() => { setPayingVendor({ arrayKey: 'cruiseVendors', vendorId: c.id, label: c.shipName || 'Cruise' }); setModal('payVendor'); }}>💸 Pay</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Insurance */}
          <div className="v2-acc">
            <div className="v2-acc-head">
              <div className="v2-acc-icon">🛡️</div>
              <div className="v2-acc-title-block">
                <h3 className="v2-acc-title">Insurance</h3>
                <div className="v2-acc-meta">{insurances.length} polic{insurances.length !== 1 ? 'ies' : 'y'}</div>
              </div>
              <div className="v2-acc-actions">
                <button className="v2-acc-btn-primary" onClick={() => setModal('insurance')}>+ Add Insurance</button>
              </div>
            </div>
            {insurances.length > 0 && (
              <div className="v2-acc-body">
                {insurances.map((ins, i) => {
                  const insCost = toINR(ins.costPrice, ins.currency, ins.exchangeRate);
                  const insSell = toINR(ins.sellingPrice, ins.currency, ins.exchangeRate);
                  const insPaid = sumBy(ins.payments, 'amount');
                  return (
                    <div key={ins.id || i} className="v2-hotel-card">
                      <div className="v2-hotel-head">
                        <div className="v2-hotel-code" style={{ background: '#059669' }}>🛡</div>
                        <div className="v2-hotel-info">
                          <div className="v2-hotel-name">{ins.name || 'Insurance'}</div>
                          <div className="v2-hotel-meta">{ins.policyType} · Policy: {ins.policyNumber || '—'}</div>
                          <div className="v2-hotel-meta">{ins.startDate || '—'} → {ins.endDate || '—'} · {ins.coveredTravellers || '—'} traveller{Number(ins.coveredTravellers) !== 1 ? 's' : ''} · Sum: {ins.sumInsured || '—'}</div>
                        </div>
                        <div className="v2-hotel-price">
                          <div className="v2-hotel-price-val">{fmtINRFull(insSell)}</div>
                        </div>
                        <button onClick={() => { setEditingVendor(ins); setModal('insurance'); }} disabled={busy} title="Edit" style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 14, marginLeft: 8, alignSelf: 'flex-start' }}>✎</button>
                        <button onClick={() => deleteVendor('insuranceVendors', ins.id, 'insurance')} disabled={busy} title="Remove" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-start' }}>✕</button>
                      </div>
                      {insCost > 0 && (
                        <div className="v2-pay-bar">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Vendor Payment</div>
                          <div className="v2-pay-progress">
                            <div className={`v2-pay-progress-fill ${insPaid >= insCost ? '' : 'amber'}`} style={{ width: `${Math.min(100, (insPaid / insCost) * 100)}%` }}></div>
                          </div>
                          <div className="v2-pay-row">
                            <span>Paid to vendor: <b>{fmtINRFull(insPaid)}</b> / {fmtINRFull(insCost)}</span>
                            <span className={`v2-pay-status ${insPaid >= insCost ? 'paid' : 'due'}`}>{insPaid >= insCost ? '✓ Fully Paid' : `${fmtINRFull(insCost - insPaid)} due`}</span>
                            <button className="v2-acc-btn-sm" onClick={() => { setPayingVendor({ arrayKey: 'insuranceVendors', vendorId: ins.id, label: ins.name || 'Insurance' }); setModal('payVendor'); }}>💸 Pay</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {modal === 'flight' && (
            <AddFlightModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'land' && (
            <AddLandModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'cruise' && (
            <AddCruiseModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'insurance' && (
            <AddInsuranceModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'ticket' && <ScanTicketModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'train' && (
            <AddTrainModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'traveller' && (
            <AddTravellerModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'scanTraveller' && <ScanTravellerModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'hotel' && (
            <AddHotelModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'visa' && (
            <AddVisaModal
              deal={deal}
              editing={editingVendor}
              onClose={() => { setModal(null); setEditingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'payment' && <AddPaymentModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'refund' && <AddRefundModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'payVendor' && payingVendor && (
            <AddVendorPaymentModal
              deal={deal}
              arrayKey={payingVendor.arrayKey}
              vendorId={payingVendor.vendorId}
              vendorLabel={payingVendor.label}
              onClose={() => { setModal(null); setPayingVendor(null); }}
              onSaved={handleSaved}
            />
          )}
          {modal === 'cancellation' && <AddCancellationModal deal={deal} onClose={() => setModal(null)} onSaved={handleSaved} />}
          {modal === 'link' && <LinkDestinationsModal deal={deal} allLeads={allLeads} onClose={() => setModal(null)} onSaved={handleSaved} />}
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
            {aiInsight && (
              <div className="v2-ai-body" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.15)', whiteSpace: 'pre-line' }}>
                {aiInsight}
              </div>
            )}
            <button className="v2-ai-cta" onClick={askAI} disabled={aiLoading}>
              {aiLoading ? '⏳ Thinking…' : '+ Ask AI about this deal'}
            </button>
          </div>

          {(deal.cancellations || []).length > 0 && (
            <div className="v2-side-card">
              <div className="v2-side-panel-head">
                <span className="v2-side-panel-title">Cancellations</span>
                <button
                  onClick={() => setModal('cancellation')}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                >+ Record</button>
              </div>
              {deal.cancellations.map((c) => {
                const netProfit = (c.lines || []).reduce((s, l) => s + (Number(l.netProfit) || 0), 0);
                const refund = (c.lines || []).reduce((s, l) => s + (Number(l.clientRefund) || 0), 0);
                return (
                  <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f4f7fc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d1b3e' }}>{c.reason}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: netProfit >= 0 ? '#059669' : '#dc2626' }}>
                          {netProfit >= 0 ? '+' : '−'} {fmtINR(Math.abs(netProfit))}
                        </div>
                        <button
                          onClick={() => deleteCancellation(c)}
                          disabled={busy}
                          title="Delete this record"
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                        >✕</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>
                      {c.date} · {(c.lines || []).length} component{(c.lines || []).length !== 1 ? 's' : ''} · Refund {fmtINR(refund)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {(deal.cancellations || []).length === 0 && (
            <div className="v2-side-card">
              <div className="v2-side-panel-head">
                <span className="v2-side-panel-title">Cancellations</span>
                <button
                  onClick={() => setModal('cancellation')}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                >+ Record</button>
              </div>
              <div style={{ fontSize: 12, color: '#6b7a99', padding: '8px 0' }}>No cancellations recorded.</div>
            </div>
          )}

          <div className="v2-side-card">
            <div className="v2-side-panel-head">
              <span className="v2-side-panel-title">Payment Schedule</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setModal('refund')}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                >− Refund</button>
                <button
                  onClick={() => setModal('payment')}
                  style={{ background: 'none', border: 'none', color: '#c9a84c', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                >+ Add</button>
              </div>
            </div>
            {payments.length === 0 && refunds.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7a99', padding: '8px 0' }}>
                No payments recorded yet.
              </div>
            ) : (
              <>
                {payments.slice(0, 5).map((p, i) => (
                  <div key={'p' + i} className="v2-schedule-row">
                    <div>
                      <div className="v2-schedule-milestone">{p.note || p.mode || 'Payment'}</div>
                      <div className="v2-schedule-date">{p.date || ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="v2-schedule-amount">
                        <div className="v2-schedule-amount-val">{fmtINR(p.amount || 0)}</div>
                        <div className="v2-schedule-status paid">Paid</div>
                      </div>
                      <button
                        onClick={() => deletePayment(p)}
                        disabled={busy}
                        title="Delete this payment"
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                      >✕</button>
                    </div>
                  </div>
                ))}
                {refunds.map((r, i) => (
                  <div key={'r' + i} className="v2-schedule-row">
                    <div>
                      <div className="v2-schedule-milestone">{r.note || r.reason || 'Refund'}</div>
                      <div className="v2-schedule-date">{r.date || ''} {r.approvedBy ? `· ${r.approvedBy}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="v2-schedule-amount">
                        <div className="v2-schedule-amount-val" style={{ color: '#dc2626' }}>− {fmtINR(r.amount || 0)}</div>
                        <div className="v2-schedule-status due">Refunded</div>
                      </div>
                      <button
                        onClick={() => deleteRefund(r)}
                        disabled={busy}
                        title="Delete this refund"
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </>
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
              <span className="v2-side-panel-title">Documents</span>
              <label style={{ background: 'none', border: 'none', color: '#c9a84c', fontWeight: 600, fontSize: 11, cursor: uploadingDoc ? 'wait' : 'pointer' }}>
                {uploadingDoc ? '⏳ …' : '+ Upload'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleAttachmentUpload}
                  disabled={uploadingDoc}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {(deal.attachments || []).length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7a99', padding: '8px 0' }}>No documents uploaded yet.</div>
            ) : (
              (deal.attachments || []).map((a, i) => (
                <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < (deal.attachments.length - 1) ? '1px solid #f4f7fc' : 'none' }}>
                  <a href={a.dataUrl} download={a.name} style={{ fontSize: 12, color: '#0d1b3e', fontWeight: 500, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    📎 {a.name}
                  </a>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    disabled={busy}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                  >✕</button>
                </div>
              ))
            )}
          </div>

          <div className="v2-side-card">
            <div className="v2-side-panel-head">
              <span className="v2-side-panel-title">Activity</span>
            </div>
            {(deal.auditLog || []).length === 0 ? (
              deal.createdAt ? (
                <div className="v2-activity-item">
                  <div className="v2-activity-dot"></div>
                  <div className="v2-activity-body">
                    <div className="v2-activity-title">Deal created</div>
                    <div className="v2-activity-meta">{new Date(deal.createdAt).toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#6b7a99', padding: '8px 0' }}>No activity recorded yet.</div>
              )
            ) : (
              [...deal.auditLog].slice(-12).reverse().map((a, i) => (
                <div className="v2-activity-item" key={i}>
                  <div className={`v2-activity-dot ${i === 0 ? 'navy' : ''}`}></div>
                  <div className="v2-activity-body">
                    <div className="v2-activity-title">{a.title}</div>
                    <div className="v2-activity-meta">{timeAgo(a.at)}{a.by ? ` · ${a.by}` : ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── CLIENTS — unique clients aggregated from leads/deals ─ */

function ClientsV2({ leads, onDealClick }) {
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);

  const clients = useMemo(() => {
    const map = new Map();
    leads.forEach((l) => {
      const key = (l.contactNo || clientName(l) || l._id).trim();
      if (!map.has(key)) {
        map.set(key, {
          key, name: clientName(l), phone: l.contactNo || '', email: l.email || '',
          deals: [], totalValue: 0, totalPaid: 0, bookedCount: 0,
        });
      }
      const c = map.get(key);
      c.deals.push(l);
      c.totalValue += sellINR(l);
      c.totalPaid += paidINR(l);
      if (isBookedStage(l)) c.bookedCount++;
      if (l.contactNo && !c.phone) c.phone = l.contactNo;
      if (l.email && !c.email) c.email = l.email;
    });
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [leads]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(search));
  }, [clients, search]);

  const selected = filtered.find((c) => c.key === selectedKey) || filtered[0] || null;

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Clients</h1>
          <p className="v2-page-sub">Every client derived from your leads &amp; deals · {clients.length} total</p>
        </div>
      </div>

      <div className="v2-filter-bar">
        <input type="text" className="v2-filter-search" placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="v2-leads-layout">
        <div className="v2-leads-list">
          <div className="v2-leads-list-head">
            <h3 className="v2-leads-list-title">All Clients <span className="v2-leads-count">{filtered.length}</span></h3>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>No clients found.</div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.key}
                className={`v2-lead-card ${selected && selected.key === c.key ? 'selected' : ''}`}
                onClick={() => setSelectedKey(c.key)}
              >
                <div className="v2-lead-avatar" style={{ background: avatarGradient(c.name) }}>{initialsOf(c.name)}</div>
                <div className="v2-lead-main">
                  <div className="v2-lead-namerow">
                    <span className="v2-lead-name">{c.name}</span>
                    {c.bookedCount > 0 && <span className="v2-chip vip">{c.bookedCount} BOOKED</span>}
                  </div>
                  <div>
                    {c.phone && <span className="v2-lead-phone">{c.phone}</span>}
                    {c.email && <span className="v2-lead-source">{c.email}</span>}
                  </div>
                  <div className="v2-lead-trip">{c.deals.length} {c.deals.length === 1 ? 'enquiry/deal' : 'enquiries/deals'} on file</div>
                </div>
                <div className="v2-lead-meta">
                  <div className="v2-lead-value">{fmtINR(c.totalValue)}</div>
                  <div className="v2-lead-time">{fmtINR(c.totalPaid)} paid</div>
                </div>
              </div>
            ))
          )}
        </div>

        {selected && (
          <div className="v2-lead-detail">
            <div className="v2-detail-head">
              <div className="v2-detail-head-top">
                <span className="v2-detail-head-chip">Client</span>
              </div>
              <h2 className="v2-detail-name">{selected.name}</h2>
              {selected.phone && <div className="v2-detail-phone">{selected.phone}</div>}
            </div>
            <div className="v2-detail-body">
              <div className="v2-detail-section-title">All Deals &amp; Enquiries</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {selected.deals.map((d) => (
                  <div
                    key={d._id}
                    onClick={() => onDealClick(d)}
                    style={{ cursor: 'pointer', background: '#f9fafc', borderRadius: 8, padding: '10px 12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b style={{ fontSize: 12.5 }}>{destination(d) || 'Enquiry'}</b>
                      <span style={{ fontSize: 12, color: '#0d1b3e', fontWeight: 700 }}>{fmtINR(sellINR(d))}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 3 }}>{stageOf(d)} · {d.travelDates || 'Dates flexible'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── PROPOSALS — leads that have been quoted, not yet booked ─ */

function ProposalsV2({ leads, onDealClick }) {
  const proposals = useMemo(() => {
    return leads
      .filter((l) => !isBookedStage(l) && !isCancelledStage(l) && sellINR(l) > 0)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [leads]);

  const totalValue = proposals.reduce((s, l) => s + sellINR(l), 0);

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Proposals</h1>
          <p className="v2-page-sub">Quoted enquiries awaiting a decision · {proposals.length} open · {fmtINR(totalValue)} pipeline</p>
        </div>
      </div>

      <div className="v2-leads-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="v2-lead-kpi rate">
          <div className="v2-lead-kpi-label">Open Proposals</div>
          <div className="v2-lead-kpi-value">{proposals.length}</div>
          <div className="v2-lead-kpi-sub">Quoted, not yet booked</div>
        </div>
        <div className="v2-lead-kpi converted">
          <div className="v2-lead-kpi-label">Pipeline Value</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalValue)}</div>
          <div className="v2-lead-kpi-sub">If all convert</div>
        </div>
        <div className="v2-lead-kpi warm">
          <div className="v2-lead-kpi-label">Avg. Quote Value</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(proposals.length ? totalValue / proposals.length : 0)}</div>
          <div className="v2-lead-kpi-sub">Per proposal</div>
        </div>
      </div>

      <div className="v2-leads-list">
        <div className="v2-leads-list-head">
          <h3 className="v2-leads-list-title">All Proposals <span className="v2-leads-count">{proposals.length}</span></h3>
        </div>
        {proposals.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>No open proposals — quote a lead to see it here.</div>
        ) : (
          proposals.map((l) => (
            <div key={l._id} className="v2-lead-card" onClick={() => onDealClick(l)}>
              <div className="v2-lead-avatar" style={{ background: avatarGradient(clientName(l)) }}>{initialsOf(clientName(l))}</div>
              <div className="v2-lead-main">
                <div className="v2-lead-namerow">
                  <span className="v2-lead-name">{clientName(l)}</span>
                  <span className={`v2-chip ${categorize(l)}`}>{stageOf(l)}</span>
                </div>
                <div className="v2-lead-trip">{flagOf(destination(l))} {destination(l) || 'Enquiry'} · {l.travelDates || 'Dates flexible'}</div>
              </div>
              <div className="v2-lead-meta">
                <div className="v2-lead-value">{fmtINR(sellINR(l))}</div>
                <div className="v2-lead-time">{timeAgo(l.updatedAt || l.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

/* ─── VENDORS — aggregated from every vendor entry across deals ─ */

/* ─── Vendor contact notes — new in V2, doesn't exist in V1.
   V1 has no supplier master-data table at all; this is a genuinely
   new, lightweight addition (phone/email/notes per vendor name),
   stored the same way Accounts is — localStorage, this device only.
   Not synced with V1 since V1 has nothing to sync with. ─────────── */
const VENDOR_NOTES_KEY = 'voyage_v2_vendor_notes';
const loadVendorNotes = () => {
  try { return JSON.parse(localStorage.getItem(VENDOR_NOTES_KEY) || '{}'); } catch { return {}; }
};
const saveVendorNotes = (n) => {
  try { localStorage.setItem(VENDOR_NOTES_KEY, JSON.stringify(n)); } catch { /* ignore */ }
};

function VendorsV2({ leads }) {
  const [notes, setNotes] = useState(loadVendorNotes);
  const [editingVendor, setEditingVendorNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ phone: '', email: '', notes: '' });

  const vendors = useMemo(() => {
    const map = new Map();
    const categories = [
      ['flightVendors', 'Flight'], ['hotelVendors', 'Hotel'], ['trainVendors', 'Train'],
      ['landVendors', 'Land'], ['visaVendors', 'Visa'],
      ['cruiseVendors', 'Cruise'], ['insuranceVendors', 'Insurance'],
    ];
    leads.forEach((l) => {
      categories.forEach(([key, label]) => {
        (l[key] || []).forEach((v) => {
          const name = (v.name || v.hotelName || 'Unnamed').trim();
          const mapKey = label + '|' + name;
          if (!map.has(mapKey)) map.set(mapKey, { name, category: label, cost: 0, paid: 0, bookings: 0 });
          const entry = map.get(mapKey);
          entry.cost += toINR(v.costPrice, v.currency, v.exchangeRate);
          entry.paid += sumBy(v.payments, 'amount');
          entry.bookings += 1;
        });
      });
    });
    return Array.from(map.values()).map((v) => ({ ...v, due: Math.max(0, v.cost - v.paid) })).sort((a, b) => b.due - a.due);
  }, [leads]);

  const totalDue = vendors.reduce((s, v) => s + v.due, 0);
  const totalPaidOut = vendors.reduce((s, v) => s + v.paid, 0);

  const openNote = (vendorName) => {
    setEditingVendorNote(vendorName);
    setNoteForm(notes[vendorName] || { phone: '', email: '', notes: '' });
  };

  const saveNote = () => {
    const next = { ...notes, [editingVendor]: noteForm };
    setNotes(next);
    saveVendorNotes(next);
    setEditingVendorNote(null);
    window.veToast && window.veToast('Vendor contact saved ✓', 'success');
  };

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Vendors</h1>
          <p className="v2-page-sub">Every supplier used across your deals, ranked by total spend</p>
        </div>
      </div>

      <div className="v2-leads-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="v2-lead-kpi converted">
          <div className="v2-lead-kpi-label">Total Vendors</div>
          <div className="v2-lead-kpi-value">{vendors.length}</div>
          <div className="v2-lead-kpi-sub">Used across all deals</div>
        </div>
        <div className="v2-lead-kpi hot" style={{ borderLeftColor: '#059669' }}>
          <div className="v2-lead-kpi-label">Paid Out</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalPaidOut)}</div>
          <div className="v2-lead-kpi-sub">Across all vendors</div>
        </div>
        <div className="v2-lead-kpi warm">
          <div className="v2-lead-kpi-label">Still Owed</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalDue)}</div>
          <div className="v2-lead-kpi-sub">Pending to suppliers</div>
        </div>
      </div>

      <div className="v2-panel">
        <div className="v2-panel-header">
          <h3 className="v2-panel-title">All Vendors <span style={{ fontWeight: 400, fontSize: 13, color: '#6b7a99' }}>({vendors.length})</span></h3>
          {vendors.length > 0 && (
            <button className="v2-view-all" onClick={() => downloadCSV('vendors.csv', [
              ['Vendor', 'Category', 'Bookings', 'Total Cost (INR)', 'Paid (INR)', 'Due (INR)', 'Phone', 'Email', 'Notes'],
              ...vendors.map((v) => {
                const n = notes[v.name] || {};
                return [v.name, v.category, v.bookings, v.cost, v.paid, v.due, n.phone || '', n.email || '', n.notes || ''];
              }),
            ])}>⬇ Export CSV</button>
          )}
        </div>
        {vendors.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>No vendor entries yet — add flights/hotels/etc. to deals to see them here.</div>
        ) : (
          <table className="info" style={{ width: '100%' }}>
            <thead>
              <tr><th>Vendor</th><th>Category</th><th style={{ textAlign: 'center' }}>Bookings</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Due</th><th>Contact</th><th></th></tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => {
                const n = notes[v.name];
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#0d1b3e' }}>{v.name}</td>
                    <td><span className="v2-detail-tag" style={{ background: '#f4f6fb', color: '#33446b' }}>{v.category}</span></td>
                    <td style={{ textAlign: 'center' }}>{v.bookings}</td>
                    <td style={{ textAlign: 'right' }}>{fmtINR(v.cost)}</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>{fmtINR(v.paid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: v.due > 0 ? '#dc2626' : '#9aa7c4' }}>{v.due > 0 ? fmtINR(v.due) : 'Settled'}</td>
                    <td style={{ fontSize: 12, color: '#6b7a99' }}>
                      {n ? (<>{n.phone && <div>{n.phone}</div>}{n.email && <div>{n.email}</div>}</>) : <span style={{ color: '#c4cede' }}>—</span>}
                    </td>
                    <td>
                      <button onClick={() => openNote(v.name)} className="v2-acc-btn-sm" style={{ padding: '4px 10px', fontSize: 11 }}>
                        {n ? '✎ Edit' : '+ Add contact'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingVendor && (
        <ModalShell
          title={`Contact — ${editingVendor}`}
          onClose={() => setEditingVendorNote(null)}
          onSubmit={saveNote}
          saving={false}
          err=""
          submitLabel="✓ Save"
        >
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Phone</div>
            <input value={noteForm.phone} onChange={(e) => setNoteForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Email</div>
            <input value={noteForm.email} onChange={(e) => setNoteForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Notes</div>
            <textarea value={noteForm.notes} onChange={(e) => setNoteForm((f) => ({ ...f, notes: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </ModalShell>
      )}
    </main>
  );
}

/* ─── VISA FILINGS — every visa entry across all deals ──── */

function VisaFilingsV2({ leads, onDealClick }) {
  const [filter, setFilter] = useState('all');

  const filings = useMemo(() => {
    const rows = [];
    leads.forEach((l) => {
      (l.visaVendors || []).forEach((v) => {
        rows.push({
          deal: l, name: v.name || 'Visa', status: v.visaStatus || 'Not Applied',
          cost: toINR(v.sellingPrice, v.currency, v.exchangeRate),
        });
      });
    });
    return rows;
  }, [leads]);

  const filtered = filter === 'all' ? filings : filings.filter((f) => f.status === filter);
  const counts = useMemo(() => {
    const c = { 'Not Applied': 0, Applied: 0, Approved: 0, Rejected: 0 };
    filings.forEach((f) => { if (c[f.status] !== undefined) c[f.status]++; });
    return c;
  }, [filings]);

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Visa Filings</h1>
          <p className="v2-page-sub">Every visa application across all deals · {filings.length} total</p>
        </div>
      </div>

      <div className="v2-filter-bar">
        <button className={`v2-filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All <span className="count">{filings.length}</span></button>
        {Object.entries(counts).map(([status, count]) => (
          <button key={status} className={`v2-filter-chip ${filter === status ? 'active' : ''}`} onClick={() => setFilter(status)}>
            {status} <span className="count">{count}</span>
          </button>
        ))}
      </div>

      <div className="v2-leads-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>No visa filings in this category.</div>
        ) : (
          filtered.map((f, i) => {
            const statusColor = { 'Not Applied': 'cold', Applied: 'warm', Approved: 'ok', Rejected: 'hot' }[f.status] || 'cold';
            return (
              <div key={i} className="v2-lead-card" onClick={() => onDealClick(f.deal)}>
                <div className="v2-lead-avatar" style={{ background: avatarGradient(clientName(f.deal)) }}>{initialsOf(clientName(f.deal))}</div>
                <div className="v2-lead-main">
                  <div className="v2-lead-namerow">
                    <span className="v2-lead-name">{clientName(f.deal)}</span>
                    <span className={`v2-chip ${statusColor === 'ok' ? 'booked' : statusColor}`}>{f.status}</span>
                  </div>
                  <div className="v2-lead-trip">{f.name} · {flagOf(destination(f.deal))} {destination(f.deal) || ''}</div>
                </div>
                <div className="v2-lead-meta">
                  <div className="v2-lead-value">{fmtINR(f.cost)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

/* ─── TASKS — real backend-persisted to-do list ─────────── */

function TasksV2({ tasks, leads, refetch }) {
  const [showNew, setShowNew] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ title: '', dueDate: '', dealId: '', priority: 'Normal' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('open');

  const filtered = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => !t.done);
    if (filter === 'done') return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const toggleDone = async (task) => {
    try {
      const res = await fetch(`${apiBase()}/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ done: !task.done }),
      });
      if (!res.ok) throw new Error();
      refetch();
    } catch {
      window.veToast && window.veToast('Could not update task', 'warning');
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${apiBase()}/api/tasks/${task._id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      refetch();
    } catch {
      window.veToast && window.veToast('Could not delete task', 'warning');
    }
  };

  const openNew = () => {
    setEditingTask(null);
    setForm({ title: '', dueDate: '', dealId: '', priority: 'Normal' });
    setShowNew(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '', dueDate: task.dueDate || '',
      dealId: task.dealId || '', priority: task.priority || 'Normal',
    });
    setShowNew(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) { window.veToast && window.veToast('Task title is required', 'warning'); return; }
    setSaving(true);
    try {
      const isEdit = !!editingTask;
      const res = await fetch(
        `${apiBase()}/api/tasks${isEdit ? '/' + editingTask._id : ''}`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error();
      window.veToast && window.veToast(isEdit ? 'Task updated ✓' : 'Task added ✓', 'success');
      setForm({ title: '', dueDate: '', dealId: '', priority: 'Normal' });
      setEditingTask(null);
      setShowNew(false);
      refetch();
    } catch {
      window.veToast && window.veToast('Could not save task', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const dealLabel = (dealId) => {
    const d = leads.find((l) => l._id === dealId);
    return d ? `${clientName(d)} — ${destination(d) || 'Enquiry'}` : '';
  };

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Tasks</h1>
          <p className="v2-page-sub">Reminders and to-dos, optionally linked to a deal</p>
        </div>
        <div className="v2-header-actions">
          <button className="v2-cta" onClick={openNew}>+ New Task</button>
        </div>
      </div>

      <div className="v2-filter-bar">
        <button className={`v2-filter-chip ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open <span className="count">{tasks.filter((t) => !t.done).length}</span></button>
        <button className={`v2-filter-chip ${filter === 'done' ? 'active' : ''}`} onClick={() => setFilter('done')}>Done <span className="count">{tasks.filter((t) => t.done).length}</span></button>
        <button className={`v2-filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All <span className="count">{tasks.length}</span></button>
      </div>

      <div className="v2-leads-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>Nothing here.</div>
        ) : (
          filtered.map((t) => (
            <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f4f7fc' }}>
              <input type="checkbox" checked={!!t.done} onChange={() => toggleDone(t)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openEdit(t)}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.done ? '#6b7a99' : '#0d1b3e', textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>
                  {t.dueDate ? `Due ${t.dueDate}` : 'No due date'}{t.dealId ? ` · ${dealLabel(t.dealId)}` : ''}
                </div>
              </div>
              {t.priority && t.priority !== 'Normal' && <span className={`v2-chip ${t.priority === 'High' || t.priority === 'Urgent' ? 'hot' : 'warm'}`}>{t.priority}</span>}
              <button onClick={() => openEdit(t)} title="Edit" style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 13 }}>✎</button>
              <button onClick={() => deleteTask(t)} title="Delete" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
          ))
        )}
      </div>

      {showNew && (
        <ModalShell
          title={editingTask ? '✎ Edit Task' : '+ New Task'}
          onClose={() => { setShowNew(false); setEditingTask(null); }}
          onSubmit={saveTask}
          saving={saving}
          err=""
          submitLabel={editingTask ? '✓ Save Changes' : '✓ Add'}
        >
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Task *</div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Follow up on Vietnam quote" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Due Date</div>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Priority</div>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                {['Low', 'Normal', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Link to Deal (optional)</div>
            <select value={form.dealId} onChange={(e) => setForm((f) => ({ ...f, dealId: e.target.value }))} style={inputStyle}>
              <option value="">None</option>
              {leads.slice(0, 100).map((l) => (
                <option key={l._id} value={l._id}>{clientName(l)} — {destination(l) || 'Enquiry'}</option>
              ))}
            </select>
          </div>
        </ModalShell>
      )}
    </main>
  );
}

/* ─── ACCOUNTS — reads/writes the SAME localStorage V1 uses
   (key: travelcrm_accounts). Not MongoDB-backed in V1 either, so
   this is a genuine shared data source, not a simplified copy —
   editing a cash location here shows up in V1 immediately and
   vice versa, same browser/device. ───────────────────────────── */

const ACCOUNTS_KEY = 'travelcrm_accounts';
const defaultAccountsV2 = () => ({
  bankBalance: '',
  cashLocations: [],
  ledger: [],
  recurring: [], // {id, name, amount, kind, dayOfMonth, lastMaterialized: 'YYYY-MM'}
  frozenMonths: {}, // {"2026-07": {unlocked:true, unlockedAt, unlockedBy}} — same shape as V1
  commitments: [], // {id, date, note, amount, status:'open'|'done', resolvedAt}
});
const loadAccountsV2 = () => {
  try {
    const v = localStorage.getItem(ACCOUNTS_KEY);
    return v ? { ...defaultAccountsV2(), ...JSON.parse(v) } : defaultAccountsV2();
  } catch { return defaultAccountsV2(); }
};
const saveAccountsV2 = (a) => {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
};

function AccountsV2({ leads }) {
  const [accounts, setAccounts] = useState(loadAccountsV2);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({ date: new Date().toISOString().slice(0, 10), kind: 'expense', party: '', amount: '', note: '' });
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [advChat, setAdvChat] = useState([]); // {role:'user'|'assistant', content, suggestData?}
  const [advInput, setAdvInput] = useState('');
  const [advBusy, setAdvBusy] = useState(false);

  const persist = (updater) => {
    setAccounts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveAccountsV2(next);
      return next;
    });
  };

  const totalCash = (accounts.cashLocations || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const bankBalance = Number(accounts.bankBalance) || 0;

  // Real, live figures from actual deal data — not something stored
  // separately, so this always reflects the current MongoDB state.
  const bookedDeals = leads.filter(isBookedStage);
  const totalReceived = bookedDeals.reduce((s, d) => s + paidINR(d), 0);
  const totalOwedToVendors = bookedDeals.reduce((s, d) => {
    const vendors = dealVendors(d);
    const paidToVendors = vendors.reduce((vs, v) => vs + sumBy(v.payments, 'amount'), 0);
    const cost = vendors.reduce((vs, v) => vs + toINR(v.costPrice, v.currency, v.exchangeRate), 0);
    return s + Math.max(0, cost - paidToVendors);
  }, 0);

  const addCashLoc = () => persist((a) => ({ ...a, cashLocations: [...(a.cashLocations || []), { id: 'cl_' + Date.now(), name: 'New location', amount: '', note: '' }] }));
  const updCashLoc = (id, key, val) => persist((a) => ({ ...a, cashLocations: (a.cashLocations || []).map((c) => c.id === id ? { ...c, [key]: val } : c) }));
  const rmCashLoc = (id) => persist((a) => ({ ...a, cashLocations: (a.cashLocations || []).filter((c) => c.id !== id) }));

  const addLedgerEntry = () => {
    if (!ledgerForm.amount || Number(ledgerForm.amount) <= 0) { window.veToast && window.veToast('Enter a valid amount', 'warning'); return; }
    const mk = ledgerForm.date ? ledgerForm.date.slice(0, 7) : '';
    const nowKeyCheck = new Date().toISOString().slice(0, 7);
    const lockedCheck = mk && mk < nowKeyCheck && !((accounts.frozenMonths || {})[mk] || {}).unlocked;
    if (lockedCheck) { window.veToast && window.veToast(`${mk} is locked — unlock it first (below) to add entries there`, 'warning'); return; }
    persist((a) => ({
      ...a,
      ledger: [...(a.ledger || []), { id: 'lg_' + Date.now(), ...ledgerForm, amount: Number(ledgerForm.amount), source: 'manual' }],
    }));
    setLedgerForm({ date: new Date().toISOString().slice(0, 10), kind: 'expense', party: '', amount: '', note: '' });
    setShowLedgerForm(false);
    window.veToast && window.veToast('Ledger entry added ✓', 'success');
  };
  const rmLedgerEntry = (id) => persist((a) => ({ ...a, ledger: (a.ledger || []).filter((l) => l.id !== id) }));

  // Recurring expenses/income — templates the person fires manually each
  // month (no server-side cron on a static site, so "automatic" would be
  // dishonest — this is a one-click "run this month's recurring items"
  // instead, which is safe and predictable).
  const currentMonthKey = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const addRecurring = () => persist((a) => ({
    ...a,
    recurring: [...(a.recurring || []), { id: 'rc_' + Date.now(), name: 'New recurring item', amount: '', kind: 'expense', dayOfMonth: 1, lastMaterialized: '' }],
  }));
  const updRecurring = (id, key, val) => persist((a) => ({
    ...a,
    recurring: (a.recurring || []).map((r) => r.id === id ? { ...r, [key]: val } : r),
  }));
  const rmRecurring = (id) => persist((a) => ({ ...a, recurring: (a.recurring || []).filter((r) => r.id !== id) }));

  const pendingRecurring = (accounts.recurring || []).filter((r) => r.lastMaterialized !== currentMonthKey && Number(r.amount) > 0);

  const runRecurringThisMonth = () => {
    if (!pendingRecurring.length) { window.veToast && window.veToast('Nothing pending for this month', 'info'); return; }
    persist((a) => {
      const newEntries = pendingRecurring.map((r) => ({
        id: 'lg_' + Date.now() + '_' + r.id,
        date: new Date().toISOString().slice(0, 10),
        kind: r.kind, party: r.name, amount: Number(r.amount), note: 'Recurring — auto-added',
        source: 'recurring',
      }));
      return {
        ...a,
        ledger: [...(a.ledger || []), ...newEntries],
        recurring: (a.recurring || []).map((r) =>
          pendingRecurring.find((p) => p.id === r.id) ? { ...r, lastMaterialized: currentMonthKey } : r
        ),
      };
    });
    window.veToast && window.veToast(`${pendingRecurring.length} recurring item${pendingRecurring.length !== 1 ? 's' : ''} added to ledger ✓`, 'success');
  };

  const sortedLedger = [...(accounts.ledger || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // ── Frozen months — same concept as V1: any ledger row dated in a
  // PAST month (before the current calendar month) is locked/read-only
  // by default, so closed books can't be silently edited later. Unlike
  // V1 (which re-checks the login password to unlock), V2 uses a plain
  // confirm() — V1 itself is single-login (admin/admin123) so that
  // re-check was already more of a deliberate "are you sure" pause than
  // a real access-control barrier; a confirm dialog achieves the same
  // friction without wiring a fresh auth round-trip.
  const monthKeyOf = (dateStr) => {
    if (!dateStr) return '';
    const [y, m] = String(dateStr).split('-');
    return y && m ? `${y}-${m}` : '';
  };
  const nowKey = new Date().toISOString().slice(0, 7);
  const isPastMonth = (mk) => !!mk && mk < nowKey;
  const isRowLocked = (row) => {
    const mk = monthKeyOf(row.date);
    if (!isPastMonth(mk)) return false;
    const st = (accounts.frozenMonths || {})[mk];
    return !st || !st.unlocked;
  };
  const unlockMonth = (mk) => {
    if (!window.confirm(`Unlock ${mk}? Past-month ledger entries become editable again until you re-lock it.`)) return;
    persist((a) => ({
      ...a,
      frozenMonths: { ...(a.frozenMonths || {}), [mk]: { unlocked: true, unlockedAt: new Date().toISOString() } },
    }));
    window.veToast && window.veToast(`${mk} unlocked ✓`, 'success');
  };
  const relockMonth = (mk) => {
    persist((a) => {
      const f = { ...(a.frozenMonths || {}) };
      delete f[mk];
      return { ...a, frozenMonths: f };
    });
    window.veToast && window.veToast(`${mk} re-locked`, 'success');
  };
  const lockedPastMonths = Array.from(new Set(
    (accounts.ledger || []).map((l) => monthKeyOf(l.date)).filter(isPastMonth)
  )).sort().reverse();

  // ── Commitments — a plain running list of financial to-dos/promises
  // ("pay the Bali DMC balance", "return security deposit to X") so
  // nothing gets forgotten between now and when it's actually settled.
  // V1 pairs this with a conversational AI salary-advisor that reads
  // this list before suggesting a founder salary split — that chat
  // flow is a fair bit more machinery for a fairly personal decision;
  // the tracking list itself (the part with clear, safe, everyday
  // value) is what's built here.
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [commitForm, setCommitForm] = useState({ note: '', amount: '', date: new Date().toISOString().slice(0, 10) });
  const addCommitment = () => {
    if (!commitForm.note.trim()) { window.veToast && window.veToast('Enter what this commitment is', 'warning'); return; }
    persist((a) => ({
      ...a,
      commitments: [...(a.commitments || []), { id: 'cm_' + Date.now(), ...commitForm, amount: Number(commitForm.amount) || 0, status: 'open' }],
    }));
    setCommitForm({ note: '', amount: '', date: new Date().toISOString().slice(0, 10) });
    setShowCommitForm(false);
    window.veToast && window.veToast('Commitment added ✓', 'success');
  };
  const resolveCommitment = (id) => persist((a) => ({
    ...a,
    commitments: (a.commitments || []).map((c) => c.id === id ? { ...c, status: 'done', resolvedAt: new Date().toISOString() } : c),
  }));
  const removeCommitment = (id) => persist((a) => ({ ...a, commitments: (a.commitments || []).filter((c) => c.id !== id) }));
  const openCommitments = (accounts.commitments || []).filter((c) => c.status === 'open');

  // ── AI Salary/Close Advisor — same exact system prompt and context
  // shape as V1's ADV_SYS, rebuilt against V2's data (bookedDeals via
  // isBookedStage, balanceINR for receivables, cost-per-vendor-minus-
  // paid for payables). Ported verbatim rather than paraphrased: the
  // rules about ONLY paying salary from cash+bank (never unarrived
  // client money), always checking urgent vendor payments and open
  // commitments first, are the actual financial-safety logic — not
  // something to risk rewording.
  const ADV_SYS = `You are the financial advisor for Voyage-Ed Travels, a two-founder travel agency. You help Vishal decide monthly salary safely.

You are given a JSON context with: cashInHand (total cash across locations), bankBalance, receivablesTotal (money coming from booked clients), payablesTotal (money going to vendors on booked deals), payablesByDeal (each upcoming vendor payment with dealNumber, client, vendor, amount), thisMonthCommitted (already spent this month), openCommitments (previous urgent items you asked about, with their status), today.

RULES:
- Salary ONLY comes from cash-in-hand and bank — NEVER from money that hasn't arrived yet from clients.
- Before suggesting salary amounts, ALWAYS ask if there are any urgent vendor payments due in the next 3 days. List candidate vendors from payablesByDeal so the user can confirm.
- When user answers, note which of those are urgent + how they'll be arranged (client payment coming, use cash, delay, etc.) and echo back: "Yaad rakhunga: [list]".
- If openCommitments is non-empty and any status is 'open', ASK FIRST about those before anything else: "Pichli baar aapne bola tha X — wo sort hua? kese?".
- Only after urgent-vendor and open-commitments check, propose salary split: Vishal ₹___, Sahitya ₹___, Balance in Company ₹___. Base on cash+bank minus urgent-vendor need. Be conservative.
- Speak Hinglish, short and clear. Ask ONE thing at a time.

Reply ONLY in these two shapes:
{"type":"ask","reply":"Hinglish question","newCommitments":[{"kind":"urgent-vendor|other","note":"","dealNumber":"","amount":0,"status":"open"}]}
{"type":"suggest","summary":"one line","vishalSalary":number,"sahityaSalary":number,"balance":number,"reasoning":"1-2 line why","newCommitments":[...]}

If it's the first turn, ALWAYS start with type "ask" — never suggest salary until you've confirmed there are no urgent vendor payments and no open commitments.`;

  const advSend = async (msg) => {
    const text = (msg || advInput || '').trim();
    if (!text) return;
    const history = [...advChat, { role: 'user', content: text }];
    setAdvChat(history);
    setAdvInput('');
    setAdvBusy(true);
    try {
      const bookedDeals = leads.filter(isBookedStage);
      const cashInHand = (accounts.cashLocations || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const bankBalance = Number(accounts.bankBalance) || 0;
      const receivablesTotal = bookedDeals.reduce((s, d) => s + Math.max(0, balanceINR(d)), 0);
      const payablesByDeal = [];
      bookedDeals.forEach((d) => {
        const vs = [
          ...(d.hotelVendors || []).map((v) => ({ ...v, _k: 'Hotel', _n: v.hotelName || v.name })),
          ...(d.flightVendors || []).map((v) => ({ ...v, _k: 'Flight', _n: v.name })),
          ...(d.trainVendors || []).map((v) => ({ ...v, _k: 'Train', _n: v.name })),
          ...(d.landVendors || []).map((v) => ({ ...v, _k: 'Land', _n: v.name })),
          ...(d.visaVendors || []).map((v) => ({ ...v, _k: 'Visa', _n: v.name })),
          ...(d.cruiseVendors || []).map((v) => ({ ...v, _k: 'Cruise', _n: v.shipName || v.cruiseLine || v.name })),
          ...(d.insuranceVendors || []).map((v) => ({ ...v, _k: 'Insurance', _n: v.name })),
        ];
        vs.forEach((v) => {
          const cost = toINR(v.costPrice, v.currency, v.exchangeRate);
          const paid = sumBy(v.payments, 'amount');
          const bal = cost - paid;
          if (bal > 0.5) payablesByDeal.push({ dealNumber: d.dealNumber, client: clientName(d), vendor: v._n, kind: v._k, amount: Math.round(bal), travelDate: d.travelDates || '' });
        });
      });
      const payablesTotal = payablesByDeal.reduce((s, p) => s + p.amount, 0);
      const now3 = new Date();
      const mkNow = `${now3.getFullYear()}-${String(now3.getMonth() + 1).padStart(2, '0')}`;
      const thisMonthCommitted = (accounts.ledger || []).filter((r) => String(r.date).startsWith(mkNow) && ['expense', 'salary', 'gst'].includes(r.kind)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const ctx = { today: now3.toISOString().slice(0, 10), cashInHand, bankBalance, receivablesTotal, payablesTotal, payablesByDeal, thisMonthCommitted, openCommitments };

      const msgs = [{ role: 'user', content: 'CONTEXT:\n' + JSON.stringify(ctx) }, ...history.map((m) => ({ role: m.role, content: m.content }))];
      const res = await fetch(`${apiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: ADV_SYS, messages: msgs }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error((data.error && (data.error.message || data.error)) || 'AI error');
      const raw = ((data.content || []).map((c) => c.text || '').join('') || '').replace(/```json|```/g, '').trim();
      let j;
      try { j = JSON.parse(raw); } catch { throw new Error("AI ka jawab samajh nahi aaya"); }

      if (Array.isArray(j.newCommitments) && j.newCommitments.length) {
        persist((a) => ({
          ...a,
          commitments: [...(a.commitments || []), ...j.newCommitments.map((nc) => ({ id: 'cm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), date: new Date().toISOString().slice(0, 10), status: 'open', ...nc }))],
        }));
      }

      if (j.type === 'suggest') {
        setAdvChat((h) => [...h, {
          role: 'assistant',
          content: `💡 ${j.summary || 'Suggestion'}\n\nVishal salary: ₹${(j.vishalSalary || 0).toLocaleString('en-IN')}\nSahitya salary: ₹${(j.sahityaSalary || 0).toLocaleString('en-IN')}\nBalance in company: ₹${(j.balance || 0).toLocaleString('en-IN')}\n\n${j.reasoning || ''}`,
          suggestData: { vishalSalary: j.vishalSalary || 0, sahityaSalary: j.sahityaSalary || 0 },
        }]);
      } else {
        setAdvChat((h) => [...h, { role: 'assistant', content: j.reply || '...' }]);
      }
    } catch (e) {
      setAdvChat((h) => [...h, { role: 'assistant', content: '⚠️ ' + ((e && e.message) || 'gadbad') }]);
    }
    setAdvBusy(false);
  };

  const advPostToLedger = (suggestData) => {
    const today = new Date().toISOString().slice(0, 10);
    const entries = [];
    if (suggestData.vishalSalary > 0) entries.push({ id: 'lg_' + Date.now() + '_1', date: today, kind: 'salary', party: 'Vishal Sharma', amount: suggestData.vishalSalary, note: 'AI Advisor — monthly salary', source: 'advisor' });
    if (suggestData.sahityaSalary > 0) entries.push({ id: 'lg_' + Date.now() + '_2', date: today, kind: 'salary', party: 'Sahitya Singh', amount: suggestData.sahityaSalary, note: 'AI Advisor — monthly salary', source: 'advisor' });
    if (!entries.length) return;
    persist((a) => ({ ...a, ledger: [...(a.ledger || []), ...entries] }));
    window.veToast && window.veToast('Posted to ledger ✓', 'success');
  };

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Accounts</h1>
          <p className="v2-page-sub">Cash on hand, bank balance, and ledger — synced with V1 on this device</p>
        </div>
        <div className="v2-header-actions">
          <button className="v2-cta" onClick={() => setShowAdvisor(true)}>🤖 AI Salary Advisor</button>
        </div>
      </div>

      <div className="v2-leads-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="v2-lead-kpi converted">
          <div className="v2-lead-kpi-label">Total Cash</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalCash)}</div>
          <div className="v2-lead-kpi-sub">Across all locations</div>
        </div>
        <div className="v2-lead-kpi rate">
          <div className="v2-lead-kpi-label">Bank Balance</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(bankBalance)}</div>
          <div className="v2-lead-kpi-sub">Manually entered</div>
        </div>
        <div className="v2-lead-kpi hot" style={{ borderLeftColor: '#059669' }}>
          <div className="v2-lead-kpi-label">Total Received</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalReceived)}</div>
          <div className="v2-lead-kpi-sub">From booked deals</div>
        </div>
        <div className="v2-lead-kpi warm">
          <div className="v2-lead-kpi-label">Owed to Vendors</div>
          <div className="v2-lead-kpi-value" style={{ fontSize: 22 }}>{fmtINR(totalOwedToVendors)}</div>
          <div className="v2-lead-kpi-sub">Still to pay</div>
        </div>
      </div>

      <div className="v2-two-col">
        <div className="v2-panel">
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">Cash Locations</h3>
            <button className="v2-view-all" onClick={addCashLoc}>+ Add</button>
          </div>
          {(accounts.cashLocations || []).length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7a99' }}>No cash locations yet.</div>
          ) : (
            accounts.cashLocations.map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f4f7fc' }}>
                <input value={c.name} onChange={(e) => updCashLoc(c.id, 'name', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} />
                <input type="number" value={c.amount} onChange={(e) => updCashLoc(c.id, 'amount', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '8px 10px', textAlign: 'right' }} />
                <button onClick={() => rmCashLoc(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))
          )}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e8ecf5' }}>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Bank Balance</div>
            <input
              type="number"
              value={accounts.bankBalance}
              onChange={(e) => persist((a) => ({ ...a, bankBalance: e.target.value }))}
              placeholder="0"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="v2-panel">
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">Ledger</h3>
            <button className="v2-view-all" onClick={() => setShowLedgerForm(true)}>+ Add Entry</button>
          </div>
          {sortedLedger.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7a99' }}>No ledger entries yet.</div>
          ) : (
            sortedLedger.slice(0, 15).map((l) => {
              const locked = isRowLocked(l);
              return (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f4f7fc', opacity: locked ? 0.65 : 1 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d1b3e' }}>
                      {locked && <span title="Past month — locked" style={{ marginRight: 5 }}>🔒</span>}
                      {l.party || l.kind}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{l.date} · {l.kind}{l.note ? ` · ${l.note}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: l.kind === 'income' ? '#059669' : '#dc2626' }}>
                      {l.kind === 'income' ? '+' : '−'} {fmtINR(l.amount)}
                    </div>
                    {!locked && (
                      <button onClick={() => rmLedgerEntry(l.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="v2-panel" style={{ marginTop: 24 }}>
        <div className="v2-panel-header">
          <h3 className="v2-panel-title">Recurring Expenses / Income</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {pendingRecurring.length > 0 && (
              <button className="v2-cta" style={{ padding: '8px 16px', fontSize: 12 }} onClick={runRecurringThisMonth}>
                ▶ Run {pendingRecurring.length} for this month
              </button>
            )}
            <button className="v2-view-all" onClick={addRecurring}>+ Add Template</button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#6b7a99', marginTop: -12, marginBottom: 16 }}>
          Rent, salaries, subscriptions — set them up once, then click "Run" each month to add them to the ledger. Nothing fires automatically (this is a browser app, not a server) — you stay in control of when it posts.
        </p>
        {(accounts.recurring || []).length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7a99' }}>No recurring items set up yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {(accounts.recurring || []).map((r) => {
              const done = r.lastMaterialized === currentMonthKey;
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 90px 32px', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f4f7fc' }}>
                  <input value={r.name} onChange={(e) => updRecurring(r.id, 'name', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} />
                  <input type="number" value={r.amount} onChange={(e) => updRecurring(r.id, 'amount', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '8px 10px', textAlign: 'right' }} />
                  <select value={r.kind} onChange={(e) => updRecurring(r.id, 'kind', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }}>
                    {['expense', 'income', 'salary', 'gst', 'other'].map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <span style={{ fontSize: 11, textAlign: 'center', color: done ? '#059669' : '#c9942a', fontWeight: 600 }}>
                    {done ? '✓ Posted' : 'Pending'}
                  </span>
                  <button onClick={() => rmRecurring(r.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="v2-two-col">
        <div className="v2-panel">
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">🔒 Locked Past Months</h3>
          </div>
          <p style={{ fontSize: 11.5, color: '#6b7a99', marginTop: -10, marginBottom: 12 }}>
            Any ledger entry dated in a past month is read-only by default, so closed books can't be edited by accident. Unlock a month only if you genuinely need to fix something in it.
          </p>
          {lockedPastMonths.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7a99' }}>No past-month entries yet.</div>
          ) : (
            lockedPastMonths.map((mk) => {
              const unlocked = !!((accounts.frozenMonths || {})[mk] || {}).unlocked;
              return (
                <div key={mk} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f4f7fc' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0d1b3e' }}>
                    {unlocked ? '🔓' : '🔒'} {mk}
                  </div>
                  {unlocked ? (
                    <button className="v2-acc-btn-sm" onClick={() => relockMonth(mk)}>Re-lock</button>
                  ) : (
                    <button className="v2-acc-btn-sm" onClick={() => unlockMonth(mk)}>Unlock</button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="v2-panel">
          <div className="v2-panel-header">
            <h3 className="v2-panel-title">📌 Open Commitments</h3>
            <button className="v2-view-all" onClick={() => setShowCommitForm(true)}>+ Add</button>
          </div>
          <p style={{ fontSize: 11.5, color: '#6b7a99', marginTop: -10, marginBottom: 12 }}>
            Financial to-dos that don't belong in the ledger yet — "pay the Bali DMC balance", "return X's deposit" — so nothing slips through.
          </p>
          {openCommitments.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7a99' }}>Nothing open — you're caught up.</div>
          ) : (
            openCommitments.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f4f7fc' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d1b3e' }}>{c.note}</div>
                  <div style={{ fontSize: 11, color: '#6b7a99' }}>{c.date}{c.amount ? ` · ${fmtINR(c.amount)}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="v2-acc-btn-sm" onClick={() => resolveCommitment(c.id)}>✓ Done</button>
                  <button onClick={() => removeCommitment(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCommitForm && (
        <ModalShell title="+ Add Commitment" onClose={() => setShowCommitForm(false)} onSubmit={addCommitment} saving={false} err="">
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>What's the commitment? *</div>
            <input value={commitForm.note} onChange={(e) => setCommitForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Pay Bali DMC balance" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Amount (₹, optional)</div>
              <input type="number" value={commitForm.amount} onChange={(e) => setCommitForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
              <input type="date" value={commitForm.date} onChange={(e) => setCommitForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
          </div>
        </ModalShell>
      )}

      {showAdvisor && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,35,80,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdvisor(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 18, width: 520, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,35,80,.35)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8ecf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: '#0d1b3e', margin: 0 }}>🤖 AI Salary Advisor</h3>
                <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>Checks urgent vendor payments &amp; open commitments before suggesting a split</div>
              </div>
              <button onClick={() => setShowAdvisor(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7a99' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {advChat.length === 0 && (
                <div style={{ fontSize: 12.5, color: '#6b7a99', textAlign: 'center', padding: '20px 10px' }}>
                  Type anything to start — e.g. "Is mahine kitni salary nikal sakte hain?"
                </div>
              )}
              {advChat.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{
                    background: m.role === 'user' ? '#0d1b3e' : '#f4f6fb',
                    color: m.role === 'user' ? '#fff' : '#1a2c52',
                    borderRadius: 12, padding: '10px 14px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line',
                  }}>
                    {m.content}
                  </div>
                  {m.suggestData && (
                    <button className="v2-acc-btn-primary" style={{ marginTop: 8 }} onClick={() => advPostToLedger(m.suggestData)}>
                      ✓ Post to Ledger
                    </button>
                  )}
                </div>
              ))}
              {advBusy && <div style={{ fontSize: 12.5, color: '#9aa7c4' }}>⏳ Thinking…</div>}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e8ecf5', display: 'flex', gap: 10 }}>
              <input
                value={advInput}
                onChange={(e) => setAdvInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !advBusy) advSend(); }}
                placeholder="Type your reply…"
                style={{ ...inputStyle, flex: 1 }}
                disabled={advBusy}
              />
              <button className="v2-acc-btn-primary" onClick={() => advSend()} disabled={advBusy || !advInput.trim()}>Send</button>
            </div>
          </div>
        </div>
      )}

      {showLedgerForm && (
        <ModalShell title="+ Add Ledger Entry" onClose={() => setShowLedgerForm(false)} onSubmit={addLedgerEntry} saving={false} err="">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Date</div>
              <input type="date" value={ledgerForm.date} onChange={(e) => setLedgerForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Type</div>
              <select value={ledgerForm.kind} onChange={(e) => setLedgerForm((f) => ({ ...f, kind: e.target.value }))} style={inputStyle}>
                {['expense', 'income', 'salary', 'gst', 'other'].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Party / Description</div>
            <input value={ledgerForm.party} onChange={(e) => setLedgerForm((f) => ({ ...f, party: e.target.value }))} placeholder="e.g. Office Rent" style={inputStyle} />
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Amount (₹)</div>
            <input type="number" value={ledgerForm.amount} onChange={(e) => setLedgerForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Note</div>
            <input value={ledgerForm.note} onChange={(e) => setLedgerForm((f) => ({ ...f, note: e.target.value }))} style={inputStyle} />
          </div>
        </ModalShell>
      )}
    </main>
  );
}

/* ─── REPORTS — pure derived view over the same leads/deals ────
   Matches V1's three sections (Repeat Customers, Vendor Performance,
   Monthly P&L). No new data, no backend calls — same computation
   V1's Reports screen does, just run against the same MongoDB data
   V2 already has loaded. ───────────────────────────────────────── */

function ReportsV2({ leads }) {
  const bookedDeals = useMemo(() => leads.filter(isBookedStage), [leads]);

  const repeats = useMemo(() => {
    const byCust = {};
    leads.forEach((d) => {
      const key = (d.contactNo || '').replace(/[^0-9]/g, '').slice(-10) || (d.clientName || '').toLowerCase().trim();
      if (!key) return;
      if (!byCust[key]) byCust[key] = { name: d.clientName, phone: d.contactNo, deals: [] };
      byCust[key].deals.push(d);
    });
    return Object.values(byCust)
      .map((c) => {
        const booked = c.deals.filter(isBookedStage);
        return { ...c, bookedCount: booked.length, enquiries: c.deals.length, total: booked.reduce((s, d) => s + sellINR(d), 0) };
      })
      .filter((c) => c.bookedCount > 1)
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const vendors = useMemo(() => {
    const byVendor = {};
    bookedDeals.forEach((d) => {
      dealVendors(d).forEach((v) => {
        const raw = (v.name || '').trim();
        if (!raw) return;
        const key = raw.toLowerCase();
        if (!byVendor[key]) byVendor[key] = { name: raw, deals: 0, cost: 0, paid: 0, sell: 0, priced: 0 };
        const c = toINR(v.costPrice, v.currency, v.exchangeRate);
        const s = toINR(v.sellingPrice, v.currency, v.exchangeRate);
        byVendor[key].deals++;
        byVendor[key].cost += c;
        byVendor[key].paid += sumBy(v.payments, 'amount');
        if (s > 0) { byVendor[key].sell += s; byVendor[key].priced += c; }
      });
    });
    return Object.values(byVendor)
      .filter((v) => v.cost > 0 || v.sell > 0)
      .map((v) => ({ ...v, due: Math.max(0, v.cost - v.paid), margin: v.sell > 0 ? v.sell - v.priced : null }))
      .sort((a, b) => b.cost - a.cost);
  }, [bookedDeals]);

  const months = useMemo(() => {
    const byMonth = {};
    bookedDeals.forEach((d) => {
      const key = d.createdAt ? String(d.createdAt).slice(0, 7) : '0000-00';
      const mon = d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Undated';
      if (!byMonth[key]) byMonth[key] = { key, mon, deals: 0, sell: 0, cost: 0, profit: 0 };
      byMonth[key].deals++;
      byMonth[key].sell += netSellINR(d);
      byMonth[key].cost += costINR(d);
      byMonth[key].profit += profitINR(d);
    });
    return Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));
  }, [bookedDeals]);

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Reports</h1>
          <p className="v2-page-sub">Repeat customers, vendor performance, and monthly P&amp;L — from your real booked deals</p>
        </div>
      </div>

      <div className="v2-panel" style={{ marginBottom: 24 }}>
        <div className="v2-panel-header">
          <h3 className="v2-panel-title">🔁 Repeat Customers</h3>
          {repeats.length > 0 && (
            <button className="v2-view-all" onClick={() => downloadCSV('repeat-customers.csv', [
              ['Client', 'Phone', 'Booked Trips', 'Total Enquiries', 'Total Value (INR)'],
              ...repeats.map((c) => [c.name || '', c.phone || '', c.bookedCount, c.enquiries, c.total]),
            ])}>⬇ Export CSV</button>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#6b7a99', marginTop: -12, marginBottom: 16 }}>Clients who booked more than once — your most loyal, easiest to upsell.</p>
        {repeats.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7a99' }}>No repeat customers yet.</div>
        ) : (
          <table className="info" style={{ width: '100%' }}>
            <thead><tr><th>Client</th><th>Phone</th><th style={{ textAlign: 'center' }}>Booked</th><th style={{ textAlign: 'center' }}>Enquiries</th><th style={{ textAlign: 'right' }}>Value</th></tr></thead>
            <tbody>
              {repeats.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td style={{ textAlign: 'center' }}><span className="v2-chip vip">{c.bookedCount}×</span></td>
                  <td style={{ textAlign: 'center' }}>{c.enquiries}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtINR(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="v2-panel" style={{ marginBottom: 24 }}>
        <div className="v2-panel-header">
          <h3 className="v2-panel-title">🤝 Vendor Performance</h3>
          {vendors.length > 0 && (
            <button className="v2-view-all" onClick={() => downloadCSV('vendor-performance.csv', [
              ['Vendor', 'Times Used', 'Business Given (INR)', 'Still to Pay (INR)', 'Margin (INR)'],
              ...vendors.map((v) => [v.name, v.deals, v.cost, v.due, v.margin === null ? '' : v.margin]),
            ])}>⬇ Export CSV</button>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#6b7a99', marginTop: -12, marginBottom: 16 }}>Booked deals only. Margin shows only where that vendor has a selling price set.</p>
        {vendors.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7a99' }}>No vendor data yet.</div>
        ) : (
          <table className="info" style={{ width: '100%' }}>
            <thead><tr><th>Vendor</th><th style={{ textAlign: 'center' }}>Times Used</th><th style={{ textAlign: 'right' }}>Business Given</th><th style={{ textAlign: 'right' }}>Still to Pay</th><th style={{ textAlign: 'right' }}>Margin</th></tr></thead>
            <tbody>
              {vendors.map((v, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td style={{ textAlign: 'center' }}>{v.deals}</td>
                  <td style={{ textAlign: 'right' }}>{fmtINR(v.cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: v.due > 0 ? '#dc2626' : '#059669' }}>{v.due > 0 ? fmtINR(v.due) : 'Settled'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: v.margin === null ? '#9aa7c4' : v.margin >= 0 ? '#059669' : '#dc2626' }}>
                    {v.margin === null ? '—' : fmtINR(v.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="v2-panel">
        <div className="v2-panel-header">
          <h3 className="v2-panel-title">💹 Monthly Profit &amp; Loss</h3>
          {months.length > 0 && (
            <button className="v2-view-all" onClick={() => downloadCSV('monthly-pnl.csv', [
              ['Month', 'Deals', 'Revenue (INR)', 'Cost (INR)', 'Profit (INR)'],
              ...months.map((m) => [m.mon, m.deals, m.sell, m.cost, m.profit]),
            ])}>⬇ Export CSV</button>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#6b7a99', marginTop: -12, marginBottom: 16 }}>Booked deals grouped by month.</p>
        {months.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7a99' }}>No booked deals yet.</div>
        ) : (
          <table className="info" style={{ width: '100%' }}>
            <thead><tr><th>Month</th><th style={{ textAlign: 'center' }}>Deals</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Profit</th></tr></thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.mon}</td>
                  <td style={{ textAlign: 'center' }}>{m.deals}</td>
                  <td style={{ textAlign: 'right' }}>{fmtINR(m.sell)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtINR(m.cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: m.profit >= 0 ? '#059669' : '#dc2626' }}>{fmtINR(m.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

/* ─── TEAM MEMBERS — same /api/users endpoints V1 already
   uses (admin-only create/delete, matches backend exactly). Role
   ENFORCEMENT elsewhere in the app (who can see costs, approve
   refunds, etc.) is a separate, bigger decision V1 itself never
   built either — this page only covers what V1's Users screen
   actually does: create/list/delete team accounts with a role
   label attached. ─────────────────────────────────────────── */

const USER_ROLES = ['admin', 'sales_manager', 'consultant', 'agent', 'accounts', 'viewer'];

function UsersV2() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'agent' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('ve_user') || '{}'); } catch { return {}; } })();
  const isAdmin = currentUser.role === 'admin';

  const loadUsers = () => {
    setLoading(true);
    fetch(`${apiBase()}/api/users`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createUser = async () => {
    if (!newUser.email || !newUser.password) { setErr('Email and password are required'); return; }
    if (newUser.password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`${apiBase()}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create user');
      window.veToast && window.veToast('User created ✓', 'success');
      setNewUser({ email: '', password: '', name: '', role: 'agent' });
      setShowNew(false);
      loadUsers();
    } catch (e) {
      setErr(e.message || 'Could not create user');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.name || u.email}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${apiBase()}/api/users/${u._id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete user');
      window.veToast && window.veToast('User deleted', 'success');
      loadUsers();
    } catch (e) {
      window.veToast && window.veToast(e.message || 'Could not delete user', 'warning');
    }
  };

  if (!isAdmin) {
    return (
      <main className="v2-page">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7a99' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d1b3e' }}>Admin access only</div>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>Your account ({currentUser.role || 'unknown role'}) can't manage team members.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="v2-page">
      <div className="v2-page-header">
        <div>
          <h1 className="v2-page-title">Team Members</h1>
          <p className="v2-page-sub">Create and manage CRM logins — same accounts V1 uses</p>
        </div>
        <div className="v2-header-actions">
          <button className="v2-cta" onClick={() => setShowNew(true)}>+ Create User</button>
        </div>
      </div>

      <div className="v2-panel">
        <div className="v2-panel-header">
          <h3 className="v2-panel-title">All Users <span style={{ fontWeight: 400, fontSize: 13, color: '#6b7a99' }}>({users.length})</span></h3>
        </div>
        {loading ? (
          <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#6b7a99', fontSize: 13, textAlign: 'center' }}>No users loaded.</div>
        ) : (
          users.map((u) => (
            <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f4f7fc' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0d1b3e' }}>
                  {u.name || u.email} {u.email === currentUser.email && <span style={{ fontSize: 10, color: '#c9a84c', fontWeight: 700 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 2 }}>{u.email} · <span className="v2-detail-tag" style={{ background: '#f4f6fb', color: '#33446b' }}>{u.role}</span></div>
              </div>
              {u.email !== currentUser.email && (
                <button onClick={() => deleteUser(u)} className="v2-acc-btn-sm" style={{ color: '#dc2626' }}>Delete</button>
              )}
            </div>
          ))
        )}
      </div>

      {showNew && (
        <ModalShell title="+ Create New User" onClose={() => setShowNew(false)} onSubmit={createUser} saving={saving} err={err} submitLabel="✓ Create">
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Email *</div>
            <input value={newUser.email} onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Password * (min 6 characters)</div>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Name</div>
              <input value={newUser.name} onChange={(e) => setNewUser((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div className="v2-detail-field-label" style={{ marginBottom: 6 }}>Role</div>
              <select value={newUser.role} onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
                {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </ModalShell>
      )}
    </main>
  );
}

/* ─── ROUTER ─────────────────────────────────────────── */

const ROUTABLE_V2_KEYS = ['dashboard', 'leads', 'deals', 'clients', 'proposals', 'vendors', 'visa', 'tasks', 'accounts', 'reports', 'users'];

export default function V2Pages() {
  const [route, setRoute] = useState('dashboard');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const { items, loading, error, refetch } = useLeads();
  const { tasks, refetch: refetchTasks } = useTasks();

  const navigate = useCallback((key) => {
    if (ROUTABLE_V2_KEYS.includes(key)) { setRoute(key); setSelectedDeal(null); }
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
        allLeads={items}
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
  if (route === 'clients') {
    return <ClientsV2 leads={items} onDealClick={openDeal} />;
  }
  if (route === 'proposals') {
    return <ProposalsV2 leads={items} onDealClick={openDeal} />;
  }
  if (route === 'vendors') {
    return <VendorsV2 leads={items} />;
  }
  if (route === 'visa') {
    return <VisaFilingsV2 leads={items} onDealClick={openDeal} />;
  }
  if (route === 'tasks') {
    return <TasksV2 tasks={tasks} leads={items} refetch={refetchTasks} />;
  }
  if (route === 'accounts') {
    return <AccountsV2 leads={items} />;
  }
  if (route === 'reports') {
    return <ReportsV2 leads={items} />;
  }
  if (route === 'users') {
    return <UsersV2 />;
  }
  return <DashboardV2 leads={items} onDealClick={openDeal} />;
}
