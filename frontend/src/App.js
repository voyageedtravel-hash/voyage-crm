import React, { useState, useEffect, useRef } from "react";
import Login from "./Login";

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────────────────
window.veToast = (msg, type="success") => {
  const t = document.createElement("div");
  const color = type==="error"?"#ef4444":type==="warning"?"#f59e0b":"#0fba74";
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);` +
    `background:${color};color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;` +
    `font-size:13px;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.3);` +
    `font-family:Outfit,Raleway,sans-serif;max-width:90vw;text-align:center;` +
    `animation:fadeInUp .3s ease;`;
  document.body.appendChild(t);
  t.textContent = msg;
  setTimeout(()=>t.remove(), 3500);
};


// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CURRENCIES = ["INR","USD","EUR","GBP","SGD","THB","MYR"];
const CITY_COUNTRY = {
  // Thailand
  bangkok:"Thailand",phuket:"Thailand","chiang mai":"Thailand","koh samui":"Thailand",pattaya:"Thailand",krabi:"Thailand",
  // Indonesia
  bali:"Indonesia",denpasar:"Indonesia",jakarta:"Indonesia",ubud:"Indonesia",
  // Malaysia / Singapore
  "kuala lumpur":"Malaysia",langkawi:"Malaysia",penang:"Malaysia",singapore:"Singapore",
  // Vietnam / Cambodia
  hanoi:"Vietnam","ho chi minh":"Vietnam","ho chi minh city":"Vietnam","da nang":"Vietnam","ha long":"Vietnam","siem reap":"Cambodia","phnom penh":"Cambodia",
  // UAE / Gulf
  dubai:"UAE","abu dhabi":"UAE",sharjah:"UAE",doha:"Qatar",muscat:"Oman",
  // Caucasus / Central Asia
  tbilisi:"Georgia",batumi:"Georgia",kazbegi:"Georgia",baku:"Azerbaijan",yerevan:"Armenia",
  almaty:"Kazakhstan",astana:"Kazakhstan",tashkent:"Uzbekistan",samarkand:"Uzbekistan",
  // Maldives / Sri Lanka / Nepal
  male:"Maldives",maldives:"Maldives",colombo:"Sri Lanka",kandy:"Sri Lanka",kathmandu:"Nepal",pokhara:"Nepal",
  // Europe
  london:"UK",paris:"France",rome:"Italy",venice:"Italy",milan:"Italy",florence:"Italy",
  barcelona:"Spain",madrid:"Spain",amsterdam:"Netherlands",frankfurt:"Germany",munich:"Germany",
  zurich:"Switzerland",interlaken:"Switzerland",geneva:"Switzerland",vienna:"Austria",prague:"Czechia",
  istanbul:"Turkey",athens:"Greece",santorini:"Greece",lisbon:"Portugal",
  // Far East
  "hong kong":"Hong Kong",tokyo:"Japan",osaka:"Japan",kyoto:"Japan",seoul:"South Korea",
  shanghai:"China",beijing:"China",taipei:"Taiwan",
  // India (for domestic hotels)
  goa:"India",jaipur:"India",udaipur:"India",manali:"India",shimla:"India",leh:"India",srinagar:"India",
};


// ─── LOOKUP HELPERS ───────────────────────────────────────────────────────────
let _abcCache=null;
const getAirportByCity = () => { if(!_abcCache){_abcCache={};for(const [code,city] of Object.entries(AIRPORT_MAP)){const k=city.toLowerCase().replace(/\s*\(.*\)/,"").trim();if(!_abcCache[k])_abcCache[k]=code;}} return _abcCache; };
const lookupCountry = (city) => CITY_COUNTRY[(city||"").toLowerCase().trim()] || "";

// ─── BRANDED QUOTATION HTML TEMPLATE (print-ready, matches Voyage-Ed PDF) ────
const FIXED_TERMS = [
  "Rates are subject to change without prior notice until booking is confirmed with advance payment.",
  "To confirm the booking, 30% of total tour cost must be paid in advance. Balance to be cleared before/on arrival.",
  "Payment Mode: Bank Transfer / UPI preferred. Credit Card payments may attract a surcharge.",
  "Check-in is typically 14:00 hrs and Check-out 12:00 noon (subject to hotel policy). Early check-in / late check-out subject to availability.",
  "Quotation is valid for the mentioned travel dates only. Any change in dates may affect pricing.",
  "Carry valid government-issued photo ID for all travellers as required at hotels, airports and permits.",
  "Any cost arising due to natural calamities, landslides, road blockages or strikes shall be borne directly by the guests.",
];
const FIXED_CANCELLATION = [
  ["31+ Days Prior to Departure","Non-Refundable Booking Deposit (₹20,000 per person)"],
  ["30 – 16 Days Prior to Departure","50% of Total Tour Cost"],
  ["15 – 8 Days Prior to Departure","75% of Total Tour Cost"],
  ["7 – 0 Days Prior to Departure","100% – Full Cancellation (No Refund)"],
];

const buildQuotationHTML = (deal, flights, hotels, ai, meta) => {
  const esc = (s)=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const onward = flights.filter(f=>f.kind==="Onward");
  const ret = flights.filter(f=>f.kind==="Return");
  const other = flights.filter(f=>f.kind!=="Onward"&&f.kind!=="Return");
  const dv=[...deal.hotelVendors||[],...deal.flightVendors||[],...deal.landVendors||[],...deal.visaVendors||[]];
  const totalSell = dv.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
  const perPax = meta.pax>0 ? Math.round(totalSell/meta.pax) : totalSell;
  const inr = (n)=>"INR "+Math.round(n).toLocaleString("en-IN")+"/-";

  const flightCol = (f)=> f ? `
    <div style="font-weight:700;color:#0f2350">${esc(f.airline)||"—"}</div>
    <div style="color:#33446b;margin:4px 0">${esc(f.fromName||f.from)} (${esc(f.from)}) &rarr; ${esc(f.toName||f.to)} (${esc(f.to)})</div>
    <div style="font-size:12px;color:#5a6b8c">${esc(f.date)} ${f.depTime?("| "+esc(f.depTime)):""} ${f.arrTime?("&rarr; "+esc(f.arrTime)):""}</div>` : "<div style='color:#999'>—</div>";

  const hotelCards = hotels.map(h=>`
    <div style="border:1px solid #d4e0f5;border-radius:8px;padding:14px 16px;margin-bottom:10px;background:#fff">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div style="font-weight:800;color:#4169E1;font-size:15px">${esc(h.name)}</div>
        <div style="color:#5a6b8c;font-size:13px">${esc(h.city)}${h.country?(", "+esc(h.country)):""}</div>
      </div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:13px;color:#33446b">
        <span><b>Check-in:</b> ${esc(h.checkIn)}</span>
        <span><b>Check-out:</b> ${esc(h.checkOut)}</span>
        <span><b>Nights:</b> ${esc(h.nights)}</span>
      </div>
      ${h.room?`<div style="margin-top:6px;font-size:13px;color:#33446b"><b>Room:</b> ${esc(h.room)}</div>`:""}
    </div>`).join("");

  const dayRows = (ai.days||[]).map(d=>`
    <div style="border-left:3px solid #4169E1;padding:10px 0 10px 16px;margin-bottom:14px">
      <div style="font-weight:800;color:#0f2350">DAY ${esc(d.day)}${d.date?(" • "+esc(d.date)):""}${d.title?(" — "+esc(d.title)):""}</div>
      <div style="color:#33446b;margin-top:6px;line-height:1.6;font-size:14px">${esc(d.desc)}</div>
      <div style="margin-top:6px;font-size:12px;color:#5a6b8c">
        ${d.hotel?("🏨 "+esc(d.hotel)+"  "):""}${d.meals?("🍽 "+esc(d.meals)):""}
      </div>
      ${d.note?`<div style="margin-top:4px;font-size:12px;color:#6b7a99;font-style:italic">Note: ${esc(d.note)}</div>`:""}
    </div>`).join("");

  // ── Tiered 3★/4★/5★ side-by-side comparison ──
  const starStr = (n)=>"★".repeat(Number(n)||0);
  const activeTiers = (meta.tiers||[]).filter(t=>t.enabled && (Number(t.totalPrice)>0 || (t.hotels||[]).some(h=>h.hotelName)));
  let tiersHTML = "";
  if(activeTiers.length){
    const cols = activeTiers.map((t,idx)=>{
      const tPax = meta.pax>0?meta.pax:1;
      const tTotal = Number(t.totalPrice)||0;
      const tPer = Math.round(tTotal/tPax);
      const isFeatured = (idx===1 && activeTiers.length===3) || t.booked; // middle tier or booked highlighted
      const hotelBlocks = (t.hotels||[]).filter(h=>h.hotelName||h.photoUrl).map(h=>`
        <div style="margin-bottom:10px">
          ${h.photoUrl?`<img src="${esc(h.photoUrl)}" alt="${esc(h.hotelName)}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;display:block;margin-bottom:6px" onerror="this.style.display='none'"/>`:""}
          <div style="font-weight:800;color:#0f2350;font-size:14px">${esc(h.hotelName)}</div>
          <div style="font-size:12px;color:#5a6b8c">${esc(h.city)}${h.roomCategory?(" · "+esc(h.roomCategory)):""}</div>
        </div>`).join("") || `<div style="color:#999;font-size:12px;padding:12px 0">Hotel details on request</div>`;
      const badge = t.booked ? "BOOKED ✓" : (idx===1 && activeTiers.length===3 ? "MOST POPULAR" : "");
      return `
      <div style="flex:1;min-width:0;border:${isFeatured?"2px solid #4169E1":"1px solid #d4e0f5"};border-radius:12px;overflow:hidden;background:#fff;${isFeatured?"box-shadow:0 6px 20px rgba(65,105,225,.18)":""}">
        <div style="background:${t.booked?"linear-gradient(135deg,#15803d,#1a9e4b)":isFeatured?"linear-gradient(135deg,#0f2350,#4169E1)":"#0f2350"};color:#fff;padding:12px 14px;text-align:center">
          <div style="font-size:15px;font-weight:800;letter-spacing:.5px">${esc(t.label||(t.star+"-Star"))}</div>
          <div style="color:#ffd76a;font-size:13px;margin-top:2px">${starStr(t.star)}</div>
          ${badge?`<div style="font-size:10px;letter-spacing:1px;color:#fff;margin-top:3px;font-weight:800">${badge}</div>`:""}
        </div>
        <div style="padding:14px">
          ${hotelBlocks}
        </div>
        <div style="padding:14px;border-top:1px dashed #d4e0f5;text-align:center;background:#f4f7fc">
          <div style="font-size:11px;color:#4169E1;font-weight:800;letter-spacing:1px">PRICE PER PERSON</div>
          <div style="font-size:24px;font-weight:800;color:#0f2350;margin:2px 0">${inr(tPer)}</div>
          <div style="font-size:11px;color:#6b7a99">Total ${inr(tTotal)}${meta.pax>0?(" · "+meta.pax+" pax"):""}</div>
        </div>
      </div>`;
    }).join("");
    tiersHTML = `
    <div class="sec-title">■ CHOOSE YOUR STAY — 3 OPTIONS</div>
    <div class="body">
      <div class="tiers-wrap" style="display:flex;gap:14px;align-items:stretch;flex-wrap:wrap">${cols}</div>
      <div style="font-size:12px;color:#6b7a99;margin-top:14px">* All three options cover the same itinerary; only the hotel category and price differ. GST extra as applicable.</div>
    </div>`;
  }
  meta.tiersHTML = tiersHTML;

  const incl = (ai.inclusions||[]).map(i=>`<li style="margin-bottom:6px;color:#15803d">✔ ${esc(i)}</li>`).join("");
  const excl = (ai.exclusions||[]).map(i=>`<li style="margin-bottom:6px;color:#b91c1c">✖ ${esc(i)}</li>`).join("");
  const terms = FIXED_TERMS.map((t,i)=>`<li style="margin-bottom:6px;color:#33446b">${esc(t)}</li>`).join("");
  const cancel = FIXED_CANCELLATION.map(([k,v])=>`<tr><td style="padding:9px 12px;border:1px solid #d4e0f5;color:#33446b">${esc(k)}</td><td style="padding:9px 12px;border:1px solid #d4e0f5;color:#33446b">${esc(v)}</td></tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Voyage-Ed Quotation — ${esc(deal.clientName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
  body{background:#eef3fc;color:#1a2c52;padding:0}
  .page{max-width:820px;margin:0 auto;background:#fff}
  .bar{position:sticky;top:0;background:#0f2350;padding:12px 20px;display:flex;gap:10px;justify-content:flex-end;z-index:10}
  .bar button{background:#4169E1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px}
  .bar button.sec{background:#fff;color:#0f2350}
  .hd{background:linear-gradient(135deg,#0f2350,#4169E1);color:#fff;padding:30px 36px}
  .hd h1{font-size:30px;letter-spacing:1px}
  .hd .sub{color:#cdd9f5;font-weight:700;font-size:12px;letter-spacing:2px;margin-top:4px}
  .hd .route{color:#e8efff;margin-top:8px;font-size:14px}
  .sec-title{background:#0f2350;color:#fff;padding:10px 36px;font-weight:700;letter-spacing:1px;font-size:14px;margin-top:0}
  .body{padding:22px 36px}
  table.info{width:100%;border-collapse:collapse;margin-bottom:6px}
  table.info th{background:#0f2350;color:#fff;padding:10px;font-size:12px;letter-spacing:.5px}
  table.info td{padding:11px;text-align:center;border:1px solid #d4e0f5;color:#33446b;font-size:14px}
  .flt{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .flt .col{border:1px solid #d4e0f5;border-radius:8px;padding:14px 16px;background:#fff}
  .flt .lbl{font-size:11px;letter-spacing:1px;color:#4169E1;font-weight:800;margin-bottom:8px}
  .price{border:2px solid #4169E1;border-radius:10px;padding:18px 20px;margin-bottom:14px;background:#f4f7fc}
  .price .opt{font-size:13px;color:#4169E1;font-weight:800;letter-spacing:1px}
  .price .amt{font-size:26px;font-weight:800;color:#0f2350;margin-top:4px}
  .price .per{font-size:13px;color:#5a6b8c}
  .twocol{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  ul{list-style:none;font-size:13px} ol{margin-left:18px;font-size:13px}
  .foot{background:#0f2350;color:#fff;padding:22px 36px;text-align:center;margin-top:20px}
  .foot a{color:#9db8f5}
  @media print{.bar{display:none}body{background:#fff}.page{max-width:100%}.tiers-wrap{display:flex !important;gap:10px !important}.tiers-wrap>div{flex:1 !important}}
  @media(max-width:600px){.flt,.twocol{grid-template-columns:1fr}.hd h1{font-size:22px}}
</style></head><body>
<div class="bar">
  <button onclick="window.print()">⬇ Save as PDF / Print</button>
  <button class="sec" onclick="window.close()">Close</button>
</div>
<div class="page">
  <div class="hd">
    <h1>${esc((deal.destination||"TRAVEL").toUpperCase())}</h1>
    <div class="sub">TAILORED ITINERARY &amp; QUOTATION</div>
    <div class="route">${esc(ai.subtitle||"")}</div>
  </div>
  <div class="body">
    <table class="info">
      <tr><th>GUEST</th><th>DESTINATION</th><th>TRAVEL DATES</th><th>DURATION</th><th>PAX</th></tr>
      <tr><td>${esc(deal.clientName)}</td><td>${esc(deal.destination)}</td><td>${esc(deal.travelDates)}</td><td>${esc(meta.totalNights)} Nights / ${esc(meta.totalNights+1)} Days</td><td>${esc(meta.pax)} Pax</td></tr>
    </table>
  </div>
  ${(onward.length||ret.length||other.length)?`
  <div class="sec-title">✈ FLIGHT DETAILS</div>
  <div class="body">
    ${(onward.length||ret.length)?`<div class="flt">
      <div class="col"><div class="lbl">ONWARD FLIGHT</div>${flightCol(onward[0])}</div>
      <div class="col"><div class="lbl">RETURN FLIGHT</div>${flightCol(ret[0])}</div>
    </div>`:""}
    ${other.length?other.map((f,i)=>`<div class="col" style="margin-top:10px"><div class="lbl">FLIGHT ${i+1}</div>${flightCol(f)}</div>`).join(""):""}
  </div>`:""}
  ${hotels.length?`<div class="sec-title">■ HOTEL DETAILS</div><div class="body">${hotelCards}</div>`:""}
  ${(ai.days&&ai.days.length)?`<div class="sec-title">■ DAY-BY-DAY ITINERARY</div><div class="body">${dayRows}</div>`:""}
  ${meta.tiersHTML || `
  <div class="sec-title">■ PRICING SUMMARY</div>
  <div class="body">
    <div class="price">
      <div class="opt">PRICE PER PERSON</div>
      <div class="amt">${meta.pax>0?inr(perPax):inr(totalSell)}</div>
      <div class="per">${meta.pax>0?("Total package "+inr(totalSell)+" for "+meta.pax+" pax"):""}</div>
    </div>
    <div style="font-size:12px;color:#6b7a99">* GST extra as applicable. Quotation valid for mentioned travel dates only.</div>
  </div>`}
  ${(incl||excl)?`<div class="sec-title">■ INCLUSIONS &amp; EXCLUSIONS</div>
  <div class="body"><div class="twocol">
    <div><div style="font-weight:800;color:#15803d;margin-bottom:8px">✔ INCLUSIONS</div><ul>${incl}</ul></div>
    <div><div style="font-weight:800;color:#b91c1c;margin-bottom:8px">✖ EXCLUSIONS</div><ul>${excl}</ul></div>
  </div></div>`:""}
  <div class="sec-title">■ TERMS &amp; CONDITIONS</div>
  <div class="body"><ol>${terms}</ol></div>
  <div class="sec-title">■ CANCELLATION POLICY</div>
  <div class="body"><table style="width:100%;border-collapse:collapse">
    <tr><th style="background:#0f2350;color:#fff;padding:10px;text-align:left">Cancellation Timeline</th><th style="background:#0f2350;color:#fff;padding:10px;text-align:left">Charges Applicable</th></tr>
    ${cancel}
  </table></div>
  <div class="foot">
    <div style="font-weight:800;letter-spacing:1px">VOYAGE-ED TRAVELS</div>
    <div style="color:#9db8f5;font-size:13px;margin-top:4px">Your Journey, Our Passion</div>
    <div style="font-size:13px;margin-top:8px">enquiry@voyage-ed.com &nbsp;|&nbsp; www.voyage-ed.com &nbsp;|&nbsp; +91 7009659048</div>
    <div style="font-size:11px;color:#7e94c8;margin-top:8px">Quotation Date: ${new Date().toLocaleDateString("en-GB")}</div>
  </div>
</div>
</body></html>`;
};

// Currencies that get +1.50 markup; all others +0.50


const CLIENT_MODES = ["UPI","Cash deposited by client in bank","Cash collected by Vishal","Cash collected by Sahitya","Bank Transfer","Cheque","Other"];
const REFUND_MODES = ["Bank Transfer","UPI","Cash"];
const REFUND_REASONS = ["Service Issue","Visa Rejection","Travel Plan Cancelled","Goodwill / Adjustment","Other"];
const REFUND_APPROVERS = ["Vishal Sharma","Sahitya Singh"];
const VE_LOGO="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCABgAS0DASIAAhEBAxEB/8QAHQAAAgMBAQEBAQAAAAAAAAAAAAcFBggECQECA//EAEwQAAEDAwIDBQUFAwYLCQEAAAECAwQABREGBxIhMQgTQVFhFCJxgZEVFjJCUmKh0QkjcoKSsSQzNFNUY2VzoqPBFxgnNUODhbPC0v/EABsBAAEFAQEAAAAAAAAAAAAAAAABAgMEBQYH/8QANREAAQMCBAQFAgUDBQAAAAAAAQACAwQRBRIhMRMiQVEGFGFxkYGhFSPB0fAHMrEzQlLh8f/aAAwDAQACEQMRAD8A39RRRQhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFFHSoqdqbT1tKhPvdvjqT+JLj6QR8s5prnBurjZKATspWiqBct7tp7Qrgn67s7a/wBCXeNR9OEZOa+WzeTR97koYsbN9ual9FR7TI4P7SkgfPNNE0Z2cEpY4bhWvUlqfvWl5luiTnIMl1s9zJbJBacHNKuXUZxkeVLax6y1da23ItyZRNejL7qTFeVwusrxnAWPxJI95JI5g9eRpsR3zIaDncPNZ8HU4P0qr6y005NKb/aeBFyitlLjSiEomM9S2s+Y6oV+U58Cax8bpKiWLjUchbI34I7EK3RzRsdklbdpXZYta2S/SPY2nVxZ4GVQ5KeBz4p8FD1BNWHIAySMCkHdL5YfZ0cI9rdIC220pwps+GT+Uj0qNevF/voCLpdJfsqRgMd+pCOH9oggq+JNcfT/ANQmRNMdXHeQf8eq13YAZDmiNm+q0C7ebQwvgeusJtXkt9IP7zXUy+zIZDrDqHW1dFoUFA/MVl1m62p+5GxaJsDWqb3nBjQEJLEcn80iRgobSM5IyVHwFPPbbR9y0jph1F9uwuV3nO+0y1tJ4I7KuEJDTCPytpAwM8zzJ5mupwPGanE7yPgyM6EnU/RZlbRx02gfmKudFFFdGs5FFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFcVxvFptDHfXW5xITeM8Ul5LY/eaXO4Mjeya89B0NZrTDhYx7Y5cEiSsH9IUgpR+80iLrtxuuJvtt70Xdri/wBTJbmNTl/vUD8gPlWNieJzUg/Jgc8+myvUlIyY88gatDT97dARH1MxrhJubgzygRluJz5cWAP31FL3ziLX/gekro6nwLjzTZ+hVSBY4LfJDF67+0PE4Dd1juRcn0UsBB+SqukK2OBCFqSClQylaTkKHmCOR+VecYh45xWF1hEGe4K6GHAqVwvnzfVM5veWQ4M/cySPT25k1KQ917e6sCbYLtFHipKEugf2Tn91LePCwB7tSbMJXkaoxePcVvqGn6J78DpehPymzbtY6buhCY11ZQ4eXdP5aX/ZVg1OggjIpKG3JebKHUBxJ/KoZH7664D98sq+Oz3JxpAH+SyAXWFfI80/I/Kuow7x4HkNq4reo/ZZlRgltYnX904KKqFq1/AeaLV8ZNqlJ8FErad9UKA5/AgH0r7K1k87lNqti+Ejk/MPdpPwT+I/QV2TsboRGJeKLH+bLJ8pNmy5dVbqibjqWxWrKZtzYS507pKuNZPlwjnVBvl7catjlw1JqEQ4KDlRU6IrI9M5yfhnNV20yLzqRv8A8PtJkxFn/wA5uyFwop5/iQjHeveecJBwedZJ8RSVDslDCXep0CsihbGLzOsr3L3DlOrKLJp2S8nGe/mLEdI9eHmrHyFU247m3S4y1262agbdm9DB05C9vfT6FRylP9bFT8XZ1i4lLuu9RT9QHHvW9k+xwB/7LZyv+upVX+0WSz2G3IgWS1w7dFQAAzFZS2n6AVZjo8Tn1qJgwdmj9VG6WnZ/psv7pEOaD3Y1hMC5S3bNFVz9ovlyXJeI9I0cobSfQqPrVotPZ70whhP3oudw1A5nKm1ERWD6d21gkf0lGm9UNd9V6esRKbndY7LgGe6B43P7KcmrjMOpafnk19XG/wDlRmolk5W/YLlsegdE6bjoZsWlLRBSjopqMji+aiMk/E181peNQ6d0m5ddNabN/fjqSXLe06G3VtfmLeeRUBzCfHGKpL2/lhnXVy1aK05f9XT2+Sm7YwO7bP7bqyEo+Zz6VarHN3Fu7yJF6sto07EPP2YSTMk9PEgJQn5Zq3HLG8Wi+wUbmOabv+6osTtDWWXpORqBxiNAgxVd3JemPLQYzmQOB1soC0qyemPEVXH90JWuVFFjtGq9RtlXClm22tyNGz+047wgj1JIq/612nRqjWsG6RnYcaG8/Hdu7ZbwuT3CwtBTjkVHHCSfDHlTOAxWB+EVdW6SOsmdkvpawuPWyu+aiiDXQsF7a311WeY+mtftvC63jRVotNoaIL6XLiZEvgPLiCW08AxyJBJ5ZqVmaUsuoxCs95trMyCuayp2OvPCsBXQ4PMdOXjTpnsNyrVJjOJCkONKSQfHIpDW+K7rPdyz6WYW99n2Mou94daWpGFgERo5UMc1Ky4R5JHnXO1/haGlr6fyTbXOvXbqr0GJvkgk4xTys9ltFhtaLdZLXDt0RH4WIjKWkD5Afvrvo6CivSgLCwXPHVFFFFKhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhFV+0aphXvUc63QCHWoqEqL6SClRKlJOPTKSM/smuPcm+yNPbaXKdCJEtaRGjkciHHFBAI+Gc/KqltAymHeLjFA4QbZBU2PNILyT/xAn+tWTVV+StipGnV1yfYK1HBeF0p6aJpy4cSdEXFmxWZLCxhTTyAtKh6g8jS+uO0doh95L0R3difWStcEAqgvn9prP82f2m8H49KY9FXKuigq2GOdoIUUUz4jmYbJJtNrZu5tNzhOW65pTx+yuq4g6nxWyvo4n4cx4gVMR4efAVf9Qaet+pLSYU9K0lKg4zIaPC7HcHRaFeCh+8ZByDiqVbDPZuL9kvjaUXOKAvvm04bmNE4DyB4c+Sk/lV6EV5xi3hNtI7iQ6s/wt2nxQyNyv3X9W4YxnAr9+xjyFSCg0ywt11aG20JKlrWoJSkeJJPID1qqsakuWrFuRtube1cGkqLa77NCkQGj0PB0VII8kYT+1VakwV0xysalkrQ3Uld896BaLeu4XKZHhRUfiffWEJB+J8fQc6iYo1jqzh+6dqbtduX1vV7aUkqH6mY3JSvMKWUj0NW3T+21ut09F51DOf1JeweITJ6R3bB8mGR7jQ+GT61dq6yh8JwR80+p7LOmxJ7tGqiWLanTttntXe+OSNTXpA5XC7EOd2f9U1ju2h5cIz61e6ir3qWyadi9/d7gzHB/CgnK1n9lI5n6Up9Q7vXq4umJpaH7C0cj2l9IW8oeaU/hT8TmtKuxjD8IZlkcG+g3+FFT0dRVu5Bf16Ju3a+WixQjLvFxjw2R+Z1YGfgPGlpet8YDbbx07bFSm2hlybOcEZhA8yTzx8cUpYFv1FuBfHRpyG5qGUhRQ/d5rykwYys8wXv/AFVDP+LaGOuVCm5o/YmyWiWzd9YXFzVV2bIW2mQ2GoMVX+pjDKQR+pRUr1rMhrsUxXWnZwY+7tXH2CtvgpKUWkdnd2GyoiNQbtblSAnTjb8iCv3VSwVW62AdDhzBef8A6gA9avFi2Itfd97ri7PagcV7yoLSfZIKT/u0nic+LilZptpSlKQlIAAGAB0Ffa2abCIoznlJkd3cb/bZUpKt7tGDKPRcdstNrstuRAs9uiQIqPwsRWktIHySAK7KKK1QANAqm6KKKKVCKiLBpmyaZjymrLARG9rkrlyV5KlvOrOVLUo8yf7gKl6KSwvdLdFFFFKkRRRRQhFFFFCEUUUUIRRRRQhFFFFCEUUUUIRRRRQhUDd5PHoqEgk8BucfiA8eZIz88VRrJfkab1BZr0+sJhgrtcxR6IQ4oLaWfQLBB+JpnbjQHJ+3M/uUlTsYJmJSPzd0oLI9TgH50pjDZmQ3YzyO+iSW8KA/Mk8woevQg15Z4wqpsPxeCrbtlt9102ExMqKR8R3utBJUlaAtCgpJGQQcg19pHaN11cNCqRYdXqdk2LPBEu6QV+zDlhDw6hPkrnj4dHXFlxZ0REqFJZkMLGUOsrC0qHoRyNd/hWLQYlAJYjr1HULCqqR9O/K8fVf2qHv1kTdW40llQanQ197Hd+PJSFeaVDkR8D4VMUVoyRtkaWu2KrgkG4S0j7cXDVMkTtypTUqIlfGxpuGo+xNgHKVPnkZC+n4sI8k0x2WGY0ZuPHabZZbSEIbbSEpQkcgAB0HpXyTKjQ4q5Mt9thlAypxxQSkD1JpS6v3uhxQuDpFlE57mDPeBDCP6I6rP0HrWfU1lHhcOaVwaB8lTxQS1LrMFymjdbxa7Jb1TbtOZiMJ/O6rGfQDqT6Ck3q3eqZKC4OlGFRGyce3yEgrUP2EHkn4q+lK+53y86iuqZN0mybhKUcI4vD0Qkck/IV26XsF71ddBD0nDjzu7XwSrxJ963wCDzSMf5U8P0JPAD+JXhXA1PimuxiXyuEssD/u6/wDS6CLCoKNnFqzc9l/F5+S7OZfnuTJ1yn5MdhtJkTJ2Ovdo6lI8VHCB50ydLbL3C8NJl7hqRGgHmnTsF4kOjPL2t4YLv+7ThHnxVdLRp/R+1tv9ukvuS7xPWlhy4yR3s2e6ejaAB08m0AJSB05Zq9tKWthKnW+7URzRnOPTNb+DeEKejf5ipPEl7nos6rxaSUZIxlb2CScPtM7JWrW8fbhqbJtE9qULaiGu3LYaYczwhB5AJGcDy5infXn526dqn7Fru37s2VDiItzKY09TQx3ElA/m3M+HEB9U1qPs17qo3Y2Ht12kvBd4gAQLkjx71A5L+Chg/Wu5fEBGHtWG2Ql5Y5XDcXdDRe1Wm2r7ra7C3w3ngw0QguLcXjOEpTzPKuufr/SNo0FH1le73GtNmfZQ+iRPV3OUqGR7quecHpjNZP3Ebc7RPbxtWg2VLd0foke0XNafwLdBCnAT5khDfwCqSN91Jce0f20rVpu8y3G9Pu3f7PhwUKIbjxWiriCU9ApQbOT158qcyAOGp9Smvmy7LZ7fay2qnOPnT8fVWoY7H+NmWiyPvsJ8/fxz+FWnQm/u1O4tyFr01quOq5nI+zpaVR5GR4cCwCT6DnV7slis+nLHHs1htsa3QI6A21GjNhCEADA5D++sddu3bqzwNP2TdSyRUW+9Mzkw5UiN/NLeCgS2rIweNJTyV1wajY1j3Zdk97i1t0/9e9ora3bTVi9OazvEu2z0tpeShUJ1SXEHopKgMKHhy8aY9kvVr1Fp6FfbLNam2+ayl+PIaVlLiFDIIrG9hsTva/7GTarw419/9NvLjRrmtISXlpSCkLI/K4kgHyIzVN7LO/52in3PardN9222uKt5cdySk5gPoyVsEdeFWDw+Gf6VP4FwbbhM41iCditqbhbsaG2vatytY3j2Ndye7iIy20p1x5XLolIJ8QM+tWh+6Q4lgcvM1wxYjUcyXVvjgLaAniJUD0wOorLOz2kLvvxvW52jNfRFs2OMos6StDwOA0kkCQofUjzUSfAVO9qvVtyvP3f2B0hJ4L9rKQluW4g/5NCCvfUry4sH5A0wxi4aN+qkzaXTB0H2i9ptyNZp0tpPUhl3Nba3W2lx1thxKfxFJUMHlz+FNWvLfd3Qtz7Lnahs150pIkLt6O6uNsddVkuJThLzKvPJyPgoeVegVz3esLHZnk7xW4+1W1FqNxaR4lWMBs+oWQk/OnSRAWLdimRyXuHbhT2tNxtD7d2tNw1pqa32Zlee79pcwtzH6UD3lfIUpXe2LtQoLetVu1leIiCczbfY3nGCB4hWBkVlDs76ck9pHtTztR7nyV3lmCyblJjvK9xxRXwtshPQNpP5RjkkV6VRIcSBCRDhRWY0dscKGWUBCEjyAHIUSRtjNjqU5jy8XGyW223aC2t3Vui7TpO/qXdUIU4u2y2FMSEpT1PCoeGag9Z9qzZ3Qet5+ktQ3a5N3WC4GnmWYDjgCiAQAQOfUdKaLOkNMR9XfemPYYDN59nVFM5plKHFNlXEUkjqMjxrzP32mQ7f/KIXCfPeQxEYvsJ1510+6hKQ2So+g60sMbXuKbK8sAK2P/3ztleLBd1OP/hH/wCFMbbXeLRW7DM5zSD9wcEEpD4mQnIxBVnGOMDPTwqMG+mwx5jcbSJ8eUpur5p+86f1Bp5i+abnQp1tkpKmpURQLbgBxkEdeYNROAA2UgPqpWqpuDuLpXbDSI1LrGcuFbi+iN3qGlOHjVnhGE8/A1aO9a/ziP7QrM3bvWB2UkqBGDe4gBHwXRG3M4Aoe6wJCsjHbA2QlNlyLfLpIQDwlTNpkOAHyyEnnXdbe1TtBdr3EtMO5XgyZbyWGkrtEhAKlHAySnA5+NIzsWbl7baS2JuNt1bq+xWqcu7uupjz5CW1lBQnCsHw68/StWab3C211fdPs/S+qrBd5iUF3uYT6HVhI6qwPCnyMDCRZMjcXAFVncDtG7U7ZawXpjV99fiXJDKH1NIircAQr8JyBjwqtnth7IJUAu73lCSAe8VaJARj48NY/wC3TlPaukkEjNpi/wD6r0Y0jBhPbb2EOw46wq2x88TaTn+aT6Uro2tY13dI15c4t7Kt6O372g15LbiaY17aJctw4TGW73LpPkErwSfQUx6yf2utgNIXPaW67kaassa1aksyBKcdhIDQlMggKStKcDiA94KGCMHzqrdlPtNqG3E/TG4lykTHrQ40mDMdVxOOMLCsIWonKikoIBPPBFJwszczUvEs7K5bYUlK0FCgClQwQfEUmmrR9jXqZptwn/A1d5GKvzxlklvB8eHmg/0R505qq2s9PSLrEYutpSj7YgcSo4WcJfQrHGyo+AUAMHwIBrmvEWENxGmygczdR+y06CqNPJfoVUF25p9hTTzSVIUMEHxqmuaXmaUuXt2k77cbIVq4i1HUFsLP7TSvdP7jV9tc6JdramZFC0DiLbjTgw4ytPJTax4KSeRHz8a/N0iCTbVtYyoe8n4ivK300tLd8Di147LpWTNfYPFwVX4+4+vYbXDKesk7lyWuM40o/HhURXHcd1dcvAoYctMFP6mY63Vf8asD6VzOx+JOcfKoiVFCScis1/jHGGgt4yuDCKQnNkUHerpeL48Hb1dJdxWk5SJChwJPogAJH0qEcSEsvyH3m48ZhHePyXl8LbKP1LV4D95PIZNS91kQbbDEqe6ttpTgZbQ02XXX3T+Fplsc3HFeCR8Tgc6Zmgdqi+zF1ZuJAbiojK9pg6fdWFtQ8Dk9KPR1/Hgfcb6JGedW8Ewaux+Tj1DzkG7j+iSrr4MPbkjHN2CrGgtqJ2uozdyvzE2z6UcGUxl5Ym3dPm54sRz4Nj31jmogci2dRay0ttvpYwLfGjR49vZCUxo6OBqOnolOEj8ROAED3lEj41G6h1vOuC1RbQpUOFkhUhXJx0en6E+vX4VWdtdOo19fmtbXFknTdufV9isLHKc+k4VNWD1SCClv5r8RXodDUwsk/DcIbt/c/t+5XO1Eb3N8zWHfYKx7e6KvM7Uq9zNwkqXfpCCi3W5w8SbPHUPwADl3yvzqHT8IOM5aVAAHSiuyhiETAwLFe8vNyqjufoWBuTtNe9GXFI4J8ZSG1nq26OaFg+GFAfLNeZe0G7+pezlrrV1qlwn1uPRH4L0M8u6mt5DTmPIHr6EV6xUlNXdlfaPW26rmv75bZ6rm6628+0zKKGHloxgrQBzzwjPnVyGUNBa7ZV5Yy4hzd1E9krbGRonY8X/UDKjqTVCzc563B74SvJQg/I8R9VVjC/WSf2c+29BuV7iPC1wrz9oxnynlIiOKOVJPiUhagR1HD616nNtoaaS02kJQkBKUgYAA6Cq7rPQOjtwrCbNrLT0K8Q88SUSUZKD5pUOaT8DQyaziT1Q+IFoA6KZtl0t95s8a62qYzMhSmw8zIZVxIcQRkEEVjbt97g21GlrDtpCkJfuciWm4SmGzlTTaUkNggeKio4HWnRauzHpDTUVyHo/WGvdNwHVFSoNsvjiWRnrwpUDw/KpPR/Zu2l0bqM6jj6fcu99K+8N1vchU2RxfqyvkD64prC1jsyc9pc3Kq12Qds7ptv2eGE3+OuNdbxIVcXo6xhTKFABtCh+rhGT8ayN23bbCidqx1cWK20ZlujOv8Ax3iySkqPqRjJ9K9N6Uu4nZw2x3R1qjVWrIVweuKGUMBTEtTSeFByPdFPimyyF5TJIrsDQrjBuFl0Xs3EuU1bUG1Wq0tuuEAJS22hoHl9PrWNtqNDbt75bk3/tFWPWUfSDkuU7BtSpMH2tfsyfdwgK5JSByz1zmtkaz2907rzb1zRWoBMXZ3Q2l1piQppTiUYwlShzI5DI8cVKaZ01ZtH6Rt+mdPQkQ7ZAZDEdhHRKR/efEn1pjZMoJG5UhbewKyTvV2cd8tbbcSJGod07fqx+0JXNhwPslEZxagn3kocTzBKQeXQnFLTswX87hbL647Nl1mmI/cobsqzuPE4Q4CCtrHUYWEqx/Sr0XpNNdl7aWLut/2i223XO3X0TPb0uQp7jTaHScqw2PdweeR0OTUjZ+Qtd9Ex0XNmCxl2Y9SvbC9qiXprcaM5ZTPZNqkqkp4Qy5xBTayf0KPIK6e8K9MEOIdaS40tK0KAUlSTkEHxBqo662s2/3Kt6YmtdLQLsEDCHXkYdR/RWMKHwzVFhdmfS1pipg2LXO4lqt6T7kKJf3A0geScgkD50yR4kNzoURsMYt0WUtvtQ31/8AlPXrW7ebkuAm/wA1CYq5Ky0AELwOEnGPSqlv9AjzP5ReXb5DKXo8m829LjbgylYUlrIIPUHyrd2hOzptTt7qr70WSxPSL9lSvtW4ylyX+JX4lcSjjJ88eNQWveydtVuLuLM1tfzfUXaWUKWuJPLSUlCQlJSAORwBUwnaHXHayYYnEW9UwE7R7WpTwp260sAPAWtn/wDmuy86Eslx2un6Dtrf2FbJUZcZItSQwY6VcyW+Hkk8z0pVDsj7chYI1NuCB+n7ySP785q/bcbRab2vcnrsFy1DMM0IDn2vc3ZnDw9OHjJ4arH3U49kmU9h7RicZ3G16cf7Rx/0qu9q/QsLbrsIW7SVtuNwuEeHe43DIuDvevL4u8J4lePWtjVTNztsdM7t6F+6erBLNv8AaG5X+CPd0vjRnHveXM05shzAuSOZcEBZb7Dm3uh9UbGXe5ak0dZbrLReFtJkT4bbywkNowAVA8uZ5fGtaWLQGhtMXFVw05o+x2mWpBbL8GC2yspPhxJAOPSkxB7GO1dqirj2q+a4gNrVxlEW+OtJKvMhOAT4VJQOyhoe3XSNOZ1huApyO6h5KXL+6pKikggKHiDjmPEU6RzXEm6SNpa0AhZA7d7ak9qZSyMJXZ4xB88FQr0b0by240+P9mxv/qTS03S7MW2u72sk6n1UbwiemMmLmFK7pJQkkjlwnnz61ys9l3SLMFENOu9yfZ0IDaWvvG8EhIGMYHhjlSve1zGt7JrWFri7uq52x929PaQ2Gu2jWrmw5qK/NiEzDacCnGmyQVuLH5RjkM9SRilT2VOzG9ctu7hqvX0ORbxdVtG3RXElLvcoCv5xST+HiK+QPPAz41pLSfZs2b0de03q36PYm3RJ4hPurq5rwPnxOE8/WmxTeKGtytSmPM7M5FFFFQqVUbVWm5sO5u6q01H76SpIFwtqVcImpSOS0eAeSOQP5h7p8CIiBdYN4tqZ1ve71okoUCkoU2ocihaTzSodCk8xTQqjas0Aq4XBeotKzGrRf+EBxSkZjTwOiJCB19Fj3h5kcq5fG8C80DNT6P7d1oUdZwyGv2VLnMcEpaR0PMVVb9cEwnI0CJDeuV3nKLcC2RiA7KX44J5IQOqnFe6kevKu+43TWcq9x9NQ9CXBvUroIKH+cBlIOC+qSOSmvID3z0wKZui9vrZoKFLvMl1+96hkoBnXVxvLruOYbaQOTbQzyQn4kk868+wrwXNWVDn1QyxtOvc+i6CpxhkMQEZu4qB242rGlXTrPXUyPctTlshBbB9mtTZ6sxknx/U4feWfIYFSWo78q7q9laymKk5CMfjPmr+FVnU+vtRzn1MM6G1i5HSo49ntSiPqSM/H6VBxb/qJxfCjbHXLmeQ44CGgT4AlTnL4+FdBjFVVPjFBhsDmxjS9rXVGkjjDuPUPBd2uuiZZJOtNTMaEiOuNRn2xJvUls4UzDyR3SVeC3iCn0SFnyp9RY0W3W5mHEZbjxo7aW220DCUISMAAeQAqs7f6Wk6b086/diyu93J32u4ONHKUrIwlpB/Q2kBA+BPjVtrrPD+Etw6lDSOd2pWXX1ZqZSeg2XEu721tXCuY0CTgDPWv5rvlrbOFy0j+qr+FSOB5V+e7bPVCfpW2b9FS0UYdSWUHBnJ/sq/hR95LL4zkD4pUP+lSXdNf5tH0oLLR6toP9UUln90aKN+8ll/05B+CVH/pQNSWUnAmpP8AUV/CpINNgcm0D5Cvvdt/oT9KLP7hLouNq8W55aUNyUlSjhIKSM/UV+rk3cXYRTa5DDD+RhbzZWnHwBH99dYSkdABX3wpSCRYpL2OiVMfUOvLtuDL0dFvdmiSoba33pPsCnApPEkJAQXOR97qTVu1NerjpbQBuD77Mua1wIW6G+7Qsk8yE5OPhmq1pnReprd2jNV6wuAhCyTojbEENulTvFkFZUnGEj3R4mpjdawX/U218606ZTFN0cKFMe0uFtAIPUkA1kMpqllLK0OJkOa2vwrhkidKy45dL/qoC07gXuPaY921Dc9OORXkJdLURakuNBWORKjjln600Q4juA6VAJ4eLJ8qQI7N1uskrTGoNNsxX7nbENGfb7m6t6NMcSAS6CrPA4FZIOMenIUyty7VrPUW2ztj0k5DgXGfwsvyJDp4YzZI4yMDKzjIxyzTMOjrIA9s5zaC3x3RUmF5Bj07/wDi4Wt1oUjXabQzbXzaVL7hN5JHcLe8W0nOcgEEnpg9c8qtGrL1M0/pd69RY6JDcbC30Kzybz7yhjy6/DNKRvs4yoWnxFhbo6lXKaSVNl9tgsFfq2ED3SeuDnHjTX0lFvv3DiQdXx4xuCWizIS053rbg6ZyQM5HmKfSsreeOc7jQjoUkhgFnM6bg9V/G462tULQiNTIWHmnUp7lpJ95xxRwlsepUQK7Lrc51t0JJur6Gm5jMUuqQDlCV46eoBpe6a2tv1v15GF3nRH9L2eQ5KtkdClKcccV/i+9BGB3YJxjOTg8sVfNdwLtdNuLxbrEyy9cX46m2G33O7QpR8CrwHXnToBWPie6XR1rADv3+p2TXiJrwG6j+aJP2vc3Vt5LPDuZoS2OvuFIhSYLq3WjxkBKj3gBPTy607rhcHLRphyfJWh5xhkKWoDhClY5nHgM1mexbX7qWS3x2l7Q6BuMqOSsTZk/iecXxFYUSE9c4x8Kfur4Op7rtLJhwIUNy+vR0ZjF8tslzI4kheDgdcHFR0nmxTPDwc9tL97fupajgmQZDy3Vjtc0XKzRZ6UhIfbS4ADnGRml5ujuTK0fdrXYoT1vtz9ySpQud2CvZmQCAfw/iV+z6iuPTs3e62W63WqRoTT/ALLHShlTpvJKwgYGcBHM48PGpXc61a7urMVrTVh0nfYHCfaYN7Cgvj8FNqwRjHIg8/Wp5HTS0ul2vFunyoo2sbLzWI912aCuWobi6+7cdY6c1DDKAUKtkctLbV6++oY/fVykzI0RCVSHUthRwnPifKkvtZt3razbiuajvNm0/piAI6mTbbO6pz2lRxhSsjCQME8uZOOlO+pcPdK6H81uU/KbUtY1/IbhRh1BaR1l/wDLX/Cvn3htH+l/8tf8KkuBH6E/SjgR+hP0q5Z3f+fKg0UeL9az0lf8Cv4V+/tq24J9owAMklCgAPpXbwI/Qn6V9CUjokfSizu6NFyM3SBIOGZKFn9nJrsoop6Rf//Z";
window.__veImgToData=(file,cb)=>{ try{ const img=new Image(); const url=URL.createObjectURL(file);
  img.onload=()=>{ try{ const c=document.createElement("canvas"); const sc=Math.min(1,760/img.width); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc); c.getContext("2d").drawImage(img,0,0,c.width,c.height); cb(c.toDataURL("image/jpeg",0.8)); }catch(e){} URL.revokeObjectURL(url); };
  img.onerror=()=>URL.revokeObjectURL(url); img.src=url; }catch(e){} };
function PPHelper({onApply}){
  const [open,setOpen]=React.useState(false);
  const [aPP,setAPP]=React.useState(""); const [aN,setAN]=React.useState("");
  const [cPP,setCPP]=React.useState(""); const [cN,setCN]=React.useState("");
  const tot=(Number(aPP)||0)*(Number(aN)||0)+(Number(cPP)||0)*(Number(cN)||0);
  if(!open) return <button onClick={()=>setOpen(true)} style={{marginTop:4,background:"transparent",border:"none",padding:0,fontSize:10,color:"#6d28d9",fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>👥 per-person se nikaalo</button>;
  const S={width:70,border:"1px solid #d4e0f5",borderRadius:6,padding:"4px 6px",fontSize:10.5,outline:"none"};
  const row=(lbl,pp,setPP,n,setN)=>(
    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
      <span style={{fontSize:10,color:"#5a6b8c",fontWeight:700,width:38}}>{lbl}</span>
      <span style={{fontSize:10,color:"#9aa7c4"}}>₹</span>
      <input className="mono" type="number" placeholder="/person" value={pp} onChange={e=>setPP(e.target.value)} style={S}/>
      <span style={{fontSize:10,color:"#9aa7c4"}}>×</span>
      <input className="mono" type="number" placeholder="pax" value={n} onChange={e=>setN(e.target.value)} style={{...S,width:42}}/>
    </div>);
  return <div style={{marginTop:6,background:"#faf8ff",border:"1px solid #e2dbfa",borderRadius:8,padding:"8px 10px",maxWidth:250}}>
    {row("Adult",aPP,setAPP,aN,setAN)}
    {row("Child",cPP,setCPP,cN,setCN)}
    <div style={{display:"flex",gap:6,marginTop:2}}>
      <button disabled={!(tot>0)} onClick={()=>{onApply(String(tot));setOpen(false);setAPP("");setAN("");setCPP("");setCN("");}} style={{flex:1,background:tot>0?"#6d28d9":"#e3eaf7",color:tot>0?"#fff":"#9aa7c4",border:"none",borderRadius:6,padding:"5px 8px",fontSize:10.5,fontWeight:800,cursor:tot>0?"pointer":"not-allowed"}}>= ₹{tot.toLocaleString("en-IN")} — Fill ✓</button>
      <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"1px solid #e3eaf7",borderRadius:6,padding:"5px 8px",fontSize:10.5,color:"#7d8bab",cursor:"pointer"}}>✕</button>
    </div>
  </div>;
}
const OCC_CATS=["Adult — Twin Sharing","Adult — Single Occupancy","Adult — Triple Sharing","Child With Bed (2–11 yrs)","Child Without Bed (2–11 yrs)","Infant (0–2 yrs)","Extra Adult / Mattress"];
const emptyRefund = () => ({id:uid(),amount:"",mode:REFUND_MODES[0],reason:REFUND_REASONS[0],approvedBy:REFUND_APPROVERS[0],date:today(),refNo:"",note:""});

// ── CANCELLATION LOG (structured, per lead) ──────────────────────────
// A cancellation is a formal event, not just a refund line. It records how
// many travellers cancelled, the gross value cancelled, the penalty the
// company/suppliers retain, and therefore the refund actually due to the
// client — with a clear full-vs-partial distinction that drives the deal's
// stage automatically.
const CANCEL_REASONS = ["Client Request","Visa Rejection","Medical / Emergency","Supplier / Operational","Payment Not Received","Force Majeure","Other"];
const CANCEL_STATUS = ["Pending","Refund Approved","Refund Processed","No Refund Due","Closed"];
// ── TRAVELLER MODEL (CRM 3.0 — post-booking detail) ──────────────────
// Entered once when a deal is Booked; every component, room, sector and
// cancellation then references travellers by id (checkbox / drag-drop), so a
// name is never retyped. Only first & last name are mandatory.
const TRAVELLER_TYPES = ["Adult","Child (with bed)","Child (without bed)","Infant"];
const SALUTATIONS = ["Mr","Mrs","Ms","Mstr","Miss","Dr"];
const SALUT_GENDER = {Mr:"Male",Mstr:"Male",Mrs:"Female",Ms:"Female",Miss:"Female",Dr:""};
const emptyTraveller = (lead=false) => ({
  id:uid(),
  firstName:"", lastName:"",
  salutation:"Mr", type:"Adult",
  dob:"",
  isLead:lead,
  passportNo:"", idType:"Passport",
  passportIssue:"", passportExpiry:"", nationality:"Indian",
});
const travellerName = (t) => `${t.salutation?t.salutation+" ":""}${(t.firstName||"").trim()} ${(t.lastName||"").trim()}`.trim() || "(unnamed)";

// ── CANCELLATION MODEL (component-level, per lead) ────────────────────
// A cancellation can hit the whole package or specific components, and
// different components can lose a different number of travellers. Each
// affected component is a line whose profit is derived WITHOUT assuming how
// the client's payment was split:
//     My Profit (this component) = Client se rakha (penalty + profit)  −  Vendor ne kaata
// "Vendor ko diya" is pulled live from that component's own vendor payments;
// "Vendor ne kaata" (what the supplier retained) is what the user enters.
const emptyCancelLine = () => ({
  compKind:"", compId:"",      // which component (flight/hotel/land/visa + vendor id)
  paxCancelled:"",             // travellers cancelling this component (Option B: per-component)
  vendorRetained:"",           // ₹ the vendor kept out of what we'd paid them
  vendorPenaltyToClient:"",    // ₹ penalty we charged the CLIENT (separate from profit)
  myProfit:"",                 // ₹ profit we kept for ourselves on this component
  clientRefund:"",             // ₹ going back to the client (auto or manual)
  refundLocked:true,           // when true, clientRefund is auto = clientHeld - penalty - profit... (see compute)
});
const emptyCancellation = () => ({
  id:uid(),
  scope:"full",                // "full" | "components"
  reason:"Client Request",
  status:"Pending",
  date:today(),
  lines:[],                    // array of emptyCancelLine — one per affected component
  refundMode:REFUND_MODES[0],
  approvedBy:REFUND_APPROVERS[0],
  refNo:"",
  note:"",
});
const VENDOR_MODES = ["UPI","Bank Transfer","Cash collected by vendor","Cash deposited by us in vendor account","Cheque","Other"];
const VISA_STATUSES = ["Not Applied","Not Required","In Progress","Approved","Rejected"];
const VISA_STATUS_COLORS = {"Not Applied":"#6b7a99","Not Required":"#5a6b8c","In Progress":"#f59e0b","Approved":"#10b981","Rejected":"#ef4444"};
const QUERY_MODES = ["Call","Website","Sahitya Reference","Vishal Reference","Other Reference"];
const GST_RATE_PROFIT = 0.18;  // 18% on GPM (profit)
const GST_RATE_PACKAGE = 0.05; // 5% on total selling price (package)

const AIRLINE_MAP = {
  "6E":"IndiGo","AI":"Air India","UK":"Vistara","SG":"SpiceJet","G8":"Go First",
  "IX":"Air India Express","QP":"Akasa Air","EK":"Emirates","EY":"Etihad",
  "QR":"Qatar Airways","SQ":"Singapore Airlines","TK":"Turkish Airlines",
  "LH":"Lufthansa","BA":"British Airways","AF":"Air France","KL":"KLM",
  "WY":"Oman Air","FZ":"flydubai","G9":"Air Arabia","VS":"Virgin Atlantic",
  "CX":"Cathay Pacific","MH":"Malaysia Airlines","GA":"Garuda Indonesia",
  "TG":"Thai Airways","VN":"Vietnam Airlines","MU":"China Eastern",
  "CA":"Air China","NH":"ANA","JL":"Japan Airlines","OZ":"Asiana Airlines",
  "AK":"AirAsia","FD":"Thai AirAsia","TR":"Scoot","VJ":"VietJet Air","QZ":"Indonesia AirAsia",
  "PG":"Bangkok Airways","BR":"EVA Air","CI":"China Airlines","CZ":"China Southern",
  "KE":"Korean Air","UL":"SriLankan Airlines","KC":"Air Astana","HY":"Uzbekistan Airways",
  "J2":"Azerbaijan Airlines","GF":"Gulf Air","SV":"Saudia","J9":"Jazeera Airways",
  "LX":"Swiss","OS":"Austrian Airlines","AZ":"ITA Airways","IB":"Iberia","TP":"TAP Air Portugal",
  "AY":"Finnair","SK":"SAS","EI":"Aer Lingus","SU":"Aeroflot","AC":"Air Canada","WS":"WestJet",
  "ET":"Ethiopian Airlines","MS":"EgyptAir","KQ":"Kenya Airways",
};

const AIRPORT_MAP = {
  "DEL":"Delhi (IGI)","BOM":"Mumbai (CSIA)","BLR":"Bengaluru (KIA)","MAA":"Chennai",
  "CCU":"Kolkata","HYD":"Hyderabad","AMD":"Ahmedabad","COK":"Kochi","GOI":"Goa",
  "JAI":"Jaipur","LKO":"Lucknow","ATQ":"Amritsar","VNS":"Varanasi","IXC":"Chandigarh",
  "DXB":"Dubai (DXB)","AUH":"Abu Dhabi","DOH":"Doha","SIN":"Singapore",
  "BKK":"Bangkok (Suvarnabhumi)","DMK":"Bangkok (Don Mueang)","KUL":"Kuala Lumpur",
  "HKG":"Hong Kong","NRT":"Tokyo (Narita)","HND":"Tokyo (Haneda)","ICN":"Seoul (Incheon)",
  "LHR":"London Heathrow","LGW":"London Gatwick","CDG":"Paris","FRA":"Frankfurt",
  "AMS":"Amsterdam","ZUR":"Zurich","VIE":"Vienna","FCO":"Rome","BCN":"Barcelona",
  "MAD":"Madrid","MXP":"Milan","ATH":"Athens","IST":"Istanbul","CAI":"Cairo",
  "JNB":"Johannesburg","NBO":"Nairobi","CMB":"Colombo","DAC":"Dhaka","KTM":"Kathmandu",
  "MLE":"Male","SYD":"Sydney","MEL":"Melbourne","LAX":"Los Angeles","JFK":"New York (JFK)",
  "ORD":"Chicago","YYZ":"Toronto","YVR":"Vancouver","GRU":"Sao Paulo",
  "TBS":"Tbilisi","BUS":"Batumi","GYD":"Baku","EVN":"Yerevan","ALA":"Almaty","NQZ":"Astana",
  "TAS":"Tashkent","HKT":"Phuket","CNX":"Chiang Mai","USM":"Koh Samui","DPS":"Bali (Denpasar)",
  "CGK":"Jakarta","SGN":"Ho Chi Minh City","HAN":"Hanoi","DAD":"Da Nang","REP":"Siem Reap",
  "PNH":"Phnom Penh","SHJ":"Sharjah","MCT":"Muscat","BAH":"Bahrain","KWI":"Kuwait","RUH":"Riyadh",
  "JED":"Jeddah","MUC":"Munich","PRG":"Prague","LIS":"Lisbon","DUB":"Dublin","VCE":"Venice",
  "GVA":"Geneva","PVG":"Shanghai","PEK":"Beijing","TPE":"Taipei","AKL":"Auckland","SXR":"Srinagar",
  "IXL":"Leh","PNQ":"Pune","TRV":"Thiruvananthapuram","RGN":"Yangon","PER":"Perth","BNE":"Brisbane",
};

const ROOM_CATEGORIES = ["Deluxe Room","Superior Room","Standard Room","Junior Suite","Suite","Executive Suite","Presidential Suite","Pool View Room","Sea View Room","Garden View","Mountain View","Studio","Apartment","Villa","Chalet","Bungalow","Tent/Glamping","Other"];

const uid = () => Math.random().toString(36).slice(2,9);
const n = (v) => Number(v)||0;
const sum = (arr, key) => (arr || []).reduce((s, i) => s + (Number(i[key]) || 0), 0);
const toINR = (amount,currency,rate) => currency==="INR"?n(amount):n(amount)*n(rate);
// ── Booked-tier helpers ──────────────────────────────────────────────
// When a client books a specific star-tier, that tier's total price becomes
// the deal's selling price. Cost/vendor tracking stays as-is (vendor-based).
const bookedTierOf = (d) => {
  if(!d || !d.useTiers || !Array.isArray(d.tiers)) return null;
  const t = d.tiers.find(x=>x && x.booked && Number(x.totalPrice)>0);
  return t || null;
};
const tierSellINR = (d) => { const t=bookedTierOf(d); return t?Number(t.totalPrice)||0:null; };
const fmtINR = (val) => "₹"+(Math.round(n(val))).toLocaleString("en-IN");

// ── UNIFIED DEAL STATUS (single source of truth) ─────────────────────
// One list drives everything: pipeline funnel, filters, tabs, reports.
const DEAL_STAGES = ["New Lead","Contacted","Quoted","Negotiation","Booked","Completed","Cancelled","Lost"];
const STAGE_META = {
  "New Lead":{icon:"🆕",color:"#6b7a99",bg:"#eef3fc"},
  "Contacted":{icon:"📞",color:"#4169E1",bg:"#eaf0ff"},
  "Quoted":{icon:"📄",color:"#7c3aed",bg:"#f3ecff"},
  "Negotiation":{icon:"🤝",color:"#f97316",bg:"#fff1e6"},
  "Booked":{icon:"✅",color:"#15803d",bg:"#e6f7ee"},
  "Completed":{icon:"🏁",color:"#0891b2",bg:"#e0f7fb"},
  "Cancelled":{icon:"⛔",color:"#b91c1c",bg:"#fdeaea"},
  "Lost":{icon:"❌",color:"#94a3b8",bg:"#f1f5f9"},
};
// Legacy `status` field kept in sync so older reports keep working.
const STAGE_TO_STATUS = {"New Lead":"Not Actioned","Contacted":"In Progress","Quoted":"Quoted",
  "Negotiation":"In Progress","Booked":"Booked","Completed":"Completed","Cancelled":"Cancelled","Lost":"Cancelled"};
// Read a deal's stage, healing legacy rows that only had `status`.
const stageOf = (d) => {
  if(!d) return "New Lead";
  if(d.stage && DEAL_STAGES.includes(d.stage)) return d.stage;
  if(d.stage==="Travelled") return "Completed";
  const s=d.status||"";
  if(s==="Booked") return "Booked";
  if(s==="Completed") return "Completed";
  if(s==="Cancelled") return "Cancelled";
  if(s==="Quoted") return "Quoted";
  if(s==="In Progress") return "Contacted";
  return "New Lead";
};
const isBookedStage = (d) => { const s=stageOf(d); return s==="Booked"||s==="Completed"; };

// ── MULTI-DESTINATION ENQUIRIES ──────────────────────────────────────
// One client enquiry can carry several destination packages (Dubai +
// Singapore + Bali). Each package stays its own record — so vendors,
// pricing, tiers and PDFs all keep working exactly as before — but they
// share an enquiryId, which is what groups them in the list and lets us
// export one combined quotation.
const enquiryIdOf = (d) => (d && (d.enquiryId || d._localId)) || "";
// Fields that describe the CLIENT, not the package — kept in sync across siblings.
const CLIENT_FIELDS = ["clientName","contactNo","email","leadSource","priority","followUpDate"];
const siblingsOf = (d, all) => {
  const eid = enquiryIdOf(d);
  if(!eid) return d?[d]:[];
  return (all||[]).filter(x=>enquiryIdOf(x)===eid);
};
// Once the client books one destination, the others are effectively off the
// table — so they're frozen (greyed, read-only feel) rather than deleted, and
// can be explicitly re-opened if the client wants a fresh quote on one.
const enquiryHasBooking = (sibs) => (sibs||[]).some(isBookedStage);
const isFrozenPkg = (p, sibs) => enquiryHasBooking(sibs) && !isBookedStage(p) && !p.unfrozen;

// ── DATE INTELLIGENCE ────────────────────────────────────────────────
const _ymd = (v) => { if(!v) return ""; const s=String(v); return s.length>=10?s.slice(0,10):""; };
// Query date = when the enquiry was created (stable; never changes on edit)
const queryDateOf = (d) => _ymd(d && (d.createdAt || d._createdAt || d._savedAt));
// Travel date = earliest of first flight departure / first hotel check-in
const travelDateOf = (d) => {
  if(!d) return "";
  let best="";
  const take=(v)=>{ const x=_ymd(v); if(x && (!best || x<best)) best=x; };
  (d.hotelVendors||[]).forEach(h=>take(h.checkIn));
  (d.flightVendors||[]).forEach(f=>{
    (f.sectors||[]).forEach(s=>take(s.date));
    (f.returnSectors||[]).forEach(s=>take(s.date));
  });
  return best;
};
// Booking date = date the client's FIRST payment landed
const bookingDateOf = (d) => {
  if(!d) return "";
  let best="";
  (d.clientPayments||[]).forEach(p=>{ const x=_ymd(p.date); if(x && (!best || x<best)) best=x; });
  return best;
};
// A booked trip whose travel date has passed is Completed.
const shouldAutoComplete = (d) => {
  if(stageOf(d)!=="Booked") return false;
  const t=travelDateOf(d);
  return !!t && t < new Date().toISOString().slice(0,10);
};

// ── UNIFIED DEAL FINANCE (one formula used everywhere) ───────────────
// Fixes the mismatch where dashboard, booked-rollup and deal list each
// computed "client pending" differently (aggregate vs per-deal netting).
const dealFinance = (d) => {
  const V=[...(d.hotelVendors||[]),...(d.flightVendors||[]),...(d.landVendors||[]),...(d.visaVendors||[])];
  const vendorSell=V.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
  const ts=tierSellINR(d);
  const sell = ts!=null ? ts : vendorSell;
  const cost=V.reduce((s,v)=>s+toINR(v.costPrice,v.currency,v.exchangeRate),0);
  const vendorPaid=V.reduce((s,v)=>s+sum(v.payments||[],"amount"),0);
  const refunded=sum(d.refunds||[],"amount");
  // Cancellations that have reached a confirmed state adjust the booking.
  const cxl=(d.cancellations||[]).filter(c=>["Refund Approved","Refund Processed","No Refund Due","Closed"].includes(c.status));
  const cxlR=cxl.map(c=>cancelCompute(c,d));
  const cxlRefundDue=cxlR.reduce((s,r)=>s+r.refund,0);
  const cxlPenalty=cxlR.reduce((s,r)=>s+r.penalty,0);
  const cxlProfit=cxlR.reduce((s,r)=>s+r.profit,0);                       // profit kept on cancelled parts
  const cxlOrigProfit=cxlR.reduce((s,r)=>s+r.cancelledCompOrigProfit,0);  // original profit of cancelled comps
  const clientRec=sum(d.clientPayments||[],"amount");
  const netSell=sell-refunded;
  const gpm=netSell-cost;
  // Original profit of cancelled components split into their sell/cost parts,
  // so we can show "after cancellation" selling and cost, not just profit.
  const cxlCompSell=cxlR.reduce((s,r)=>s+r.lines.reduce((a,l)=>a+(l.comp.sell||0),0),0);
  const cxlCompCost=cxlR.reduce((s,r)=>s+r.lines.reduce((a,l)=>a+(l.comp.cost||0),0),0);
  // Revised booking profit: remove the cancelled components' original profit,
  // add back what we actually kept on the cancellation.
  const revisedProfit = gpm - cxlOrigProfit + cxlProfit;
  // After-cancellation actuals:
  //   selling  = surviving components' selling + what we kept from client on cancelled parts
  //   cost     = surviving components' cost + what the vendor actually retained on cancelled parts
  const afterSell = (netSell - cxlCompSell) + (cxlPenalty + cxlProfit);
  const afterCost = (cost - cxlCompCost) + cxlR.reduce((s,r)=>s+r.vendorRetained,0);
  const bal=netSell-clientRec;
  return {
    sell, netSell, cost, refunded, gpm,
    vendorPaid, vendorDue:Math.max(0,cost-vendorPaid),
    clientRec,
    clientDue:Math.max(0,bal),        // money still to COLLECT
    clientAdvance:Math.max(0,-bal),   // client overpaid → refundable
    cxlRefundDue, cxlPenalty, cxlProfit, cxlOrigProfit,   // cancellation outcomes
    revisedProfit, hasCxl:cxl.length>0,
    afterSell, afterCost,             // after-cancellation actuals
  };
};
const today = () => new Date().toISOString().split("T")[0];
// Enumerate a deal's real components as pickable cancellation targets, each
// with a human label and the amount already paid to that vendor (from CRM).
const dealComponents = (d) => {
  const out=[];
  const add=(kind,arr,labeler)=>(arr||[]).forEach(v=>{
    const name=(v.name||"").trim();
    out.push({ compKind:kind, compId:v.id, vendorName:name||kind,
      label:labeler(v), paidToVendor:sum(v.payments||[],"amount"),
      cost:toINR(v.costPrice,v.currency,v.exchangeRate),
      sell:toINR(v.sellingPrice,v.currency,v.exchangeRate) });
  });
  add("flight", d.flightVendors, v=>{
    const s=(v.sectors||[]).filter(x=>x.from||x.to);
    const route=s.length?`${s[0].from||"?"}–${s[s.length-1].to||"?"}`:"";
    return `Flight — ${(v.name||"Airline").trim()}${route?" ("+route+")":""}`;
  });
  add("hotel", d.hotelVendors, v=>`Hotel — ${(v.hotelName||v.name||"Stay").trim()}${v.city?" ("+v.city+")":""}`);
  add("land", d.landVendors, v=>`Land — ${(v.name||"Transfers").trim()}`);
  add("visa", d.visaVendors, v=>`Visa — ${(v.name||"Visa").trim()}`);
  return out.filter(c=>c.vendorName||c.cost||c.sell);   // drop fully-empty placeholder rows
};
const compById = (d, kind, id) => dealComponents(d).find(c=>c.compKind===kind && c.compId===id);

// Compute one cancellation's outcome across all its component lines.
//   Per component:  Net profit = (penalty charged to client + own profit) − vendor retained
//   Refund        = the client's paid share for the cancelled travellers, minus what we keep
// Nothing is inferred from a % split of the client's total payment; the refund
// base is the per-traveller share actually attributable to the cancelled pax.
const cancelCompute = (c, d) => {
  const paxTotal=(Number(d.adults)||0)+(Number(d.children)||0)+(Number(d.infants)||0);
  const lines=(c.lines||[]).map(ln=>{
    const comp=compById(d, ln.compKind, ln.compId) || {paidToVendor:0,sell:0,cost:0,vendorName:ln.compId,label:"(removed component)"};
    const nCancel=Number(ln.paxCancelled)||0;
    const vendorRetained=Number(ln.vendorRetained)||0;               // real liability to supplier
    const penalty=Number(ln.vendorPenaltyToClient)||0;              // charged to the client
    const profit=Number(ln.myProfit)||0;                            // kept for us
    // Client's paid share for THIS component's cancelled travellers. Only the
    // cancelled heads count — never the whole component when just a few cancel.
    const perHeadSell = paxTotal>0 ? comp.sell/paxTotal : comp.sell;
    const heads = nCancel>0 ? nCancel : paxTotal;   // full component only if pax not specified
    const clientHeldForComp = Math.round(perHeadSell * heads);
    const clientKept = Math.min(penalty + profit, clientHeldForComp);  // can't keep more than paid share
    let refund = ln.refundLocked ? Math.max(0, clientHeldForComp - clientKept) : (Number(ln.clientRefund)||0);
    // Net profit for the company on this component.
    const netProfit = (penalty + profit) - vendorRetained;
    return { ...ln, comp, nCancel, vendorRetained, penalty, profit, refund,
      paidToVendor:comp.paidToVendor, clientHeldForComp, netProfit,
      isLoss:netProfit<0, label:comp.label };
  });
  const totRefund=lines.reduce((s,l)=>s+l.refund,0);
  const totVendorRetained=lines.reduce((s,l)=>s+l.vendorRetained,0);
  const totPenalty=lines.reduce((s,l)=>s+l.penalty,0);
  const totProfit=lines.reduce((s,l)=>s+l.netProfit,0);
  // Original profit of the components being cancelled (to revise booking profit).
  const cancelledCompOrigProfit=lines.reduce((s,l)=>s+((l.comp.sell||0)-(l.comp.cost||0)),0);
  return { paxTotal, lines,
    refund:totRefund, penalty:totPenalty, vendorRetained:totVendorRetained,
    profit:totProfit, isLoss:totProfit<0, cancelledCompOrigProfit };
};
const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const parseDate = (d) => {
    // agar YYYY-MM-DD hai
    if (d.includes("-")) return new Date(d);

    // agar DD/MM/YYYY hai
    if (d.includes("/")) {
      const [day, month, year] = d.split("/");
      return new Date(`${year}-${month}-${day}`);
    }

    return new Date(d);
  };

  const start = parseDate(checkIn);
  const end = parseDate(checkOut);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diff = end - start;
  const nights = diff / (1000 * 60 * 60 * 24);

  return nights > 0 ? nights : 0;
};
// ─── EMPTY FACTORIES ──────────────────────────────────────────────────────────
const emptyVendor = (isFlight=false) => ({
  id:uid(), name:"", currency:isFlight?"INR":"INR", exchangeRate:"",
  costPrice:"", sellingPrice:"", payments:[],
});
const emptyVisaVendor = () => ({...emptyVendor(), visaStatus:"Not Applied"});
const emptyHotelVendor = () => ({
  id:uid(), name:"", currency:"INR", exchangeRate:"",
  country:"", city:"", hotelName:"", photoUrl:"", starRating:"", roomCategory:"Deluxe Room",
  checkIn:"", checkOut:"", nights:0,
  costPrice:"", sellingPrice:"", payments:[],
});
// ── Tiered options (3★ / 4★ / 5★) — each tier has its own hotels + total price ──
const emptyTierHotel = () => ({ id:uid(), hotelName:"", city:"", photoUrl:"", roomCategory:"" });
const emptyTier = (star, label) => ({
  id:uid(), star, label, enabled:false, booked:false,
  hotels:[emptyTierHotel()],
  totalPrice:"",   // total package selling price for this tier (INR)
});
const defaultTiers = () => ([
  emptyTier(3,"3-Star"),
  emptyTier(4,"4-Star"),
  emptyTier(5,"5-Star"),
]);
const emptyLandVendor = () => ({
  id:uid(), name:"", currency:"INR", exchangeRate:"",
  itinerary:"", costPrice:"", sellingPrice:"", payments:[],
});
const emptyPayment = (modes) => ({id:uid(),amount:"",mode:modes[0],date:today(),note:""});
const emptySector = () => ({
  id:uid(), airlineCode:"", airlineName:"", from:"", fromName:"",
  to:"", toName:"", date:"", depTime:"", arrTime:"",
});
const emptyFlightVendor = () => ({
  id:uid(), name:"", currency:"INR", exchangeRate:"",
  costPrice:"", sellingPrice:"", payments:[],
  flightType:"one-way",
  sectors:[emptySector()],
  returnSectors:[emptySector()],
});

const initDeal = {
  clientName:"", contactNo:"", email:"",
  adults:"2", children:"0", infants:"0", rooms:"1",
  travellers:[],   // CRM 3.0: populated at booking; empty = pre-booking mode
  modeOfQuery:"Call", travelDates:"", destination:"", quoteValidTill:"",
  remarks:"",
  gstMode:"profit",
  gstExemptSections:[],
  status:"Not Actioned",
  stage:"New Lead",
  followUpDate:"",
  leadSource:"",
  priority:"Normal",
  dealNumber:"",
  hotelVendors:[emptyHotelVendor()],
  flightVendors:[emptyFlightVendor()],
  landVendors:[emptyLandVendor()],
  visaVendors:[emptyVisaVendor()],
  clientPayments:[],
  refunds:[],
  cancellations:[],
  pricingRows:[], usePricingTotal:false,
  tiers:defaultTiers(), useTiers:false,
  enquiryId:"",        // shared across every destination package of one client enquiry
  attachments:[],
};

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
const STORAGE_KEY = "travelcrm_deal";
const VENDORS_KEY = "travelcrm_vendors";
const DEALS_KEY = "travelcrm_all_deals";

const loadDeal = () => { try { const d=localStorage.getItem(STORAGE_KEY); return d?JSON.parse(d):null; } catch(e){return null;} };
// Purani-shape deals (missing fields) ko safe banata hai — har array field guaranteed
const normalizeDeal = (d) => { const x={...initDeal,...(d||{})};
  ["hotelVendors","flightVendors","landVendors","visaVendors","clientPayments","refunds","cancellations","attachments","pricingRows","travellers"].forEach(k=>{ if(!Array.isArray(x[k])) x[k]=Array.isArray(initDeal[k])?[]:x[k]===undefined?[]:x[k]; if(x[k]==null) x[k]=[]; });
  // Tiered options — guarantee 3 tiers exist for older deals
  if(!Array.isArray(x.tiers) || x.tiers.length===0) x.tiers = defaultTiers();
  x.tiers = x.tiers.map(t=>({...emptyTier(t.star,t.label),...t, hotels: Array.isArray(t.hotels)&&t.hotels.length?t.hotels:[emptyTierHotel()]}));
  if(typeof x.useTiers!=="boolean") x.useTiers=false;
  // Stable query date — never changes on edit (older deals backfilled from first save)
  if(!x.createdAt) x.createdAt = x._savedAt || new Date().toISOString();
  // Every deal belongs to an enquiry; legacy deals become a one-package enquiry.
  if(!x._localId) x._localId = uid();
  if(!x.enquiryId) x.enquiryId = x._localId;
  // Heal legacy stage/status into the unified list, then auto-complete past trips
  x.stage = stageOf(x);
  if(shouldAutoComplete(x)) x.stage = "Completed";
  // A confirmed full cancellation drives the deal to Cancelled automatically.
  const activeFullCxl=(x.cancellations||[]).some(c=>c.scope==="full" && c.status!=="Pending");
  if(activeFullCxl) x.stage = "Cancelled";
  x.status = STAGE_TO_STATUS[x.stage] || x.status || "Not Actioned";
  return x; };
const saveDeal = (d) => { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); } catch(e){} };
const loadVendorNames = () => { try { const v=localStorage.getItem(VENDORS_KEY); return v?JSON.parse(v):[]; } catch(e){return[];} };
const saveVendorName = (name) => {
  const list = loadVendorNames();
  if(name && !list.includes(name)){ list.push(name); try{localStorage.setItem(VENDORS_KEY,JSON.stringify(list));}catch(e){} }
};
const loadAllDeals = () => { try { const d=localStorage.getItem(DEALS_KEY); const arr=d?JSON.parse(d):[];
  // Auto-advance: a Booked trip whose travel date has passed becomes Completed.
  let changed=false;
  const out=arr.map(x=>{ if(shouldAutoComplete(x)){ changed=true; return {...x,stage:"Completed",status:"Completed"}; } return x; });
  if(changed){ try{ localStorage.setItem(DEALS_KEY, JSON.stringify(out)); }catch(e){} }
  return out; } catch(e){return[];} };
const saveAllDeals = (deals) => {
  try {
    if (!Array.isArray(deals)) return;
    // SAFETY: never overwrite a non-empty deal list with an empty one (prevents accidental wipe).
    const existing = (()=>{ try { return JSON.parse(localStorage.getItem(DEALS_KEY)||"[]"); } catch { return []; } })();
    if (deals.length === 0 && existing.length > 0) {
      console.warn("Refused to overwrite", existing.length, "deals with empty list");
      return;
    }
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
    // Rolling backup so data is recoverable even if something goes wrong.
    localStorage.setItem(DEALS_KEY+"_backup", JSON.stringify({ savedAt:new Date().toISOString(), deals }));
  } catch(e){}
};
// Recover deals from backup if the main store ever ends up emptier than the backup.
const recoverDealsIfNeeded = () => {
  try {
    const main = JSON.parse(localStorage.getItem(DEALS_KEY)||"[]");
    const bk = JSON.parse(localStorage.getItem(DEALS_KEY+"_backup")||"null");
    if (bk && Array.isArray(bk.deals) && bk.deals.length > main.length) {
      localStorage.setItem(DEALS_KEY, JSON.stringify(bk.deals));
      return bk.deals;
    }
  } catch(e){}
  return null;
};

// ─── API LAYER ────────────────────────────────────────────────────────────────
const API_BASE = "https://voyage-crm.onrender.com";

const authHeaders = () => {
  const t = localStorage.getItem("token");
  return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` }
           : { "Content-Type": "application/json" };
};
const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem("ve_user") || "{}"); } catch { return {}; }
};

const leadsAPI = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/api/leads`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch leads: ${res.status}`);
    return res.json();
  },
  create: async (dealData) => {
    const res = await fetch(`${API_BASE}/api/leads`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(dealData),
    });
    if (!res.ok) throw new Error(`Failed to save lead: ${res.status}`);
    return res.json();
  },
  update: async (id, dealData) => {
    const res = await fetch(`${API_BASE}/api/leads/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(dealData),
    });
    if (!res.ok) throw new Error(`Failed to update lead: ${res.status}`);
    return res.json();
  },
  remove: async (id) => {
    const res = await fetch(`${API_BASE}/api/leads/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete lead: ${res.status}`);
    return res.json();
  },
};

const usersAPI = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || `Failed: ${res.status}`);
    return res.json();
  },
  create: async (u) => {
    const res = await fetch(`${API_BASE}/api/users`, { method: "POST", headers: authHeaders(), body: JSON.stringify(u) });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || `Failed: ${res.status}`);
    return data;
  },
  remove: async (id) => {
    const res = await fetch(`${API_BASE}/api/users/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || `Failed: ${res.status}`);
    return data;
  },
};

// Deal status options used in dashboard filtering + deal dropdown
const LEAD_SOURCES = ["WhatsApp","Instagram","Website","Referral","Walk-in","Call","Facebook","Google","Other"];
const PRIORITIES = ["Low","Normal","High","Hot 🔥"];
const ccCard=(border)=>({background:"#f4f7fc",border:"1px solid "+border,borderRadius:10,padding:"14px 16px",cursor:"pointer",transition:"transform .15s"});
const ccNum=(c)=>({fontSize:20,fontWeight:800,color:c,fontFamily:"monospace"});
const ccLbl={fontSize:10,color:"#5a6b8c",marginTop:4,letterSpacing:.3};
const uInp = {background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:7,color:"#1a2c52",padding:"10px 12px",fontSize:13,outline:"none"};

// ─── VENDOR AUTOCOMPLETE INPUT ────────────────────────────────────────────────
function VendorInput({value, onChange, placeholder}) {
  const [show,setShow]=useState(false);
  const [list,setList]=useState([]);
  const ref=useRef();
  useEffect(()=>{
    const all=loadVendorNames();
    setList(value?all.filter(v=>v.toLowerCase().includes(value.toLowerCase())&&v!==value):all);
  },[value]);
  return (
    <div style={{position:"relative"}} ref={ref}>
      <input value={value} onChange={e=>{onChange(e.target.value);setShow(true);}}
        onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),150)}
        placeholder={placeholder||"Vendor name..."} />
      {show&&list.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#eef3fc",border:"1px solid #c2d2ee",borderRadius:6,zIndex:50,maxHeight:160,overflowY:"auto"}}>
          {list.map(v=>(
            <div key={v} onMouseDown={()=>onChange(v)} style={{padding:"7px 10px",cursor:"pointer",fontSize:13,color:"#1a2c52"}}
              onMouseEnter={e=>e.currentTarget.style.background="#dde6f5"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}// ─── RECEIPT COMPONENT ────────────────────────────────────────────────────────
function Receipt({deal, payment, onClose}) {
  const handlePrint=()=>{
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>Receipt</title><style>
      body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1410;max-width:600px;margin:0 auto}
      .logo{font-size:28px;font-weight:900;color:#f97316;letter-spacing:-1px}
      .sub{font-size:11px;color:#6b7a99;letter-spacing:2px;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
      .label{color:#6b7a99;width:50%} .val{font-weight:600;text-align:right}
      .total{font-size:20px;font-weight:800;color:#f97316}
      .footer{margin-top:32px;text-align:center;font-size:11px;color:#5a6b8c}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="logo">✈ Voyage-Ed</div>
      <div class="sub">Payment Receipt</div>
      <hr style="border:none;border-top:2px solid #f97316;margin:16px 0"/>
      <table>
        <tr><td class="label">Receipt No</td><td class="val">RCP-${Date.now()}</td></tr>
        <tr><td class="label">Date</td><td class="val">${payment.date}</td></tr>
        <tr><td class="label">Client Name</td><td class="val">${deal.clientName||"—"}</td></tr>
        <tr><td class="label">Contact</td><td class="val">${deal.contactNo||"—"}</td></tr>
        <tr><td class="label">Package</td><td class="val">${deal.destination||"—"}</td></tr>
        <tr><td class="label">Travel Dates</td><td class="val">${deal.travelDates||"—"}</td></tr>
        <tr><td class="label">Mode of Payment</td><td class="val">${payment.mode}</td></tr>
        ${payment.note?`<tr><td class="label">Reference</td><td class="val">${payment.note}</td></tr>`:""}
        <tr><td colspan="2" style="padding:16px 0">
          <div style="background:#fff7ed;border:2px solid #f97316;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:15px">Amount Received</span>
            <span class="total">₹${n(payment.amount).toLocaleString("en-IN")}</span>
          </div>
        </td></tr>
      </table>
      <div class="footer">Thank you for choosing Voyage-Ed! · This is a computer generated receipt.</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000aa",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:16,padding:32,width:480,maxWidth:"95vw"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:"#f97316",letterSpacing:-1}}>✈ Voyage-Ed</div>
            <div style={{fontSize:10,color:"#6b7a99",letterSpacing:2,textTransform:"uppercase"}}>Payment Receipt</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{borderTop:"2px solid #f97316",paddingTop:16}}>
          {[
            ["Client",deal.clientName||"—"],["Contact",deal.contactNo||"—"],
            ["Package",deal.destination||"—"],["Travel Dates",deal.travelDates||"—"],
            ["Date",payment.date],["Mode",payment.mode],
            ...(payment.note?[["Reference",payment.note]]:[]),
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #d4e0f5",fontSize:13}}>
              <span style={{color:"#6b7a99"}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
          <div style={{background:"#1a0e00",border:"2px solid #f97316",borderRadius:8,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
            <span style={{fontWeight:700,fontSize:15}}>Amount Received</span>
            <span style={{fontFamily:"monospace",fontSize:22,fontWeight:800,color:"#f97316"}}>{fmtINR(payment.amount)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={handlePrint} style={{flex:1,background:"linear-gradient(135deg,#f97316,#f59e0b)",color:"#fff",border:"none",borderRadius:8,padding:"10px",fontWeight:700,cursor:"pointer",fontSize:14}}>🖨 Print / Save PDF</button>
          <button onClick={onClose} style={{padding:"10px 20px",background:"#d4e0f5",border:"1px solid #c2d2ee",color:"#5a6b8c",borderRadius:8,cursor:"pointer",fontWeight:600}}>Close</button>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:"#a9bce0",marginTop:12}}>Computer generated receipt — no signature required</div>
      </div>
    </div>
  );
}

// ─── SECTOR ROW ───────────────────────────────────────────────────────────────
function SectorRow({sector, onChange, onRemove, showRemove, label}) {
  const updAirline = (code) => {
    const upper = code.toUpperCase();
    onChange({...sector, airlineCode:upper, airlineName:AIRLINE_MAP[upper]||sector.airlineName});
  };
  const resolveAirport = (input) => {
    const raw = (input||"").trim();
    const upper = raw.toUpperCase();
    // If it's a known 3-letter code → fill city name
    if (AIRPORT_MAP[upper]) return { code: upper, name: AIRPORT_MAP[upper] };
    // Otherwise treat as a city name → reverse-lookup the code
    const code = getAirportByCity()[raw.toLowerCase()];
    if (code) return { code, name: AIRPORT_MAP[code] };
    return { code: upper, name: "" };
  };
  const updFrom = (input) => {
    const r = resolveAirport(input);
    onChange({...sector, from:r.code, fromName:r.name||sector.fromName});
  };
  const updTo = (input) => {
    const r = resolveAirport(input);
    onChange({...sector, to:r.code, toName:r.name||sector.toName});
  };

  return (
    <div style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:8,padding:12,marginBottom:8}}>
      {label&&<div style={{fontSize:10,color:"#f97316",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>{label}</div>}
      <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr auto",gap:8,alignItems:"end"}}>
        <div>
          <span className="lbl">Airline Code</span>
          <input value={sector.airlineCode} onChange={e=>updAirline(e.target.value)} placeholder="6E" style={{textTransform:"uppercase"}} />
          {sector.airlineName&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2}}>{sector.airlineName}</div>}
        </div>
        <div>
          <span className="lbl">Airline Name</span>
          <input value={sector.airlineName} onChange={e=>onChange({...sector,airlineName:e.target.value})} placeholder="IndiGo" />
        </div>
        <div>
          <span className="lbl">From (IATA)</span>
          <input value={sector.from} onChange={e=>updFrom(e.target.value)} placeholder="DEL" style={{textTransform:"uppercase"}} />
          {sector.fromName&&<div style={{fontSize:10,color:"#4169E1",marginTop:2}}>{sector.fromName}</div>}
        </div>
        <div>
          <span className="lbl">To (IATA)</span>
          <input value={sector.to} onChange={e=>updTo(e.target.value)} placeholder="DXB" style={{textTransform:"uppercase"}} />
          {sector.toName&&<div style={{fontSize:10,color:"#4169E1",marginTop:2}}>{sector.toName}</div>}
        </div>
        <div>
          <span className="lbl">Date</span>
          <input type="date" value={sector.date} onChange={e=>onChange({...sector,date:e.target.value})} />
        </div>
        <div>
          <span className="lbl">Arr Date <span style={{opacity:.55,fontSize:9}}>(next-day ho toh)</span></span>
          <input type="date" value={sector.arrDate||""} onChange={e=>onChange({...sector,arrDate:e.target.value})} />
        </div>
        <div>
          <span className="lbl">Dep Time</span>
          <input value={sector.depTime} onChange={e=>onChange({...sector,depTime:e.target.value})} placeholder="0011" maxLength={4} style={{fontFamily:"monospace"}} />
        </div>
        <div>
          <span className="lbl">Arr Time</span>
          <input value={sector.arrTime} onChange={e=>onChange({...sector,arrTime:e.target.value})} placeholder="0215" maxLength={4} style={{fontFamily:"monospace"}} />
        </div>
        {showRemove&&<button onClick={onRemove} className="btn btn-danger" style={{marginBottom:1}}>✕</button>}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function TravelCRM() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );
  const [screen,setScreen]=useState("dashboard");
  const [allDeals,setAllDeals]=useState(()=>loadAllDeals());
  const [deal,setDeal]=useState(()=>normalizeDeal(loadDeal()));
  const [tab,setTab]=useState("client");
  const [expandedVendor,setExpandedVendor]=useState(null);
  const [receiptPayment,setReceiptPayment]=useState(null);
  const [proposalOpen,setProposalOpen]=useState(false);
  const [duesOpen,setDuesOpen]=useState(false);
  const [propCompareId,setPropCompareId]=useState("");
  const [aiX,setAiX]=useState(null); // "flight"|"hotel"|"land"
  const [aiXText,setAiXText]=useState("");
  const [aiXImgs,setAiXImgs]=useState([]);
  const [aiXBusy,setAiXBusy]=useState(false);
  const [imgHealth,setImgHealth]=useState(null); // null | "checking" | {ok:n, dead:[urls]}
  const [propFlights,setPropFlights]=useState("with");   // with | without | only
  const [propShowPrice,setPropShowPrice]=useState(true);
  const [propCoverUrl,setPropCoverUrl]=useState("");
  const [propCancelMode,setPropCancelMode]=useState("static"); // static | custom
  const [propCancelCustom,setPropCancelCustom]=useState("");
  const [propDays,setPropDays]=useState(null); // null = auto from vendor itinerary; array = day-wise edited
  const [propInc,setPropInc]=useState(null);  // null = auto; string = edited inclusions (one per line)
  const [propExc,setPropExc]=useState(null);  // null = auto; string = edited exclusions
  const [propDayPhotos,setPropDayPhotos]=useState({}); // {dayIndex: dataURL} — day card ke saath photo
  const [saveStatus,setSaveStatus]=useState("");
  const [dirty,setDirty]=useState(false);
  const _dealLoadedRef=useRef(false);
  const _autosaveTimer=useRef(null);
  const [apiLoading,setApiLoading]=useState(false);
  // User management
  const [users,setUsers]=useState([]);
  const [newUser,setNewUser]=useState({email:"",password:"",name:"",role:"agent"});
  const [userMsg,setUserMsg]=useState("");
  const currentUser=getCurrentUser();
  const isAdmin=currentUser.role==="admin";
  // Dashboard date range
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [dateMode,setDateMode]=useState("query");   // query | travel | booking
  const [stageTab,setStageTab]=useState("All");     // deal-list status tab
  const [dealFilter,setDealFilter]=useState("");
  const [dealSearch,setDealSearch]=useState("");
  // AI Assistant
  const [aiOpen,setAiOpen]=useState(false);
  const [aiInput,setAiInput]=useState("");
  const [aiChat,setAiChat]=useState([{role:"assistant",text:"Hi! I'm your Voyage-Ed AI assistant. Tell me what to do — e.g. \"create a deal for Rahul to Dubai\", \"show hot leads\", \"how much do I need to collect?\", or \"draft a follow-up for the current client\"."}]);
  const [aiThinking,setAiThinking]=useState(false);
  // AI Daily Brief
  const [briefText,setBriefText]=useState("");
  const [briefBusy,setBriefBusy]=useState(false);
  // AI itinerary
  const [aiBusy,setAiBusy]=useState(false);
  // AI call script
  const [callScript,setCallScript]=useState("");
  const [callBusy,setCallBusy]=useState(false);
  // Quotation builder
  const [quoteBusy,setQuoteBusy]=useState(false);
  // Live FX rates (foreign→INR, with markup)
  const [fxRates,setFxRates]=useState(()=>{ try{return JSON.parse(localStorage.getItem("ve_fx")||"null")?.rates||null;}catch{return null;} });
  const [aiItinerary,setAiItinerary]=useState("");

  const loadUsers=async()=>{
    try{ const u=await usersAPI.getAll(); setUsers(u); }
    catch(e){ setUserMsg("⚠️ "+e.message); }
  };
  const handleCreateUser=async()=>{
    setUserMsg("");
    if(!newUser.email||!newUser.password){ setUserMsg("⚠️ Email and password required"); return; }
    if(newUser.password.length<6){ setUserMsg("⚠️ Password must be at least 6 characters"); return; }
    try{
      await usersAPI.create(newUser);
      setUserMsg("✅ User created: "+newUser.email);
      setNewUser({email:"",password:"",name:"",role:"agent"});
      loadUsers();
    }catch(e){ setUserMsg("⚠️ "+e.message); }
  };
  const handleDeleteUser=async(id,email)=>{
    if(!window.confirm("Delete user "+email+"? This cannot be undone."))return;
    try{ await usersAPI.remove(id); setUserMsg("✅ Deleted "+email); loadUsers(); }
    catch(e){ setUserMsg("⚠️ "+e.message); }
  };
  const handleLogout=()=>{
    localStorage.removeItem("token"); localStorage.removeItem("ve_user");
    setIsLoggedIn(false);
  };

  // ─── AI ASSISTANT (natural-language command center) ───────────────────────
  const aiContext=()=>{
    // Compact snapshot of current data for the AI to reason over
    const dv=(d)=>[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
    const sellOf=(d)=>{ const ts=tierSellINR(d); return ts!=null?ts:dv(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0); };
    const recvOf=(d)=>sum(d.clientPayments||[],"amount");
    return {
      totalDeals:allDeals.length,
      hotLeads:allDeals.filter(d=>(d.priority==="Hot 🔥"||d.priority==="High")&&!["Booked","Cancelled","Lost"].includes(d.stage||"")).map(d=>d.clientName),
      followUpsDue:allDeals.filter(d=>d.followUpDate&&d.followUpDate<=new Date().toISOString().slice(0,10)).map(d=>({client:d.clientName,date:d.followUpDate})),
      toCollect:allDeals.filter(d=>(d.status||d.stage)==="Booked").reduce((s,d)=>s+Math.max(0,sellOf(d)-recvOf(d)),0),
      currentDeal:deal.clientName?{client:deal.clientName,destination:deal.destination,stage:deal.stage,status:deal.status}:null,
      stages:DEAL_STAGES,
    };
  };

  const runAI=async()=>{
    const q=aiInput.trim(); if(!q) return;
    setAiChat(c=>[...c,{role:"user",text:q}]); setAiInput(""); setAiThinking(true);
    try{
      const system=`You are the AI assistant inside Voyage-Ed Travels CRM. You help the owner run their travel business by hand.
You can either ANSWER a question about their data, or return an ACTION for the app to perform.
Respond with ONLY a JSON object, no markdown, in this shape:
{"reply":"short friendly reply in Hinglish or English","action":{"type":"...","payload":{...}}}
Valid action types (use null if just answering):
- "create_deal": payload {clientName, contactNo?, destination?, stage?, priority?, leadSource?, followUpDate?(YYYY-MM-DD)} — creates a new deal
- "open_filter": payload {filter} where filter is one of "followup","hot","collect","pay" — opens that list on dashboard
- "search_deals": payload {query} — searches deals by name/destination
- "draft_whatsapp": payload {kind} where kind is "quote","followup","payment","confirm" — drafts a WhatsApp for the CURRENT open deal
- "generate_itinerary": payload {} — generates AI itinerary for the CURRENT open deal
- "call_script": payload {} — prepares an AI phone-call script for the CURRENT open deal
- "set_stage": payload {stage} — sets the current open deal's pipeline stage
- "goto": payload {screen} where screen is "dashboard","users"
Current CRM data snapshot: ${JSON.stringify(aiContext())}
Be concise. If asked to do something you have no action for, explain politely in "reply" with action null.`;
      const res=await fetch(`${API_BASE}/api/chat`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,system,messages:[{role:"user",content:q}]}),
      });
      const data=await res.json();
      let text=(data.content&&data.content[0]&&data.content[0].text)||data.error||"";
      let parsed; try{ parsed=JSON.parse(text.replace(/```json|```/g,"").trim()); }catch{ parsed={reply:text||"Sorry, I couldn't process that.",action:null}; }
      setAiChat(c=>[...c,{role:"assistant",text:parsed.reply||"Done."}]);
      if(parsed.action) executeAIAction(parsed.action);
    }catch(e){
      setAiChat(c=>[...c,{role:"assistant",text:"⚠️ AI unavailable. Make sure ANTHROPIC_API_KEY is set on the server. ("+e.message+")"}]);
    }finally{ setAiThinking(false); }
  };

  const executeAIAction=(action)=>{
    const {type,payload={}}=action;
    try{
      if(type==="create_deal"){
        const d={...initDeal,...payload,_localId:uid(),clientName:payload.clientName||"New Client",
          stage:payload.stage||"New Lead",priority:payload.priority||"Normal"};
        setDeal(d); saveDeal(d); setScreen("deal"); setTab("client");
        window.veToast&&window.veToast("✨ Deal created — review & save","success");
      } else if(type==="open_filter"){ setScreen("dashboard"); setDealFilter(payload.filter||""); }
      else if(type==="search_deals"){ setScreen("dashboard"); setDealSearch(payload.query||""); }
      else if(type==="draft_whatsapp"){ if(deal.clientName) waMessage(payload.kind||"followup"); else window.veToast&&window.veToast("Open a deal first","warning"); }
      else if(type==="generate_itinerary"){ if(deal.clientName){ setScreen("deal"); setTab("summary"); generateAIItinerary(); } else window.veToast&&window.veToast("Open a deal first","warning"); }
      else if(type==="call_script"){ if(deal.clientName){ setScreen("deal"); setTab("client"); generateCallScript(); } else window.veToast&&window.veToast("Open a deal first","warning"); }
      else if(type==="set_stage"){ if(deal.clientName) upd("stage",payload.stage); }
      else if(type==="goto"){ setScreen(payload.screen==="users"?"users":"dashboard"); if(payload.screen==="users")loadUsers(); }
    }catch(e){ console.warn("AI action failed:",e?.message); }
  };

  // ─── AI ASSISTANT OVERLAY (renders on every screen) ───────────────────────
  const aiWidgetEl=(
    <>
      {/* Floating button */}
      <button onClick={()=>setAiOpen(o=>!o)} aria-label="AI Assistant"
        style={{position:"fixed",bottom:20,right:20,zIndex:9998,width:60,height:60,borderRadius:"50%",border:"none",cursor:"pointer",
          background:"linear-gradient(135deg,#4169E1,#5b7fff)",boxShadow:"0 10px 30px -6px rgba(124,58,237,.6)",fontSize:26}}>
        {aiOpen?"✕":"🤖"}
      </button>
      {/* Panel */}
      {aiOpen&&(
        <div style={{position:"fixed",bottom:90,right:16,left:16,maxWidth:420,marginLeft:"auto",zIndex:9998,
          background:"#f4f7fc",border:"1px solid #4169E1",borderRadius:16,boxShadow:"0 24px 60px -12px rgba(0,0,0,.7)",
          display:"flex",flexDirection:"column",maxHeight:"min(560px,75vh)",overflow:"hidden"}}>
          <div style={{background:"linear-gradient(135deg,#e8efff,#dfe8ff)",padding:"14px 18px",borderBottom:"1px solid #4169E1"}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1a2c52"}}>🤖 Voyage-Ed AI Assistant</div>
            <div style={{fontSize:11,color:"#5b7fff"}}>Tell me what to do — I'll handle it</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
            {aiChat.map((m,i)=>(
              <div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"85%",
                background:m.role==="user"?"#4169E1":"#eef3fc",color:m.role==="user"?"#fff":"#1a2c52",
                padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.text}</div>
            ))}
            {aiThinking&&<div style={{alignSelf:"flex-start",color:"#5b7fff",fontSize:13,padding:"6px 10px"}}>thinking…</div>}
          </div>
          <div style={{padding:"12px",borderTop:"1px solid #d4e0f5",display:"flex",gap:8}}>
            <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runAI();}}
              placeholder="e.g. create a deal for Rahul to Dubai"
              style={{flex:1,background:"#eef3fc",border:"1px solid #4169E1",borderRadius:9,color:"#1a2c52",padding:"11px 13px",fontSize:14,outline:"none"}}/>
            <button onClick={runAI} disabled={aiThinking} style={{background:"linear-gradient(135deg,#4169E1,#5b7fff)",border:"none",borderRadius:9,color:"#fff",padding:"0 16px",fontWeight:800,cursor:"pointer",fontSize:14}}>➤</button>
          </div>
          {/* Quick suggestion chips */}
          <div style={{padding:"0 12px 12px",display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Show hot leads","How much to collect?","Today's follow-ups","Draft a quote"].map(s=>(
              <span key={s} onClick={()=>{setAiInput(s);}} style={{fontSize:11,background:"#eef3fc",border:"1px solid #4169E1",color:"#4169E1",padding:"5px 10px",borderRadius:20,cursor:"pointer"}}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ─── AI DAILY BUSINESS BRIEF (the CRM briefs YOU every morning) ────────────
  const generateDailyBrief=async()=>{
    setBriefBusy(true); setBriefText("");
    try{
      const dv=(d)=>[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
      const sellOf=(d)=>{ const ts=tierSellINR(d); return ts!=null?ts:dv(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0); };
      const costOf=(d)=>dv(d).reduce((s,v)=>s+toINR(v.costPrice,v.currency,v.exchangeRate),0);
      const recvOf=(d)=>sum(d.clientPayments||[],"amount");
      const paidVOf=(d)=>dv(d).reduce((s,v)=>s+sum(v.payments||[],"amount"),0);
      const today=new Date().toISOString().slice(0,10);

      const booked=allDeals.filter(d=>(d.status||d.stage)==="Booked");
      const snapshot={
        date:today,
        totalLeads:allDeals.length,
        bookedCount:booked.length,
        conversionPct: allDeals.length?((booked.length/allDeals.length)*100).toFixed(1):"0",
        revenueBooked: booked.reduce((s,d)=>s+sellOf(d),0),
        grossProfitBooked: booked.reduce((s,d)=>s+(sellOf(d)-costOf(d)-sum(d.refunds||[],"amount")),0),
        toCollect: booked.reduce((s,d)=>s+Math.max(0,sellOf(d)-recvOf(d)),0),
        toPayVendors: booked.reduce((s,d)=>s+Math.max(0,costOf(d)-paidVOf(d)),0),
        followUpsDueToday: allDeals.filter(d=>d.followUpDate&&d.followUpDate<=today&&!["Booked","Lost","Cancelled","Travelled"].includes(d.stage||"")).map(d=>({client:d.clientName,dest:d.destination,date:d.followUpDate,priority:d.priority})),
        hotLeads: allDeals.filter(d=>(d.priority==="Hot 🔥"||d.priority==="High")&&!["Booked","Lost","Cancelled"].includes(d.stage||"")).map(d=>({client:d.clientName,dest:d.destination,stage:d.stage})),
        stuckInNegotiation: allDeals.filter(d=>d.stage==="Negotiation").map(d=>({client:d.clientName,dest:d.destination})),
        bySource: LEAD_SOURCES.map(s=>({source:s,count:allDeals.filter(d=>d.leadSource===s).length})).filter(x=>x.count>0),
      };

      const system=`You are the Chief of Staff for Voyage-Ed Travels, an Indian travel agency. Read the business data and write a sharp, motivating DAILY BRIEF for the owner (Vishal). Be specific and action-oriented — name clients, amounts, and exactly what to do today. Use short sections with emojis as headers. Keep it under 250 words. Write in friendly Hinglish (mix Hindi+English naturally). Prioritise: money to collect, hot leads to close, follow-ups due, and one smart strategic observation. End with a one-line motivational push.`;
      const userMsg="Here is today's business data:\n"+JSON.stringify(snapshot,null,1);
      const res=await fetch(`${API_BASE}/api/chat`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:900,system,messages:[{role:"user",content:userMsg}]}),
      });
      const data=await res.json();
      const text=(data.content&&data.content[0]&&data.content[0].text)||data.error||"No response";
      setBriefText(text);
    }catch(e){ setBriefText("⚠️ Brief unavailable — make sure ANTHROPIC_API_KEY is set on the server. ("+e.message+")"); }
    finally{ setBriefBusy(false); }
  };

  // ─── PROFESSIONAL QUOTATION / ITINERARY BUILDER (print-to-PDF) ────────────
  // Builds the quotation HTML for ANY deal (not just the open one) so a single
  // enquiry can export every destination package in one document.
  const buildQuoteHTMLFor = async (deal) => {
      // 1. Gather structured data from the deal
      const fmtDate = (d)=>{ if(!d) return ""; try{ return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }catch{return d;} };
      const flights = (deal.flightVendors||[]).flatMap(fv=>{
        const legs=[];
        const sec=(s,kind)=>({kind,airline:[s.airlineCode,s.airlineName||AIRLINE_MAP[(s.airlineCode||"").toUpperCase()]||""].filter(Boolean).join(" "),
          from:s.from,fromName:s.fromName||AIRPORT_MAP[(s.from||"").toUpperCase()]||"",to:s.to,toName:s.toName||"",
          date:s.date,depTime:s.depTime,arrTime:s.arrTime});
        (fv.sectors||[]).forEach(s=>{ if(s.from||s.to) legs.push(sec(s, fv.flightType==="multi-city"?"Flight":"Onward")); });
        if(fv.flightType==="return") (fv.returnSectors||[]).forEach(s=>{ if(s.from||s.to) legs.push(sec(s,"Return")); });
        return legs;
      });
      const rawHotels = (deal.hotelVendors||[]).filter(h=>h.hotelName||h.city).map(h=>({
        name:h.hotelName||"Hotel", city:h.city, country:h.country, room:h.roomCategory,
        checkInRaw:h.checkIn, checkOutRaw:h.checkOut,
        checkIn:fmtDate(h.checkIn), checkOut:fmtDate(h.checkOut), nights:Number(h.nights)||nightsBetween(h.checkIn,h.checkOut),
      }));
      const hotels = rawHotels;
      const totalNights = hotels.reduce((s,h)=>s+(Number(h.nights)||0),0);
      const pax = (Number(deal.adults)||0)+(Number(deal.children)||0);

      // ── Build a DETERMINISTIC day skeleton so days can NEVER mismatch ──
      // Find trip start: earliest hotel check-in, or first flight date.
      const allDates = [...rawHotels.map(h=>h.checkInRaw).filter(Boolean)];
      let tripStart = allDates.sort()[0] || "";
      const totalDays = totalNights>0 ? totalNights+1 : (hotels.length||1);
      const dayMs = 86400000;
      // Map each calendar day → which hotel the guest sleeps in that night (by date range).
      const skeleton = [];
      for(let i=0;i<totalDays;i++){
        let dateStr="", iso="";
        if(tripStart){ const d=new Date(new Date(tripStart).getTime()+i*dayMs); iso=d.toISOString().slice(0,10); dateStr=d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"}); }
        // Hotel for THIS night: check-in <= iso < check-out
        let stayHotel="";
        for(const h of rawHotels){ if(h.checkInRaw && h.checkOutRaw && iso>=h.checkInRaw && iso<h.checkOutRaw){ stayHotel=h.name+(h.city?(", "+h.city):""); break; } }
        skeleton.push({ day:i+1, date:dateStr, hotelTonight: i===totalDays-1 ? "" : stayHotel });
      }

      // Vendor raw itineraries (land vendors often paste the day-wise plan from the supplier)
      const rawItinerary = (deal.landVendors||[]).map(l=>l.itinerary).filter(Boolean).join("\n\n").trim();

      // 2. Ask AI to FILL the fixed skeleton (it must not change day count or hotels)
      const aiInput = {
        destination: deal.destination, travelDates: deal.travelDates, pax,
        daySkeleton: skeleton,   // exact days + dates + which hotel each night — AI MUST keep these
        hotels: hotels.map(h=>({name:h.name,city:h.city,nights:h.nights,checkIn:h.checkIn,checkOut:h.checkOut})),
        flights: flights.map(f=>({kind:f.kind,route:`${f.fromName||f.from} to ${f.toName||f.to}`,date:f.date,dep:f.depTime,arr:f.arrTime})),
        vendorRawItinerary: rawItinerary || "(none provided — generate from destination knowledge)",
      };
      const system = `You are a senior itinerary writer for Voyage-Ed Travels (India). You are given a FIXED day skeleton (daySkeleton) with exact day numbers, dates and which hotel the guest stays each night. You MUST return exactly one entry per skeleton day, keeping the same "day", "date" and "hotel" values — DO NOT add, remove, reorder or renumber days, and DO NOT change which hotel is on which day.
If vendorRawItinerary is provided, USE IT as the source of truth for each day's activities and any timings (pickup times, etc.) — split that raw text across the correct days. Only use your own destination knowledge to fill gaps. NEVER invent specific pickup timings that aren't in the raw itinerary; if no timing is given, omit it.
Return ONLY a JSON object (no markdown), exact shape:
{"subtitle":"city names separated by •","days":[{"day":1,"date":"<from skeleton>","title":"short title","desc":"2-3 vivid sentences of that day's plan","hotel":"<from skeleton hotelTonight>","meals":"e.g. Breakfast + Dinner","note":"practical tip or timing if known"}],"inclusions":["..."],"exclusions":["..."]}
The days array length MUST equal ${skeleton.length}. Inclusions/exclusions: 5-7 each, specific to this trip (flights included?, meal plan, transfers, permits, etc.).`;
      const res = await fetch(`${API_BASE}/api/chat`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:2500,system,messages:[{role:"user",content:JSON.stringify(aiInput)}]}),
      });
      const data = await res.json();
      let parsed;
      try { parsed = JSON.parse(((data.content&&data.content[0]&&data.content[0].text)||"{}").replace(/```json|```/g,"").trim()); }
      catch { parsed = {subtitle:deal.destination,days:[],inclusions:[],exclusions:[]}; }

      // ── ENFORCE the skeleton: guarantee correct day count, dates and hotels ──
      // AI fills content, but day/date/hotel come from our deterministic skeleton so they can never mismatch.
      const aiDays = Array.isArray(parsed.days)?parsed.days:[];
      parsed.days = skeleton.map((sk,i)=>{
        const a = aiDays[i] || {};
        return {
          day: sk.day,
          date: sk.date,                                  // always our date
          title: a.title || "",
          desc: a.desc || "",
          hotel: sk.hotelTonight,                         // always our hotel for that night
          meals: a.meals || (sk.hotelTonight?"Breakfast + Dinner":""),
          note: a.note || "",
        };
      });

      // 3. Build branded print-ready HTML
      return buildQuotationHTML(deal, flights, hotels, parsed, {pax,totalNights,fmtDate,tiers:(deal.useTiers?deal.tiers:[])});
  };

  // Single destination — the currently open package.
  const generateQuotation = async () => {
    if(!deal.clientName){ window.veToast && window.veToast("Add client name first","warning"); return; }
    setQuoteBusy(true);
    try {
      const html = await buildQuoteHTMLFor(deal);
      const w = window.open("","_blank");
      if(!w){ window.veToast && window.veToast("Allow popups to view the quotation","warning"); return; }
      w.document.write(html); w.document.close();
    } catch(e){
      window.veToast && window.veToast("Quotation failed: "+e.message,"error");
    } finally { setQuoteBusy(false); }
  };

  // Every destination in this enquiry, merged into ONE document.
  const generateCombinedQuotation = async () => {
    if(!deal.clientName){ window.veToast && window.veToast("Add client name first","warning"); return; }
    const allNow = loadAllDeals();
    const sibsAll = siblingsOf(deal, allNow);
    // Skip packages the client already passed on — a booked enquiry's PDF
    // should show what they chose (and anything reopened for re-quoting).
    const pkgs = sibsAll
      .filter(p=>!isFrozenPkg(p,sibsAll))
      .filter(p=>(p.destination||"").trim() || (p.hotelVendors||[]).length || (p.flightVendors||[]).length);
    if(pkgs.length<2){ window.veToast && window.veToast("Is enquiry mein sirf ek active destination hai — normal quotation use karo","warning"); return; }
    setQuoteBusy(true);
    try {
      const bodies=[]; const failed=[];
      for(let i=0;i<pkgs.length;i++){
        const p=pkgs[i];
        setQuoteBusy(`Building ${i+1}/${pkgs.length} — ${p.destination||"package"}…`);
        try{
          const html=await buildQuoteHTMLFor(normalizeDeal(p));
          const m=html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          bodies.push({html, inner:m?m[1]:html, dest:p.destination||"Package "+(i+1)});
        }catch(err){ failed.push(p.destination||("Package "+(i+1))); }
      }
      if(!bodies.length) throw new Error("Koi bhi package build nahi hua");
      // Reuse the first document's <head> (all packages share identical CSS),
      // then stack each destination with a print page-break between them.
      const first=bodies[0].html;
      const head=(first.match(/<head[^>]*>[\s\S]*?<\/head>/i)||[""])[0];
      const sep=`<div style="page-break-before:always;height:0"></div>`;
      const combined=`<!DOCTYPE html><html>${head}<body>${bodies.map(b=>b.inner).join(sep)}</body></html>`;
      const w=window.open("","_blank");
      if(!w){ window.veToast && window.veToast("Allow popups to view the quotation","warning"); return; }
      w.document.write(combined); w.document.close();
      window.veToast && window.veToast(`✅ ${bodies.length} destinations ek PDF mein`+(failed.length?` (${failed.join(", ")} skip hue)`:""), failed.length?"warning":"success");
    } catch(e){
      window.veToast && window.veToast("Combined quotation failed: "+e.message,"error");
    } finally { setQuoteBusy(false); }
  };

  // ─── ONE-CLICK WHATSAPP FOLLOW-UP ─────────────────────────────────────────
  const waMessage=(kind)=>{
    const name=deal.clientName||"there";
    const dest=deal.destination||"your trip";
    const sell=[...deal.hotelVendors||[],...deal.flightVendors||[],...deal.landVendors||[],...deal.visaVendors||[]]
      .reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
    const templates={
      quote:`Hi ${name}! 👋 Greetings from Voyage-Ed Travels. Here's your customised quote for ${dest}${sell>0?` — starting at ${fmtINR(sell)} per person`:""}. Shall I share the detailed itinerary? ✈️`,
      followup:`Hi ${name}! 😊 Just following up on your ${dest} plan. Are you ready to proceed, or do you have any questions? We'd love to make this trip happen for you!`,
      payment:`Hi ${name}! Thank you for choosing Voyage-Ed for your ${dest} trip. 🌟 A gentle reminder regarding the pending payment to confirm your booking. Let me know if you need any help!`,
      confirm:`Hi ${name}! 🎉 Your ${dest} booking with Voyage-Ed is confirmed! We'll share all documents shortly. Get ready for an amazing journey! ✈️`,
    };
    const phone=(deal.contactNo||"").replace(/[^0-9]/g,"");
    const num=phone.length===10?"91"+phone:phone;
    const url=`https://wa.me/${num}?text=${encodeURIComponent(templates[kind]||templates.followup)}`;
    window.open(url,"_blank");
  };

  // ─── AI CALL SCRIPT (prep before you dial the client) ─────────────────────
  const generateCallScript=async()=>{
    setCallBusy(true); setCallScript("");
    try{
      const dv=[...deal.hotelVendors||[],...deal.flightVendors||[],...deal.landVendors||[],...deal.visaVendors||[]];
      const sell=dv.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
      const recv=sum(deal.clientPayments||[],"amount");
      const ctx={
        client:deal.clientName||"the client",
        destination:deal.destination||"their trip",
        stage:deal.stage||"New Lead",
        priority:deal.priority||"Normal",
        leadSource:deal.leadSource||"unknown",
        travelDates:deal.travelDates||"",
        adults:deal.adults,children:deal.children,
        quotedPrice: sell>0?sell:null,
        amountReceived: recv>0?recv:null,
        balance: sell-recv>0?sell-recv:null,
        remarks:deal.remarks||"",
      };
      const system=`You are a top travel-sales coach for Voyage-Ed Travels (India). Prepare the owner for a phone call with this client. Output a tight, practical CALL SCRIPT in friendly Hinglish with these sections (use emoji headers):
🎯 Goal of this call (1 line, based on the pipeline stage)
👋 Opening line (warm, personalised)
💬 Key talking points (3-4 bullets using the actual trip + price details)
🛡️ Likely objections & how to answer (2-3, e.g. price, thinking about it, comparing)
✅ Closing / next step (clear ask)
Keep it under 200 words. Be specific with names, destination and amounts. Don't invent facts not given.`;
      const res=await fetch(`${API_BASE}/api/chat`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:800,system,messages:[{role:"user",content:"Client data:\n"+JSON.stringify(ctx,null,1)}]}),
      });
      const data=await res.json();
      const text=(data.content&&data.content[0]&&data.content[0].text)||data.error||"No response";
      setCallScript(text);
    }catch(e){ setCallScript("⚠️ Unavailable — ensure ANTHROPIC_API_KEY is set on the server. ("+e.message+")"); }
    finally{ setCallBusy(false); }
  };

  // ─── AI ITINERARY GENERATOR ───────────────────────────────────────────────
  const generateAIItinerary=async()=>{
    setAiBusy(true); setAiItinerary("");
    try{
      // Build structured flight summary — differentiate onward / return / multi-city
      const flightLines=[];
      (deal.flightVendors||[]).forEach(fv=>{
        const type=fv.flightType||"one-way";
        const fmtSector=(s)=>{
          const air=[s.airlineCode,s.airlineName].filter(Boolean).join(" ");
          const route=[s.fromName||s.from, s.toName||s.to].filter(Boolean).join(" → ");
          const when=[s.date,s.depTime&&("dep "+s.depTime),s.arrTime&&("arr "+s.arrTime)].filter(Boolean).join(", ");
          return [air,route,when].filter(Boolean).join(" | ");
        };
        if(type==="multi-city"){
          (fv.sectors||[]).forEach((s,i)=>{ const t=fmtSector(s); if(t) flightLines.push(`MULTI-CITY leg ${i+1}: ${t}`); });
        } else if(type==="return"){
          (fv.sectors||[]).forEach(s=>{ const t=fmtSector(s); if(t) flightLines.push(`ONWARD: ${t}`); });
          (fv.returnSectors||[]).forEach(s=>{ const t=fmtSector(s); if(t) flightLines.push(`RETURN: ${t}`); });
        } else {
          (fv.sectors||[]).forEach(s=>{ const t=fmtSector(s); if(t) flightLines.push(`ONWARD: ${t}`); });
        }
      });
      // Hotels
      const hotelLines=[];
      (deal.hotelVendors||[]).forEach(hv=>{
        const parts=[hv.hotelName||hv.name, hv.city, hv.country, hv.roomCategory,
          (hv.checkIn&&hv.checkOut)&&(`${hv.checkIn} to ${hv.checkOut}`),
          hv.nights&&(`${hv.nights} nights`)].filter(Boolean);
        if(parts.length) hotelLines.push(parts.join(" | "));
      });
      // Land/sightseeing notes
      const landLines=[];
      (deal.landVendors||[]).forEach(lv=>{ if(lv.itinerary) landLines.push(lv.itinerary); });

      const facts=[
        `Destination: ${deal.destination||"N/A"}`,
        `Travel dates: ${deal.travelDates||"N/A"}`,
        `Travellers: ${deal.adults||0} adults, ${deal.children||0} children, ${deal.infants||0} infants`,
        flightLines.length?`FLIGHTS:\n${flightLines.join("\n")}`:"FLIGHTS: none specified",
        hotelLines.length?`HOTELS:\n${hotelLines.join("\n")}`:"HOTELS: none specified",
        landLines.length?`SIGHTSEEING NOTES:\n${landLines.join("\n")}`:"",
      ].filter(Boolean).join("\n\n");

      const system="You are a senior travel itinerary writer for Voyage-Ed Travels, a premium Indian travel agency. "+
        "Create a polished, client-ready day-by-day itinerary. RULES: "+
        "1) Use the EXACT flight details given — clearly label Onward, Return, and Multi-city legs with airline, route, date and times. "+
        "2) Include a Flights summary section AND a Hotels section with check-in/check-out and meal plan, using ONLY the details provided. "+
        "3) Then a Day-by-Day plan. Do not invent flights or hotels not listed. "+
        "4) Warm, premium tone for Indian travellers. Use clear headings. Output plain text (no markdown tables).";
      const userMsg="Create the itinerary from these confirmed booking details:\n\n"+facts;

      const res=await fetch(`${API_BASE}/api/chat`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:2000, system, messages:[{role:"user",content:userMsg}] }),
      });
      const data=await res.json();
      const text=(data.content&&data.content[0]&&data.content[0].text)||data.error||"No response from AI";
      // Voyage-Ed branded header + footer
      const branded=
`✈️  VOYAGE-ED TRAVELS — Learn · Travel · Explore
────────────────────────────────────────────
${text}
────────────────────────────────────────────
📞 +91 7009659048   |   ✉️ enquiry@voyage-ed.com   |   🌐 www.voyage-ed.com`;
      setAiItinerary(branded);
    }catch(e){ setAiItinerary("⚠️ Error: "+e.message); }
    finally{ setAiBusy(false); }
  };
  
  // Auto-save to localStorage
  useEffect(()=>{
    const t=setTimeout(()=>{ saveDeal(deal); setSaveStatus("Saved"); setTimeout(()=>setSaveStatus(""),1500); },600);
    return ()=>clearTimeout(t);
  },[deal]);

  // Fetch all leads from backend on mount.
  // CRITICAL RULE: localStorage is the DURABLE source of truth. The server can only
  // ADD deals we don't have locally — it can NEVER remove or overwrite local deals.
  // This guarantees leads are never lost on reload, even if the server is asleep,
  // slow, returns an empty list, or errors out.
  useEffect(()=>{
    // 0. Recover from backup first if main store somehow lost deals.
    recoverDealsIfNeeded();
    // 1. Always show local deals immediately (instant, never blank).
    const local = loadAllDeals();
    setAllDeals(local);

    // 2. Then try the server and MERGE additively.
    leadsAPI.getAll()
      .then(serverDeals => {
        if (!Array.isArray(serverDeals)) return;            // bad response → keep local
        if (serverDeals.length === 0 && local.length > 0) return; // empty server (asleep/new) → NEVER wipe local

        const current = loadAllDeals();
        // Index local deals by both ids so we can match reliably.
        const localById = {};
        const localByLocalId = {};
        current.forEach(d => { if(d._id) localById[d._id]=d; if(d._localId) localByLocalId[d._localId]=d; });

        // Start from everything we already have locally (nothing is ever dropped).
        const merged = [...current];
        serverDeals.forEach(sd => {
          sd._localId = sd._localId || sd._id;
          const existing = localById[sd._id] || localByLocalId[sd._localId];
          if (existing) {
            // Update in place — but prefer the newer copy by _savedAt so unsynced local edits aren't lost.
            const idx = merged.indexOf(existing);
            const localNewer = existing._savedAt && sd._savedAt && existing._savedAt > sd._savedAt;
            merged[idx] = localNewer ? { ...sd, ...existing } : { ...existing, ...sd, _localId: existing._localId || sd._localId };
          } else {
            merged.push(sd); // server has a deal we don't → add it
          }
        });
        setAllDeals(merged); saveAllDeals(merged);
      })
      .catch(err => {
        console.warn("Could not fetch leads from server:", err.message);
        // Keep local deals exactly as-is. Never touch localStorage on failure.
      });
    },[]);

  // Fetch live FX rates once per day (foreign→INR incl. markup)
  useEffect(()=>{
    fetch(`${API_BASE}/api/fx-rates`)
      .then(r=>r.json())
      .then(d=>{ if(d&&d.rates){ setFxRates(d.rates); try{localStorage.setItem("ve_fx",JSON.stringify(d));}catch{} } })
      .catch(()=>{ /* keep cached localStorage rates */ });
  },[]);
  const upd=(key,val)=>setDeal(d=>({...d,[key]:val}));
  // ── Dirty tracking + debounced autosave ──
  useEffect(()=>{
    if(!_dealLoadedRef.current){_dealLoadedRef.current=true;return;}
    setDirty(true);
    if(_autosaveTimer.current) clearTimeout(_autosaveTimer.current);
    _autosaveTimer.current=setTimeout(()=>{ if(deal&&deal.clientName) saveToAllDeals(true); },2500);
    return ()=>{ if(_autosaveTimer.current) clearTimeout(_autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[deal]);

  const updH=(id,key,val)=>
    setDeal(d=>({...d,hotelVendors:d.hotelVendors.map(v=>{
      if(v.id!==id) return v;
      let updated={...v,[key]:val};
      if(key==="checkIn"||key==="checkOut") updated.nights=nightsBetween(updated.checkIn,updated.checkOut);
      if(key==="city"){ const c=lookupCountry(val); if(c) updated.country=c; }
      if(key==="currency"){ const r=rateFor(val); if(r) updated.exchangeRate=r; if(val==="INR") updated.exchangeRate=""; }
      return updated;
    })}));
  const addHV=()=>setDeal(d=>({...d,hotelVendors:[...d.hotelVendors,emptyHotelVendor()]}));
  const rmHV=(id)=>setDeal(d=>({...d,hotelVendors:d.hotelVendors.filter(v=>v.id!==id)}));

  // When currency changes, auto-fill the live exchange rate (foreign→INR incl. markup).
  // User can still manually override the rate afterwards.
  const rateFor=(curr)=>{
    if(!curr||curr==="INR") return "";
    if(fxRates && fxRates[curr]) return String(fxRates[curr]);
    return "";
  };
  const withCurrencyRate=(v,key,val)=>{
    const updated={...v,[key]:val};
    if(key==="currency"){ const r=rateFor(val); if(r) updated.exchangeRate=r; if(val==="INR") updated.exchangeRate=""; }
    return updated;
  };
  const updF=(id,key,val)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>v.id===id?withCurrencyRate(v,key,val):v)}));
  const updSector=(vid,idx,sec,sectorData)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>{
    if(v.id!==vid) return v;
    const arr=[...v[sec]]; arr[idx]=sectorData; return {...v,[sec]:arr};
  })}));
  const addSector=(vid,sec)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>v.id===vid?{...v,[sec]:[...v[sec],emptySector()]}:v)}));
  const rmSector=(vid,idx,sec)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>v.id===vid?{...v,[sec]:v[sec].filter((_,i)=>i!==idx)}:v)}));
  const AIX_SYS={
    flight:'You extract flight booking details for a travel agency CRM. From the given image(s)/text (airline PNRs, vendor quotes, screenshots, emails), output ONLY valid JSON, no markdown, no explanation: {"vendorName":string,"costPrice":number|null,"flightType":"one-way|return|multi-city","sectors":[...],"returnSectors":[...]}. Each sector object = {"from":"IATA or city","fromName":string,"to":"IATA or city","toName":string,"date":"YYYY-MM-DD","arrDate":"YYYY-MM-DD or null (only if arrival is a different day)","depTime":"HHMM 24h","arrTime":"HHMM 24h","airlineCode":"2-letter code","airlineName":string}. TRIP TYPE RULES — decide flightType carefully: (1) "return" (round-trip) if the journey goes A→B (with possible connections) and later comes back to the ORIGIN city B→A on a later date — put the OUTBOUND legs in "sectors" and the HOMEBOUND legs in "returnSectors". A connecting/layover stop (e.g. DEL→DOH→YYZ) is still ONE direction, not multi-city. (2) "one-way" if travel goes one direction only and never returns to the origin — all legs in "sectors", leave "returnSectors" empty. (3) "multi-city" only if there are 3+ distinct cities in an open-jaw pattern that is NOT a simple there-and-back (e.g. DEL→BKK, then BKK→SIN, then SIN→DEL, or DEL→LON…PAR→DEL) — put every leg in "sectors" in journey order, leave "returnSectors" empty. Detect the origin as the very first departure city and check whether the final leg lands back there to distinguish return vs multi-city. Missing fields = empty string or null. costPrice = total quoted cost if visible.',
    hotel:'You extract hotel booking details for a travel agency CRM. From the given image(s)/text (hotel quotes, confirmations, screenshots, emails), output ONLY valid JSON, no markdown: {"hotels":[{"vendorName":string,"city":string,"hotelName":string,"starRating":"3|4|5 or empty","roomCategory":string,"checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","costPrice":number|null}]}. One object per hotel/stay. Missing = empty string or null.',
    land:'You extract land package / itinerary details for a travel agency CRM. From the given image(s)/text (DMC quotes, itinerary PDFs/screenshots, emails), output ONLY valid JSON, no markdown: {"vendorName":string,"costPrice":number|null,"itinerary":string}. itinerary must be day-wise plain text, each day starting on a new line as "Day 1: ...", "Day 2: ..." with full activity details preserved. costPrice = total land cost if visible.'
  };
  async function runAIExtract(){
    if(!aiX) return;
    if(!aiXText.trim()&&aiXImgs.length===0){ window.veToast("Pic paste karo ya email text daalo","warning"); return; }
    setAiXBusy(true);
    try{
      const content=[];
      aiXImgs.forEach(d=>{ const m=d.match(/^data:(image\/[a-z]+);base64,(.+)$/); if(m) content.push({type:"image",source:{type:"base64",media_type:m[1],data:m[2]}}); });
      content.push({type:"text",text:(aiXText.trim()||"Extract from the attached image(s).")});
      const res=await fetch(`${API_BASE}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2500,system:AIX_SYS[aiX],messages:[{role:"user",content}]})});
      const data=await res.json();
      const txt=((data.content||[]).map(c=>c.text||"").join("")||"").replace(/```json|```/g,"").trim();
      const j=JSON.parse(txt);
      if(aiX==="flight"){
        const mapSec=(x)=>({from:x.from||"",fromName:x.fromName||"",to:x.to||"",toName:x.toName||"",date:x.date||"",arrDate:x.arrDate||"",depTime:x.depTime||"",arrTime:x.arrTime||"",airlineCode:(x.airlineCode||"").toUpperCase(),airlineName:x.airlineName||""});
        const secs=(j.sectors||[]).map(mapSec);
        let retSecs=(j.returnSectors||[]).map(mapSec);
        if(!secs.length) throw new Error("no sectors");
        // Decide trip type: trust AI, but self-correct obvious cases.
        let ftype=(j.flightType||"").toLowerCase();
        if(!["one-way","return","multi-city"].includes(ftype)){
          // fallback: if last sector lands back at first origin -> return, else one-way/multi
          const orig=(secs[0].from||"").toUpperCase();
          const lastTo=(secs[secs.length-1].to||"").toUpperCase();
          ftype = (retSecs.length||lastTo===orig) ? (retSecs.length?"return":"multi-city") : "one-way";
        }
        // If AI marked return but didn't split, move the homebound legs into returnSectors.
        if(ftype==="return" && !retSecs.length && secs.length>1){
          const orig=(secs[0].from||"").toUpperCase();
          let splitAt=-1;
          for(let i=1;i<secs.length;i++){ if((secs[i].from||"").toUpperCase()===(secs[i-1].to||"").toUpperCase()) continue; }
          // find where a leg departs from the outbound destination back toward origin
          for(let i=1;i<secs.length;i++){ if((secs[i].to||"").toUpperCase()===orig || (secs[i].from||"").toUpperCase()===(secs[secs.length-1].from||"").toUpperCase()){ splitAt=i; break; } }
          if(splitAt>0){ retSecs=secs.splice(splitAt); }
        }
        const nv={...emptyFlightVendor(),name:j.vendorName||"AI Extracted",costPrice:j.costPrice!=null?String(j.costPrice):"",flightType:ftype,sectors:secs,returnSectors:retSecs.length?retSecs:[emptySector()]};
        setDeal(d=>({...d,flightVendors:[...(d.flightVendors||[]),nv]}));
        const tlabel = ftype==="return"?"return (2-way)":ftype==="multi-city"?"multi-city":"one-way";
        window.veToast("✅ "+tlabel+" flight — "+secs.length+(retSecs.length?"+"+retSecs.length:"")+" sector(s) bhar diye. Check kar lo","success");
      }else if(aiX==="hotel"){
        const hs=(j.hotels||[]);
        if(!hs.length) throw new Error("no hotels");
        const nvs=hs.map(h=>({...emptyHotelVendor(),name:h.vendorName||"AI Extracted",city:h.city||"",hotelName:h.hotelName||"",starRating:h.starRating||"",roomCategory:h.roomCategory||"Deluxe Room",checkIn:h.checkIn||"",checkOut:h.checkOut||"",costPrice:h.costPrice!=null?String(h.costPrice):""}));
        setDeal(d=>({...d,hotelVendors:[...(d.hotelVendors||[]),...nvs]}));
        window.veToast("✅ "+nvs.length+" hotel(s) bhar diye — check/edit kar lo","success");
      }else{
        if(!(j.itinerary||"").trim()) throw new Error("no itinerary");
        const nv={...emptyLandVendor(),name:j.vendorName||"AI Extracted",itinerary:j.itinerary,costPrice:j.costPrice!=null?String(j.costPrice):""};
        setDeal(d=>({...d,landVendors:[...(d.landVendors||[]),nv]}));
        window.veToast("✅ Day-wise itinerary bhar di — check/edit kar lo","success");
      }
      setAiX(null); setAiXText(""); setAiXImgs([]);
    }catch(e){
      window.veToast("⚠️ Extract nahi ho paya — pic saaf hai? Ya text paste karke try karo","error");
    }
    setAiXBusy(false);
  }
  const addFV=()=>setDeal(d=>({...d,flightVendors:[...d.flightVendors,emptyFlightVendor()]}));
  const rmFV=(id)=>setDeal(d=>({...d,flightVendors:d.flightVendors.filter(v=>v.id!==id)}));

  const updL=(id,key,val)=>setDeal(d=>({...d,landVendors:d.landVendors.map(v=>v.id===id?withCurrencyRate(v,key,val):v)}));
  const addLV=()=>setDeal(d=>({...d,landVendors:[...d.landVendors,emptyLandVendor()]}));
  const rmLV=(id)=>setDeal(d=>({...d,landVendors:d.landVendors.filter(v=>v.id!==id)}));

  const updVisa=(id,key,val)=>setDeal(d=>({...d,visaVendors:d.visaVendors.map(v=>v.id===id?withCurrencyRate(v,key,val):v)}));
  const addVisaV=()=>setDeal(d=>({...d,visaVendors:[...d.visaVendors,emptyVisaVendor()]}));
  const rmVisaV=(id)=>setDeal(d=>({...d,visaVendors:d.visaVendors.filter(v=>v.id!==id)}));

  const addVPmt=(sec,vid)=>setDeal(d=>({...d,[sec]:d[sec].map(v=>v.id===vid?{...v,payments:[...v.payments,emptyPayment(VENDOR_MODES)]}:v)}));
  const updVPmt=(sec,vid,pid,key,val)=>setDeal(d=>({...d,[sec]:d[sec].map(v=>v.id===vid?{...v,payments:v.payments.map(p=>p.id===pid?{...p,[key]:val}:p)}:v)}));
  const rmVPmt=(sec,vid,pid)=>setDeal(d=>({...d,[sec]:d[sec].map(v=>v.id===vid?{...v,payments:v.payments.filter(p=>p.id!==pid)}:v)}));

  const addCPmt=()=>setDeal(d=>({...d,clientPayments:[...d.clientPayments,emptyPayment(CLIENT_MODES)]}));
  const updCPmt=(pid,key,val)=>setDeal(d=>({...d,clientPayments:d.clientPayments.map(p=>p.id===pid?{...p,[key]:val}:p)}));
  const rmCPmt=(pid)=>setDeal(d=>({...d,clientPayments:d.clientPayments.filter(p=>p.id!==pid)}));
  const exportAllDeals=()=>{
    try{
      const all=loadAllDeals();
      const cur={...deal,_savedAt:deal._savedAt||new Date().toISOString(),_localId:deal._localId||uid()};
      const map={}; all.concat([cur]).forEach(d=>{ if(d&&d._localId) map[d._localId]=d; });
      const list=Object.values(map);
      const blob=new Blob([JSON.stringify({app:"voyage-crm",exportedAt:new Date().toISOString(),count:list.length,deals:list},null,1)],{type:"application/json"});
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
      a.download="voyage-ed-backup-"+new Date().toISOString().slice(0,10)+".json";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      window.veToast && window.veToast(list.length+" deals ka backup download ho gaya — isse Google Drive/email me safe rakho ✅","success");
    }catch(e){ window.veToast && window.veToast("Backup failed: "+e.message,"error"); }
  };
  const importDealsFile=(file)=>{
    const rd=new FileReader();
    rd.onload=()=>{
      try{
        const j=JSON.parse(rd.result);
        const incoming=Array.isArray(j)?j:(j&&Array.isArray(j.deals))?j.deals:null;
        if(!incoming) throw new Error("valid backup file nahi hai");
        const cur=loadAllDeals(); const map={};
        cur.forEach(d=>{ if(d&&d._localId) map[d._localId]=d; });
        let added=0,updated=0;
        incoming.forEach(raw=>{
          const d=normalizeDeal(raw); if(!d._localId){ d._localId=uid(); }
          const ex=map[d._localId];
          if(!ex){ map[d._localId]=d; added++; }
          else if((d._savedAt||"")>(ex._savedAt||"")){ map[d._localId]=d; updated++; }
        });
        const merged=Object.values(map);
        saveAllDeals(merged); setAllDeals(merged);
        window.veToast && window.veToast("Restore done ✅ "+added+" nayi deals, "+updated+" updated (newer). Total: "+merged.length,"success");
      }catch(e){ window.veToast && window.veToast("Restore failed: "+e.message,"error"); }
    };
    rd.readAsText(file);
  };
  const duplicateDeal=()=>{
    const copy=normalizeDeal({...JSON.parse(JSON.stringify(deal)),
      _localId:uid(), _savedAt:new Date().toISOString(), createdAt:new Date().toISOString(),
      clientName:(deal.clientName||"Client")+" (Copy)",
      clientPayments:[], refunds:[], stage:"New Lead", status:"Not Actioned"});
    delete copy._id;
    const all=loadAllDeals(); all.unshift(copy); saveAllDeals(all); setAllDeals(all);
    setDeal(copy); saveDeal(copy);
    window.veToast && window.veToast("Deal duplicate ho gayi — same package, payments/refunds fresh. Client name update kar lo ✏️","success");
  };
  // ── Traveller handlers (CRM 3.0) ──
  const addTraveller=()=>setDeal(d=>{
    if((d.travellers||[]).length>=99){ window.veToast&&window.veToast("Max 99 travellers","warning"); return d; }
    const lead=(d.travellers||[]).length===0;
    return {...d,travellers:[...(d.travellers||[]),emptyTraveller(lead)]};
  });
  const updTraveller=(tid,key,val)=>setDeal(d=>({...d,travellers:(d.travellers||[]).map(t=>{
    if(t.id!==tid) return t;
    const nt={...t,[key]:val};
    if(key==="salutation" && SALUT_GENDER[val]) nt.gender=SALUT_GENDER[val];
    return nt;
  })}));
  const rmTraveller=(tid)=>setDeal(d=>{
    let travellers=(d.travellers||[]).filter(t=>t.id!==tid);
    if(travellers.length && !travellers.some(t=>t.isLead)) travellers=travellers.map((t,i)=>i===0?{...t,isLead:true}:t);
    return {...d,travellers};
  });
  const setLeadTraveller=(tid)=>setDeal(d=>({...d,travellers:(d.travellers||[]).map(t=>({...t,isLead:t.id===tid}))}));
  // Seed travellers from pax counts + lead name when a deal first becomes Booked.
  const seedTravellers=()=>setDeal(d=>{
    if((d.travellers||[]).length) return d;   // already has travellers
    const rows=[];
    const nameParts=(d.clientName||"").trim().split(/\s+/);
    const A=Number(d.adults)||0, C=Number(d.children)||0, I=Number(d.infants)||0;
    for(let i=0;i<A;i++){ const t=emptyTraveller(i===0); if(i===0&&nameParts.length){ t.firstName=nameParts[0]; t.lastName=nameParts.slice(1).join(" "); } rows.push(t); }
    for(let i=0;i<C;i++){ const t=emptyTraveller(); t.type="Child (with bed)"; rows.push(t); }
    for(let i=0;i<I;i++){ const t=emptyTraveller(); t.type="Infant"; rows.push(t); }
    if(!rows.length) rows.push(emptyTraveller(true));
    return {...d,travellers:rows};
  });

  const addRefund=()=>setDeal(d=>({...d,refunds:[...(d.refunds||[]),emptyRefund()]}));
  const updRefund=(rid,key,val)=>setDeal(d=>({...d,refunds:(d.refunds||[]).map(r=>r.id===rid?{...r,[key]:val}:r)}));
  const rmRefund=(rid)=>setDeal(d=>({...d,refunds:(d.refunds||[]).filter(r=>r.id!==rid)}));

  // ── Cancellation handlers (component-level) ──
  const addCancellation=()=>setDeal(d=>({...d,cancellations:[...(d.cancellations||[]),emptyCancellation()]}));
  const updCancellation=(cid,key,val)=>setDeal(d=>{
    let cancellations=(d.cancellations||[]).map(c=>c.id===cid?{...c,[key]:val}:c);
    // When scope flips to "full", auto-load every component as a cancel line.
    if(key==="scope" && val==="full"){
      cancellations=cancellations.map(c=>{
        if(c.id!==cid) return c;
        const comps=dealComponents(d);
        const paxTotal=(Number(d.adults)||0)+(Number(d.children)||0)+(Number(d.infants)||0);
        return {...c, lines: comps.map(comp=>({...emptyCancelLine(), compKind:comp.compKind, compId:comp.compId, paxCancelled:String(paxTotal||"")}))};
      });
    }
    if(key==="scope" && val==="components"){
      cancellations=cancellations.map(c=>c.id===cid?{...c, lines:[]}:c);
    }
    return {...d,cancellations};
  });
  const rmCancellation=(cid)=>setDeal(d=>{
    const next=(d.cancellations||[]).filter(c=>c.id!==cid);
    const stillCancelled=next.some(c=>c.scope==="full" && c.status!=="Pending");
    const nd={...d,cancellations:next};
    if(!stillCancelled && stageOf(d)==="Cancelled") { nd.stage="Booked"; nd.status="Booked"; }
    return nd;
  });
  // Toggle a component in/out of a "components"-scope cancellation.
  const toggleCancelComp=(cid,comp)=>setDeal(d=>({...d,cancellations:(d.cancellations||[]).map(c=>{
    if(c.id!==cid) return c;
    const exists=(c.lines||[]).some(l=>l.compKind===comp.compKind && l.compId===comp.compId);
    const lines=exists
      ? c.lines.filter(l=>!(l.compKind===comp.compKind && l.compId===comp.compId))
      : [...(c.lines||[]), {...emptyCancelLine(), compKind:comp.compKind, compId:comp.compId}];
    return {...c, lines};
  })}));
  const updCancelLine=(cid,compKind,compId,key,val)=>setDeal(d=>({...d,cancellations:(d.cancellations||[]).map(c=>{
    if(c.id!==cid) return c;
    return {...c, lines:(c.lines||[]).map(l=>(l.compKind===compKind && l.compId===compId)?{...l,[key]:val}:l)};
  })}));
  // Confirming a cancellation: move out of Pending and (for full scope) flip stage.
  const confirmCancellation=(cid,newStatus)=>setDeal(d=>{
    const cancellations=(d.cancellations||[]).map(c=>c.id===cid?{...c,status:newStatus}:c);
    const nd={...d,cancellations};
    const c=cancellations.find(x=>x.id===cid);
    if(c && c.scope==="full" && newStatus!=="Pending"){ nd.stage="Cancelled"; nd.status="Cancelled"; }
    return nd;
  });
  const printRefundReceipt=(r)=>{
    const amt=Number(r.amount)||0;
    const w=window.open("","_blank"); if(!w){window.veToast&&window.veToast("Popup blocked","error");return;}
    w.document.write(`<html><head><title>Refund Receipt</title><style>body{font-family:'Segoe UI',sans-serif;background:#eef2f9;padding:30px;display:flex;justify-content:center}
      .card{background:#fff;max-width:560px;width:100%;border-radius:18px;padding:30px 34px;box-shadow:0 10px 40px rgba(13,27,62,.15)}
      table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:9px 4px;border-bottom:1px dashed #e3eaf7;font-size:13px}
      .label{color:#7d8bab;width:42%}.val{color:#0d1b3e;font-weight:700}
      @media print{body{background:#fff;padding:0}.card{box-shadow:none}}</style></head><body><div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <img src="${VE_LOGO}" style="height:40px"/>
        <div style="text-align:right"><div style="font-size:10px;letter-spacing:2px;color:#b91c1c;font-weight:800">REFUND RECEIPT</div><div style="font-size:10px;color:#7d8bab">RFD-${Date.now()}</div></div>
      </div>
      <div style="margin-top:16px;background:#fdf1f1;border-radius:12px;padding:14px 18px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:#b91c1c">₹ ${amt.toLocaleString("en-IN")}</div>
        <div style="font-size:10.5px;color:#7d8bab;letter-spacing:1px">REFUNDED TO CLIENT</div>
      </div>
      <table>
        <tr><td class="label">Client</td><td class="val">${(deal.clientName||"—")}</td></tr>
        <tr><td class="label">Booking Ref</td><td class="val">${(deal.reference||"—")} · ${(deal.destination||"")}</td></tr>
        <tr><td class="label">Date</td><td class="val">${r.date||"—"}</td></tr>
        <tr><td class="label">Mode</td><td class="val">${r.mode||"—"}</td></tr>
        <tr><td class="label">Reason</td><td class="val">${r.reason||"—"}</td></tr>
        <tr><td class="label">UTR / Ref No.</td><td class="val">${r.refNo||"—"}</td></tr>
        <tr><td class="label">Approved By</td><td class="val">${r.approvedBy||"—"}</td></tr>
        ${r.note?`<tr><td class="label">Note</td><td class="val">${r.note}</td></tr>`:""}
      </table>
      <div style="margin-top:18px;font-size:10px;color:#7d8bab;text-align:center">Voyage-Ed Travels · GMADA Aerocity, Mohali · enquiry@voyage-ed.com · +91 70096 59048<br>This is a computer generated refund receipt.</div>
      <div style="text-align:center;margin-top:14px"><button onclick="window.print()" style="background:#0d1b3e;color:#fff;border:none;border-radius:9px;padding:10px 26px;cursor:pointer;font-weight:700">🖨 Print / Save PDF</button></div>
    </div></body></html>`);
    w.document.close();
  };

  const fileInputRef=useRef();
  const handleFiles=(files)=>{
    Array.from(files).forEach(file=>{
      const reader=new FileReader();
      reader.onload=e=>{
        setDeal(d=>({...d,attachments:[...d.attachments,{id:uid(),name:file.name,type:file.type,size:file.size,data:e.target.result}]}));
      };
      reader.readAsDataURL(file);
    });
  };
  const rmAttachment=(id)=>setDeal(d=>({...d,attachments:d.attachments.filter(a=>a.id!==id)}));

  const saveToAllDeals = async (silent) => {
    if (!deal.clientName) { if(!silent){window.veToast && window.veToast("Please enter client name first", "warning");} return; }
    if(!silent) setApiLoading(true);
    // Always keep a local copy first so a deal can NEVER be lost, even if the network fails.
    const persistLocal = (d) => {
      const all = loadAllDeals();
      const idx = all.findIndex(x => (d._id && x._id === d._id) || (d._localId && x._localId === d._localId));
      if (idx >= 0) all[idx] = d; else all.unshift(d);
      // Client details belong to the ENQUIRY, not one package — push them to
      // every sibling destination so they never drift out of sync.
      const eid = enquiryIdOf(d);
      if(eid){
        const patch = {};
        CLIENT_FIELDS.forEach(k=>{ if(d[k]!==undefined) patch[k]=d[k]; });
        for(let i=0;i<all.length;i++){
          const s=all[i];
          if(enquiryIdOf(s)!==eid) continue;
          if((s._localId&&s._localId===d._localId)||(s._id&&s._id===d._id)) continue;
          all[i]={...s,...patch};
        }
      }
      saveAllDeals(all); setAllDeals(all);
      // Race-fix: poora deal replace mat karo (user beech me type kar raha ho sakta hai) — sirf server metadata merge
      setDeal(cur=>{ const merged=normalizeDeal({...cur,_id:d._id||cur._id,_localId:d._localId||cur._localId,_savedAt:d._savedAt}); saveDeal(merged); return merged; });
      return d;
    };
    try {
      const toSave = { ...deal, _localId: deal._localId || uid(), _savedAt: new Date().toISOString() };
      // If this deal already exists on the server (_id present) -> UPDATE; else CREATE.
      const saved = deal._id
        ? await leadsAPI.update(deal._id, toSave)
        : await leadsAPI.create(toSave);
      // Merge server response (gets real _id) but keep our _localId for matching.
      const finalDeal = { ...toSave, ...(saved || {}), _localId: toSave._localId };
      persistLocal(finalDeal);
      setDirty(false);
      setSaveStatus(silent?"Autosaved "+new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"Saved");
      if(!silent) window.veToast && window.veToast("✅ Deal saved successfully!", "success");
    } catch (e) {
      console.error("Save error:", e?.message);
      // Network/auth failed — DO NOT lose the deal. Keep it locally and tell the user clearly.
      const localCopy = { ...deal, _localId: deal._localId || uid(), _savedAt: new Date().toISOString() };
      persistLocal(localCopy);
      window.veToast && window.veToast("⚠️ Saved on this device, but server sync failed. Check login/connection.", "warning");
    } finally {
      if(!silent) setApiLoading(false);
    }
  };

  // Delete a deal everywhere (server + local). Used by the dashboard delete button.
  const deleteDealEverywhere = async (d) => {
    if (!window.confirm(`Delete deal for "${d.clientName||"this client"}"? This cannot be undone.`)) return;
    try { if (d._id) await leadsAPI.remove(d._id); }
    catch(e){ console.warn("Server delete failed:", e?.message); }
    const all = loadAllDeals().filter(x => !((d._id && x._id===d._id) || (d._localId && x._localId===d._localId)));
    saveAllDeals(all); setAllDeals(all);
    window.veToast && window.veToast("Deal deleted", "success");
  };

  // ── Delete ONE destination package from an enquiry ──
  const deletePackage = async (p) => {
    const all0 = loadAllDeals();
    const sibs = siblingsOf(p, all0);
    const label = (p.destination||"").trim() || "this package";
    const isCurrent = (p._localId&&p._localId===deal._localId)||(p._id&&p._id===deal._id);
    if(!window.confirm(`Delete "${label}"?\n\nIs destination ke hotels, flights, pricing aur payments permanently delete ho jayenge. Baaki destinations safe rahenge.`)) return;
    try { if (p._id) await leadsAPI.remove(p._id); }
    catch(e){ console.warn("Server delete failed:", e?.message); }
    const all = all0.filter(x => !((p._id && x._id===p._id) || (p._localId && x._localId===p._localId)));
    saveAllDeals(all); setAllDeals(all);
    if(isCurrent){
      const rest = sibs.filter(x => !((p._id && x._id===p._id) || (p._localId && x._localId===p._localId)));
      if(rest.length) openDeal(rest[0]);          // jump to a surviving destination
      else setScreen("deals");                     // that was the last one
    }
    window.veToast && window.veToast(`🗑️ "${label}" delete ho gaya`,"success");
  };

  // ── Freeze / unfreeze a package the client didn't choose ──
  const setPkgUnfrozen = (p, unfrozen) => {
    const all = loadAllDeals().map(x =>
      ((p._id && x._id===p._id) || (p._localId && x._localId===p._localId)) ? {...x, unfrozen} : x);
    saveAllDeals(all); setAllDeals(all);
    if((p._localId&&p._localId===deal._localId)||(p._id&&p._id===deal._id)){
      setDeal(d=>{ const nd={...d,unfrozen}; saveDeal(nd); return nd; });
    }
    window.veToast && window.veToast(unfrozen?"🔓 Package unfreeze — ab re-quote kar sakte ho":"🔒 Package wapas freeze ho gaya","success");
  };

  const newDeal=()=>{ if(window.confirm("Start a new deal? Current draft is auto-saved.")){const d={...initDeal,createdAt:new Date().toISOString(),_localId:uid()};setDeal(d);saveDeal(d);setTab("client");} };
  const openDeal=(d)=>{ const nd=normalizeDeal(d); setDeal(nd); saveDeal(nd); setScreen("deal"); setTab("client"); };

  // ── Add another destination to the SAME client enquiry ──
  // Client details carry over; vendors, pricing and payments start blank so
  // each destination is quoted, tracked and booked independently.
  const addDestination=()=>{
    if(!(deal.clientName||"").trim()){ window.veToast && window.veToast("Pehle client ka naam bharo","warning"); return; }
    const eid = enquiryIdOf(deal) || uid();
    // Make sure the current package is stamped with the shared enquiry id first.
    const cur = {...deal, enquiryId:eid, _localId:deal._localId||uid()};
    const fresh = normalizeDeal({
      ...initDeal,
      _localId: uid(),
      createdAt: new Date().toISOString(),
      enquiryId: eid,
      clientName: deal.clientName, contactNo: deal.contactNo, email: deal.email,
      leadSource: deal.leadSource, priority: deal.priority, followUpDate: deal.followUpDate,
      adults: deal.adults, children: deal.children, infants: deal.infants,
      destination: "",
      stage: "New Lead", status: "Not Actioned",
    });
    const all = loadAllDeals();
    const idx = all.findIndex(x=>(cur._id&&x._id===cur._id)||(cur._localId&&x._localId===cur._localId));
    if(idx>=0) all[idx]=cur; else all.unshift(cur);
    all.unshift(fresh);
    saveAllDeals(all); setAllDeals(all);
    setDeal(fresh); saveDeal(fresh); setTab("client");
    window.veToast && window.veToast("➕ Naya destination add ho gaya — same client, alag package","success");
  };

  const vendorINR=(v)=>({
    costINR:toINR(v.costPrice,v.currency,v.exchangeRate),
    sellINR:toINR(v.sellingPrice,v.currency,v.exchangeRate),
    paidINR:sum(v.payments,"amount"),
  });
const sectionCalc = (vendors) => (vendors || []).reduce((acc, v) => {
  const { costINR, sellINR, paidINR } = vendorINR(v);
  return {
    cost: acc.cost + costINR,
    sell: acc.sell + sellINR,
    paid: acc.paid + paidINR
  };
}, { cost: 0, sell: 0, paid: 0 });

  const hotel=sectionCalc(deal.hotelVendors);
  const flight=sectionCalc(deal.flightVendors);
  const land=sectionCalc(deal.landVendors);
  const visa=sectionCalc(deal.visaVendors);
  const totalCost=hotel.cost+flight.cost+land.cost+visa.cost;
  const _bookedTierSell=tierSellINR(deal);           // if a star-tier is booked, its price = selling
  const totalSell=_bookedTierSell!=null?_bookedTierSell:(hotel.sell+flight.sell+land.sell+visa.sell);
  const totalPaidToVendors=hotel.paid+flight.paid+land.paid+visa.paid;
  const totalRefunded=sum(deal.refunds||[],"amount");
  const netSell=totalSell-totalRefunded;            // refund => selling cost se minus
  const gpm=netSell-totalCost;                      // => profit se bhi automatically minus
  // Per-component GST exclusion: exempt sections' amounts are subtracted from GST base
  const exempt = deal.gstExemptSections || [];
  const gstSell = netSell - (exempt.includes("flights")?flight.sell:0) - (exempt.includes("hotels")?hotel.sell:0)
    - (exempt.includes("land")?land.sell:0) - (exempt.includes("visa")?visa.sell:0);
  const gstCost = totalCost - (exempt.includes("flights")?flight.cost:0) - (exempt.includes("hotels")?hotel.cost:0)
    - (exempt.includes("land")?land.cost:0) - (exempt.includes("visa")?visa.cost:0);
  const gstGpm = gstSell - gstCost;
  const gst = deal.gstMode === "none" ? 0
    : deal.gstMode === "package" ? gstSell * GST_RATE_PACKAGE
    : (gstGpm > 0 ? gstGpm * GST_RATE_PROFIT : 0);
  const netProfit=gpm-gst;
  const marginPct=totalSell>0?((gpm/totalSell)*100).toFixed(1):"0.0";
  const netMarginPct=totalSell>0?((netProfit/totalSell)*100).toFixed(1):"0.0";
  const totalClientReceived=sum(deal.clientPayments,"amount");
  const netClientReceived=totalClientReceived-totalRefunded;   // wapas diya paisa received se minus
  const balanceFromClient=netSell-netClientReceived;           // = totalSell-totalClientReceived (math same, par net basis pe)
  const balanceToVendors=totalCost-totalPaidToVendors;

  const lbl3={fontSize:9,color:"#6b7a99",letterSpacing:.5,textTransform:"uppercase",marginBottom:3};
  const inp3={width:"100%",border:"1px solid #d4e0f5",borderRadius:8,padding:"7px 8px",fontSize:12,outline:"none",fontFamily:"inherit"};
  const tabs=[
    {id:"client",label:"👤 Client"},
    ...(isBookedStage(deal)?[{id:"travellers",label:"🧑‍🤝‍🧑 Travellers"}]:[]),
    {id:"flights",label:"✈️ Flights"},
    {id:"hotels",label:"🏨 Hotels"},
    {id:"land",label:"🚌 Land"},
    {id:"visa",label:"🛂 Visa"},
    {id:"payments",label:"💰 Payments"},
    {id:"attachments",label:"📎 Attachments"},
    {id:"summary",label:"📋 Summary"},
  ];

  // ── Real-time image health check: modal khulte hi cover+gallery test — dead image PDF tak jaane hi nahi degi ──
  useEffect(()=>{
    if(!proposalOpen){ setImgHealth(null); return; }
    let cancelled=false;
    setImgHealth("checking");
    const urls=[propCover()].concat(propGallery()).filter(Boolean);
    if(!urls.length){ setImgHealth({ok:0,dead:[]}); return; }
    Promise.all(urls.map(u=>new Promise(res=>{
      const im=new Image();
      const t=setTimeout(()=>res({u,ok:false}),8000);
      im.onload=()=>{clearTimeout(t);res({u,ok:true});};
      im.onerror=()=>{clearTimeout(t);res({u,ok:false});};
      im.src=u;
    }))).then(rs=>{ if(!cancelled) setImgHealth({ok:rs.filter(r=>r.ok).length, dead:rs.filter(r=>!r.ok).map(r=>r.u)}); });
    return ()=>{cancelled=true;};
  },[proposalOpen,propCoverUrl,deal&&deal.destination]); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Autosave: 2s debounce after any change — unsaved-state proposals khatam ──
  const _lastSavedRef=useRef("");
  const _asDealRef=useRef(deal); _asDealRef.current=deal;
  useEffect(()=>{
    if(!deal||(!(deal.clientName||"").trim()&&!(deal.destination||"").trim())) return;
    const snap=JSON.stringify({...deal,_savedAt:0});
    if(snap===_lastSavedRef.current) return;
    let t;
    const isTyping=()=>{const a=document.activeElement;return a&&["INPUT","TEXTAREA","SELECT"].indexOf(a.tagName)>=0;};
    const fire=()=>{
      if(isTyping()){ t=setTimeout(fire,5000); return; }  // user type kar raha hai — disturb mat karo
      _lastSavedRef.current=JSON.stringify({..._asDealRef.current,_savedAt:0});
      try{ saveDeal(_asDealRef.current); setSaveStatus("Draft saved · "+new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})); }catch(e){}
    };
    t=setTimeout(fire,10000);
    return ()=>clearTimeout(t);
  },[deal]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }
// ── USERS SCREEN (admin only) ─────────────────────────────────────────────
  // ─── 📊 REPORTS SCREEN (repeat customers, vendor performance, monthly P&L) ──
  if(screen==="reports"){
    const allD = loadAllDeals().map(normalizeDeal);
    const isBooked = (d)=>isBookedStage(d);
    const inr = (x)=>"₹"+Math.round(x).toLocaleString("en-IN");

    // ── 1. REPEAT CUSTOMERS ──
    // A repeat customer is someone who BOOKED more than once — not someone who
    // simply enquired twice. Value counts booked revenue only, never open quotes.
    const byCust = {};
    allD.forEach(d=>{
      const key = (d.contactNo||"").replace(/[^0-9]/g,"").slice(-10) || (d.clientName||"").toLowerCase().trim();
      if(!key) return;
      if(!byCust[key]) byCust[key]={name:d.clientName,phone:d.contactNo,deals:[]};
      if(d.clientName && !byCust[key].name) byCust[key].name=d.clientName;
      if(d.contactNo && !byCust[key].phone) byCust[key].phone=d.contactNo;
      byCust[key].deals.push(d);
    });
    const repeats = Object.values(byCust)
      .map(c=>{
        const bookedDeals=c.deals.filter(isBooked);
        // Count distinct ENQUIRIES, not packages — a client who asked for Dubai +
        // Singapore + Bali in one go is one enquiry, not three repeat visits.
        const bookedTrips=new Set(bookedDeals.map(enquiryIdOf)).size;
        const enquiries=new Set(c.deals.map(enquiryIdOf)).size;
        return {...c, enquiries, booked:bookedTrips,
          total:bookedDeals.reduce((s,d)=>s+dealFinance(d).netSell,0)};
      })
      .filter(c=>c.booked>1)
      .sort((a,b)=>b.total-a.total||b.booked-a.booked);

    // ── 2. VENDOR PERFORMANCE ──
    // Only booked/completed deals count as real business. Per-vendor selling
    // price is often blank when the deal is priced at package/tier level, so a
    // margin is shown ONLY where that vendor actually has a selling price —
    // otherwise it read as a fake loss (cost with zero sell).
    const byVendor = {};
    allD.filter(isBooked).forEach(d=>{
      [...(d.hotelVendors||[]),...(d.flightVendors||[]),...(d.landVendors||[]),...(d.visaVendors||[])].forEach(v=>{
        const raw=(v.name||"").trim(); if(!raw) return;
        const key=raw.toLowerCase();                     // "trip jack" and "Trip Jack" are one vendor
        if(!byVendor[key]) byVendor[key]={name:raw,deals:0,cost:0,paid:0,sell:0,priced:0};
        const c=toINR(v.costPrice,v.currency,v.exchangeRate);
        const s=toINR(v.sellingPrice,v.currency,v.exchangeRate);
        const b=byVendor[key];
        b.deals++; b.cost+=c; b.paid+=sum(v.payments||[],"amount");
        if(s>0){ b.sell+=s; b.priced+=c; }               // margin only on priced lines
      });
    });
    const vendors = Object.values(byVendor)
      .filter(v=>v.cost>0||v.sell>0)                     // drop empty placeholder rows
      .map(v=>({...v, due:Math.max(0,v.cost-v.paid), margin:v.sell>0?v.sell-v.priced:null}))
      .sort((a,b)=>b.cost-a.cost);

    // ── 3. MONTHLY P&L (chronological, refunds net off revenue) ──
    const byMonth = {};
    allD.filter(isBooked).forEach(d=>{
      const dt = bookingDateOf(d)||travelDateOf(d)||queryDateOf(d)||"";
      const key = dt ? dt.slice(0,7) : "0000-00";
      const mon = dt ? new Date(dt).toLocaleDateString("en-GB",{month:"short",year:"numeric"}) : "Undated";
      if(!byMonth[key]) byMonth[key]={key,mon,deals:0,sell:0,cost:0,profit:0};
      const F=dealFinance(d);
      byMonth[key].deals++; byMonth[key].sell+=(F.hasCxl?F.afterSell:F.netSell); byMonth[key].cost+=F.cost; byMonth[key].profit+=(F.hasCxl?F.revisedProfit:F.gpm);
    });
    const months = Object.values(byMonth).sort((a,b)=>a.key.localeCompare(b.key));

    const card = {background:"#fff",border:"1px solid #d4e0f5",borderRadius:12,padding:"18px 20px",marginBottom:18};
    const th = {textAlign:"left",padding:"8px 10px",fontSize:11,letterSpacing:.5,color:"#5a6b8c",borderBottom:"2px solid #d4e0f5"};
    const td = {padding:"9px 10px",fontSize:13,color:"#1a2c52",borderBottom:"1px solid #eef3fc"};

    return (
      <div style={{minHeight:"100vh",background:"#f4f7fc",color:"#1a2c52",fontFamily:"'Segoe UI',sans-serif"}}>
        <style>{dashStyles}</style>
        <div style={{background:"#fff",borderBottom:"1px solid #d4e0f5",padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:3,color:"#f97316",fontWeight:700,marginBottom:4}}>VOYAGE-ED CRM · REPORTS</div>
            <div style={{fontSize:22,fontWeight:800,color:"#0f2350"}}>📊 Business Reports</div>
          </div>
          <button onClick={()=>setScreen("dashboard")} className="btn btn-sm">← Dashboard</button>
        </div>
        <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 20px"}}>

          {/* REPEAT CUSTOMERS */}
          <div style={card}>
            <div style={{fontSize:16,fontWeight:800,color:"#4169E1",marginBottom:4}}>🔁 Repeat Customers</div>
            <div style={{fontSize:12,color:"#6b7a99",marginBottom:14}}>Clients who <b>booked</b> more than once — your most loyal, easiest to upsell. Value = booked revenue only.</div>
            {repeats.length===0 ? <div style={{color:"#6b7a99",fontSize:13}}>No repeat customers yet — koi client abhi tak do baar book nahi hua.</div> :
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>CLIENT</th><th style={th}>PHONE</th><th style={th}>BOOKED TRIPS</th><th style={th}>ENQUIRIES</th><th style={th}>BOOKED VALUE</th></tr></thead>
              <tbody>{repeats.map((c,i)=>(
                <tr key={i}><td style={{...td,fontWeight:700}}>{c.name||"—"}</td><td style={td}>{c.phone||"—"}</td>
                  <td style={td}><span style={{background:"#e6f7ee",color:"#15803d",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{c.booked}×</span></td>
                  <td style={td}>{c.enquiries}</td><td style={{...td,fontWeight:700}}>{inr(c.total)}</td></tr>
              ))}</tbody>
            </table></div>}
          </div>

          {/* VENDOR PERFORMANCE */}
          <div style={card}>
            <div style={{fontSize:16,fontWeight:800,color:"#4169E1",marginBottom:4}}>🤝 Vendor Performance</div>
            <div style={{fontSize:12,color:"#6b7a99",marginBottom:14}}>Booked deals only. <b>Business given</b> = kitna kaam diya · <b>Still to pay</b> = bakaya · Margin sirf wahan dikhta hai jahan us vendor ka selling price bhara hai.</div>
            {vendors.length===0 ? <div style={{color:"#6b7a99",fontSize:13}}>No vendor data yet.</div> :
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>VENDOR</th><th style={th}>TIMES USED</th><th style={th}>BUSINESS GIVEN</th><th style={th}>STILL TO PAY</th><th style={th}>MARGIN</th></tr></thead>
              <tbody>{vendors.map((v,i)=>(
                <tr key={i}><td style={{...td,fontWeight:700}}>{v.name}</td><td style={td}>{v.deals}</td>
                  <td style={td}>{inr(v.cost)}</td>
                  <td style={{...td,fontWeight:700,color:v.due>0?"#b91c1c":"#15803d"}}>{v.due>0?inr(v.due):"Settled"}</td>
                  <td style={{...td,fontWeight:700,color:v.margin===null?"#9aa7c4":v.margin>=0?"#15803d":"#b91c1c"}}>
                    {v.margin===null?<span title="Is vendor ka per-line selling price nahi bhara — deal package/tier level pe priced hai">—</span>:inr(v.margin)}</td></tr>
              ))}</tbody>
            </table></div>}
          </div>

          {/* MONTHLY P&L */}
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:4}}>
              <div style={{fontSize:16,fontWeight:800,color:"#4169E1"}}>💹 Monthly Profit & Loss</div>
              <button onClick={()=>window.print()} className="btn btn-sm">🖨 Print / Save PDF</button>
            </div>
            <div style={{fontSize:12,color:"#6b7a99",marginBottom:14}}>Booked deals grouped by month — your real earnings.</div>
            {months.length===0 ? <div style={{color:"#6b7a99",fontSize:13}}>No booked deals yet.</div> :
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>MONTH</th><th style={th}>BOOKINGS</th><th style={th}>REVENUE</th><th style={th}>COST</th><th style={th}>GROSS PROFIT</th></tr></thead>
              <tbody>{months.map((m,i)=>(
                <tr key={i}><td style={{...td,fontWeight:700}}>{m.mon}</td><td style={td}>{m.deals}</td>
                  <td style={td}>{inr(m.sell)}</td><td style={td}>{inr(m.cost)}</td>
                  <td style={{...td,fontWeight:700,color:m.profit>=0?"#15803d":"#b91c1c"}}>{inr(m.profit)}</td></tr>
              ))}</tbody>
              <tfoot><tr style={{background:"#f4f7fc"}}>
                <td style={{...td,fontWeight:800}}>TOTAL</td>
                <td style={{...td,fontWeight:800}}>{months.reduce((s,m)=>s+m.deals,0)}</td>
                <td style={{...td,fontWeight:800}}>{inr(months.reduce((s,m)=>s+m.sell,0))}</td>
                <td style={{...td,fontWeight:800}}>{inr(months.reduce((s,m)=>s+m.cost,0))}</td>
                <td style={{...td,fontWeight:800,color:months.reduce((s,m)=>s+m.profit,0)>=0?"#15803d":"#b91c1c"}}>{inr(months.reduce((s,m)=>s+m.profit,0))}</td>
              </tr></tfoot>
            </table></div>}
          </div>

        </div>
      </div>
    );
  }

  if(screen==="users"){
    if(!isAdmin){
      return (
        <div style={{minHeight:"100vh",background:"#f4f7fc",color:"#1a2c52",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{fontSize:18,fontWeight:700}}>🔒 Admin access only</div>
          <button onClick={()=>setScreen("dashboard")} className="btn btn-ind">← Back to Dashboard</button>
        </div>
      );
    }
    return (
      <div style={{minHeight:"100vh",background:"#f4f7fc",color:"#1a2c52",fontFamily:"'Segoe UI',sans-serif"}}>
        <style>{dashStyles}</style>
        <div style={{background:"linear-gradient(135deg,#ffffff,#ffffff)",borderBottom:"1px solid #d4e0f5",padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:3,color:"#f97316",fontWeight:700,marginBottom:4}}>VOYAGE-ED CRM · USER MANAGEMENT</div>
            <div style={{fontSize:22,fontWeight:800,color:"#0f2350"}}>Team Members</div>
          </div>
          <button onClick={()=>setScreen("dashboard")} className="btn btn-sm">← Dashboard</button>
        </div>
        <div style={{maxWidth:900,margin:"0 auto",padding:"28px 32px"}}>
          {userMsg&&<div style={{padding:"10px 14px",borderRadius:8,marginBottom:18,fontSize:13,
            background:userMsg.startsWith("✅")?"#e6f7ee":"#fdeaea",
            border:userMsg.startsWith("✅")?"1px solid #16a34a":"1px solid #dc2626",
            color:userMsg.startsWith("✅")?"#15803d":"#b91c1c"}}>{userMsg}</div>}

          {/* Create user */}
          <div style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:12,padding:"22px 24px",marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:700,color:"#0f2350",marginBottom:16}}>➕ Create New User</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
              <input placeholder="Email *" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} style={uInp}/>
              <input placeholder="Password * (min 6)" type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} style={uInp}/>
              <input placeholder="Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} style={uInp}/>
              <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})} style={uInp}>
                <option value="admin">admin</option>
                <option value="sales_manager">sales_manager</option>
                <option value="consultant">consultant</option>
                <option value="agent">agent</option>
                <option value="accounts">accounts</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
            <button onClick={handleCreateUser} className="btn btn-ind">Create User</button>
          </div>

          {/* User list */}
          <div style={{fontSize:12,color:"#6b7a99",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>All Users ({users.length})</div>
          {users.length===0&&<div style={{textAlign:"center",padding:30,color:"#a9bce0",background:"#ffffff",borderRadius:12,border:"1px dashed #d4e0f5"}}>No users loaded. They will appear here.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {users.map(u=>(
              <div key={u._id} style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:10,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{u.name||u.email} {u.email===currentUser.email&&<span style={{fontSize:10,color:"#f97316"}}>(you)</span>}</div>
                  <div style={{fontSize:12,color:"#6b7a99"}}>{u.email} · <span style={{color:"#4169E1"}}>{u.role}</span></div>
                </div>
                {u.email!==currentUser.email&&(
                  <button onClick={()=>handleDeleteUser(u._id,u.email)} style={{background:"#fdeaea",border:"1px solid #dc2626",color:"#b91c1c",borderRadius:7,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>Delete</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

// ── DASHBOARD SCREEN ──────────────────────────────────────────────────────

  // ─── PROPOSAL GENERATOR (client-facing itinerary PDF + WhatsApp) ─────────────
  
  const PROP_KEYMAP = {"kashmir":"kashmir","srinagar":"kashmir","gulmarg":"kashmir","pahalgam":"kashmir","sonamarg":"kashmir","ladakh":"ladakh","leh":"ladakh","pangong":"ladakh","nubra":"ladakh","himachal":"himachal","manali":"himachal","shimla":"himachal","dharamshala":"himachal","kasol":"himachal","spiti":"himachal","dalhousie":"himachal","mcleodganj":"himachal","goa":"goa","kerala":"kerala","munnar":"kerala","alleppey":"kerala","kochi":"kerala","kovalam":"kerala","wayanad":"kerala","thekkady":"kerala","rajasthan":"rajasthan","jaipur":"rajasthan","udaipur":"rajasthan","jodhpur":"rajasthan","jaisalmer":"rajasthan","pushkar":"rajasthan","mount abu":"rajasthan","uttarakhand":"uttarakhand","rishikesh":"uttarakhand","mussoorie":"uttarakhand","nainital":"uttarakhand","auli":"uttarakhand","haridwar":"uttarakhand","jim corbett":"uttarakhand","sikkim":"sikkim-darjeeling","darjeeling":"sikkim-darjeeling","gangtok":"sikkim-darjeeling","pelling":"sikkim-darjeeling","lachung":"sikkim-darjeeling","arunachal":"arunachal-meghalaya","meghalaya":"arunachal-meghalaya","shillong":"arunachal-meghalaya","tawang":"arunachal-meghalaya","cherrapunji":"arunachal-meghalaya","cherrapunjee":"arunachal-meghalaya","north east":"arunachal-meghalaya","northeast":"arunachal-meghalaya","north-east":"arunachal-meghalaya","guwahati":"arunachal-meghalaya","assam":"arunachal-meghalaya","kaziranga":"arunachal-meghalaya","dawki":"arunachal-meghalaya","mawlynnong":"arunachal-meghalaya","jowai":"arunachal-meghalaya","krangsuri":"arunachal-meghalaya","madhya pradesh":"madhya-pradesh","khajuraho":"madhya-pradesh","bandhavgarh":"madhya-pradesh","kanha":"madhya-pradesh","pench":"madhya-pradesh","tamil nadu":"tamil-nadu","chennai":"tamil-nadu","madurai":"tamil-nadu","ooty":"tamil-nadu","rameshwaram":"tamil-nadu","kodaikanal":"tamil-nadu","karnataka":"karnataka","coorg":"karnataka","hampi":"karnataka","mysore":"karnataka","bengaluru":"karnataka","bangalore":"karnataka","gokarna":"karnataka","gujarat":"gujarat","rann":"gujarat","kutch":"gujarat","dwarka":"gujarat","somnath":"gujarat","gir":"gujarat","andaman":"andaman-nicobar","havelock":"andaman-nicobar","port blair":"andaman-nicobar","nicobar":"andaman-nicobar","agra":"delhi-agra-varanasi","taj mahal":"delhi-agra-varanasi","varanasi":"delhi-agra-varanasi","golden triangle":"delhi-agra-varanasi","delhi":"delhi-agra-varanasi","bali":"bali","ubud":"bali","indonesia":"bali","nusa":"bali","seminyak":"bali","kuta":"bali","thailand":"thailand","bangkok":"thailand","phuket":"thailand","pattaya":"thailand","krabi":"thailand","koh samui":"thailand","phi phi":"thailand","vietnam":"vietnam","da nang":"vietnam","danang":"vietnam","hanoi":"vietnam","ho chi minh":"vietnam","phu quoc":"vietnam","hoi an":"vietnam","halong":"vietnam","nha trang":"vietnam","singapore":"singapore","sentosa":"singapore","maldives":"maldives","male":"maldives","dubai":"dubai","abu dhabi":"dubai","uae":"dubai","united arab":"dubai","sharjah":"dubai","sri lanka":"sri-lanka","srilanka":"sri-lanka","colombo":"sri-lanka","kandy":"sri-lanka","ella":"sri-lanka","bentota":"sri-lanka","galle":"sri-lanka","georgia":"georgia","tbilisi":"georgia","kazbegi":"georgia","batumi":"georgia","gudauri":"georgia","armenia":"armenia","yerevan":"armenia","azerbaijan":"azerbaijan","baku":"azerbaijan","kazakhstan":"kazakhstan","almaty":"kazakhstan","astana":"kazakhstan","turkey":"turkey","istanbul":"turkey","cappadocia":"turkey","antalya":"turkey","egypt":"egypt","cairo":"egypt","giza":"egypt","luxor":"egypt","nile":"egypt","sharm":"egypt","kenya":"kenya","masai":"kenya","nairobi":"kenya","south africa":"south-africa","cape town":"south-africa","johannesburg":"south-africa","kruger":"south-africa","seychelles":"seychelles","mahe":"seychelles","praslin":"seychelles","mauritius":"mauritius","victoria falls":"victoria-falls","zimbabwe":"victoria-falls","zambia":"victoria-falls","greece":"greece","santorini":"greece","athens":"greece","mykonos":"greece","crete":"greece","switzerland":"france-switzerland-italy","swiss":"france-switzerland-italy","zurich":"france-switzerland-italy","interlaken":"france-switzerland-italy","france":"france-switzerland-italy","paris":"france-switzerland-italy","italy":"france-switzerland-italy","rome":"france-switzerland-italy","venice":"france-switzerland-italy","milan":"france-switzerland-italy","europe":"france-switzerland-italy","lucerne":"france-switzerland-italy","germany":"germany-austria-hungary","berlin":"germany-austria-hungary","munich":"germany-austria-hungary","austria":"germany-austria-hungary","vienna":"germany-austria-hungary","hungary":"germany-austria-hungary","budapest":"germany-austria-hungary","prague":"prague-budapest-poland","czech":"prague-budapest-poland","poland":"prague-budapest-poland","krakow":"prague-budapest-poland","warsaw":"prague-budapest-poland","norway":"norway-finland","oslo":"norway-finland","finland":"norway-finland","helsinki":"norway-finland","northern lights":"norway-finland","scandinavia":"norway-finland","lapland":"norway-finland","london":"uk-ireland","england":"uk-ireland","scotland":"uk-ireland","united kingdom":"uk-ireland","ireland":"uk-ireland","dublin":"uk-ireland","edinburgh":"uk-ireland","britain":"uk-ireland","russia":"russia","moscow":"russia","petersburg":"russia","japan":"japan-korea","tokyo":"japan-korea","kyoto":"japan-korea","osaka":"japan-korea","korea":"japan-korea","seoul":"japan-korea","new york":"us-east-coast","washington dc":"us-east-coast","boston":"us-east-coast","los angeles":"us-west-coast","san francisco":"us-west-coast","las vegas":"us-west-coast","california":"us-west-coast","hollywood":"us-west-coast","yellowstone":"us-national-parks","grand canyon":"us-national-parks","national parks":"us-national-parks","orlando":"orlando","disney":"orlando","miami":"orlando","florida":"orlando","canada":"eastern-canada","toronto":"eastern-canada","montreal":"eastern-canada","niagara":"eastern-canada","ottawa":"eastern-canada","vancouver":"western-canada","calgary":"western-canada","banff":"western-canada","whistler":"western-canada","queenstown":"nz-queenstown","new zealand":"nz-north-south","auckland":"nz-north-south","christchurch":"nz-north-south","rotorua":"nz-north-south","australia":"australia-sydney-melbourne","sydney":"australia-sydney-melbourne","melbourne":"australia-sydney-melbourne","great barrier reef":"australia-great-barrier-reef","cairns":"australia-great-barrier-reef","whitsundays":"australia-great-barrier-reef","gold coast":"australia-gold-coast","brisbane":"australia-gold-coast","cruise":"cruise","msc":"cruise","world europa":"cruise","costa cruise":"cruise","royal caribbean":"cruise","cordelia":"cruise","mediterranean cruise":"cruise","malaysia":"malaysia","kuala lumpur":"malaysia","langkawi":"malaysia","genting":"malaysia","penang":"malaysia","philippines":"philippines","palawan":"philippines","el nido":"philippines","coron":"philippines","boracay":"philippines","cebu":"philippines","manila":"philippines","sweden":"norway-finland","stockholm":"norway-finland","denmark":"norway-finland","copenhagen":"norway-finland","iceland":"norway-finland","reykjavik":"norway-finland","lofoten":"norway-finland","fjord":"norway-finland","nordic":"norway-finland","scandinavian":"norway-finland","bergen":"norway-finland","tromso":"norway-finland","rovaniemi":"norway-finland","aurora":"norway-finland","arctic":"norway-finland","baltic":"norway-finland"};
  const PROP_DEST_COVER = {"kashmir":"https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1400&q=85","ladakh":"https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=1400&q=85","himachal":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85","goa":"https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1400&q=85","kerala":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85","rajasthan":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85","uttarakhand":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85","sikkim-darjeeling":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=85","arunachal-meghalaya":"https://images.unsplash.com/photo-1593813738953-fb3c93e0769d?w=1400&q=85","madhya-pradesh":"https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1400&q=85","tamil-nadu":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85","karnataka":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85","gujarat":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85","andaman-nicobar":"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=85","delhi-agra-varanasi":"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85","bali":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1400&q=85","thailand":"https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1400&q=85","vietnam":"https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1400&q=85","singapore":"https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1400&q=85","maldives":"https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1400&q=85","dubai":"https://images.unsplash.com/photo-1569669568753-66ae4baf6d58?w=1400&q=85","sri-lanka":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85","georgia":"https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=1400&q=85","armenia":"https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1400&q=85","azerbaijan":"https://images.unsplash.com/photo-1601059625985-6da10d56ec22?w=1400&q=85","kazakhstan":"https://images.unsplash.com/photo-1474401941244-3a13d3107b51?w=1400&q=85","turkey":"https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1400&q=85","egypt":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85","kenya":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1400&q=85","south-africa":"https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1400&q=85","seychelles":"https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=1400&q=85","mauritius":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85","victoria-falls":"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1400&q=85","greece":"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=85","france-switzerland-italy":"https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1400&q=85","germany-austria-hungary":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85","prague-budapest-poland":"https://images.unsplash.com/photo-1541849546-216549ae216d?w=1400&q=85","norway-finland":"https://images.unsplash.com/photo-1663428520845-056989f8a664?w=1400&q=85","uk-ireland":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85","russia":"https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1400&q=85","japan-korea":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85","us-east-coast":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1400&q=85","us-west-coast":"https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1400&q=85","us-national-parks":"https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1400&q=85","orlando":"https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85","eastern-canada":"https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=1400&q=85","western-canada":"https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85","nz-queenstown":"https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=85","nz-north-south":"https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1400&q=85","australia-sydney-melbourne":"https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1400&q=85","australia-great-barrier-reef":"https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=1400&q=85","australia-gold-coast":"https://images.unsplash.com/photo-1524397057410-1e775ed476f3?w=1400&q=85","cruise":"https://images.unsplash.com/photo-1554254648-2d58a1bc3fd5?w=1400&q=85","malaysia":"https://images.unsplash.com/photo-1508062878650-88b52897f298?w=1400&q=85","philippines":"https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1400&q=85"};
  const PROP_GALLERY = {"kashmir":["https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=700&q=80","https://images.unsplash.com/photo-1587474260584-136574528ed5?w=700&q=80"],
    "ladakh":["https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=700&q=80","https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=700&q=80","https://images.unsplash.com/photo-1589308454676-21178b783dc1?w=700&q=80"],
    "himachal":["https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=700&q=80","https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=700&q=80","https://images.unsplash.com/photo-1572213426852-0e4ed8f69e0f?w=700&q=80"],
    "goa":["https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=700&q=80","https://images.unsplash.com/photo-1583294955284-3a9a56b1d427?w=700&q=80","https://images.unsplash.com/photo-1587474260584-136574528ed5?w=700&q=80"],
    "kerala":["https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=700&q=80","https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=700&q=80","https://images.unsplash.com/photo-1590001155093-a3c66f9f85b4?w=700&q=80"],
    "rajasthan":["https://images.unsplash.com/photo-1477587458883-47145ed94245?w=700&q=80","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=700&q=80","https://images.unsplash.com/photo-1599661046827-dacde63e9860?w=700&q=80"],
    "uttarakhand":["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80","https://images.unsplash.com/photo-1564507592333-c60657eea523?w=700&q=80","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=700&q=80"],
    "sikkim-darjeeling":["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80","https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=700&q=80"],
    "arunachal-meghalaya":["https://images.unsplash.com/photo-1609276804051-8c5e906cc430?w=700&q=80","https://images.unsplash.com/photo-1552978534-9d01e1f91517?w=700&q=80","https://images.unsplash.com/photo-1686472886489-1d2d7e08ff9c?w=700&q=80"],
    "madhya-pradesh":["https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=700&q=80","https://images.unsplash.com/photo-1571126770897-2d612d1f7b89?w=700&q=80","https://images.unsplash.com/photo-1530053969600-caed2596d242?w=700&q=80"],
    "tamil-nadu":["https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=700&q=80","https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=700&q=80","https://images.unsplash.com/photo-1597277478408-8df2e6a9a3ce?w=700&q=80"],
    "karnataka":["https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=700&q=80","https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=700&q=80","https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=700&q=80"],
    "gujarat":["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80","https://images.unsplash.com/photo-1477587458883-47145ed94245?w=700&q=80","https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=700&q=80"],
    "andaman-nicobar":["https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80","https://images.unsplash.com/photo-1534710961216-75c88202f43e?w=700&q=80","https://images.unsplash.com/photo-1583212292454-1d6a5b13cca1?w=700&q=80"],
    "delhi-agra-varanasi":["https://images.unsplash.com/photo-1564507592333-c60657eea523?w=700&q=80","https://images.unsplash.com/photo-1587474260584-136574528ed5?w=700&q=80","https://images.unsplash.com/photo-1561361513-2d8efce48e9e?w=700&q=80"],
    "bali":["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=700&q=80","https://images.unsplash.com/photo-1604999333679-b86d54738315?w=700&q=80","https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=700&q=80"],
    "thailand":["https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=700&q=80","https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?w=700&q=80","https://images.unsplash.com/photo-1534008897995-27a23e859048?w=700&q=80"],
    "vietnam":["https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=700&q=80","https://images.unsplash.com/photo-1563354860-799d15199ac3?w=700&q=80","https://images.unsplash.com/photo-1741138327956-dfa75763b50d?w=700&q=80"],
    "singapore":["https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=700&q=80","https://images.unsplash.com/photo-1540202404-a2f29016b523?w=700&q=80","https://images.unsplash.com/photo-1565967511849-76a60a516170?w=700&q=80"],
    "maldives":["https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=700&q=80","https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80","https://images.unsplash.com/photo-1540202404-a2f29016b523?w=700&q=80"],
    "dubai":["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&q=80","https://images.unsplash.com/photo-1518684079-3c830dcef090?w=700&q=80","https://images.unsplash.com/photo-1546412414-e1885e51cfa5?w=700&q=80"],
    "sri-lanka":["https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=700&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80","https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=700&q=80"],
    "georgia":["https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=700&q=80","https://images.unsplash.com/photo-1567103472667-6898f3a79cf2?w=700&q=80","https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=700&q=80"],
    "armenia":["https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=700&q=80","https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=700&q=80","https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=700&q=80"],
    "azerbaijan":["https://images.unsplash.com/photo-1601059625985-6da10d56ec22?w=700&q=80","https://images.unsplash.com/photo-1593011951104-f30e76c2c4cd?w=700&q=80","https://images.unsplash.com/photo-1558618047-3c8c76ca0d31?w=700&q=80"],
    "kazakhstan":["https://images.unsplash.com/photo-1474401941244-3a13d3107b51?w=700&q=80","https://images.unsplash.com/photo-1596397360628-7b27e25c5cbf?w=700&q=80","https://images.unsplash.com/photo-1609825488888-3a766db05542?w=700&q=80"],
    "turkey":["https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=700&q=80","https://images.unsplash.com/photo-1545241047-6083a3684587?w=700&q=80","https://images.unsplash.com/photo-1502301197179-65228ab57f78?w=700&q=80"],
    "egypt":["https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=700&q=80","https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=700&q=80"],
    "kenya":["https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=700&q=80","https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=700&q=80","https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=700&q=80"],
    "south-africa":["https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=700&q=80","https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=700&q=80","https://images.unsplash.com/photo-1517783999520-f068d7431a60?w=700&q=80"],
    "seychelles":["https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=700&q=80","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80","https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80"],
    "mauritius":["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80","https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80","https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80"],
    "victoria-falls":["https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=700&q=80","https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=700&q=80","https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=700&q=80"],
    "greece":["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=700&q=80","https://images.unsplash.com/photo-1555993539-1732b0258235?w=700&q=80","https://images.unsplash.com/photo-1533105079780-92b9be482077?w=700&q=80"],
    "france-switzerland-italy":["https://images.unsplash.com/photo-1431274172761-fca41d930114?w=700&q=80","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80","https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=700&q=80"],
    "germany-austria-hungary":["https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=700&q=80","https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=700&q=80","https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=700&q=80"],
    "prague-budapest-poland":["https://images.unsplash.com/photo-1541849546-216549ae216d?w=700&q=80","https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=700&q=80","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80"],
    "norway-finland":["https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=700&q=80","https://images.unsplash.com/photo-1505312917212-9db5bde78aff?w=700&q=80","https://images.unsplash.com/photo-1508592931388-95bc7b61033d?w=700&q=80"],"cruise":["https://images.unsplash.com/photo-1599640842225-85d111c60e6b?w=700&q=80","https://images.unsplash.com/photo-1548574505-5e239809ee19?w=700&q=80","https://images.unsplash.com/photo-1516495312540-a148643b22d3?w=700&q=80"],"malaysia":["https://images.unsplash.com/photo-1566914447826-bf04e54bf1be?w=700&q=80","https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=700&q=80","https://images.unsplash.com/photo-1573110348543-93d9092b50b5?w=700&q=80"],"philippines":["https://images.unsplash.com/photo-1695051702427-1c24ce3682e7?w=700&q=80","https://images.unsplash.com/photo-1746260948448-d741c5838c16?w=700&q=80","https://images.unsplash.com/photo-1519101236449-ac8098e16f15?w=700&q=80"],
    "uk-ireland":["https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=700&q=80","https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=700&q=80","https://images.unsplash.com/photo-1512075135822-67cdd9dd7314?w=700&q=80"],
    "russia":["https://images.unsplash.com/photo-1513326738677-b964603b136d?w=700&q=80","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=700&q=80","https://images.unsplash.com/photo-1547448415-e9f5b28e570d?w=700&q=80"],
    "japan-korea":["https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=700&q=80","https://images.unsplash.com/photo-1522383225653-ed111181a951?w=700&q=80","https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=700&q=80"],
    "us-east-coast":["https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=700&q=80","https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=700&q=80","https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=700&q=80"],
    "us-west-coast":["https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=700&q=80","https://images.unsplash.com/photo-1534430480872-3498386e7856?w=700&q=80"],
    "us-national-parks":["https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=700&q=80","https://images.unsplash.com/photo-1504870712357-65ea720d6078?w=700&q=80"],
    "orlando":["https://images.unsplash.com/photo-1534430480872-3498386e7856?w=700&q=80","https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=700&q=80","https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=700&q=80"],
    "eastern-canada":["https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=700&q=80","https://images.unsplash.com/photo-1569161031678-f49d0e38e2be?w=700&q=80","https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=700&q=80"],
    "western-canada":["https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&q=80","https://images.unsplash.com/photo-1505832268823-414c63a48fb4?w=700&q=80","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80"],
    "nz-queenstown":["https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80","https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=700&q=80","https://images.unsplash.com/photo-1517935706615-2717063c2225?w=700&q=80"],
    "nz-north-south":["https://images.unsplash.com/photo-1517935706615-2717063c2225?w=700&q=80","https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=700&q=80","https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80"],
    "australia-sydney-melbourne":["https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=700&q=80","https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=700&q=80","https://images.unsplash.com/photo-1538688423619-a81d3f23454b?w=700&q=80"],
    "australia-great-barrier-reef":["https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=700&q=80","https://images.unsplash.com/photo-1559828583-c93b69cf94c4?w=700&q=80","https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=700&q=80"],
    "australia-gold-coast":["https://images.unsplash.com/photo-1524397057410-1e775ed476f3?w=700&q=80","https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=700&q=80","https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=700&q=80"]};
  function propGallery(){const dest=((deal&&deal.destination)||"").toLowerCase();const _pk=Object.keys(PROP_KEYMAP).sort(function(a,b){return b.length-a.length;});for(var i=0;i<_pk.length;i++){if(dest.indexOf(_pk[i])>=0)return PROP_GALLERY[PROP_KEYMAP[_pk[i]]]||[];}return[];}

  function propCover(){
    if(propCoverUrl && propCoverUrl.trim()) return propCoverUrl.trim();
    const dest=(deal.destination||"").toLowerCase();
    const _pk=Object.keys(PROP_KEYMAP).sort(function(a,b){return b.length-a.length;});
    for(var i=0;i<_pk.length;i++){ if(dest.indexOf(_pk[i])>=0) return PROP_DEST_COVER[PROP_KEYMAP[_pk[i]]]||""; }
    return "";
  }
  function propSell(){
    const ts=tierSellINR(deal);
    if(ts!=null) return ts;
    const prTotal=(deal.pricingRows||[]).reduce((a,r)=>a+((Number(r.count)||0)*(Number(r.pp)||0)),0);
    if(deal.usePricingTotal&&prTotal>0) return prTotal;
    let vend=[];
    if(propFlights==="only") vend=[...(deal.flightVendors||[])];
    else if(propFlights==="without") vend=[...(deal.hotelVendors||[]),...(deal.landVendors||[]),...(deal.visaVendors||[])];
    else vend=[...(deal.hotelVendors||[]),...(deal.flightVendors||[]),...(deal.landVendors||[]),...(deal.visaVendors||[])];
    return vend.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
  }
  function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function fmtD(d){ if(!d) return ""; try{return new Date(d).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});}catch(e){return d;} }
  function buildProposalHTML(){
    let cover=propCover();
    // Stay options (3★/4★/5★) — detected up front so the stats row, price
    // block and stays section all stay consistent.
    const _tiers = (deal.useTiers ? (deal.tiers||[]) : []).filter(t=>
      t.enabled && (Number(t.totalPrice)>0 || (t.hotels||[]).some(h=>h.hotelName||h.photoUrl)));
    const pax=`${deal.adults||0} Adults${Number(deal.children)>0?`, ${deal.children} Children`:""}${Number(deal.infants)>0?`, ${deal.infants} Infants`:""}`;
    const hotels=(deal.hotelVendors||[]).filter(h=>h.hotelName||h.city);
    const nightsTotal=hotels.reduce((s,h)=>s+(Number(h.nights)||0),0);
    const flights=(deal.flightVendors||[]).filter(f=>(f.sectors||[]).some(s=>s.from||s.to));
    const ref=deal.dealNumber||("VE"+String(Date.now()).slice(-6));
    const showF=propFlights!=="without" && flights.length>0;
    const showH=propFlights!=="only";
    const sell=propSell();
    const totalPax=(Number(deal.adults)||0)+(Number(deal.children)||0);
    const _parseDaysEarly=(text)=>{const raw=(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);const dayHdr=/^(?:day[\s-]*\d+|\d+(?:st|nd|rd|th)?\s+day)\b/i;const firstHdr=raw.findIndex(l=>dayHdr.test(l));if(firstHdr<0)return raw;const out=[];let cur=null;raw.slice(firstHdr).forEach(l=>{if(dayHdr.test(l)){if(cur!==null)out.push(cur);cur=l;}else{cur=cur===null?l:cur+" "+l;}});if(cur!==null)out.push(cur);return out;};
    const _autoDayLines=(deal.landVendors||[]).filter(l=>l.itinerary).map(l=>_parseDaysEarly(l.itinerary)).reduce((a,b)=>a.concat(b),[]);
    const allDayLines=(propDays&&propDays.length)?propDays.filter(d=>String(d||"").trim()):_autoDayLines;
    const dayIcon=(t)=>{const s=(t||"").toLowerCase();
      if(/beach|island|boat|snorkel|cruise|speed/.test(s))return"🏖️";
      if(/temple|pagoda|heritage|fort|palace|museum|ancient/.test(s))return"🛕";
      if(/cable|hill|mountain|trek|peak/.test(s))return"🚡";
      if(/safari|wildlife|zoo|national park/.test(s))return"🦁";
      if(/arrival|airport pickup|check-in|welcome/.test(s))return"🛬";
      if(/departure|check-out|drop/.test(s))return"🛫";
      if(/shopping|market|city tour|downtown/.test(s))return"🏙️";
      if(/leisure|relax|free day|own/.test(s))return"🌴";
      return"📍";};
    const statsRibbon=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px">
      ${nightsTotal?`<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${nightsTotal}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">NIGHTS</div></div>`:""}
      ${_tiers.length?`<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${_tiers.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">STAY OPTIONS</div></div>`
        :(showH&&hotels.length?`<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${hotels.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">PREMIUM STAY${hotels.length>1?"S":""}</div></div>`:"")}
      ${showF&&flights.length?`<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${flights.reduce((s,f)=>s+((f.sectors||[]).filter(x=>x.from||x.to).length)+((f.returnSectors||[]).filter(x=>x.from||x.to).length),0)}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">FLIGHT SECTORS</div></div>`:""}
      ${allDayLines.length?`<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${allDayLines.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">CURATED DAYS</div></div>`:""}
      <div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${totalPax||"–"}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">TRAVELLER${totalPax>1?"S":""}</div></div>
    </div>`;
    const hlItems=[];
    if(showF&&flights.length)hlItems.push("✈️ Flights handpicked for the best timings & baggage");
    if(showH&&hotels.length)hlItems.push(`🏨 ${hotels.length} premium stay${hotels.length>1?"s":""} with breakfast included`);
    if(allDayLines.length)hlItems.push(`🗺️ ${allDayLines.length}-day fully curated experience — zero planning stress`);
    hlItems.push("🤝 Dedicated Voyage-Ed trip manager on WhatsApp, before & during your trip");
    const highlightsHTML=`<div style="background:linear-gradient(135deg,#fdf9ee,#fff);border-left:4px solid #c9961a;border-radius:0 14px 14px 0;padding:16px 20px;margin:0 0 18px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:8px">WHY YOU'LL LOVE THIS TRIP</div>
      <div style="font-size:12.5px;line-height:2.1;color:#33415e">${hlItems.join("<br>")}</div>
    </div>`;
    const timelineHTML=allDayLines.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:14px 16px;margin-bottom:16px">
      ${allDayLines.map((d,i)=>`<div style="text-align:center;min-width:50px"><div style="font-size:19px">${dayIcon(d)}</div><div style="font-size:8.5px;color:#7d8bab;font-weight:800;letter-spacing:.5px">DAY ${i+1}</div></div>`).join(`<div style="color:#c9961a;font-weight:800">›</div>`)}
    </div>`:"";
    const totRec=sum(deal.clientPayments||[],"amount");
    const totRef=sum(deal.refunds||[],"amount");
    const payBlock=(propShowPrice&&sell>0&&totRec>0)?`<div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;margin-top:16px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:10px">PAYMENT SUMMARY</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
        <div style="flex:1;min-width:130px;background:#f0faf4;border-radius:10px;padding:10px 14px"><div style="color:#15803d;font-weight:800;font-size:16px">₹${totRec.toLocaleString("en-IN")}</div><div style="color:#5a6b8c;font-size:10px">RECEIVED — thank you! 🙏</div></div>
        ${totRef>0?`<div style="flex:1;min-width:130px;background:#fdf1f1;border-radius:10px;padding:10px 14px"><div style="color:#b91c1c;font-weight:800;font-size:16px">− ₹${totRef.toLocaleString("en-IN")}</div><div style="color:#5a6b8c;font-size:10px">REFUNDED</div></div>`:""}
        <div style="flex:1;min-width:130px;background:#fff7ed;border-radius:10px;padding:10px 14px"><div style="color:#c2660a;font-weight:800;font-size:16px">₹${Math.max(0,(sell-totRef)-(totRec-totRef)).toLocaleString("en-IN")}</div><div style="color:#5a6b8c;font-size:10px">BALANCE — due before travel</div></div>
      </div>
    </div>`:"";
    const _dead=(imgHealth&&imgHealth.dead)?imgHealth.dead:[];
    const galleryImgs=propGallery().filter(g=>_dead.indexOf(g)<0);
    if(cover&&_dead.indexOf(cover)>=0) cover=galleryImgs[0]||"";
    // Guaranteed fallback: koi mapping na ho ya sab dead ho — destination-vibe se verified hero
    const pickFallbackCover=()=>{
      const _d=((deal&&deal.destination)||"").toLowerCase();
      const VERIFIED_FALLBACKS={
        mountain:"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
        beach:"https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1400&q=85",
        city:"https://images.unsplash.com/photo-1508062878650-88b52897f298?w=1400&q=85",
        cruise:"https://images.unsplash.com/photo-1554254648-2d58a1bc3fd5?w=1400&q=85",
        europe:"https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1400&q=85",
        nordic:"https://images.unsplash.com/photo-1663428520845-056989f8a664?w=1400&q=85",
        tropicboat:"https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1400&q=85"
      };
      return /cruise|ship|msc|cordelia/.test(_d)?VERIFIED_FALLBACKS.cruise
        : /kashmir|himachal|spiti|manali|shimla|leh|ladakh|nepal|bhutan|uttarakhand|mussoorie|nainital|darjeeling|gangtok|sikkim|swiss|alps/.test(_d)?VERIFIED_FALLBACKS.mountain
        : /norway|finland|sweden|denmark|iceland|scandinavia|lofoten|fjord/.test(_d)?VERIFIED_FALLBACKS.nordic
        : /paris|france|italy|europe|london|spain|portugal|amsterdam|prague|vienna|rome/.test(_d)?VERIFIED_FALLBACKS.europe
        : /dubai|city|kuala|singapore|hong kong|tokyo|delhi|mumbai/.test(_d)?VERIFIED_FALLBACKS.city
        : /thailand|phuket|krabi|pattaya|bangkok|goa|andaman/.test(_d)?VERIFIED_FALLBACKS.tropicboat
        : VERIFIED_FALLBACKS.beach;
    };
    const fbCover=pickFallbackCover();
    if(!cover) cover=fbCover;
    const glimpseHTML=galleryImgs.length?`<div style="margin:0 0 18px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:8px">A GLIMPSE OF YOUR DESTINATION</div>
      ${galleryImgs.length>=3?`<div style="display:grid;grid-template-columns:1.6fr 1fr;grid-template-rows:132px 132px;gap:10px">
        <img src="${galleryImgs[0]}" onerror="this.style.display='none'" style="grid-row:1/3;width:100%;height:100%;object-fit:cover;border-radius:16px"/>
        <img src="${galleryImgs[1]}" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;border-radius:16px"/>
        <img src="${galleryImgs[2]}" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;border-radius:16px"/>
      </div>`:`<div style="display:flex;gap:10px">${galleryImgs.map(g=>`<img src="${g}" onerror="this.style.display='none'" style="flex:1;min-width:0;height:150px;object-fit:cover;border-radius:16px"/>`).join("")}</div>`}
    </div>`:"";
    const acceptMsg="I, "+(deal.clientName||"the Client")+", have read and ACCEPT the Booking Policy, Cancellation Policy and Terms & Conditions (Clauses 1-16) of Voyage-Ed proposal Ref: "+ref+".";
    const acceptWA="https://wa.me/917009659048?text="+encodeURIComponent(acceptMsg);
    const STATIC_CANCEL_TABLE=`<table style="width:100%;border-collapse:collapse;margin:2px 0 8px;font-size:11px">
        <tr><th style="background:#0d1b3e;color:#fff;padding:7px 12px;text-align:left;border-radius:8px 0 0 0">Days Before Departure</th><th style="background:#0d1b3e;color:#fff;padding:7px 12px;text-align:left;border-radius:0 8px 0 0">Cancellation Charge</th></tr>
        <tr><td style="padding:7px 12px;border:1px solid #e3eaf7">30 – 16 days</td><td style="padding:7px 12px;border:1px solid #e3eaf7;font-weight:700;color:#0d1b3e">50% of the total cost</td></tr>
        <tr><td style="padding:7px 12px;border:1px solid #e3eaf7;background:#f8fafd">15 – 8 days</td><td style="padding:7px 12px;border:1px solid #e3eaf7;background:#f8fafd;font-weight:700;color:#0d1b3e">75% of the total cost</td></tr>
        <tr><td style="padding:7px 12px;border:1px solid #e3eaf7">7 – 0 days</td><td style="padding:7px 12px;border:1px solid #e3eaf7;font-weight:700;color:#b91c1c">100% of the total cost (no refund)</td></tr>
      </table>
      • Visa fee & service charges are <b style="color:#0d1b3e">non-refundable</b>.<br>
      • No refund, either in part or in full, will be made for any <b style="color:#0d1b3e">unused part of the services</b> provided in the package.<br>
      • Overseas Insurance Policy after issuance is non-refundable (Travel Insurance Charges: <b style="color:#0d1b3e">₹1,000 per person</b>).`;
    const STATIC_CANCEL_PLAIN="30-16 days before departure: 50% of total cost | 15-8 days: 75% of total cost | 7-0 days: 100% of total cost (no refund) | Visa fee & service charges non-refundable | No refund for unused services | Insurance non-refundable after issuance (Rs.1,000/person)";
    const isCustomCancel = propCancelMode==="custom" && propCancelCustom.trim();
    const activeCancelPlain = isCustomCancel ? propCancelCustom.trim() : STATIC_CANCEL_PLAIN;
    const cancelPolicyHTML = isCustomCancel
      ? `<div style="background:#fdf6e5;border:1px dashed #c9961a;border-radius:10px;padding:10px 14px;margin:2px 0 8px;font-size:11.5px;color:#4a5772">`+propCancelCustom.trim().split(/\n+/).map(l=>"• "+esc(l)).join("<br>")+`</div><div style="font-size:9.5px;color:#8a6d1a;margin-bottom:6px">※ Special cancellation terms applicable for this booking (supersede standard policy).</div>`
      : STATIC_CANCEL_TABLE;
    const legalTC = `
    <div class="pagebreak" style="margin-top:26px">
      <h2 style="font-size:18px;color:#0d1b3e;margin:0 0 10px">⚖️ Terms & Conditions of Service (Legal)</h2>
      <div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;font-size:10px;line-height:1.75;color:#4a5772">
        <b style="color:#0d1b3e">1. Definitions & Parties.</b> In these Terms, "the Company" means <b>Voyage-Ed Travels</b>, having its office at GMADA Aerocity, Mohali, Punjab, India; "the Client" means the person(s) named in this proposal and all travellers on whose behalf the booking is made; "Suppliers" means airlines, hotels, cruise lines, transport operators, insurers and other third-party service providers; "Total Cost" means the total package price stated in this proposal. These Terms constitute a legally binding agreement between the Company and the Client.<br>
        <b style="color:#0d1b3e">2. Acceptance & Authority.</b> Acceptance of this proposal — by digital acceptance below, written or electronic confirmation, or payment of any deposit — constitutes unconditional acceptance of these Terms by the Client on behalf of all travellers in the booking, and the Client warrants that they have authority to bind all such travellers.<br>
        <b style="color:#0d1b3e">3. Role of the Company.</b> The Company acts solely as an agent of the Suppliers. All services are additionally governed by the Suppliers' own tariffs, terms and conditions of carriage/service, which are deemed incorporated herein by reference. The Company shall not be liable for any act, omission, default or insolvency of any Supplier.<br>
        <b style="color:#0d1b3e">4. Booking & Payment.</b> A non-refundable deposit of ₹20,000 per person — or the actual hotel, flight and land component minimum due, whichever is higher — is required to initiate a booking. Where the date of travel is less than 7 (seven) days away, a non-refundable deposit of 50% of the Total Cost shall apply. Full payment is required upon confirmation of all services and prior to departure from India. Time is of the essence: failure to pay any amount by its due date entitles the Company to treat the booking as cancelled by the Client, and the Cancellation Policy shall apply.<br>
        <b style="color:#0d1b3e">5. Cancellation & Refunds.</b> The Cancellation Policy stated in this proposal (${isCustomCancel?"the <u>special cancellation terms</u> specified above, which supersede the standard slab for this booking":"the standard slab: 30–16 days before departure — 50%; 15–8 days — 75%; 7–0 days — 100% of the Total Cost"}) forms an integral part of this Agreement. All cancellations must be communicated in writing and take effect from the date of receipt by the Company. Visa fees and service charges are non-refundable in all circumstances. No refund shall be payable, in whole or in part, for any unused, partially used or forfeited service. Travel insurance, once issued, is non-refundable (insurance charge: ₹1,000 per person). Failure to travel / no-show shall be treated as a cancellation attracting 100% charges.<br>
        <b style="color:#0d1b3e">6. Refund Processing.</b> Refunds, where due, shall be processed only after realisation of the corresponding amounts from the respective Suppliers and in accordance with their policies, ordinarily within 30–45 working days of receipt. Refunds shall be made to the same account/instrument from which payment was received.<br>
        <b style="color:#0d1b3e">7. Amendments & Transfers.</b> Any change requested by the Client (dates, names, itinerary, room category or otherwise) is treated as a fresh booking, subject to availability and revised pricing; changes within the cancellation window attract applicable cancellation charges. Bookings are non-transferable except with the Company's prior written consent and payment of applicable Supplier charges.<br>
        <b style="color:#0d1b3e">8. Travel Documents, Visas & Permits.</b> The Client is solely responsible for holding valid passports (minimum 6 months' validity from the date of return travel), visas, permits, and health/vaccination documentation for all travellers. Photocopies of passport (first and address page) are mandatory for all destinations. Grant, refusal or delay of any visa is at the sole discretion of the concerned Embassy/authority; the Company assumes no liability therefor, and cancellation charges shall apply in case of visa refusal or delayed issuance.<br>
        <b style="color:#0d1b3e">9. Prices & Taxes.</b> All prices are subject to availability, rate of exchange, fuel and Supplier surcharges, and statutory levies (including GST as per government norms) prevailing at the time of booking and may be revised accordingly until full payment. Mandatory gala dinner supplements on special dates (24/31 December, 14 February) may be payable by the Client directly at the hotel.<br>
        <b style="color:#0d1b3e">10. Itinerary Changes by the Company.</b> The Company reserves the right to modify, re-sequence or substitute any part of the itinerary or services due to force majeure, weather, operational requirements, safety considerations or non-availability, with suitable alternatives of comparable standard being provided where reasonably possible; no compensation shall be payable for such modification.<br>
        <b style="color:#0d1b3e">11. Force Majeure.</b> The Company shall not be liable for any delay, alteration, curtailment, cancellation, loss or damage arising from acts of God, weather, natural calamity, epidemic/pandemic, strikes, riots, civil disturbance, war, terrorism, government or regulatory action, airspace or border closures, technical or operational failure of Suppliers, or any other cause beyond its reasonable control. Any additional cost so arising (including extended stay, re-routing or repatriation) shall be borne by the Client.<br>
        <b style="color:#0d1b3e">12. Limitation of Liability & Indemnity.</b> To the maximum extent permitted by law, the Company's aggregate liability under or in connection with this Agreement, howsoever arising, shall not exceed the amount actually received by the Company for the booking. The Company shall not be liable for any indirect, incidental or consequential loss, loss of enjoyment, or loss of baggage/personal effects. The Client shall indemnify and hold harmless the Company against all claims, losses and expenses arising from the Client's breach of these Terms, unlawful conduct, or inaccurate information supplied.<br>
        <b style="color:#0d1b3e">13. Health, Insurance & Conduct.</b> The Client warrants fitness to travel and shall disclose any medical condition relevant to the services booked. Comprehensive travel insurance is strongly recommended and is the Client's responsibility. The Company or its Suppliers may decline or terminate services, without refund, in case of unlawful, unsafe or abusive conduct. Check-in/check-out timings, baggage allowances and on-board rules are as per the respective Suppliers.<br>
        <b style="color:#0d1b3e">14. Complaints & Notices.</b> Any complaint regarding the services must be notified to the Company in writing at enquiry@voyage-ed.com within 14 (fourteen) days of completion of travel, failing which the claim shall be deemed waived. All notices under this Agreement shall be in writing to the addresses/e-mail stated in this proposal.<br>
        <b style="color:#0d1b3e">15. Severability & Waiver.</b> If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force. No failure or delay by the Company in exercising any right shall operate as a waiver thereof.<br>
        <b style="color:#0d1b3e">16. Governing Law, Jurisdiction & Entire Agreement.</b> This Agreement shall be governed by and construed in accordance with the laws of India. Subject to an attempt at amicable resolution, all disputes shall be subject to the exclusive jurisdiction of the competent courts at Mohali / Chandigarh, Punjab, India. This proposal together with these Terms constitutes the entire agreement between the parties and supersedes all prior communications relating to this booking.
      </div>
    </div>
    <div id="ve-accept" style="margin-top:16px;background:linear-gradient(135deg,#fdf9ee,#fff);border:2px solid #c9961a;border-radius:16px;padding:18px 22px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:8px">✍️ CLIENT ACCEPTANCE</div>
      <div class="ve-interactive">
        <label style="display:flex;gap:10px;align-items:flex-start;font-size:12px;color:#33415e;cursor:pointer;line-height:1.6">
          <input type="checkbox" id="veAgree" style="width:18px;height:18px;margin-top:2px;accent-color:#c9961a"/>
          <span>I, <b style="color:#0d1b3e">${esc(deal.clientName)||"the undersigned Client"}</b>, confirm that I have read, understood and unconditionally accept the Booking & Payment Policy, the Cancellation Policy${isCustomCancel?" (including the special cancellation terms specified for this booking)":""} and the Terms & Conditions of Service (Clauses 1–16) stated in this proposal (Ref: <b>${esc(ref)}</b>). I understand that my submission constitutes a legally binding acceptance of these terms.</span>
        </label>
        <button id="veAccBtn" style="margin-top:12px;background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;border:none;border-radius:10px;padding:12px 26px;font-size:13px;font-weight:800;cursor:pointer">✅ Accept & Submit</button>
        <div id="veAccMsg" style="font-size:12px;margin-top:10px;font-weight:700"></div>
        <div style="font-size:10.5px;color:#7d8bab;margin-top:8px">Ya ek tap me: <a href="${acceptWA}" style="color:#15803d;font-weight:800">WhatsApp par accept karein →</a></div>
      </div>
      <div class="ve-printsign" style="display:none">
        <a href="${acceptWA}" style="display:block;text-decoration:none;background:linear-gradient(135deg,#15803d,#22a04e);border-radius:14px;padding:16px 20px;text-align:center;margin:4px 0 12px">
          <span style="color:#fff;font-size:16px;font-weight:800;letter-spacing:.5px">✅ &nbsp;TAP HERE TO ACCEPT THIS PROPOSAL</span><br>
          <span style="color:#d7f5e0;font-size:10.5px">Ek tap me WhatsApp khulega — ready-typed acceptance message ke saath — bas Send dabayein.<br>By sending, you accept the Booking Policy, Cancellation Policy & Terms (Clauses 1–16) · Ref: ${esc(ref)}</span>
        </a>
        <div style="font-size:10px;color:#7d8bab;text-align:center;margin-bottom:10px">Ya WhatsApp par likh bhejein: <b style="color:#33415e">"I ACCEPT ${esc(ref)}"</b> → <b style="color:#33415e">+91 70096 59048</b> · Ya QR scan karein (footer)</div>
        <div style="font-size:11px;color:#33415e;line-height:2.2;border-top:1px dashed #e3d9be;padding-top:8px">
          For physical signing: &nbsp; Client Signature: ______________________________ &nbsp;&nbsp; Name: ${esc(deal.clientName)||"____________________"} &nbsp;&nbsp; Date: ________________
        </div>
      </div>
    </div>
    <script>
      (function(){
        var btn=document.getElementById("veAccBtn"); if(!btn) return;
        var VE_REF=${JSON.stringify(String(ref||""))}, VE_CLIENT=${JSON.stringify(String(deal.clientName||"Client"))}, VE_DEST=${JSON.stringify(String(deal.destination||""))}, VE_PRICE=${JSON.stringify(propShowPrice&&sell>0?("Rs. "+sell.toLocaleString("en-IN")):"On request")}, VE_PMODE=${JSON.stringify(isCustomCancel?"CUSTOM/AMENDED":"STATIC/STANDARD")}, VE_POLICY=${JSON.stringify(activeCancelPlain)};
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
    ` ;
    const qrURL="https://api.qrserver.com/v1/create-qr-code/?size=96x96&data="+encodeURIComponent(acceptWA);

    const sectorRow=(s)=>{
      const _code=String(s.airlineCode||"").trim().toUpperCase();
      const _name=String(s.airlineName||"").trim()||(typeof AIRLINE_MAP!=="undefined"&&AIRLINE_MAP[_code])||"";
      return `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px dashed #d8e2f3">
        <div style="min-width:72px;max-width:86px;text-align:center">
          <div style="font-size:14px;font-weight:800;color:#c9961a;letter-spacing:1px">${esc(_code)||(_name?esc(_name.split(" ")[0]):"✈")}</div>
          <div style="font-size:9.5px;color:#7d8bab;line-height:1.3">${esc(_name)}</div>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:10px">
          <div><div style="font-size:17px;font-weight:800;color:#0d1b3e">${esc(s.from)}</div><div style="font-size:9px;color:#7d8bab">${esc(s.fromName)}</div><div style="font-size:11px;font-weight:700;color:#334e82">${esc(s.depTime)}</div></div>
          <div style="flex:1;text-align:center;color:#c9961a;font-size:11px">──────✈──────<div style="font-size:9px;color:#7d8bab">${fmtD(s.date)}</div></div>
          <div style="text-align:right"><div style="font-size:17px;font-weight:800;color:#0d1b3e">${esc(s.to)}</div><div style="font-size:9px;color:#7d8bab">${esc(s.toName)}</div><div style="font-size:11px;font-weight:700;color:#334e82">${esc(s.arrTime)}</div>${(function(){
            if(!s.arrDate||s.arrDate===s.date) return "";
            const d1=Date.parse(s.date||""), d2=Date.parse(s.arrDate);
            const plus=(!isNaN(d1)&&!isNaN(d2))?Math.round((d2-d1)/864e5):0;
            const disp=new Date(s.arrDate).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
            return `<div style="font-size:9px;color:#b4540a;font-weight:800">${disp}${plus>0?" (+"+plus+" day"+(plus>1?"s":"")+")":""}</div>`;
          })()}</div>
        </div>
      </div>`;};

    const detectFlightType=(f)=>{
      const norm=x=>String(x||"").trim().toLowerCase();
      const secs=(f.sectors||[]).filter(s=>s.from||s.to);
      const rets=(f.returnSectors||[]).filter(s=>s.from||s.to);
      if(rets.length) return "ROUND TRIP";
      if(secs.length>=2){
        const first=secs[0], last=secs[secs.length-1];
        const returnsHome = norm(first.from) && norm(last.to)===norm(first.from);
        if(secs.length===2 && returnsHome && norm(secs[0].to)===norm(secs[1].from)) return "ROUND TRIP";
        return returnsHome ? "MULTI-CITY" : (f.flightType==="round-trip"?"ROUND TRIP":"MULTI-CITY");
      }
      if(f.flightType==="round-trip") return "ROUND TRIP";
      if(f.flightType==="multi-city") return "MULTI-CITY";
      return "ONE WAY";
    };
    const flightBlocks = showF ? flights.map(f=>{
      const visSecs=(f.sectors||[]).filter(s=>s.from||s.to);
      const visRets=(f.returnSectors||[]).filter(s=>s.from||s.to);
      const noTimes=[...visSecs,...visRets].every(s=>!s.depTime&&!s.arrTime);
      return `
      <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
        <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;padding:10px 18px;font-size:12px;font-weight:700;letter-spacing:1px">✈️ FLIGHT · ${detectFlightType(f)}</div>
        ${visSecs.map(sectorRow).join("")}
        ${visRets.map(s=>`<div style="background:#f8fafd;font-size:10px;color:#7d8bab;padding:4px 18px;font-weight:700;letter-spacing:1px">RETURN</div>`+sectorRow(s)).join("")}
        ${noTimes?`<div style="background:#fdf9ee;font-size:10px;color:#8a6d1a;padding:7px 18px">🕐 Exact departure & arrival timings will be confirmed on your final ticket.</div>`:""}
      </div>`;}).join("") : "";

    const hotelBlocks = showH ? hotels.map(h=>`
      <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;padding:20px 22px;margin-bottom:14px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
        ${h.photoUrl?`<img src="${esc(h.photoUrl)}" style="width:100%;height:auto;max-height:260px;object-fit:contain;background:#f4f7fc;border-radius:12px;margin-bottom:14px;display:block" onerror="this.style.display='none'"/>`:""}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800">🏨 ${esc((h.city||"").toUpperCase())}${h.country?" · "+esc(h.country.toUpperCase()):""}</div>
            <div style="font-size:18px;font-weight:800;color:#0d1b3e;margin:4px 0 2px">${esc(h.hotelName)||"Hotel"}</div>
            <div style="font-size:12px;color:#5a6b8c">${esc(h.roomCategory)} · Breakfast included</div>
            ${h.starRating?`<div style="font-size:13px;color:#f0c842;margin-top:3px">${"★".repeat(Number(h.starRating)||0)}<span style="color:#c9ccd4">${"★".repeat(Math.max(0,5-(Number(h.starRating)||0)))}</span></div>`:""}
          </div>
          <div style="text-align:right">
            <div style="background:#f0f5fd;border-radius:10px;padding:8px 14px;font-size:11px;color:#334e82">
              <b>${(()=>{let n=Number(h.nights);if(!n&&h.checkIn&&h.checkOut){n=Math.round((new Date(h.checkOut)-new Date(h.checkIn))/86400000);}return n>0?n:1;})()} night${(()=>{let n=Number(h.nights);if(!n&&h.checkIn&&h.checkOut){n=Math.round((new Date(h.checkOut)-new Date(h.checkIn))/86400000);}return n===1?"":"s";})()}</b><br>
              ${h.checkIn?"In: "+fmtD(h.checkIn):""}<br>${h.checkOut?"Out: "+fmtD(h.checkOut):""}
            </div>
          </div>
        </div>
      </div>`).join("") : "";

    const parseDays=(text)=>{
      const raw=(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
      // Detect explicit day headers like "Day 1", "Day-2", "1st Day", "Day 1:"
      const dayHdr=/^(?:day[\s-]*\d+|\d+(?:st|nd|rd|th)?\s+day)\b/i;
      const firstHdr=raw.findIndex(l=>dayHdr.test(l));
      if(firstHdr<0) return raw; // no headers → each line = a point (legacy)
      const out=[]; let cur=null;
      // Skip intro lines before the first real day header (e.g. "Day Wise Itinerary")
      raw.slice(firstHdr).forEach(l=>{
        if(dayHdr.test(l)){ if(cur!==null) out.push(cur); cur=l; }
        else { cur = cur===null ? l : cur+"\n"+l; }
      });
      if(cur!==null) out.push(cur);
      return out;
    };
    const landBlocks = showH ? (function(){
      const srcs=[(propDays&&propDays.length)?{__days:allDayLines}:null].filter(Boolean).concat((propDays&&propDays.length)?[]:(deal.landVendors||[]).filter(l=>l.itinerary));
      const allDays=srcs.map(l=>l.__days?l.__days:parseDays(l.itinerary)).reduce((a,b)=>a.concat(b),[]);
      const N=allDays.length;
      // meals + day-type + overnight-hotel intelligence (sab auto — text/dates se)
      const _hp=(x)=>{const t=Date.parse(x);return isNaN(t)?null:t;};
      const _hn=(deal.hotelVendors||[]).map(h=>({h,ci:_hp(h.checkIn),co:_hp(h.checkOut)})).filter(x=>x.ci!==null&&x.co!==null&&x.co>x.ci);
      const _t0=_hn.length?Math.min.apply(null,_hn.map(x=>x.ci)):null;
      const overnightFor=(i)=>{ if(_t0===null) return null; const t=_t0+i*86400000; const f=_hn.find(x=>t>=x.ci&&t<x.co); return f?f.h:null; };
      const mealsOf=(d)=>{const c=[];if(/breakfast/i.test(d))c.push("🍳 Breakfast");if(/\blunch/i.test(d))c.push("🥗 Lunch");if(/dinner/i.test(d))c.push("🍽 Dinner");return c;};
      const tagsOf=(d)=>{const t=[];
        if(/temple|monastery|pagoda|shakti|church|cathedral|mosque|gurudwara/i.test(d))t.push("🛕 Temples");
        if(/beach|island/i.test(d))t.push("🏖 Beach");
        if(/waterfall|falls\b/i.test(d))t.push("💦 Waterfalls");
        if(/trek|hiking|hike\b|canyon/i.test(d))t.push("🥾 Trek");
        if(/cruise|boat|ferry|kayak/i.test(d))t.push("🚤 Boat");
        if(/safari|wildlife|national park/i.test(d))t.push("🦁 Wildlife");
        if(/shopping|bazaar|market/i.test(d))t.push("🛍 Shopping");
        if(!t.length&&/transfer|proceed to|drive to|drop/i.test(d))t.push("🚗 Transfer Day");
        return t.slice(0,3);};
      const _bC=allDays.filter(d=>/breakfast/i.test(d)).length,_lC=allDays.filter(d=>/\blunch/i.test(d)).length,_dC=allDays.filter(d=>/dinner/i.test(d)).length;
      const mealSummary=(_bC||_lC||_dC)?`<div style="margin:-2px 0 14px;display:flex;gap:8px;flex-wrap:wrap">${[_bC?`🍳 ${_bC} Breakfast${_bC>1?"s":""}`:"",_lC?`🥗 ${_lC} Lunch${_lC>1?"es":""}`:"",_dC?`🍽 ${_dC} Dinner${_dC>1?"s":""}`:""].filter(Boolean).map(x=>`<span style="background:#f0faf4;border:1px solid #cfe9d6;color:#15803d;font-size:10px;font-weight:800;border-radius:20px;padding:5px 12px">${x} included</span>`).join("")}</div>`:"";
      const _cards=allDays.map((d,i)=>{
        const lines=String(d).split("\n");
        let head=lines[0]||"";
        const m=head.match(/^((?:day[\s-]*\d+|\d+(?:st|nd|rd|th)?\s+day)[:\-\s]*)(.*)$/i);
        let rest=m?m[2]:head;
        // pull out "(Mon 15th June)" style date chip
        let chip=""; const dm=rest.match(/^\s*\(([^)]{3,30})\)\s*[:\-–]?\s*(.*)$/);
        if(dm){chip=dm[1]; rest=dm[2]||rest;}
        // title = part before first " - " or first sentence-ish colon
        let title=rest, body=lines.slice(1).join(" ");
        const tSplit=rest.split(/\s[-–—]\s|:\s/);
        if(tSplit.length>1 && tSplit[0].length<70){ title=tSplit[0]; body=(rest.slice(title.length).replace(/^[\s:\-–—]+/,"")+" "+body).trim(); }
        return `
        <div style="display:flex;gap:0;position:relative">
          <div style="width:66px;display:flex;flex-direction:column;align-items:center;flex-shrink:0">
            <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#c9961a,#f0c842);box-shadow:0 3px 10px rgba(201,150,26,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0d1b3e;font-weight:800;z-index:1">
              <div style="font-size:7.5px;letter-spacing:1px">DAY</div><div style="font-size:17px;line-height:1">${i+1}</div>
            </div>
            ${i<N-1?`<div style="flex:1;width:2px;background:linear-gradient(#e8d9a8,#f3ecd2);margin:4px 0"></div>`:""}
          </div>
          <div style="flex:1;background:#fff;border:1px solid #e3eaf7;border-left:3px solid #e8d089;border-radius:14px;padding:13px 17px;margin:0 0 16px 6px;box-shadow:0 2px 10px rgba(13,27,62,.05)">
            <div style="display:flex;align-items:flex-start;gap:8px 10px;flex-wrap:wrap">
              <div style="flex:1;min-width:200px;font-family:Georgia,'Times New Roman',serif;font-size:14.5px;font-weight:700;color:#0d1b3e;line-height:1.4">${i===0&&/arriv|pick|airport|welcome/i.test(d)?"🛬":i===N-1&&/depart|drop|airport|onward journey/i.test(d)?"🛫":dayIcon(d)} ${esc(title)}</div>
              ${chip?`<div style="background:#fdf6e5;border:1px solid #ecd9a0;color:#8a6d1a;font-size:9.5px;font-weight:800;letter-spacing:.5px;border-radius:20px;padding:4px 11px;white-space:nowrap">📅 ${esc(chip)}</div>`:""}
            </div>
            ${propDayPhotos[i]?`<img src="${propDayPhotos[i]}" style="float:right;width:132px;height:90px;object-fit:cover;border-radius:10px;margin:6px 0 6px 12px;border:1px solid #eadfc2"/>`:""}
            ${(function(){const mm=mealsOf(d),tt=tagsOf(d); if(!mm.length&&!tt.length) return ""; return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">${mm.map(x=>`<span style="background:#f0faf4;border:1px solid #cfe9d6;color:#15803d;font-size:9px;font-weight:800;border-radius:20px;padding:3px 9px">${x}</span>`).join("")}${tt.map(x=>`<span style="background:#eef3fc;border:1px solid #d4e0f5;color:#334e82;font-size:9px;font-weight:800;border-radius:20px;padding:3px 9px">${x}</span>`).join("")}</div>`;})()}
            ${(function(){
              if(!body) return "";
              const hi=(t)=>esc(t).replace(/(breakfast|lunch|dinner|check[- ]?in|check[- ]?out|transfer|overnight(?:\s+night)?\s+stay|pick[- ]?up|drop(?:\s+off)?|sightseeing|excursion|visit|explore)/gi,'<b style="color:#8a6d1a;font-weight:700">$1</b>');
              const sents=body.split(/(?<=[.!?])\s+(?=[A-Z])/).map(x=>x.trim()).filter(Boolean);
              if(body.length>170&&sents.length>=3){
                return '<div style="margin-top:8px">'+sents.map(x=>{
                  if(/^tips?\s*[:\-–]/i.test(x)) return '<div style="margin:6px 0;background:linear-gradient(135deg,#fdf6e5,#fffdf6);border:1px dashed #c9961a;border-radius:9px;padding:7px 11px;font-size:11px;color:#8a6d1a;font-weight:600">💡 <b>Voyage-Ed Tip:</b> '+hi(x.replace(/^tips?\s*[:\-–]\s*/i,""))+'</div>';
                  return '<div style="display:flex;gap:8px;font-size:11.5px;line-height:1.65;color:#5a6b8c;margin-bottom:4px"><span style="color:#c9961a;font-weight:800;flex-shrink:0">›</span><span>'+hi(x)+'</span></div>';
                }).join("")+'</div>';
              }
              if(/^tips?\s*[:\-–]/i.test(body)) return '<div style="margin-top:8px;background:linear-gradient(135deg,#fdf6e5,#fffdf6);border:1px dashed #c9961a;border-radius:9px;padding:7px 11px;font-size:11px;color:#8a6d1a;font-weight:600">💡 <b>Voyage-Ed Tip:</b> '+hi(body.replace(/^tips?\s*[:\-–]\s*/i,""))+'</div>';
              return '<div style="font-size:12px;line-height:1.7;color:#5a6b8c;margin-top:6px">'+hi(body)+'</div>';
            })()}
            ${(function(){const oh=overnightFor(i); if(!oh||!(oh.hotelName||oh.city)) return ""; const st=oh.starRating?" ⭐"+esc(String(oh.starRating)):""; return `<div style="margin-top:9px;background:#f4f7fc;border:1px solid #e0e9f7;border-radius:9px;padding:6px 11px;font-size:10.5px;color:#334e82;font-weight:700">🏨 Overnight: ${esc(oh.hotelName||"")}${oh.city?", "+esc(oh.city):""}${st}${oh.roomCategory?` · <span style="font-weight:600;color:#7d8bab">${esc(oh.roomCategory)}</span>`:""}</div>`;})()}
          </div>
        </div>`;
      }).join("");
      return mealSummary+_cards;
    })() : "";

    // ── Multiple stay options (3★ / 4★ / 5★) in ONE proposal ──
    // Same destination, same itinerary — only the hotel category and price
    // change, so the client can compare and pick without us sending 3 PDFs.
    const tierOptionsBlock = _tiers.length ? (()=>{
      const cols=_tiers.map((t,i)=>{
        const tot=Number(t.totalPrice)||0;
        const pp=totalPax>0&&tot>0?Math.round(tot/totalPax):0;
        const feat=t.booked||(_tiers.length===3&&i===1);
        const badge=t.booked?"✓ YOUR CHOICE":(_tiers.length===3&&i===1?"MOST POPULAR":"");
        const hs=(t.hotels||[]).filter(h=>h.hotelName||h.photoUrl).map(h=>`
          <div style="margin-bottom:10px">
            ${h.photoUrl?`<img src="${esc(h.photoUrl)}" style="width:100%;height:auto;max-height:150px;object-fit:contain;background:#f4f7fc;border-radius:9px;margin-bottom:7px;display:block" onerror="this.style.display='none'"/>`:""}
            <div style="font-size:14px;font-weight:800;color:#0d1b3e;line-height:1.3">${esc(h.hotelName)||"Hotel"}</div>
            <div style="font-size:11px;color:#5a6b8c;margin-top:2px">${esc(h.city)}${h.roomCategory?" · "+esc(h.roomCategory):""}</div>
          </div>`).join("") || `<div style="color:#9aa7c4;font-size:11px;padding:14px 0">Hotel details on request</div>`;
        return `
        <div style="flex:1;min-width:180px;border:${feat?"2px solid #1a3060":"1px solid #e3eaf7"};border-radius:14px;overflow:hidden;background:#fff;${feat?"box-shadow:0 6px 20px rgba(13,27,62,.14)":""}">
          <div style="background:${t.booked?"linear-gradient(135deg,#15803d,#1a9e4b)":feat?"linear-gradient(135deg,#0d1b3e,#1a3060)":"#0d1b3e"};color:#fff;padding:11px 13px;text-align:center">
            <div style="font-size:14px;font-weight:800;letter-spacing:.4px">${esc(t.label||(t.star+"-Star"))}</div>
            <div style="color:#f0c842;font-size:12px;margin-top:2px">${"★".repeat(Number(t.star)||0)}<span style="color:rgba(255,255,255,.3)">${"★".repeat(Math.max(0,5-(Number(t.star)||0)))}</span></div>
            ${badge?`<div style="font-size:9px;letter-spacing:1px;font-weight:800;margin-top:3px">${badge}</div>`:""}
          </div>
          <div style="padding:13px">${hs}</div>
          ${tot>0?`<div style="padding:12px 13px;border-top:1px dashed #e3eaf7;text-align:center;background:#f8fafd">
            <div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">PRICE PER PERSON</div>
            <div style="font-size:23px;font-weight:800;color:#0d1b3e;margin:2px 0;font-family:Georgia,serif">₹${(pp||tot).toLocaleString("en-IN")}</div>
            <div style="font-size:10.5px;color:#5a6b8c">Total ₹${tot.toLocaleString("en-IN")}${totalPax>1?" · "+pax:""}</div>
          </div>`:""}
        </div>`;
      }).join("");
      return `
      <h2 style="font-size:22px;color:#0d1b3e;margin:22px 0 6px">🏨 Choose Your Stay</h2>
      <div style="font-size:12px;color:#5a6b8c;margin-bottom:14px">Same itinerary, same inclusions — sirf hotel category aur price alag hai. Jo pasand aaye wo choose kijiye.</div>
      <div style="display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;margin-bottom:6px">${cols}</div>
      <div style="font-size:10.5px;color:#8894b0;margin-bottom:16px">* All options include the same flights, transfers and sightseeing. GST extra as applicable.</div>`;
    })() : "";

    const _perPax = totalPax>0 ? Math.round(sell/totalPax) : 0;
    const _tierMin = _tiers.length ? Math.min(...(_tiers.map(t=>Number(t.totalPrice)||0).filter(v=>v>0)).concat([Infinity])) : Infinity;
    const _fromPP = (_tierMin!==Infinity && totalPax>0) ? Math.round(_tierMin/totalPax) : 0;
    // Per-person leads, total supports it — a package reads far cheaper that way.
    const priceBlock = propShowPrice && sell>0 ? `
      <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:18px;padding:26px 28px;color:#fff;margin:8px 0 18px">
        <div style="font-size:10px;letter-spacing:2px;color:#f0c842;font-weight:800;margin-bottom:6px">${_fromPP?"STARTING FROM · PER PERSON":"PRICE PER PERSON"}</div>
        <div style="font-size:34px;font-weight:800">₹${(_fromPP||_perPax||sell).toLocaleString("en-IN")}<span style="font-size:13px;font-weight:600;opacity:.8"> /- all inclusive</span></div>
        ${_fromPP
          ? `<div style="font-size:12px;opacity:.85;margin-top:4px">${_tiers.length} stay options below${totalPax>1?" · "+pax:""}</div>`
          : (totalPax>1?`<div style="font-size:12px;opacity:.85;margin-top:4px">Total package ₹${sell.toLocaleString("en-IN")} · ${pax}</div>`:"")}
        ${(function(){
          const rows=(deal.pricingRows||[]).filter(r=>(Number(r.pp)||0)>0);
          if(!rows.length) return "";
          return `<table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:10.5px">`+
            rows.map(r=>{const c=Number(r.count)||0,pp=Number(r.pp)||0;return `<tr>
              <td style="padding:4px 0;color:#c7d2ee">${esc(r.cat)}</td>
              <td style="padding:4px 6px;color:#c7d2ee;text-align:center;white-space:nowrap">${c?c+" × ":""}₹${pp.toLocaleString("en-IN")}</td>
              <td style="padding:4px 0;text-align:right;color:#f0c842;font-weight:800;white-space:nowrap">${c?"₹"+(c*pp).toLocaleString("en-IN"):""}</td></tr>`;}).join("")+
          `</table>`;
        })()}
        <div style="font-size:10px;opacity:.6;margin-top:10px">*Subject to availability at the time of booking. Prices may vary with currency fluctuation. Quote valid till <b>${quoteVTDisplay}</b>.</div>
      </div>` : `
      <div style="background:#fdf6e5;border:1px solid #ecd9a0;border-radius:14px;padding:16px 22px;margin:8px 0 18px;text-align:center">
        <div style="font-size:13px;color:#8a6d1a;font-weight:700">💬 Best price guaranteed — contact us for your personalised quote</div>
      </div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Voyage-Ed Proposal — ${esc(deal.destination)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:#eef2f9;color:#1a2c52}
.page{max-width:820px;margin:0 auto;background:#f7fafd}
h1,h2,.serif{font-family:'Playfair Display',serif}
@media print{ body{background:#fff} .noprint{display:none} .pagebreak{page-break-before:always} .ve-interactive{display:none!important} .ve-printsign{display:block!important} }
</style></head><body>
<div class="page">
  <!-- COVER -->
  <div id="veHero" style="position:relative;height:96vh;min-height:640px;${cover?`background:url('${cover}') center/cover no-repeat;`:"background:linear-gradient(155deg,#0a1530,#13265c 55%,#1a3572);"}display:flex;flex-direction:column;justify-content:flex-end">
    ${cover&&cover!==fbCover?`<img src="${cover}" style="display:none" onerror="var h=document.getElementById('veHero');if(h){h.style.background=&quot;url('${fbCover}') center/cover no-repeat&quot;;}"/>`:""}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,21,48,.25),rgba(10,21,48,${cover?".78":".15"}) 75%)"></div>
    <div style="position:absolute;top:26px;left:28px;background:#fff;border-radius:12px;padding:8px 16px"><img src="${VE_LOGO}" style="height:42px;display:block" alt="Voyage-Ed Travels"/></div>
    ${!cover?`<div style="position:absolute;top:40%;left:0;right:0;text-align:center;color:#f0c842;font-size:60px">✈️</div>`:""}
    <div style="position:relative;padding:34px 40px 40px;color:#fff">
      <h1 style="font-size:52px;line-height:1.05;margin-bottom:8px">Trip to ${esc(deal.destination)||"Your Dream Destination"}</h1>
      <div style="font-size:11px;letter-spacing:4px;color:#f0c842;font-weight:700;margin-bottom:8px">LEARN · TRAVEL · EXPLORE</div>
      <div style="font-size:13px;opacity:.85;margin-bottom:16px">Reference: <b>${ref}</b></div>
      <div style="border-top:2px solid rgba(255,255,255,.5);padding-top:16px;font-size:14px;line-height:2">
        📍 <b>${esc(deal.destination)}</b>${nightsTotal?` — ${nightsTotal} nights / ${nightsTotal+1} days`:""}<br>
        📅 <b>${esc(deal.travelDates)||"Dates to be confirmed"}</b><br>
        👥 <b>${deal.rooms||1} room${Number(deal.rooms)===1?"":"s"}, ${pax}</b>
      </div>
    </div>
    <div style="position:relative;background:rgba(10,21,48,.85);padding:12px 40px;color:#fff;font-size:12px">Specially crafted for <b style="color:#f0c842">${esc(deal.clientName)||"our valued guest"}</b> by <b style="color:#f0c842">VOYAGE-ED TRAVELS</b> &nbsp;·&nbsp; 📞 +91 70096 59048</div>
  </div>

  <!-- BODY -->
  <div class="pagebreak" style="padding:34px 36px">
    ${statsRibbon}
    ${priceBlock}
    ${highlightsHTML}
    ${glimpseHTML}
    ${showF?`<h2 style="font-size:22px;color:#0d1b3e;margin:6px 0 14px">✈️ Your Flights</h2>${flightBlocks}`:""}
    ${tierOptionsBlock}
    ${showH&&hotels.length&&!tierOptionsBlock?`<h2 style="font-size:22px;color:#0d1b3e;margin:20px 0 14px">🏨 Your Stays</h2>${hotelBlocks}`:""}
    ${landBlocks?`<h2 style="font-size:22px;color:#0d1b3e;margin:20px 0 14px">🗓️ Day-wise Journey</h2>${timelineHTML}${landBlocks}`:""}

    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:22px">
      <div style="flex:1;min-width:250px">
        <h2 style="font-size:16px;color:#15803d;margin:0 0 8px">✅ What's Included</h2>
        <div style="background:#fff;border:1px solid #d3ecd9;border-radius:14px;padding:14px 18px;font-size:12px;line-height:2;color:#33415e">
          ${(propInc!=null?propInc:autoIncText()).split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>"✅ "+esc(x)).join("<br>")}
        </div>
      </div>
      <div style="flex:1;min-width:250px">
        <h2 style="font-size:16px;color:#b4540a;margin:0 0 8px">ℹ️ Not Included</h2>
        <div style="background:#fff;border:1px solid #f3e3cf;border-radius:14px;padding:14px 18px;font-size:12px;line-height:2;color:#33415e">
          ${(propExc!=null?propExc:autoExcText()).split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>"✖ "+esc(x)).join("<br>")}
        </div>
      </div>
    </div>
    <h2 style="font-size:18px;color:#0d1b3e;margin:24px 0 10px">📋 Booking Terms & Cancellation Policy</h2>
    <div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;font-size:11.5px;line-height:1.9;color:#4a5772">
      <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:6px">BOOKING & PAYMENT POLICY</div>
      • A <b style="color:#0d1b3e">non-refundable deposit of ₹20,000 per person</b> is required to initiate a booking, OR the actual hotel, flight & land component minimum due — whichever is higher.<br>
      • If the date of travel is <b style="color:#0d1b3e">less than 7 days</b> away, a non-refundable deposit of <b style="color:#0d1b3e">50% of the total cost</b> shall be applicable.<br>
      • <b style="color:#0d1b3e">Full payment</b> is required on confirmation of all services and before departure from India.<br>
      • Payments accepted via bank transfer, UPI, or card — we never ask for payments to personal accounts.<br>
      • Photocopies of the passport (<b style="color:#0d1b3e">first & address page</b>) are mandatory for all destinations.<br>
      <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800;margin:12px 0 6px">CANCELLATION POLICY${isCustomCancel?" · SPECIAL TERMS":""}</div>
      ${cancelPolicyHTML}<br>
      <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800;margin:12px 0 6px">AMENDMENTS & IMPORTANT</div>
      • Any change is treated as a new booking, subject to availability and revised pricing. Changes within the cancellation window attract applicable charges.<br>
      • Passport must be valid for at least 6 months from travel date. Visa granting is at the Embassy's discretion; rejection/delay is not our liability.<br>
      • Gala dinner charges on special dates (24/31 Dec, 14 Feb) may be payable directly at the hotel. Itinerary may be modified due to force majeure, weather, or availability — suitable alternatives will be arranged.
    </div>
    <div style="font-size:10px;color:#8a97b5;margin-top:12px;line-height:1.7">This itinerary is a preliminary proposal. All services & prices are subject to availability and currency fluctuation at the time of booking. GST is applicable as per government norms.</div>

    ${payBlock}
    ${legalTC}
    <div style="margin-top:22px;display:flex;justify-content:flex-end"><div style="text-align:right">
      <div style="font-family:'Playfair Display',serif;font-size:17px;color:#0d1b3e;font-style:italic">Warm regards,</div>
      <div style="font-size:12.5px;font-weight:800;color:#0d1b3e;margin-top:2px">Vishal Sharma & Sahitya Singh</div>
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
  function propWarnings(){
    const w=[];
    const P=x=>{if(!x)return null;const t=Date.parse(x);return isNaN(t)?null:t;};
    const today0=new Date(); today0.setHours(0,0,0,0);
    if(!(deal.clientName||"").trim()) w.push("Client name missing — legal acceptance mein naam blank aayega");
    if(!(deal.contactNo||"").trim()) w.push("Client phone missing — WhatsApp send kaam nahi karega");
    (deal.flightVendors||[]).forEach(f=>{
      const secs=(f.sectors||[]).concat(f.returnSectors||[]).filter(x=>x.from||x.to);
      let prev=null, prevLbl="";
      secs.forEach(x=>{
        const t=P(x.date); const lbl=(x.from||"?")+" → "+(x.to||"?");
        if(t!==null){
          if(t<today0.getTime()) w.push("Flight "+lbl+" ki date ("+x.date+") past mein hai");
          if(prev!==null && t<prev) w.push("Flight dates ulti hain: "+lbl+" ("+x.date+") pichhle sector "+prevLbl+" se PEHLE hai");
          prev=t; prevLbl=lbl+" ("+x.date+")";
        }
      });
    });
    (deal.hotelVendors||[]).forEach(h=>{
      const ci=P(h.checkIn), co=P(h.checkOut); const nm=h.hotelName||h.city||"Hotel";
      if(ci!==null&&co!==null&&co<=ci) w.push(nm+": check-out ("+h.checkOut+") check-in ("+h.checkIn+") ke baad nahi hai");
      if(ci!==null&&ci<today0.getTime()) w.push(nm+": check-in ("+h.checkIn+") past mein hai");
    });
    const sell=propSell();
    if(propShowPrice&&!(sell>0)) w.push("Selling price 0/blank hai — price section khali dikhega");
    return w;
  }
  // ── Quote validity engine ──
  const _qToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
  const quoteVT=(function(){ const t=Date.parse(deal.quoteValidTill||""); if(!isNaN(t)&&t>=_qToday().getTime()) return deal.quoteValidTill; const d=new Date(Date.now()+7*864e5); return d.toISOString().slice(0,10); })();
  const quoteDaysLeft=Math.ceil((Date.parse(quoteVT)-_qToday().getTime())/864e5);
  const quoteVTDisplay=new Date(quoteVT).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  const persistQuoteVT=(vt)=>{ if(deal.quoteValidTill!==vt) setDeal(d=>({...d,quoteValidTill:vt})); };
  const extendQuoteVT=()=>{ const d=new Date(Date.now()+7*864e5).toISOString().slice(0,10); setDeal(x=>({...x,quoteValidTill:d})); window.veToast&&window.veToast("Quote validity extend — ab "+new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" tak","success"); };
  const visaIncludedInDeal=()=> (deal.visaVendors||[]).some(v=> (Number(v.sellingPrice)||0)>0 || (Number(v.costPrice)||0)>0 );
  function autoIncText(){
    const L=[];
    if((deal.flightVendors||[]).some(f=>(f.sectors||[]).concat(f.returnSectors||[]).some(x=>x.from||x.to))) L.push("Flights as mentioned above");
    if((deal.hotelVendors||[]).some(h=>h.hotelName||h.city)){ L.push("Hotel stays with breakfast"); L.push("All transfers & sightseeing as per itinerary"); }
    if(visaIncludedInDeal()) L.push("Visa fees & visa assistance");
    L.push("Dedicated trip manager on WhatsApp");
    L.push("All taxes included — no hidden charges");
    return L.join(String.fromCharCode(10));
  }
  function autoExcText(){
    const L=["Meals other than specified"];
    if(!visaIncludedInDeal()) L.push("Visa fees (unless mentioned)");
    L.push("Travel insurance & personal expenses");
    L.push("Anything not mentioned in inclusions");
    return L.join(String.fromCharCode(10));
  }
  function loadPropDaysForEdit(){
    const dayHdr=/^(?:day[\s-]*\d+|\d+(?:st|nd|rd|th)?\s+day)\b/i;
    const parse=(text)=>{const raw=(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);const f=raw.findIndex(l=>dayHdr.test(l));if(f<0)return raw;const out=[];let cur=null;raw.slice(f).forEach(l=>{if(dayHdr.test(l)){if(cur!==null)out.push(cur);cur=l;}else{cur=cur===null?l:cur+" "+l;}});if(cur!==null)out.push(cur);return out;};
    const days=(deal.landVendors||[]).filter(l=>l.itinerary).map(l=>parse(l.itinerary)).reduce((a,b)=>a.concat(b),[]);
    setPropDays(days.length?days:[""]);
  }
  function validateDealForProposal(){
    const issues=[];
    const D=x=>{const t=Date.parse(x);return isNaN(t)?null:t;};
    (deal.flightVendors||[]).forEach((f,fi)=>{
      const secs=(f.sectors||[]).filter(x=>x.from||x.to);
      for(let i=1;i<secs.length;i++){
        const a=D(secs[i-1].date), b=D(secs[i].date);
        if(a&&b&&b<a) issues.push("✈️ Flight "+(fi+1)+": sector "+(i+1)+" ("+secs[i].from+"→"+secs[i].to+", "+secs[i].date+") ki date pichhle sector se PEHLE hai — dates check karo");
      }
      (f.returnSectors||[]).filter(x=>x.from||x.to).forEach((r,ri)=>{
        const a=secs.length?D(secs[secs.length-1].date):null, b=D(r.date);
        if(a&&b&&b<a) issues.push("✈️ Flight "+(fi+1)+": return sector ("+r.date+") onward se pehle hai");
      });
    });
    (deal.hotelVendors||[]).forEach((h,hi)=>{
      const a=D(h.checkIn), b=D(h.checkOut);
      if(a&&b&&b<=a) issues.push("🏨 Hotel "+(hi+1)+" ("+(h.hotelName||h.city||"?")+"): check-out check-in se pehle/same hai");
    });
    const _T0=(function(){const d=new Date();d.setHours(0,0,0,0);return d.getTime();})();
    (deal.flightVendors||[]).forEach((f)=>{ (f.sectors||[]).concat(f.returnSectors||[]).forEach(x=>{ const t=D(x.date); if((x.from||x.to)&&t!==null&&t<_T0&&!issues.some(m=>m.indexOf("past date")>=0)) issues.push("✈️ Kisi flight ki date past date mein hai ("+x.date+") — check karo"); }); });
    (deal.hotelVendors||[]).forEach((h)=>{ const a=D(h.checkIn); if(a!==null&&a<_T0&&!issues.some(m=>m.indexOf("check-in past")>=0)) issues.push("🏨 "+(h.hotelName||h.city||"Hotel")+": check-in past date mein hai"); });
    const _recv=(deal.clientPayments||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
    if(propSell()>0&&_recv>propSell()) issues.push("💰 Received (₹"+_recv.toLocaleString("en-IN")+") total price se ZYADA hai — payment entries check karo");
    if(propShowPrice&&propSell()<=0) issues.push("💰 Selling price 0 hai lekin 'Show price' ON hai");
    if(!(deal.clientName||"").trim()) issues.push("👤 Client name khali hai — acceptance section mein naam nahi aayega");
    return issues;
  }
  function openProposal(){
    persistQuoteVT(quoteVT);
    try{ saveToAllDeals(true); }catch(e){}
    const issues=validateDealForProposal();
    if(issues.length && !window.confirm("⚠️ PROPOSAL WARNINGS:\n\n"+issues.join("\n")+"\n\nPhir bhi generate karein?")) return;
    const w=window.open("","_blank");
    if(!w){window.veToast("Popup blocked — allow popups","error");return;}
    w.document.write(buildProposalHTML());
    w.document.close();
  }
  function downloadProposalHTML(){
    persistQuoteVT(quoteVT);
    try{ saveToAllDeals(true); }catch(e){}
    const issues=validateDealForProposal();
    if(issues.length && !window.confirm("⚠️ PROPOSAL WARNINGS:\n\n"+issues.join("\n")+"\n\nPhir bhi generate karein?")) return;
    const html=buildProposalHTML();
    const ref=(deal.reference||deal.clientName||"proposal").toString().replace(/[^a-zA-Z0-9-]+/g,"-");
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="Voyage-Ed-Proposal-"+ref+".html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    window.veToast && window.veToast("Interactive proposal downloaded — WhatsApp pe document ki tarah bhejo. Client browser me kholega toh Accept button kaam karega ✅","success");
  }
  function _cmpCalc(d0){
    const d=normalizeDeal(d0);
    const allV=[...(d.hotelVendors||[]),...(d.flightVendors||[]),...(d.landVendors||[]),...(d.visaVendors||[])];
    const refT=(d.refunds||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
    const sell=Math.max(0,allV.reduce((a,v)=>a+vendorINR(v).sellINR,0)-refT);
    const hotels=(d.hotelVendors||[]).filter(h=>h.hotelName||h.city).map(h=>({city:h.city,name:h.hotelName,star:h.starRating,room:h.roomCategory,n:Number(h.nights)||nightsBetween(h.checkIn,h.checkOut)||0}));
    const nights=hotels.reduce((a,h)=>a+(h.n||0),0);
    const secs=[]; (d.flightVendors||[]).forEach(f=>(f.sectors||[]).concat(f.returnSectors||[]).forEach(x=>{if(x.from||x.to)secs.push(x);}));
    const itin=(d.landVendors||[]).map(l=>l.itinerary||"").join(" ");
    const meals=[/breakfast/i.test(itin)||hotels.length?"🍳 Breakfast":"",/lunch/i.test(itin)?"🥗 Lunch":"",/dinner/i.test(itin)?"🍽 Dinner":""].filter(Boolean);
    const visa=(d.visaVendors||[]).some(v=>(Number(v.sellingPrice)||0)>0||(Number(v.costPrice)||0)>0);
    const adults=Number(d.adults)||0;
    return {d,sell,hotels,nights,secs,meals,visa,adults,ref:d.reference||("VE-"+(d._localId||"").slice(-4).toUpperCase())};
  }
  function openComparison(){
    const other=(allDeals||[]).find(x=>x._localId===propCompareId);
    if(!other){window.veToast("Compare karne ke liye doosri deal chuno","warning");return;}
    const A=_cmpCalc(deal), B=_cmpCalc(other);
    const w=window.open("","_blank"); if(!w){window.veToast("Popup blocked","error");return;}
    const col=(X,tag,color)=>{
      const pp=X.adults>0&&X.sell>0?Math.round(X.sell/X.adults):0;
      const wa="https://wa.me/917009659048?text="+encodeURIComponent("I, "+(deal.clientName||"the Client")+", would like to CONFIRM "+tag+" ("+(X.d.destination||"")+", Ref: "+X.ref+") as per the comparison proposal.");
      return `<div style="flex:1;min-width:270px;background:#fff;border:2px solid ${color};border-radius:18px;overflow:hidden;display:flex;flex-direction:column">
        <div style="background:${color};color:#fff;padding:10px 16px;font-size:12px;font-weight:800;letter-spacing:1.5px;text-align:center">${tag}</div>
        <div style="padding:16px 18px;flex:1">
          <div style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#0d1b3e;line-height:1.3">${esc(X.d.destination||"—")}</div>
          <div style="font-size:11px;color:#7d8bab;margin:2px 0 10px">${X.nights?X.nights+" Nights / "+(X.nights+1)+" Days":""}${X.d.travelDates?" · "+esc(X.d.travelDates):""}</div>
          ${X.sell>0?`<div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:12px;padding:10px 14px;margin-bottom:12px"><div style="color:#f0c842;font-size:9px;letter-spacing:2px;font-weight:800">TOTAL PACKAGE</div><div style="color:#fff;font-size:22px;font-weight:800;font-family:Georgia,serif">₹${X.sell.toLocaleString("en-IN")}<span style="font-size:10px;font-weight:400"> /- all incl.</span></div>${pp?`<div style="color:#c7d2ee;font-size:10px">≈ ₹${pp.toLocaleString("en-IN")} per person · ${X.adults} Adults</div>`:""}</div>`:""}
          <div style="font-size:9.5px;letter-spacing:1.5px;color:#c9961a;font-weight:800;margin-bottom:5px">STAYS</div>
          ${X.hotels.length?X.hotels.map(h=>`<div style="font-size:11px;color:#33415e;padding:4px 0;border-bottom:1px dashed #eef2fa"><b>${esc(h.name||h.city||"Hotel")}</b>${h.star?" "+"⭐".repeat(Math.min(5,Number(h.star)||0)):""}<br><span style="color:#7d8bab;font-size:10px">${esc(h.city||"")}${h.room?" · "+esc(h.room):""}${h.n?" · "+h.n+"N":""}</span></div>`).join(""):`<div style="font-size:11px;color:#9aa7c4">—</div>`}
          <div style="font-size:9.5px;letter-spacing:1.5px;color:#c9961a;font-weight:800;margin:10px 0 5px">FLIGHTS</div>
          <div style="font-size:11px;color:#33415e">${X.secs.length?X.secs.slice(0,4).map(x=>esc((x.from||"")+" → "+(x.to||""))).join("<br>")+(X.secs.length>4?"<br>+"+(X.secs.length-4)+" more":""):"Not included"}</div>
          <div style="font-size:9.5px;letter-spacing:1.5px;color:#c9961a;font-weight:800;margin:10px 0 5px">INCLUDED</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">${[...X.meals,X.visa?"🛂 Visa":"","🚗 Transfers","🤝 Trip Manager"].filter(Boolean).map(x=>`<span style="background:#f0faf4;border:1px solid #cfe9d6;color:#15803d;font-size:9px;font-weight:800;border-radius:20px;padding:4px 9px">${x}</span>`).join("")}</div>
        </div>
        <a href="${wa}" style="display:block;text-decoration:none;background:linear-gradient(135deg,#15803d,#22a04e);color:#fff;text-align:center;padding:13px;font-size:13px;font-weight:800">✅ CHOOSE ${tag}</a>
      </div>`;
    };
    const diff=Math.abs(A.sell-B.sell);
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voyage-Ed — Compare Your Options</title>
    <style>body{font-family:'Segoe UI',system-ui,sans-serif;background:#eef2f9;margin:0;padding:0}@media print{body{background:#fff}.noprint{display:none}}</style></head><body>
    <div style="max-width:860px;margin:0 auto;background:#f8fafd;min-height:100vh">
      <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);padding:22px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="background:#fff;border-radius:10px;padding:6px 12px"><img src="${VE_LOGO}" style="height:36px;display:block"/></div>
        <div style="text-align:right;color:#fff"><div style="font-size:10px;letter-spacing:2px;color:#f0c842;font-weight:800">CHOOSE YOUR PERFECT OPTION</div><div style="font-size:12px;color:#c7d2ee">Specially prepared for <b style="color:#f0c842">${esc(deal.clientName)||"you"}</b></div></div>
      </div>
      <div style="padding:20px 22px">
        ${A.sell>0&&B.sell>0&&diff>0?`<div style="text-align:center;margin-bottom:14px;font-size:11.5px;color:#5a6b8c">Difference: <b style="color:#0d1b3e">₹${diff.toLocaleString("en-IN")}</b> — ${A.sell>B.sell?"OPTION A":"OPTION B"} is the premium pick ✨</div>`:""}
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:stretch">
          ${col(A,"OPTION A","#c9961a")}
          ${col(B,"OPTION B","#1a3060")}
        </div>
        <div style="text-align:center;margin-top:16px">
          <button class="noprint" onclick="window.print()" style="background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;border:none;border-radius:10px;padding:12px 26px;cursor:pointer;font-weight:800;font-size:13px">🖨 Print / Save PDF</button>
          <div style="font-size:9.5px;color:#9aa7c4;margin-top:10px">Prices subject to availability at time of booking · Full itinerary & T&C in the detailed proposal · Voyage-Ed Travels, GMADA Aerocity, Mohali · +91 70096 59048 · enquiry@voyage-ed.com</div>
        </div>
      </div>
    </div></body></html>`);
    w.document.close();
  }
  function waProposal(){
    const ph=(deal.contactNo||"").replace(/[^0-9]/g,"");
    if(!ph){window.veToast("Client phone number missing","error");return;}
    const hotels=(deal.hotelVendors||[]).filter(h=>h.hotelName||h.city);
    const flights=(deal.flightVendors||[]).filter(f=>(f.sectors||[]).some(s=>s.from||s.to));
    const sell=propSell();
    let m="✈️ *VOYAGE-ED TRAVELS — Trip Proposal*\n\n";
    m+="Hi "+((deal.clientName||"").split(" ")[0]||"")+"! Here is your personalised plan 🌍\n\n";
    m+="📍 *"+(deal.destination||"")+"*\n📅 "+(deal.travelDates||"Dates TBC")+"\n👥 "+(deal.adults||0)+" Adults"+(Number(deal.children)>0?", "+deal.children+" Children":"")+"\n";
    if(propFlights!=="without"&&flights.length){
      m+="\n*✈️ Flights:*\n";
      flights.forEach(f=>(f.sectors||[]).forEach(s=>{ if(s.from||s.to) m+="• "+(s.airlineName||s.airlineCode||"Flight")+" — "+s.from+" → "+s.to+(s.date?" ("+s.date+")":"")+"\n"; }));
    }
    if(propFlights!=="only"&&hotels.length){
      m+="\n*🏨 Stays:*\n";
      hotels.forEach(h=>{ m+="• "+(h.city?h.city+": ":"")+(h.hotelName||"Hotel")+" — "+(h.nights||"?")+"N, "+(h.roomCategory||"")+"\n"; });
    }
    if(propShowPrice&&sell>0) m+="\n💰 *Total: ₹"+sell.toLocaleString("en-IN")+"/-* (all inclusive)\n";
    else m+="\n💬 Reply for your best personalised price!\n";
    const _wref=deal.reference||("VE-"+(deal._localId||"").slice(-4).toUpperCase());
    m+="\n⏳ *Price valid till "+quoteVTDisplay+"* — seats/rooms subject to availability.\n";
    m+="\n✅ To confirm, simply reply: *I ACCEPT "+_wref+"*\n📄 Detailed PDF proposal attached separately.\n\n— Team Voyage-Ed 🌟\n📞 +91 70096 59048 · voyage-ed.com";
    window.open("https://wa.me/91"+ph+"?text="+encodeURIComponent(m),"_blank");
  }

  if(screen==="dashboard"){
    // Date-range filter — user picks WHICH date to filter on
    const DATE_MODES={
      query:{label:"Query Date",hint:"jis din enquiry bani",get:queryDateOf},
      travel:{label:"Travel Date",hint:"pehli flight / pehla hotel check-in",get:travelDateOf},
      booking:{label:"Booking Date",hint:"client ki pehli payment",get:bookingDateOf},
    };
    const dm=DATE_MODES[dateMode]||DATE_MODES.query;
    const inRange=(d)=>{
      if(!dateFrom && !dateTo) return true;
      const ds=dm.get(d);
      if(!ds) return false;               // no such date on this deal → excluded
      if(dateFrom && ds<dateFrom) return false;
      if(dateTo && ds>dateTo) return false;
      return true;
    };
    const rangedDeals=allDeals.filter(inRange);

    // ─── SALES INTELLIGENCE (the CRM tells YOU what to do) ───────────────────
    const todayStr=new Date().toISOString().slice(0,10);
    // Follow-ups due/overdue
    const followUps=allDeals.filter(d=>d.followUpDate && d.followUpDate<=todayStr && (d.stage!=="Booked"&&d.stage!=="Lost"&&d.stage!=="Travelled"));
    const overdueFollowUps=followUps.filter(d=>d.followUpDate<todayStr);
    // Hot leads not yet booked
    const hotLeads=allDeals.filter(d=>(d.priority==="Hot 🔥"||d.priority==="High")&&!["Booked","Cancelled","Travelled","Lost"].includes(d.stage||""));
    // Client payments pending on BOOKED deals (money to collect)
    // NOTE: all money now flows through dealFinance() so every screen agrees.
    const pendingCollections=allDeals.filter(isBookedStage)
      .map(d=>({...d,_due:dealFinance(d).clientDue}))
      .filter(d=>d._due>1).sort((a,b)=>b._due-a._due);
    const totalToCollect=pendingCollections.reduce((s,d)=>s+d._due,0);
    // Vendor payments we owe on booked deals
    const vendorDues=allDeals.filter(isBookedStage)
      .map(d=>({...d,_owe:dealFinance(d).vendorDue}))
      .filter(d=>d._owe>1).sort((a,b)=>b._owe-a._owe);
    const totalToPay=vendorDues.reduce((s,d)=>s+d._owe,0);
    // Pipeline funnel counts
    const funnel=DEAL_STAGES.map(st=>({stage:st,count:allDeals.filter(d=>stageOf(d)===st).length}));
    // Conversion rate
    const totalLeads=allDeals.length;
    const bookedCount=allDeals.filter(isBookedStage).length;
    const convRate=totalLeads>0?((bookedCount/totalLeads)*100).toFixed(1):"0";

    // Financial roll-up — per-deal GST mode respected (FIX: was always 18%)
    const dealVendors=(d)=>[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
    const dealSell=(d)=>dealVendors(d).reduce((ss,v)=>ss+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
    const dealCost=(d)=>dealVendors(d).reduce((ss,v)=>ss+toINR(v.costPrice,v.currency,v.exchangeRate),0);
    const dealGst=(d)=>{
      if(d.gstMode==="none") return 0;
      const s=dealSell(d), c=dealCost(d), g=s-c;
      return d.gstMode==="package" ? s*GST_RATE_PACKAGE : (g>0?g*GST_RATE_PROFIT:0);
    };
    const rollup=(deals)=>{
      const F=deals.map(dealFinance);
      const add=(k)=>F.reduce((s,f)=>s+f[k],0);
      const sell=add("sell"), cost=add("cost");
      const gpm=sell-cost;
      const gst=deals.reduce((s,d)=>s+dealGst(d),0);  // per-deal GST, not flat 18%
      const net=gpm-gst;
      const anyCxl=F.some(f=>f.hasCxl);
      return {count:deals.length,sell,cost,gpm,gst,net,
        vendorPaid:add("vendorPaid"), vendorDue:add("vendorDue"),
        clientRec:add("clientRec"),
        clientDue:add("clientDue"),        // sum of positive dues — real money to collect
        clientAdvance:add("clientAdvance"),// overpayments, shown separately
        afterSell:add("afterSell"), revisedProfit:add("revisedProfit"), anyCxl,
      };
    };

    // Split by stage — Booked/Completed vs Cancelled tracked SEPARATELY
    const bookedDeals=rangedDeals.filter(isBookedStage);
    const cancelledDeals=rangedDeals.filter(d=>["Cancelled","Lost"].includes(stageOf(d)));
    const B=rollup(bookedDeals);
    const C=rollup(cancelledDeals);
    const rangeLabel=(dateFrom||dateTo)?`${dateFrom||"start"} → ${dateTo||"today"}`:"All time";

    return (
      <div style={{minHeight:"100vh",background:"#f4f7fc",color:"#1a2c52",fontFamily:"'Syne','Segoe UI',sans-serif"}}>
        <style>{dashStyles}</style>
        {aiWidgetEl}
        <div className="crm-header" style={{background:"linear-gradient(135deg,#ffffff,#ffffff)",borderBottom:"1px solid #d4e0f5",padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:3,color:"#f97316",fontWeight:700,marginBottom:4}}>VOYAGE-ED CRM · DASHBOARD</div>
            <div style={{fontSize:22,fontWeight:800,color:"#0f2350"}}>{(()=>{const h=new Date().getHours();return h<12?"Good morning ☀️":h<17?"Good afternoon 🌤️":"Good evening 🌙"})()} </div>
            <div style={{fontSize:13,color:"#6b7a99",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div className="hdr-actions" style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={()=>{newDeal();setScreen("deal");}} className="btn btn-ind">+ New Deal</button>
            <button onClick={()=>setScreen("deal")} className="btn btn-sm">Continue Draft →</button>
            <button onClick={()=>setScreen("reports")} className="btn btn-sm">📊 Reports</button>
            <button onClick={()=>setDuesOpen(true)} className="btn btn-sm" style={{borderColor:"#f3c6c6",color:"#b91c1c"}}>💸 Dues</button>
            {isAdmin&&<button onClick={()=>{setScreen("users");loadUsers();}} className="btn btn-sm">👥 Users</button>}
            <button onClick={handleLogout} className="btn btn-sm" style={{borderColor:"#dc2626",color:"#b91c1c"}}>Logout</button>
            {duesOpen&&(()=>{
              const P=(x)=>{const t=Date.parse(x||"");return isNaN(t)?null:t;};
              const rows=[]; let payable=0, receivable=0;
              (allDeals||[]).forEach(d0=>{
                const d=normalizeDeal(d0);
                const secs=[["🏨",d.hotelVendors],["✈️",d.flightVendors],["🚗",d.landVendors],["🛂",d.visaVendors]];
                let travel=null;
                (d.hotelVendors||[]).forEach(h=>{const t=P(h.checkIn); if(t!==null&&(travel===null||t<travel))travel=t;});
                (d.flightVendors||[]).forEach(f=>(f.sectors||[]).forEach(x=>{const t=P(x.date); if(t!==null&&(travel===null||t<travel))travel=t;}));
                secs.forEach(([ic,vs])=>(vs||[]).forEach(v=>{
                  const vi=vendorINR(v); const due=vi.costINR-vi.paidINR;
                  if(due>0.5){ payable+=due; rows.push({ic,vn:v.name||v.hotelName||v.city||"Vendor",client:d.clientName||"—",dest:d.destination||"",due,travel}); }
                }));
                const sc=[...(d.hotelVendors||[]),...(d.flightVendors||[]),...(d.landVendors||[]),...(d.visaVendors||[])].reduce((a,v)=>a+vendorINR(v).sellINR,0);
                const ref=(d.refunds||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
                const rec=(d.clientPayments||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
                receivable+=Math.max(0,(sc-ref)-(rec-ref));
              });
              rows.sort((a,b)=>(a.travel===null?9e15:a.travel)-(b.travel===null?9e15:b.travel));
              const now=Date.now();
              return (
                <div onClick={()=>setDuesOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,21,48,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
                  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,width:"100%",maxWidth:640,maxHeight:"85vh",overflowY:"auto",padding:"22px 22px 18px",boxShadow:"0 30px 80px rgba(0,0,0,.35)",textAlign:"left"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <span style={{fontSize:16,fontWeight:800,color:"#0f2350"}}>💸 Vendor Dues Board</span>
                      <button onClick={()=>setDuesOpen(false)} style={{background:"transparent",border:"none",fontSize:18,cursor:"pointer",color:"#7d8bab"}}>✕</button>
                    </div>
                    <div style={{display:"flex",gap:10,marginBottom:14}}>
                      <div style={{flex:1,background:"#fdf1f1",border:"1px solid #f3c6c6",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:10,color:"#b91c1c",fontWeight:800,letterSpacing:1}}>VENDORS KO DENA</div><div className="mono" style={{fontSize:18,fontWeight:800,color:"#b91c1c"}}>{fmtINR(payable)}</div></div>
                      <div style={{flex:1,background:"#f0faf4",border:"1px solid #cfe9d6",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:10,color:"#15803d",fontWeight:800,letterSpacing:1}}>CLIENTS SE AANA</div><div className="mono" style={{fontSize:18,fontWeight:800,color:"#15803d"}}>{fmtINR(receivable)}</div></div>
                      <div style={{flex:1,background:receivable-payable>=0?"#f0faf4":"#fff7ed",border:"1px solid #e3eaf7",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:10,color:"#5a6b8c",fontWeight:800,letterSpacing:1}}>NET POSITION</div><div className="mono" style={{fontSize:18,fontWeight:800,color:receivable-payable>=0?"#15803d":"#c2660a"}}>{fmtINR(receivable-payable)}</div></div>
                    </div>
                    {rows.length===0&&<div style={{textAlign:"center",padding:24,color:"#7d8bab",fontSize:13}}>🎉 Koi vendor due pending nahi!</div>}
                    {rows.map((r,i)=>{
                      const days=r.travel===null?null:Math.ceil((r.travel-now)/864e5);
                      const urgent=days!==null&&days<=7&&days>=-1;
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,marginBottom:6,background:urgent?"#fdf1f1":"#f8fafd",border:"1px solid "+(urgent?"#f3c6c6":"#e3eaf7")}}>
                          <span style={{fontSize:15}}>{r.ic}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12.5,fontWeight:800,color:"#0f2350",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.vn}</div>
                            <div style={{fontSize:10.5,color:"#7d8bab",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.client}{r.dest?" · "+r.dest:""}</div>
                          </div>
                          {days!==null&&<span style={{fontSize:10,fontWeight:800,color:urgent?"#b91c1c":"#5a6b8c",whiteSpace:"nowrap"}}>{days<0?"travel ho chuki":days===0?"AAJ travel!":"travel in "+days+"d"}</span>}
                          <span className="mono" style={{fontSize:13.5,fontWeight:800,color:"#b91c1c",whiteSpace:"nowrap"}}>{fmtINR(r.due)}</span>
                        </div>
                      );
                    })}
                    <div style={{fontSize:10,color:"#9aa7c4",marginTop:10}}>Due = vendor cost − vendor ko ab tak paid · Urgent (red) = travel 7 din ke andar · Saved deals se live calculate hota hai</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{maxWidth:1120,margin:"0 auto",padding:"28px 32px"}}>
          {/* Date range filter */}
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",marginBottom:22,background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:12,padding:"14px 18px"}}>
            <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Filter by</div>
              <select value={dateMode} onChange={e=>setDateMode(e.target.value)} style={{background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:6,color:"#1a2c52",padding:"7px 10px",fontWeight:700,cursor:"pointer"}}>
                <option value="query">🗓️ Query Date</option>
                <option value="travel">✈️ Travel Date</option>
                <option value="booking">💰 Booking Date</option>
              </select></div>
            <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>From</div>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:6,color:"#1a2c52",padding:"7px 10px"}}/></div>
            <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>To</div>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:6,color:"#1a2c52",padding:"7px 10px"}}/></div>
            {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} className="btn btn-sm">Clear</button>}
            <div style={{flex:1,minWidth:120}}></div>
            <div style={{fontSize:11,color:"#6b7a99",textAlign:"right"}}>
              <div><b style={{color:"#0f2350"}}>{dm.label}</b> · {rangedDeals.length} deals</div>
              <div style={{fontSize:10,color:"#9aa7c4"}}>{dm.hint} · <b style={{color:"#c9961a"}}>{rangeLabel}</b></div>
            </div>
          </div>

          {/* ═══ AI DAILY BRIEF ═══ */}
          <div style={{background:"linear-gradient(135deg,#4169E1,#5b7fff)",borderRadius:14,padding:"18px 22px",marginBottom:18,color:"#fff",boxShadow:"0 12px 30px -10px rgba(65,105,225,.5)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,letterSpacing:.3}}>☀️ Aaj ka Business Brief</div>
                <div style={{fontSize:12,opacity:.9}}>AI tumhara poora business padh ke bataye aaj kya zaroori hai</div>
              </div>
              <button onClick={generateDailyBrief} disabled={briefBusy}
                style={{background:"#fff",color:"#4169E1",border:"none",borderRadius:9,padding:"11px 20px",fontWeight:800,cursor:"pointer",fontSize:14}}>
                {briefBusy?"Analysing…":"✨ Generate Brief"}</button>
            </div>
            {briefText&&(
              <div style={{marginTop:16,background:"rgba(255,255,255,.14)",borderRadius:10,padding:"16px 18px",fontSize:14,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{briefText}</div>
            )}
          </div>

          {/* ═══ TODAY'S COMMAND CENTER ═══ */}
          <div style={{background:"linear-gradient(135deg,#e8efff,#4169E1)",border:"1px solid #4169E1",borderRadius:14,padding:"20px 22px",marginBottom:24}}>
            <div style={{fontSize:13,fontWeight:800,color:"#4169E1",letterSpacing:1,marginBottom:14}}>🧠 TODAY'S COMMAND CENTER</div>
            <div className="cc-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
              <div onClick={()=>setDealFilter("followup")} style={ccCard(overdueFollowUps.length>0?"#dc2626":"#d4e0f5")}>
                <div style={ccNum(overdueFollowUps.length>0?"#b91c1c":"#1a2c52")}>{followUps.length}</div>
                <div style={ccLbl}>Follow-ups due{overdueFollowUps.length>0?` (${overdueFollowUps.length} overdue)`:""}</div>
              </div>
              <div onClick={()=>setDealFilter("hot")} style={ccCard("#d4e0f5")}>
                <div style={ccNum("#c2410c")}>{hotLeads.length}</div>
                <div style={ccLbl}>🔥 Hot leads</div>
              </div>
              <div onClick={()=>setDealFilter("collect")} style={ccCard("#d4e0f5")}>
                <div style={ccNum("#b45309")}>{fmtINR(totalToCollect)}</div>
                <div style={ccLbl}>To collect ({pendingCollections.length})</div>
              </div>
              <div onClick={()=>setDealFilter("pay")} style={ccCard("#d4e0f5")}>
                <div style={ccNum("#b91c1c")}>{fmtINR(totalToPay)}</div>
                <div style={ccLbl}>To pay vendors ({vendorDues.length})</div>
              </div>
              <div style={ccCard("#d4e0f5")}>
                <div style={ccNum("#15803d")}>{convRate}%</div>
                <div style={ccLbl}>Conversion ({bookedCount}/{totalLeads})</div>
              </div>
            </div>
            {/* Action list based on filter */}
            {dealFilter && (()=>{
              const map={followup:followUps,hot:hotLeads,collect:pendingCollections,pay:vendorDues};
              const list=map[dealFilter]||[];
              const titleMap={followup:"📞 Follow-ups due",hot:"🔥 Hot leads",collect:"💰 Pending collections",pay:"🏦 Vendor payments due"};
              return (
                <div style={{marginTop:16,borderTop:"1px solid #c2d2ee",paddingTop:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#4169E1"}}>{titleMap[dealFilter]} ({list.length})</span>
                    <span onClick={()=>setDealFilter("")} style={{fontSize:11,color:"#5a6b8c",cursor:"pointer"}}>✕ close</span>
                  </div>
                  {list.length===0&&<div style={{fontSize:12,color:"#6b7a99"}}>Nothing here — you're all caught up! 🎉</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto"}}>
                    {list.slice(0,20).map(d=>(
                      <div key={d._id||d._localId} onClick={()=>openDeal(d)} style={{background:"#f4f7fc",border:"1px solid #d4e0f5",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:10,flexWrap:"wrap"}}>
                        <div>
                          <span style={{fontWeight:700,fontSize:13}}>{d.clientName||"Unnamed"}</span>
                          <span style={{fontSize:11,color:"#6b7a99"}}> · {d.destination||"—"}</span>
                          {d.followUpDate&&dealFilter==="followup"&&<span style={{fontSize:11,color:d.followUpDate<todayStr?"#b91c1c":"#5a6b8c"}}> · 📅 {d.followUpDate}</span>}
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:dealFilter==="pay"?"#b91c1c":"#b45309"}}>
                          {dealFilter==="collect"&&fmtINR(d._due)}
                          {dealFilter==="pay"&&fmtINR(d._owe)}
                          {dealFilter==="hot"&&(d.priority||"")}
                          {dealFilter==="followup"&&"Open →"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* PIPELINE FUNNEL */}
          <div style={{fontSize:12,color:"#6b7a99",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>📊 Sales Pipeline</div>
          <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
            {funnel.map(f=>(
              <div key={f.stage} style={{flex:"1 1 110px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:800,color:f.stage==="Booked"?"#15803d":f.stage==="Lost"?"#ef4444":"#1a2c52"}}>{f.count}</div>
                <div style={{fontSize:10,color:"#6b7a99",marginTop:4}}>{f.stage}</div>
              </div>
            ))}
          </div>

          {/* BOOKED set */}
          <div style={{fontSize:12,color:"#10b981",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>✅ Booked — {B.count} deals</div>
          <div className="dash-cards" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:28}}>
            {[
              {l:"Sale Price",v:fmtINR(B.sell),c:"#1a2c52"},
              {l:"Cost Price",v:fmtINR(B.cost),c:"#33446b"},
              {l:"Gross Profit",v:fmtINR(B.gpm),c:B.gpm>=0?"#10b981":"#ef4444"},
              ...(B.anyCxl?[{l:"Profit After Cancellation",v:fmtINR(B.revisedProfit),c:B.revisedProfit>=0?"#0891b2":"#ef4444"}]:[]),
              {l:"Net (after GST)",v:fmtINR(B.net),c:B.net>=0?"#f97316":"#ef4444"},
              {l:"Vendor Paid",v:fmtINR(B.vendorPaid),c:"#4169E1"},
              {l:"Vendor Pending",v:fmtINR(B.vendorDue),c:B.vendorDue>0?"#ef4444":"#10b981"},
              {l:"Client Received",v:fmtINR(B.clientRec),c:"#10b981"},
              {l:"Client Pending",v:fmtINR(B.clientDue),c:B.clientDue>0?"#f59e0b":"#10b981"},
              ...(B.clientAdvance>0?[{l:"Client Advance (refundable)",v:fmtINR(B.clientAdvance),c:"#7c3aed"}]:[]),
            ].map((s,i)=>(
              <div key={i} style={{background:"#ffffff",border:"1px solid #15803d",borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
                <div style={{fontFamily:"monospace",fontSize:17,fontWeight:800,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* CANCELLED set */}
          <div style={{fontSize:12,color:"#ef4444",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>❌ Cancelled — {C.count} deals</div>
          <div className="dash-cards" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:32}}>
            {[
              {l:"Sale Price",v:fmtINR(C.sell),c:"#33446b"},
              {l:"Cost Price",v:fmtINR(C.cost),c:"#33446b"},
              {l:"Lost Profit",v:fmtINR(C.gpm),c:"#ef4444"},
              {l:"Vendor Paid",v:fmtINR(C.vendorPaid),c:"#4169E1"},
              {l:"Vendor Pending",v:fmtINR(C.vendorDue),c:C.vendorDue>0?"#ef4444":"#10b981"},
              {l:"Client Received",v:fmtINR(C.clientRec),c:"#10b981"},
              {l:"Client Refund Due",v:fmtINR(C.clientRec),c:"#f59e0b"},
            ].map((s,i)=>(
              <div key={i} style={{background:"#ffffff",border:"1px solid #fdeaea",borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
                <div style={{fontFamily:"monospace",fontSize:17,fontWeight:800,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:12,color:"#6b7a99",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Queries ({allDeals.length})</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={exportAllDeals} className="btn btn-sm" title="Saari deals ki JSON file download — Google Drive me safe rakho">⬇️ Backup</button>
              <label className="btn btn-sm" style={{cursor:"pointer"}} title="Backup file se deals wapas lao (naya device / data loss)">⬆️ Restore
                <input type="file" accept=".json,application/json" style={{display:"none"}} onChange={e=>{const f=e.target.files&&e.target.files[0]; if(f) importDealsFile(f); e.target.value="";}}/>
              </label>
            </div>
          </div>
          {allDeals.length===0&&<div style={{textAlign:"center",padding:40,color:"#a9bce0",background:"#ffffff",borderRadius:12,border:"1px dashed #d4e0f5"}}>No deals saved yet. Create a new deal and save it.</div>}
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
            <input value={dealSearch} onChange={e=>setDealSearch(e.target.value)} placeholder="🔍 Search client, destination, deal no..."
              style={{flex:"1 1 260px",background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:8,color:"#1a2c52",padding:"10px 14px",fontSize:13,outline:"none"}}/>
          </div>
          {/* ── Status tabs — click a stage to see only those queries ── */}
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
            {(()=>{
              const q=dealSearch.toLowerCase().trim();
              const searched=allDeals.filter(d=>!q||(`${d.clientName||""} ${d.destination||""} ${d.dealNumber||""} ${d.contactNo||""}`).toLowerCase().includes(q));
              const counts={All:searched.length};
              DEAL_STAGES.forEach(s=>{counts[s]=searched.filter(d=>stageOf(d)===s).length;});
              return ["All",...DEAL_STAGES].map(s=>{
                const m=STAGE_META[s]||{icon:"📋",color:"#0f2350",bg:"#eef3fc"};
                const on=stageTab===s;
                return <button key={s} onClick={()=>setStageTab(s)}
                  style={{border:"1px solid "+(on?m.color:"#d4e0f5"),background:on?m.color:"#fff",color:on?"#fff":m.color,
                    borderRadius:20,padding:"7px 13px",cursor:"pointer",fontSize:11.5,fontWeight:800,letterSpacing:.2,
                    display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
                  <span>{s==="All"?"📋":m.icon}</span>{s}
                  <span style={{background:on?"rgba(255,255,255,.25)":m.bg,color:on?"#fff":m.color,
                    borderRadius:10,padding:"1px 7px",fontSize:10.5,fontWeight:800}}>{counts[s]||0}</span>
                </button>;
              });
            })()}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {allDeals.filter(d=>{
              if(stageTab!=="All" && stageOf(d)!==stageTab) return false;
              const q=dealSearch.toLowerCase().trim();
              if(!q) return true;
              return (`${d.clientName||""} ${d.destination||""} ${d.dealNumber||""} ${d.contactNo||""}`).toLowerCase().includes(q);
            }).sort((a,b)=>(queryDateOf(b)||"").localeCompare(queryDateOf(a)||"")).map(d=>{
              const _F=dealFinance(d);
              const dSell=_F.sell, dGpm=_F.gpm, dRec=_F.clientRec;
              const _stage=stageOf(d), _sm=STAGE_META[_stage]||{icon:"📋",color:"#6b7a99",bg:"#eef3fc"};
              const _qd=queryDateOf(d), _td=travelDateOf(d), _bd=bookingDateOf(d);
              const _shortD=(x)=>x?new Date(x).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"—";
              return (
                <div key={d._id} onClick={()=>openDeal(d)} style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:10,padding:"14px 20px",cursor:"pointer",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:12,alignItems:"center",transition:"border .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#f97316"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#d4e0f5"}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                      {d.clientName||"Unnamed Client"}
                      <span style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:_sm.bg,color:_sm.color}}>{_sm.icon} {_stage}</span>
                      {(()=>{ const sb=siblingsOf(d,allDeals);
                        return <>
                          {sb.length>1&&<span title="Is client ki enquiry mein itne destinations hain" style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:"#e0f7fb",color:"#0e7490"}}>🗺️ {sb.length} destinations</span>}
                          {isFrozenPkg(d,sb)&&<span title="Client ne is enquiry ka dusra destination book kiya" style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:"#f1f5f9",color:"#94a3b8"}}>🔒 Not chosen</span>}
                        </>; })()}
                    </div>
                    <div style={{fontSize:12,color:"#6b7a99"}}>{d.destination||"No destination"}</div>
                    <div style={{fontSize:10,color:"#9aa7c4",marginTop:3,display:"flex",gap:9,flexWrap:"wrap"}}>
                      <span title="Query date">🗓️ {_shortD(_qd)}</span>
                      <span title="Travel date" style={{color:_td&&_td>=new Date().toISOString().slice(0,10)?"#0891b2":"#9aa7c4"}}>✈️ {_shortD(_td)}</span>
                      <span title="Booking date">💰 {_shortD(_bd)}</span>
                    </div>
                  </div>
                  <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>SELLING</div><div style={{fontFamily:"monospace",fontWeight:700}}>{fmtINR(dSell)}</div>{_F.hasCxl&&<div style={{fontSize:9,fontFamily:"monospace",color:"#0891b2"}} title="After cancellation">→ {fmtINR(_F.afterSell)}</div>}</div>
                  <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>GPM</div><div style={{fontFamily:"monospace",fontWeight:700,color:dGpm>=0?"#10b981":"#ef4444"}}>{fmtINR(dGpm)}</div>{_F.hasCxl&&<div style={{fontSize:9,fontFamily:"monospace",color:_F.revisedProfit>=0?"#0891b2":"#ef4444"}} title="After cancellation">→ {fmtINR(_F.revisedProfit)}</div>}</div>
                  <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>RECEIVED</div><div style={{fontFamily:"monospace",fontWeight:700,color:"#10b981"}}>{fmtINR(dRec)}</div></div>
                  <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>BALANCE</div><div style={{fontFamily:"monospace",fontWeight:700,color:(dSell-dRec)>0?"#f97316":"#10b981"}}>{fmtINR(dSell-dRec)}</div></div>
                    <div style={{textAlign:"right"}}>
                      {d.status && d.status!=="Not Actioned" && (
                        <span style={{display:"inline-block",fontSize:9,fontWeight:800,letterSpacing:.5,padding:"3px 8px",borderRadius:20,marginBottom:4,
                          background:d.status==="Booked"?"#e6f7ee":d.status==="Cancelled"?"#fdeaea":"#eef3fc",
                          color:d.status==="Booked"?"#15803d":d.status==="Cancelled"?"#b91c1c":"#5a6b8c"}}>{d.status}</span>
                      )}
                      <div style={{fontSize:11,color:"#a9bce0"}}>{d._savedAt?new Date(d._savedAt).toLocaleDateString("en-IN"):""}</div>
                      <button onClick={(e)=>{e.stopPropagation();deleteDealEverywhere(d);}}
                        style={{marginTop:4,background:"transparent",border:"1px solid #fdeaea",color:"#b91c1c",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:11}}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    // ── DEAL SCREEN ───────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#f4f7fc",color:"#1a2c52",fontFamily:"'Syne','Segoe UI',sans-serif"}}>
      <style>{dealStyles}</style>
      {aiWidgetEl}

      {receiptPayment&&<Receipt deal={deal} payment={receiptPayment} onClose={()=>setReceiptPayment(null)} />}

      {aiX&&(
        <div onClick={()=>!aiXBusy&&setAiX(null)} style={{position:"fixed",inset:0,background:"rgba(10,21,48,.55)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",padding:"22px",boxShadow:"0 30px 80px rgba(0,0,0,.35)"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#0f2350",marginBottom:4}}>✨ AI Extract — {aiX==="flight"?"Flight Details":aiX==="hotel"?"Hotel Details":"Land / Itinerary"}</div>
            <div style={{fontSize:11,color:"#7d8bab",marginBottom:12}}>Vendor ka email text paste karo, ya quote/PNR/itinerary ki <b>photo</b> — AI khud padh ke {aiX==="land"?"day-wise itinerary":"saare columns"} bhar dega. Baad mein form mein edit kar sakte ho.</div>
            <div tabIndex={0}
              onPaste={e=>{
                const items=Array.from(e.clipboardData.items||[]);
                const imgs=items.filter(x=>x.type&&x.type.indexOf("image")===0);
                if(imgs.length){ e.preventDefault(); imgs.forEach(it=>{const f=it.getAsFile(); if(f) window.__veImgToData(f,(d)=>setAiXImgs(a=>[...a,d]));}); }
              }}
              style={{border:"2px dashed #c4b5fd",borderRadius:12,padding:"14px",textAlign:"center",fontSize:11.5,color:"#5b21b6",background:"#faf8ff",outline:"none",marginBottom:10,cursor:"text"}}>
              📋 <b>Click karke Ctrl+V</b> — screenshot/photo paste karo (multiple bhi)
              <label style={{display:"inline-block",marginLeft:10,background:"#ede9fe",border:"1px solid #c4b5fd",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:10.5,fontWeight:700}}>📁 Choose
                <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{Array.from(e.target.files||[]).forEach(f=>window.__veImgToData(f,(d)=>setAiXImgs(a=>[...a,d]))); e.target.value="";}}/>
              </label>
              {aiXImgs.length>0&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,justifyContent:"center"}}>
                  {aiXImgs.map((d,i)=>(
                    <div key={i} style={{position:"relative"}}>
                      <img src={d} alt="" style={{width:64,height:46,objectFit:"cover",borderRadius:6,border:"1px solid #c4b5fd"}}/>
                      <button onClick={()=>setAiXImgs(a=>a.filter((_,j)=>j!==i))} style={{position:"absolute",top:-6,right:-6,width:16,height:16,borderRadius:"50%",background:"#b91c1c",color:"#fff",border:"none",fontSize:9,cursor:"pointer",lineHeight:"16px",padding:0}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <textarea value={aiXText} onChange={e=>setAiXText(e.target.value)} rows={5} placeholder={"Ya vendor ka email/message text yahan paste karo...\n(dono bhi de sakte ho — pic + text)"}
              style={{width:"100%",border:"1px solid #d4e0f5",borderRadius:10,padding:"10px 12px",fontSize:11.5,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6,marginBottom:12}}/>
            <div style={{display:"flex",gap:10}}>
              <button disabled={aiXBusy} onClick={runAIExtract} style={{flex:2,background:aiXBusy?"#c4b5fd":"linear-gradient(135deg,#6d28d9,#8b5cf6)",color:"#fff",border:"none",borderRadius:11,padding:"13px",cursor:aiXBusy?"wait":"pointer",fontSize:13,fontWeight:800}}>{aiXBusy?"🔎 AI padh raha hai...":"✨ Extract & Auto-Fill"}</button>
              <button disabled={aiXBusy} onClick={()=>{setAiX(null);setAiXText("");setAiXImgs([]);}} style={{flex:1,background:"transparent",border:"1px solid #e3eaf7",borderRadius:11,padding:"13px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#7d8bab"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {proposalOpen&&(
        <div onClick={()=>setProposalOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,21,48,.55)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:"26px 26px 22px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.35)"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#f97316",fontWeight:800,marginBottom:4}}>CLIENT PROPOSAL</div>
            <div style={{fontSize:20,fontWeight:800,color:"#0f2350",marginBottom:16}}>📄 Generate Proposal</div>

            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>WHAT TO INCLUDE</div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[["with","✈️+🏨 Full package"],["without","🏨 Without flights"],["only","✈️ Flights only"]].map(function(o){
                var act=propFlights===o[0];
                return <button key={o[0]} onClick={()=>setPropFlights(o[0])} style={{flex:"1 1 120px",background:act?"#0d1b3e":"#f4f7fc",color:act?"#fff":"#334e82",border:"1px solid "+(act?"#0d1b3e":"#d4e0f5"),borderRadius:10,padding:"10px 8px",cursor:"pointer",fontSize:12,fontWeight:700}}>{o[1]}</button>;
              })}
            </div>

            <label style={{display:"flex",alignItems:"center",gap:10,background:"#f4f7fc",border:"1px solid #d4e0f5",borderRadius:10,padding:"11px 14px",cursor:"pointer",marginBottom:12}}>
              <input type="checkbox" checked={propShowPrice} onChange={e=>setPropShowPrice(e.target.checked)} style={{width:17,height:17,accentColor:"#c9961a"}}/>
              <span style={{fontSize:13,fontWeight:600,color:"#1a2c52"}}>Show selling price {propShowPrice&&propSell()>0&&<b style={{color:"#15803d"}}>(₹{propSell().toLocaleString("en-IN")})</b>}</span>
            </label>

            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>COVER PHOTO URL <span style={{fontWeight:400}}>(optional — paste any image link)</span></div>
            <input value={propCoverUrl} onChange={e=>setPropCoverUrl(e.target.value)} placeholder="https://... (blank = auto/premium cover)"
              style={{width:"100%",background:"#f4f7fc",border:"1px solid #d4e0f5",borderRadius:10,padding:"10px 13px",fontSize:12,outline:"none",marginBottom:18}}/>

            {dirty&&(
              <div style={{display:"flex",alignItems:"center",gap:10,background:"#fdeaea",border:"1px solid #f5c6c6",borderRadius:10,padding:"9px 12px",marginBottom:12}}>
                <span style={{fontSize:12,fontWeight:700,color:"#b91c1c",flex:1}}>⚠️ Unsaved changes — proposal purane data se ban sakti hai</span>
                <button onClick={()=>saveToAllDeals(false)} disabled={apiLoading} style={{background:"#b91c1c",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:11,fontWeight:800}}>{apiLoading?"Saving...":"💾 Save now"}</button>
              </div>
            )}
            {(function(){var ws=propWarnings(); return ws.length?(
              <div style={{background:"#fdf6e5",border:"1px solid #ecd9a0",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                <div style={{fontSize:10,letterSpacing:1.5,color:"#8a6d1a",fontWeight:800,marginBottom:5}}>⚠️ CHECK KARO ({ws.length})</div>
                {ws.map(function(x,i){return <div key={i} style={{fontSize:11.5,color:"#7a5c10",lineHeight:1.7}}>• {x}</div>;})}
              </div>
            ):null;})()}
            {imgHealth==="checking"&&(
              <div style={{background:"#f4f7fc",border:"1px solid #d4e0f5",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#5a6b8c",marginBottom:12}}>🔎 Destination images live check ho rahi hain...</div>
            )}
            {imgHealth&&imgHealth!=="checking"&&imgHealth.dead&&imgHealth.dead.length>0&&(
              <div style={{background:"#fdf1f1",border:"1px solid #f3c6c6",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#b91c1c",marginBottom:12,fontWeight:600}}>⚠️ {imgHealth.dead.length} image(s) dead nikli — fikar mat karo, PDF mein automatically skip ho jayengi. Chaaho toh Custom Cover URL de do.</div>
            )}
            {imgHealth&&imgHealth!=="checking"&&imgHealth.dead&&imgHealth.dead.length===0&&imgHealth.ok>0&&(
              <div style={{background:"#f0faf2",border:"1px solid #c9e8d0",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#15803d",marginBottom:12,fontWeight:600}}>✅ Saari {imgHealth.ok} destination images live hain</div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{flex:1,fontSize:11,fontWeight:800,borderRadius:8,padding:"8px 12px",background:quoteDaysLeft>3?"#f0faf4":quoteDaysLeft>=1?"#fff7ed":"#fdf1f1",color:quoteDaysLeft>3?"#15803d":quoteDaysLeft>=1?"#c2660a":"#b91c1c",border:"1px solid "+(quoteDaysLeft>3?"#cfe9d6":quoteDaysLeft>=1?"#f3dfc0":"#f3c6c6")}}>
                ⏳ Quote valid till {quoteVTDisplay}{deal.quoteValidTill?` — ${quoteDaysLeft} din ${quoteDaysLeft===1?"bacha":"bache"}`:" (generate pe lock hogi)"}
              </span>
              <button onClick={extendQuoteVT} title="+7 din" style={{background:"#eef3fc",border:"1px solid #c2d2ee",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:11,fontWeight:800,color:"#334e82"}}>🔄 +7d</button>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>💺 OCCUPANCY PRICING (optional — sharing-wise per person)</div>
            {(deal.pricingRows||[]).length===0&&(
              <button onClick={()=>setDeal(d=>({...d,pricingRows:[{id:uid(),cat:OCC_CATS[0],count:"2",pp:""}]}))} style={{width:"100%",background:"#f4f7fc",border:"1px dashed #c2d2ee",borderRadius:10,padding:"11px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#334e82",marginBottom:14}}>➕ Twin/Single/Triple/Child-wise pricing likho</button>
            )}
            {(deal.pricingRows||[]).length>0&&(()=>{
              const rows=deal.pricingRows||[];
              const upd=(id,k,v)=>setDeal(d=>({...d,pricingRows:(d.pricingRows||[]).map(r=>r.id===id?{...r,[k]:v}:r)}));
              const grand=rows.reduce((a,r)=>a+((Number(r.count)||0)*(Number(r.pp)||0)),0);
              return (
                <div style={{marginBottom:14,background:"#f8fafd",border:"1px solid #e3eaf7",borderRadius:12,padding:"10px 12px"}}>
                  {rows.map(r=>{
                    const line=(Number(r.count)||0)*(Number(r.pp)||0);
                    return <div key={r.id} style={{display:"flex",gap:6,alignItems:"center",marginBottom:7}}>
                      <select value={r.cat} onChange={e=>upd(r.id,"cat",e.target.value)} style={{flex:2,border:"1px solid #d4e0f5",borderRadius:8,padding:"7px",fontSize:11,outline:"none",background:"#fff",minWidth:0}}>{OCC_CATS.map(c=><option key={c}>{c}</option>)}</select>
                      <input className="mono" type="number" value={r.count} onChange={e=>upd(r.id,"count",e.target.value)} placeholder="pax" style={{width:44,border:"1px solid #d4e0f5",borderRadius:8,padding:"7px",fontSize:11,outline:"none"}}/>
                      <input className="mono" type="number" value={r.pp} onChange={e=>upd(r.id,"pp",e.target.value)} placeholder="₹/person" style={{width:82,border:"1px solid #d4e0f5",borderRadius:8,padding:"7px",fontSize:11,outline:"none"}}/>
                      <span className="mono" style={{fontSize:10.5,fontWeight:800,color:"#0f2350",whiteSpace:"nowrap",minWidth:66,textAlign:"right"}}>{line>0?"₹"+line.toLocaleString("en-IN"):"—"}</span>
                      <button onClick={()=>setDeal(d=>({...d,pricingRows:(d.pricingRows||[]).filter(x=>x.id!==r.id)}))} style={{background:"transparent",border:"1px solid #fdeaea",color:"#b91c1c",borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:10}}>✕</button>
                    </div>;
                  })}
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <button onClick={()=>setDeal(d=>({...d,pricingRows:[...(d.pricingRows||[]),{id:uid(),cat:OCC_CATS[Math.min((d.pricingRows||[]).length,OCC_CATS.length-1)],count:"",pp:""}]}))} style={{flex:1,background:"#eef3fc",border:"1px solid #c2d2ee",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#334e82"}}>+ Row</button>
                    <button onClick={()=>setDeal(d=>({...d,pricingRows:[],usePricingTotal:false}))} style={{flex:1,background:"transparent",border:"1px solid #e3eaf7",borderRadius:8,padding:"7px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#7d8bab"}}>🗑 Clear</button>
                  </div>
                  <label style={{display:"flex",gap:8,alignItems:"center",background:grand>0?"#f0faf4":"#fff",border:"1px solid "+(deal.usePricingTotal?"#15803d":"#e3eaf7"),borderRadius:8,padding:"8px 10px",cursor:"pointer",fontSize:11.5,fontWeight:700,color:"#0f2350"}}>
                    <input type="checkbox" checked={!!deal.usePricingTotal} onChange={e=>setDeal(d=>({...d,usePricingTotal:e.target.checked}))} style={{width:15,height:15,accentColor:"#15803d"}}/>
                    Is total ko package price banao: <span className="mono" style={{color:"#15803d"}}>₹{grand.toLocaleString("en-IN")}</span>
                  </label>
                  <div style={{fontSize:9.5,color:"#9aa7c4",marginTop:5}}>Ex: 12L total, 6 pax → system khud ₹2L/person dikhata hai. Sharing-wise chahiye toh yahan rows bharo — PDF mein poora breakdown table aayega.</div>
                </div>
              );
            })()}
            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>🏨 3★ / 4★ / 5★ OPTIONS (optional — teeno ek PDF mein side-by-side)</div>
            <label style={{display:"flex",gap:8,alignItems:"center",background:deal.useTiers?"#f0f5ff":"#fff",border:"1px solid "+(deal.useTiers?"#4169E1":"#e3eaf7"),borderRadius:8,padding:"9px 11px",cursor:"pointer",fontSize:11.5,fontWeight:700,color:"#0f2350",marginBottom:deal.useTiers?10:14}}>
              <input type="checkbox" checked={!!deal.useTiers} onChange={e=>setDeal(d=>({...d,useTiers:e.target.checked}))} style={{width:15,height:15,accentColor:"#4169E1"}}/>
              3 options wali comparison PDF banao (client ko teeno choices dikhao)
            </label>
            {deal.useTiers&&(()=>{
              const updTier=(tid,k,v)=>setDeal(d=>({...d,tiers:(d.tiers||[]).map(t=>t.id===tid?{...t,[k]:v}:t)}));
              const updTierHotel=(tid,hid,k,v)=>setDeal(d=>({...d,tiers:(d.tiers||[]).map(t=>t.id!==tid?t:{...t,hotels:(t.hotels||[]).map(h=>h.id===hid?{...h,[k]:v}:h)})}));
              const addTierHotel=(tid)=>setDeal(d=>({...d,tiers:(d.tiers||[]).map(t=>t.id!==tid?t:{...t,hotels:[...(t.hotels||[]),emptyTierHotel()]})}));
              const rmTierHotel=(tid,hid)=>setDeal(d=>({...d,tiers:(d.tiers||[]).map(t=>t.id!==tid?t:{...t,hotels:(t.hotels||[]).filter(h=>h.id!==hid)})}));
              const pax=(Number(deal.adults)||0)+(Number(deal.children)||0);
              return <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:10}}>
                {(deal.tiers||[]).map(t=>{
                  const per=pax>0&&Number(t.totalPrice)>0?Math.round(Number(t.totalPrice)/pax):0;
                  return <div key={t.id} style={{border:"1px solid "+(t.enabled?"#4169E1":"#e3eaf7"),borderRadius:12,padding:"11px 12px",background:t.enabled?"#fbfdff":"#fafafa"}}>
                    <label style={{display:"flex",gap:8,alignItems:"center",cursor:"pointer",marginBottom:t.enabled?9:0}}>
                      <input type="checkbox" checked={!!t.enabled} onChange={e=>updTier(t.id,"enabled",e.target.checked)} style={{width:15,height:15,accentColor:"#4169E1"}}/>
                      <span style={{fontWeight:800,color:"#0f2350",fontSize:13}}>{t.label}</span>
                      <span style={{color:"#f0c842",fontSize:12}}>{"★".repeat(t.star)}</span>
                    </label>
                    {t.enabled&&<div>
                      {(t.hotels||[]).map(h=>(
                        <div key={h.id} style={{background:"#fff",border:"1px solid #e8eef8",borderRadius:9,padding:"8px 9px",marginBottom:7}}>
                          <div style={{display:"flex",gap:6,marginBottom:6}}>
                            <input value={h.hotelName} onChange={e=>updTierHotel(t.id,h.id,"hotelName",e.target.value)} placeholder="Hotel name" style={{flex:2,border:"1px solid #d4e0f5",borderRadius:7,padding:"7px",fontSize:11,outline:"none",minWidth:0}}/>
                            <input value={h.city} onChange={e=>updTierHotel(t.id,h.id,"city",e.target.value)} placeholder="City" style={{flex:1,border:"1px solid #d4e0f5",borderRadius:7,padding:"7px",fontSize:11,outline:"none",minWidth:0}}/>
                            {(t.hotels||[]).length>1&&<button onClick={()=>rmTierHotel(t.id,h.id)} style={{background:"transparent",border:"1px solid #fdeaea",color:"#b91c1c",borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:10}}>✕</button>}
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <input value={h.photoUrl} onChange={e=>updTierHotel(t.id,h.id,"photoUrl",e.target.value)} placeholder="Photo URL (https://...)" style={{flex:2,border:"1px solid #d4e0f5",borderRadius:7,padding:"7px",fontSize:11,outline:"none",minWidth:0}}/>
                            <input value={h.roomCategory} onChange={e=>updTierHotel(t.id,h.id,"roomCategory",e.target.value)} placeholder="Room type" style={{flex:1,border:"1px solid #d4e0f5",borderRadius:7,padding:"7px",fontSize:11,outline:"none",minWidth:0}}/>
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>addTierHotel(t.id)} style={{background:"#eef3fc",border:"1px dashed #c2d2ee",borderRadius:7,padding:"6px",cursor:"pointer",fontSize:10.5,fontWeight:700,color:"#334e82",width:"100%",marginBottom:8}}>+ Aur hotel is tier mein</button>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#5a6b8c",whiteSpace:"nowrap"}}>Total package ₹</span>
                        <input className="mono" type="number" value={t.totalPrice} onChange={e=>updTier(t.id,"totalPrice",e.target.value)} placeholder="e.g. 1135500" style={{flex:1,border:"1px solid #d4e0f5",borderRadius:8,padding:"8px",fontSize:12,outline:"none",minWidth:0}}/>
                        {per>0&&<span className="mono" style={{fontSize:11,fontWeight:800,color:"#15803d",whiteSpace:"nowrap"}}>≈₹{per.toLocaleString("en-IN")}/pp</span>}
                      </div>
                      <button onClick={()=>setDeal(d=>({...d,status:t.booked?d.status:"Booked",tiers:(d.tiers||[]).map(x=>x.id===t.id?{...x,booked:!x.booked}:{...x,booked:false})}))}
                        style={{marginTop:8,width:"100%",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontSize:11.5,fontWeight:800,letterSpacing:.3,
                        background:t.booked?"linear-gradient(135deg,#15803d,#1a9e4b)":"#eef3fc",color:t.booked?"#fff":"#334e82"}}>
                        {t.booked?"✓ CLIENT BOOKED THIS TIER — selling price locked":"📌 Client ne yeh choose kiya — Book this tier"}
                      </button>
                    </div>}
                  </div>;
                })}
                <div style={{fontSize:9.5,color:"#9aa7c4"}}>Har tier mein hotel + photo URL + total price bharo. Quotation generate karne pe teeno side-by-side aa jayenge, per-person price bada dikhega. Kam se kam 1 tier tick + price zaroori.</div>
              </div>;
            })()}
            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>🆚 COMPARE (Option A = yeh deal)</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <select value={propCompareId} onChange={e=>setPropCompareId(e.target.value)} style={{flex:1,border:"1px solid #d4e0f5",borderRadius:10,padding:"10px",fontSize:12,outline:"none",background:"#fff"}}>
                <option value="">Option B chuno (doosri deal)...</option>
                {(allDeals||[]).filter(x=>x._localId!==deal._localId).map(x=><option key={x._localId} value={x._localId}>{(x.clientName||"—")+" · "+(x.destination||"—")}</option>)}
              </select>
              <button onClick={openComparison} disabled={!propCompareId} style={{background:propCompareId?"linear-gradient(135deg,#0d1b3e,#1a3060)":"#e3eaf7",color:propCompareId?"#fff":"#9aa7c4",border:"none",borderRadius:10,padding:"10px 16px",cursor:propCompareId?"pointer":"not-allowed",fontSize:12,fontWeight:800}}>🆚 PDF</button>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>CANCELLATION POLICY</div>
            <div style={{display:"flex",gap:8,marginBottom:propCancelMode==="custom"?8:14,flexWrap:"wrap"}}>
              {[["static","📋 Static (official policy)"],["custom","✏️ Amend for this booking"]].map(function(o){
                var act=propCancelMode===o[0];
                return <button key={o[0]} onClick={()=>{setPropCancelMode(o[0]); if(o[0]==="custom"&&!propCancelCustom) setPropCancelCustom("Non-refundable once booked (cruise/last-minute fare)\nDate change not permitted\nNo refund for unused services\nVisa fee & service charges non-refundable");}} style={{flex:"1 1 150px",background:act?"#0d1b3e":"#f4f7fc",color:act?"#fff":"#334e82",border:"1px solid "+(act?"#0d1b3e":"#d4e0f5"),borderRadius:10,padding:"10px 8px",cursor:"pointer",fontSize:12,fontWeight:700}}>{o[1]}</button>;
              })}
            </div>
            {propCancelMode==="custom"&&(
              <div style={{marginBottom:14}}>
                <textarea value={propCancelCustom} onChange={e=>setPropCancelCustom(e.target.value)} rows={5} placeholder={"One condition per line — e.g.\nNon-refundable once booked (cruise fare)\n45-31 days: 25% of total cost\n30-0 days: 100% of total cost"}
                  style={{width:"100%",background:"#fdf6e5",border:"1px dashed #c9961a",borderRadius:10,padding:"10px 13px",fontSize:12,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>
                <div style={{fontSize:10,color:"#8a6d1a",marginTop:4}}>💡 Yeh terms proposal + legal T&C dono mein automatically apply hongi (e.g. cruise / last-minute booking).</div>
              </div>
            )}

            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>✅ INCLUSIONS / ✖ EXCLUSIONS</div>
            {propInc==null&&(
              <button onClick={()=>{setPropInc(autoIncText());setPropExc(autoExcText());}} style={{width:"100%",background:"#f4f7fc",border:"1px dashed #c2d2ee",borderRadius:10,padding:"11px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#334e82",marginBottom:14}}>✏️ Edit Inclusions & Exclusions</button>
            )}
            {propInc!=null&&(
              <div style={{marginBottom:14,background:"#f8fafd",border:"1px solid #e3eaf7",borderRadius:12,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:800,color:"#15803d",marginBottom:4}}>✅ INCLUSIONS (one per line)</div>
                <textarea value={propInc} onChange={e=>setPropInc(e.target.value)} rows={5} style={{width:"100%",background:"#fff",border:"1px solid #d3ecd9",borderRadius:8,padding:"8px 11px",fontSize:11.5,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6,marginBottom:8}}/>
                <div style={{fontSize:10,fontWeight:800,color:"#b4540a",marginBottom:4}}>✖ EXCLUSIONS (one per line)</div>
                <textarea value={propExc==null?"":propExc} onChange={e=>setPropExc(e.target.value)} rows={4} style={{width:"100%",background:"#fff",border:"1px solid #f3e3cf",borderRadius:8,padding:"8px 11px",fontSize:11.5,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>
                <button onClick={()=>{setPropInc(null);setPropExc(null);}} style={{marginTop:8,width:"100%",background:"transparent",border:"1px solid #e3eaf7",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#7d8bab"}}>↺ Reset to auto (visa/flights ke hisab se)</button>
              </div>
            )}
            <div style={{fontSize:11,fontWeight:700,color:"#5a6b8c",letterSpacing:.5,marginBottom:6}}>ITINERARY (DAY-WISE)</div>
            {!propDays&&(
              <button onClick={loadPropDaysForEdit} style={{width:"100%",background:"#f4f7fc",border:"1px dashed #c2d2ee",borderRadius:10,padding:"11px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#334e82",marginBottom:14}}>✏️ Edit itinerary day-wise before generating</button>
            )}
            {propDays&&(
              <div style={{marginBottom:14,background:"#f8fafd",border:"1px solid #e3eaf7",borderRadius:12,padding:"10px 12px"}}>
                {propDays.map(function(d,i){
                  return <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                    <div style={{minWidth:44,background:"linear-gradient(135deg,#c9961a,#f0c842)",borderRadius:8,textAlign:"center",padding:"5px 0",fontSize:10,fontWeight:800,color:"#0d1b3e"}}>DAY<br/>{i+1}</div>
                    <textarea value={d} rows={2} onChange={e=>{var a=propDays.slice();a[i]=e.target.value;setPropDays(a);}}
                      style={{flex:1,background:"#fff",border:"1px solid #d4e0f5",borderRadius:8,padding:"7px 10px",fontSize:11.5,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.5}}/>
                    {propDayPhotos[i]?(
                      <div style={{position:"relative",width:52,flexShrink:0}}>
                        <img src={propDayPhotos[i]} alt="" style={{width:52,height:38,objectFit:"cover",borderRadius:6,border:"1px solid #d4e0f5"}}/>
                        <button onClick={()=>{const m={...propDayPhotos};delete m[i];setPropDayPhotos(m);}} title="Photo hatao" style={{position:"absolute",top:-7,right:-7,width:17,height:17,borderRadius:"50%",background:"#b91c1c",color:"#fff",border:"none",fontSize:9,cursor:"pointer",lineHeight:"17px",padding:0}}>✕</button>
                      </div>
                    ):(
                      <label tabIndex={0} title="Is day ki photo — click karke Ctrl+V ya file choose"
                        onPaste={e=>{const it=Array.from(e.clipboardData.items||[]).find(x=>x.type&&x.type.indexOf("image")===0); if(it){e.preventDefault(); const f=it.getAsFile(); if(f) window.__veImgToData(f,(d)=>setPropDayPhotos(m=>({...m,[i]:d})));}}}
                        style={{width:52,height:38,flexShrink:0,border:"1.5px dashed #c2d2ee",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",background:"#f8fafd",outline:"none"}}>📷
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files&&e.target.files[0]; if(f) window.__veImgToData(f,(d)=>setPropDayPhotos(m=>({...m,[i]:d}))); e.target.value="";}}/>
                      </label>
                    )}
                    <button onClick={()=>{var a=propDays.slice();a.splice(i,1);const m={};Object.keys(propDayPhotos).forEach(k=>{const kk=Number(k); if(kk<i)m[kk]=propDayPhotos[k]; else if(kk>i)m[kk-1]=propDayPhotos[k];});setPropDayPhotos(m);setPropDays(a.length?a:[""]);}} title="Remove day" style={{background:"transparent",border:"1px solid #fdeaea",color:"#b91c1c",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                  </div>;
                })}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setPropDays(propDays.concat([""]))} style={{flex:1,background:"#eef3fc",border:"1px solid #c2d2ee",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#334e82"}}>+ Add day</button>
                  <button onClick={()=>{setPropDays(null);setPropDayPhotos({});}} style={{flex:1,background:"transparent",border:"1px solid #e3eaf7",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#7d8bab"}}>↺ Reset to auto</button>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10}}>
              <button onClick={openProposal} style={{flex:1,background:"linear-gradient(135deg,#0d1b3e,#1a3060)",color:"#fff",border:"none",borderRadius:11,padding:"13px",cursor:"pointer",fontSize:13,fontWeight:800}}>🖨 Preview / PDF</button>
              <button onClick={downloadProposalHTML} title="Client browser me kholega toh Accept checkbox + submit kaam karega" style={{flex:1,background:"linear-gradient(135deg,#c9961a,#f0c842)",color:"#0d1b3e",border:"none",borderRadius:11,padding:"13px",cursor:"pointer",fontSize:13,fontWeight:800}}>🌐 Interactive Copy</button>
              <button onClick={waProposal} style={{flex:1,background:"#25d366",color:"#fff",border:"none",borderRadius:11,padding:"13px",cursor:"pointer",fontSize:13,fontWeight:800}}>💬 Send WhatsApp</button>
            </div>
            <div style={{fontSize:10,color:"#8a97b5",marginTop:10,textAlign:"center"}}>PDF: browser print dialog se "Save as PDF" karo, phir WhatsApp pe attach karo</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#ffffff,#ffffff)",borderBottom:"1px solid #d4e0f5",padding:"16px 28px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <button onClick={()=>setScreen("dashboard")} style={{background:"none",border:"1px solid #c2d2ee",borderRadius:6,color:"#5a6b8c",padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>← Dashboard</button>
            <div style={{flex:1}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#f97316",fontWeight:700,marginBottom:3}}>VOYAGE-ED CRM · DEAL P&L</div>
              <input value={deal.destination||""} onChange={e=>upd("destination",e.target.value)} placeholder="Destination / Package Name..." style={{background:"transparent",border:"none",borderBottom:"1px solid #c2d2ee",borderRadius:0,color:"#0f2350",fontSize:18,fontWeight:800,padding:"2px 0",width:300,outline:"none"}} />
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {dirty?<span style={{fontSize:11,color:"#b45309",fontWeight:700}}>● Unsaved</span>:(saveStatus&&<span style={{fontSize:11,color:"#10b981",fontWeight:600}}>✓ {saveStatus}</span>)}
              <button onClick={()=>setProposalOpen(true)} style={{background:"linear-gradient(135deg,#f0c842,#c9961a)",border:"none",borderRadius:8,color:"#0d1b3e",padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:800}}>📄 Proposal</button>
              <select value={stageOf(deal)} onChange={e=>{const v=e.target.value; setDeal(d=>({...d,stage:v,status:STAGE_TO_STATUS[v]||"Not Actioned"}));}}
                title="Deal status — dashboard tabs, funnel aur totals sab isi se chalte hain"
                style={{background:((STAGE_META[stageOf(deal)]||{}).bg||"#eef3fc"),
                  border:"1px solid "+((STAGE_META[stageOf(deal)]||{}).color||"#c2d2ee"),
                  color:((STAGE_META[stageOf(deal)]||{}).color||"#1a2c52"),
                  borderRadius:7,padding:"7px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {DEAL_STAGES.map(s=><option key={s} value={s}>{(STAGE_META[s]||{}).icon} {s}</option>)}
              </select>
              <button onClick={newDeal} className="btn btn-sm">+ New</button>
              <button onClick={duplicateDeal} className="btn btn-sm" title="Same package naye client ke liye — payments/refunds fresh">⧉ Duplicate</button>
              <button onClick={saveToAllDeals} className="btn btn-ind" disabled={apiLoading}>{apiLoading?"Saving...":"💾 Save Deal"}</button>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:2}}>
              <span style={{fontSize:10,color:"#6b7a99",letterSpacing:1}}>QUICK WHATSAPP:</span>
              <button onClick={()=>waMessage("quote")} className="btn btn-sm" style={{borderColor:"#16a34a",color:"#15803d"}} title="Send quote">💬 Quote</button>
              <button onClick={()=>waMessage("followup")} className="btn btn-sm" style={{borderColor:"#4169E1",color:"#1d4ed8"}} title="Follow up">🔔 Follow-up</button>
              <button onClick={()=>waMessage("payment")} className="btn btn-sm" style={{borderColor:"#f59e0b",color:"#b45309"}} title="Payment reminder">💰 Payment</button>
              <button onClick={()=>waMessage("confirm")} className="btn btn-sm" style={{borderColor:"#4169E1",color:"#4169E1"}} title="Booking confirmed">🎉 Confirm</button>
              <button onClick={()=>{const p=(deal.contactNo||"").replace(/[^0-9]/g,"");if(p)window.open("tel:+"+(p.length===10?"91"+p:p));}} className="btn btn-sm" style={{borderColor:"#4169E1",color:"#4169E1"}} title="Call client now">📞 Call Now</button>
              <button onClick={generateCallScript} disabled={callBusy} className="btn btn-sm" style={{borderColor:"#4169E1",color:"#4169E1"}} title="AI call prep">{callBusy?"Prepping…":"🎯 Call Prep"}</button>
            </div>
            {callScript&&(
              <div style={{marginTop:10,background:"#eef3fc",border:"1px solid #4169E1",borderRadius:10,padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:800,color:"#4169E1"}}>🎯 AI Call Script — {deal.clientName||"Client"}</span>
                  <span onClick={()=>setCallScript("")} style={{fontSize:12,color:"#6b7a99",cursor:"pointer"}}>✕</span>
                </div>
                <div style={{fontSize:13,lineHeight:1.6,color:"#1a2c52",whiteSpace:"pre-wrap"}}>{callScript}</div>
                <button onClick={()=>{navigator.clipboard.writeText(callScript);window.veToast&&window.veToast("Script copied!");}} className="btn btn-sm" style={{marginTop:10,borderColor:"#4169E1",color:"#4169E1"}}>📋 Copy</button>
              </div>
            )}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {l:"Selling",v:fmtINR(totalSell),c:"#1a2c52"},
                {l:"GPM",v:fmtINR(gpm),c:gpm>=0?"#10b981":"#ef4444"},
                {l:`GST (${deal.gstMode==="none"?"No GST":deal.gstMode==="package"?"5% pkg":"18% profit"})`,v:fmtINR(gst),c:"#4169E1"},
                {l:"Net Profit",v:fmtINR(netProfit),c:netProfit>=0?"#f97316":"#ef4444"},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"6px 12px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:7}}>
                  <div style={{fontSize:9,color:"#a9bce0",letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>{s.l}</div>
                  <div style={{fontFamily:"monospace",fontSize:14,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks bar */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #d4e0f5",padding:"8px 28px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#f97316",fontWeight:700,whiteSpace:"nowrap"}}>📝 Remarks:</span>
          <input value={deal.remarks||""} onChange={e=>upd("remarks",e.target.value)} placeholder="Add remarks / special notes about this query..." style={{background:"transparent",border:"none",borderBottom:"1px dashed #c2d2ee",borderRadius:0,color:"#5a6b8c",fontSize:12,flex:1,outline:"none",padding:"3px 0"}} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #d4e0f5",padding:"0 28px",overflowX:"auto"}}>
        <div className="tab-bar" style={{maxWidth:1200,margin:"0 auto",display:"flex"}}>
          {tabs.map(t=><button key={t.id} className={`tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 28px"}}>

        {/* ══ CLIENT TAB ══ */}
        {tab==="client"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* ── Destinations in this enquiry ── */}
            {(()=>{
              const sibs=siblingsOf(deal, allDeals);
              const showAlways=(deal.clientName||"").trim();
              if(!showAlways) return null;
              return <div className="card" style={{borderColor:"#0891b2"}}>
                <div className="sec-head" style={{color:"#0891b2"}}>🗺️ Destinations in this Enquiry {sibs.length>1&&<span style={{fontSize:11,fontWeight:700,background:"#e0f7fb",color:"#0e7490",padding:"2px 9px",borderRadius:10,marginLeft:6}}>{sibs.length} packages</span>}</div>
                <div style={{fontSize:11.5,color:"#6b7a99",marginBottom:10}}>Ek hi client, alag-alag destinations. Har package ka apna hotel, pricing aur status hota hai — client details sab mein same rehti hain.</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {sibs.map(p=>{
                    const on=(p._localId&&p._localId===deal._localId)||(p._id&&p._id===deal._id);
                    const st=stageOf(p), m=STAGE_META[st]||{icon:"📋",color:"#6b7a99",bg:"#eef3fc"};
                    const val=dealFinance(p).sell;
                    const frozen=isFrozenPkg(p,sibs);
                    return <div key={p._localId||p._id} style={{position:"relative"}}>
                      <button onClick={()=>{ if(!on) openDeal(p); }}
                        title={frozen?"Client ne dusra destination book kiya — ye package freeze hai":""}
                        style={{border:"1px solid "+(on?"#0891b2":frozen?"#e2e8f0":"#d4e0f5"),
                          background:on?"#e0f7fb":frozen?"#f8fafc":"#fff",borderRadius:11,
                          padding:"9px 13px",paddingRight:sibs.length>1?26:13,cursor:on?"default":"pointer",
                          textAlign:"left",minWidth:132,opacity:frozen&&!on?0.6:1,width:"100%"}}>
                        <div style={{fontSize:12.5,fontWeight:800,color:frozen?"#64748b":"#0f2350",
                          textDecoration:frozen?"line-through":"none"}}>
                          {on?"📍 ":frozen?"🔒 ":""}{p.destination||"(no destination)"}
                        </div>
                        <div style={{fontSize:9.5,marginTop:3,display:"flex",alignItems:"center",gap:5}}>
                          <span style={{background:frozen?"#f1f5f9":m.bg,color:frozen?"#94a3b8":m.color,padding:"1px 6px",borderRadius:8,fontWeight:800}}>
                            {frozen?"Not chosen":`${m.icon} ${st}`}</span>
                          {val>0&&<span className="mono" style={{color:"#6b7a99"}}>{fmtINR(val)}</span>}
                        </div>
                      </button>
                      {sibs.length>1&&<button onClick={(e)=>{e.stopPropagation();deletePackage(p);}}
                        title="Ye destination delete karo"
                        style={{position:"absolute",top:5,right:5,border:"none",background:"transparent",
                          color:"#cbd5e1",cursor:"pointer",fontSize:13,lineHeight:1,padding:2,fontWeight:700}}
                        onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                        onMouseLeave={e=>e.currentTarget.style.color="#cbd5e1"}>✕</button>}
                    </div>;
                  })}
                  <button onClick={addDestination}
                    style={{border:"1px dashed #0891b2",background:"#f8feff",color:"#0e7490",borderRadius:11,
                      padding:"9px 15px",cursor:"pointer",fontSize:12,fontWeight:800,minWidth:132}}>
                    ➕ Add Destination
                  </button>
                </div>
                {/* Frozen banner for the package currently open */}
                {isFrozenPkg(deal,sibs)&&<div style={{marginTop:11,background:"#fffbeb",border:"1px solid #fde68a",
                  borderRadius:10,padding:"11px 13px",display:"flex",gap:11,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 220px",fontSize:12,color:"#92400e",lineHeight:1.55}}>
                    🔒 <b>Ye package freeze hai</b> — client ne <b>{(sibs.find(isBookedStage)||{}).destination||"dusra destination"}</b> book kar liya hai.
                    Dekh sakte ho, par re-quote karne ke liye pehle unfreeze karo.
                  </div>
                  <button onClick={()=>setPkgUnfrozen(deal,true)}
                    style={{border:"none",borderRadius:8,padding:"9px 15px",cursor:"pointer",fontSize:11.5,
                      fontWeight:800,background:"#d97706",color:"#fff",whiteSpace:"nowrap"}}>
                    🔓 Unfreeze &amp; Re-quote
                  </button>
                </div>}
                {/* Manually unfrozen — offer to put it back */}
                {deal.unfrozen&&enquiryHasBooking(sibs)&&!isBookedStage(deal)&&<div style={{marginTop:11,
                  background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"9px 13px",
                  display:"flex",gap:11,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 220px",fontSize:11.5,color:"#166534"}}>🔓 Ye package re-quote ke liye khula hai.</div>
                  <button onClick={()=>setPkgUnfrozen(deal,false)}
                    style={{border:"1px solid #bbf7d0",borderRadius:8,padding:"7px 13px",cursor:"pointer",
                      fontSize:11,fontWeight:800,background:"#fff",color:"#166534",whiteSpace:"nowrap"}}>
                    Wapas freeze karo
                  </button>
                </div>}
                {(()=>{ const active=sibs.filter(p=>!isFrozenPkg(p,sibs));
                  if(active.length<2) return null;
                  return <div style={{marginTop:11,paddingTop:10,borderTop:"1px dashed #d4e0f5"}}>
                  <button onClick={generateCombinedQuotation} disabled={!!quoteBusy}
                    style={{width:"100%",border:"none",borderRadius:9,padding:"10px",cursor:quoteBusy?"default":"pointer",
                      fontSize:12,fontWeight:800,background:quoteBusy?"#cbd5e1":"linear-gradient(135deg,#0891b2,#0e7490)",color:"#fff"}}>
                    {typeof quoteBusy==="string"?quoteBusy:quoteBusy?"Building…":`📄 Download ALL ${active.length} destinations in one PDF`}
                  </button>
                </div>; })()}
              </div>;
            })()}
            <div className="card" style={{borderColor:"#4169E1"}}>
              <div className="sec-head" style={{color:"#4169E1"}}>🎯 Lead Tracking</div>
              <div className="grid3" style={{marginBottom:6}}>
                <div><span className="lbl">Deal Status</span>
                  <select value={stageOf(deal)} onChange={e=>{const v=e.target.value; setDeal(d=>({...d,stage:v,status:STAGE_TO_STATUS[v]||"Not Actioned"}));}}>
                    {DEAL_STAGES.map(s=><option key={s} value={s}>{(STAGE_META[s]||{}).icon} {s}</option>)}
                  </select></div>
                <div><span className="lbl">Priority</span>
                  <select value={deal.priority||"Normal"} onChange={e=>upd("priority",e.target.value)}>
                    {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div><span className="lbl">Next Follow-up Date</span>
                  <input type="date" value={deal.followUpDate||""} onChange={e=>upd("followUpDate",e.target.value)} /></div>
                <div><span className="lbl">Lead Source</span>
                  <select value={deal.leadSource||""} onChange={e=>upd("leadSource",e.target.value)}>
                    <option value="">— select —</option>
                    {LEAD_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              {/* Auto-derived dates — no manual entry, no duplication */}
              {(()=>{
                const F=(x)=>x?new Date(x).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
                const td=travelDateOf(deal), bd=bookingDateOf(deal);
                return <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                  {[{i:"🗓️",l:"Query Date",v:F(queryDateOf(deal)),h:"auto — jis din query bani"},
                    {i:"✈️",l:"Travel Date",v:F(td),h:"auto — pehli flight / pehla hotel check-in"},
                    {i:"💰",l:"Booking Date",v:F(bd),h:"auto — client ki pehli payment"}].map((c,i)=>(
                    <div key={i} title={c.h} style={{flex:"1 1 150px",background:"#f8fafd",border:"1px solid #e3eaf7",borderRadius:9,padding:"8px 11px"}}>
                      <div style={{fontSize:9,color:"#7d8bab",letterSpacing:.8,textTransform:"uppercase"}}>{c.i} {c.l}</div>
                      <div style={{fontSize:12.5,fontWeight:800,color:"#0f2350",marginTop:2}}>{c.v}</div>
                    </div>
                  ))}
                </div>;
              })()}
              {shouldAutoComplete(deal)&&<div style={{marginTop:8,background:"#e0f7fb",border:"1px solid #a5e5ef",borderRadius:9,padding:"8px 11px",fontSize:11.5,color:"#0e7490",fontWeight:700}}>🏁 Travel date nikal chuki hai — ye deal apne-aap <b>Completed</b> ho jayegi.</div>}
            </div>
            <div className="card">
              <div className="sec-head">Client Information</div>
              <div className="grid3" style={{marginBottom:14}}>
                <div><span className="lbl">Client Name *</span><input value={deal.clientName} onChange={e=>upd("clientName",e.target.value)} placeholder="Full name" /></div>
                <div><span className="lbl">Contact Number</span><input value={deal.contactNo} onChange={e=>upd("contactNo",e.target.value)} placeholder="+91 98765 43210" /></div>
                <div><span className="lbl">Email ID</span><input value={deal.email} onChange={e=>upd("email",e.target.value)} placeholder="client@email.com" /></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:12,marginBottom:14}}>
                <div><span className="lbl">Adults</span><input type="number" min="0" value={deal.adults} onChange={e=>upd("adults",e.target.value)} /></div>
                <div><span className="lbl">Children (2–11)</span><input type="number" min="0" value={deal.children} onChange={e=>upd("children",e.target.value)} /></div>
                <div><span className="lbl">Infants (&lt;2 yrs)</span><input type="number" min="0" value={deal.infants} onChange={e=>upd("infants",e.target.value)} /></div>
                <div><span className="lbl">Total Pax</span><input readOnly value={n(deal.adults)+n(deal.children)+n(deal.infants)} style={{opacity:.6,cursor:"default"}} /></div>
                <div><span className="lbl">Rooms</span><input type="number" min="1" value={deal.rooms} onChange={e=>upd("rooms",e.target.value)} /></div>
              </div>
              <div className="grid3">
                <div><span className="lbl">Mode of Query</span><select value={deal.modeOfQuery} onChange={e=>upd("modeOfQuery",e.target.value)}>{QUERY_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                <div><span className="lbl">Destination / Package</span><input value={deal.destination} onChange={e=>upd("destination",e.target.value)} placeholder="Dubai 7N/8D" /></div>
                <div><span className="lbl">Travel Dates</span><input value={deal.travelDates} onChange={e=>upd("travelDates",e.target.value)} placeholder="15 Jun – 22 Jun 2026" /></div>
              </div>
            </div>
          </div>
        )}

        {/* ══ FLIGHTS TAB ══ */}
        {tab==="flights"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>✈️ Flight Vendors</h2>
              {deal.flightVendors.length<10&&<button className="btn btn-ind" onClick={addFV}>+ Add Flight Vendor</button>}
              <button onClick={()=>setAiX("flight")} className="btn" style={{background:"linear-gradient(135deg,#6d28d9,#8b5cf6)",color:"#fff",border:"none"}}>✨ AI Extract (pic/email)</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{l:"Total Cost",v:fmtINR(flight.cost),c:"#5a6b8c"},{l:"Total Selling",v:fmtINR(flight.sell),c:"#1a2c52"},{l:"Profit",v:fmtINR(flight.sell-flight.cost),c:(flight.sell-flight.cost)>=0?"#10b981":"#ef4444"},{l:"Balance to Pay",v:fmtINR(flight.cost-flight.paid),c:(flight.cost-flight.paid)>0?"#ef4444":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>

            {deal.flightVendors.map((fv,fi)=>{
              const {costINR,sellINR,paidINR}=vendorINR(fv);
              const isExp=expandedVendor===fv.id;
              return (
                <div key={fv.id} className="vrow" style={{border:isExp?"1px solid #4169E144":"1px solid #d4e0f5"}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
                    <div style={{width:26,height:26,background:"linear-gradient(135deg,#f97316,#f59e0b)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,flexShrink:0}}>{fi+1}</div>
                    <div style={{flex:1}}><span className="lbl">Vendor Name</span><VendorInput value={fv.name} onChange={v=>{updF(fv.id,"name",v);saveVendorName(v);}} placeholder="Vendor name..." /></div>
                    <div style={{minWidth:160}}>
                      <span className="lbl">Cost (INR)</span>
                      <input className="mono" type="number" value={fv.costPrice} onChange={e=>updF(fv.id,"costPrice",e.target.value)} placeholder="0" /><PPHelper onApply={v=>updF(fv.id,"costPrice",v)}/>
                    </div>
                    <div style={{minWidth:160}}>
                      <span className="lbl">Selling (INR)</span>
                      <input className="mono" type="number" value={fv.sellingPrice} onChange={e=>updF(fv.id,"sellingPrice",e.target.value)} placeholder="0" />
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>PROFIT</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(sellINR-costINR)>=0?"#10b981":"#ef4444"}}>{fmtINR(sellINR-costINR)}</div>
                      </div>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>BALANCE</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(costINR-paidINR)>0?"#ef4444":"#10b981"}}>{fmtINR(costINR-paidINR)}</div>
                      </div>
                      <button onClick={()=>setExpandedVendor(isExp?null:fv.id)} className="btn btn-sm" style={{fontSize:11,padding:"5px 10px",fontWeight:800,whiteSpace:"nowrap"}}>{isExp?"▲ Close":"💳 Payments"}</button>
                      <button onClick={()=>rmFV(fv.id)} className="btn btn-danger">✕</button>
                    </div>
                  </div>

                  {/* Flight type selector */}
                  <div style={{display:"flex",gap:8,marginBottom:14}}>
                    {["one-way","return","multi-city"].map(ft=>(
                      <button key={ft} onClick={()=>updF(fv.id,"flightType",ft)} style={{padding:"6px 14px",border:"1px solid",borderRadius:20,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit",borderColor:fv.flightType===ft?"#f97316":"#c2d2ee",color:fv.flightType===ft?"#f97316":"#6b7a99",background:fv.flightType===ft?"#f9731610":"transparent",transition:"all .2s"}}>
                        {ft==="one-way"?"→ One Way":ft==="return"?"⇄ Return":"⊞ Multi City"}
                      </button>
                    ))}
                  </div>

                  {/* ONE WAY */}
                  {fv.flightType==="one-way"&&(
                    <div>
                      <div style={{fontSize:10,color:"#f97316",fontWeight:700,letterSpacing:1.5,marginBottom:8}}>OUTBOUND SECTOR</div>
                      {fv.sectors.map((sec,si)=>(
                        <SectorRow key={sec.id} sector={sec} onChange={s=>updSector(fv.id,si,"sectors",s)} onRemove={()=>rmSector(fv.id,si,"sectors")} showRemove={fv.sectors.length>1} />
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addSector(fv.id,"sectors")}>+ Add Sector</button>
                    </div>
                  )}

                  {/* RETURN */}
                  {fv.flightType==="return"&&(
                    <div>
                      <div style={{fontSize:10,color:"#10b981",fontWeight:700,letterSpacing:1.5,marginBottom:8}}>OUTBOUND</div>
                      {fv.sectors.map((sec,si)=>(
                        <SectorRow key={sec.id} sector={sec} onChange={s=>updSector(fv.id,si,"sectors",s)} onRemove={()=>rmSector(fv.id,si,"sectors")} showRemove={fv.sectors.length>1} />
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addSector(fv.id,"sectors")}>+ Add Outbound Sector</button>
                      <div style={{borderTop:"1px dashed #c2d2ee",margin:"14px 0"}} />
                      <div style={{fontSize:10,color:"#4169E1",fontWeight:700,letterSpacing:1.5,marginBottom:8}}>RETURN</div>
                      {fv.returnSectors.map((sec,si)=>(
                        <SectorRow key={sec.id} sector={sec} onChange={s=>updSector(fv.id,si,"returnSectors",s)} onRemove={()=>rmSector(fv.id,si,"returnSectors")} showRemove={fv.returnSectors.length>1} />
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addSector(fv.id,"returnSectors")}>+ Add Return Sector</button>
                    </div>
                  )}

                  {/* MULTI CITY */}
                  {fv.flightType==="multi-city"&&(
                    <div>
                      <div style={{fontSize:10,color:"#f59e0b",fontWeight:700,letterSpacing:1.5,marginBottom:8}}>SECTORS</div>
                      {fv.sectors.map((sec,si)=>(
                        <SectorRow key={sec.id} sector={sec} label={`Sector ${si+1}`} onChange={s=>updSector(fv.id,si,"sectors",s)} onRemove={()=>rmSector(fv.id,si,"sectors")} showRemove={fv.sectors.length>1} />
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addSector(fv.id,"sectors")}>+ Add Sector</button>
                    </div>
                  )}

                  {/* Payments */}
                  {isExp&&(
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #d4e0f5"}}>
                      <div style={{fontSize:11,color:"#4169E1",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>
                        Payments to {fv.name||"Vendor"} · <span className="mono">Paid: {fmtINR(paidINR)}</span> · <span className="mono" style={{color:(costINR-paidINR)>0?"#ef4444":"#10b981"}}>Balance: {fmtINR(costINR-paidINR)}</span>
                      </div>
                      {fv.payments.map((pmt,pi)=>(
                        <div key={pmt.id} className="prow">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1.8fr 1fr 1.5fr auto",gap:8,alignItems:"end"}}>
                            <div><span className="lbl">#{pi+1} Amount (₹)</span><input className="mono" type="number" value={pmt.amount} onChange={e=>updVPmt("flightVendors",fv.id,pmt.id,"amount",e.target.value)} placeholder="0" /></div>
                            <div><span className="lbl">Mode</span><select value={pmt.mode} onChange={e=>updVPmt("flightVendors",fv.id,pmt.id,"mode",e.target.value)}>{VENDOR_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                            <div><span className="lbl">Date</span><input type="date" value={pmt.date} onChange={e=>updVPmt("flightVendors",fv.id,pmt.id,"date",e.target.value)} /></div>
                            <div><span className="lbl">Note</span><input value={pmt.note} onChange={e=>updVPmt("flightVendors",fv.id,pmt.id,"note",e.target.value)} placeholder="Ref..." /></div>
                            <button className="btn btn-danger" style={{marginBottom:1}} onClick={()=>rmVPmt("flightVendors",fv.id,pmt.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addVPmt("flightVendors",fv.id)}>+ Add Payment Entry</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ HOTELS TAB ══ */}
        {tab==="hotels"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>🏨 Hotel Vendors</h2>
              {deal.hotelVendors.length<10&&<button className="btn btn-ind" onClick={addHV}>+ Add Hotel</button>}
              <button onClick={()=>setAiX("hotel")} className="btn" style={{background:"linear-gradient(135deg,#6d28d9,#8b5cf6)",color:"#fff",border:"none"}}>✨ AI Extract (pic/email)</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[{l:"Total Cost",v:fmtINR(hotel.cost),c:"#5a6b8c"},{l:"Total Selling",v:fmtINR(hotel.sell),c:"#1a2c52"},{l:"Profit",v:fmtINR(hotel.sell-hotel.cost),c:(hotel.sell-hotel.cost)>=0?"#10b981":"#ef4444"},{l:"Paid",v:fmtINR(hotel.paid),c:"#4169E1"},{l:"Balance",v:fmtINR(hotel.cost-hotel.paid),c:(hotel.cost-hotel.paid)>0?"#ef4444":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>

            {deal.hotelVendors.map((hv,hi)=>{
              const {costINR,sellINR,paidINR}=vendorINR(hv);
              const isExp=expandedVendor===hv.id;
              const needsRate=hv.currency!=="INR";
              return (
                <div key={hv.id} className="vrow" style={{border:isExp?"1px solid #4169E144":"1px solid #d4e0f5"}}>
                  {/* Row 1: Vendor details */}
                  <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:12,flexWrap:"wrap"}}>
                    <div style={{width:26,height:26,background:"linear-gradient(135deg,#f97316,#f59e0b)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,flexShrink:0,marginBottom:2}}>{hi+1}</div>
                    <div style={{flex:"0 0 200px"}}><span className="lbl">Vendor Name</span><VendorInput value={hv.name} onChange={v=>{updH(hv.id,"name",v);saveVendorName(v);}} /></div>
                    <div style={{flex:"0 0 100px"}}><span className="lbl">Currency</span><select value={hv.currency} onChange={e=>updH(hv.id,"currency",e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
                    {needsRate&&<div style={{flex:"0 0 140px"}}><span className="lbl">1 {hv.currency} = ₹</span><input className="mono" type="number" value={hv.exchangeRate} onChange={e=>updH(hv.id,"exchangeRate",e.target.value)} placeholder="e.g. 95" /></div>}
                    <div style={{flex:"0 0 140px"}}>
                      <span className="lbl">Cost {needsRate?`(${hv.currency})`:""}</span>
                      <input className="mono" type="number" value={hv.costPrice} onChange={e=>updH(hv.id,"costPrice",e.target.value)} placeholder="0" /><PPHelper onApply={v=>updH(hv.id,"costPrice",v)}/>
                      {needsRate&&hv.costPrice&&hv.exchangeRate&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2}}>= {fmtINR(costINR)}</div>}
                    </div>
                    <div style={{flex:"0 0 140px"}}>
                      <span className="lbl">Selling {needsRate?`(${hv.currency})`:""}</span>
                      <input className="mono" type="number" value={hv.sellingPrice} onChange={e=>updH(hv.id,"sellingPrice",e.target.value)} placeholder="0" />
                      {needsRate&&hv.sellingPrice&&hv.exchangeRate&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2}}>= {fmtINR(sellINR)}</div>}
                    </div>
                    <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>PROFIT</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(sellINR-costINR)>=0?"#10b981":"#ef4444"}}>{fmtINR(sellINR-costINR)}</div>
                      </div>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>BALANCE</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(costINR-paidINR)>0?"#ef4444":"#10b981"}}>{fmtINR(costINR-paidINR)}</div>
                      </div>
                      <button onClick={()=>setExpandedVendor(isExp?null:hv.id)} className="btn btn-sm" style={{fontSize:11,padding:"5px 10px",fontWeight:800,whiteSpace:"nowrap"}}>{isExp?"▲ Close":"💳 Payments"}</button>
                      <button onClick={()=>rmHV(hv.id)} className="btn btn-danger">✕</button>
                    </div>
                  </div>

                  {/* Row 2: Hotel details */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.5fr 1.5fr 1fr 1fr 0.6fr",gap:10}}>
                    <div><span className="lbl">Country</span><input value={hv.country} onChange={e=>updH(hv.id,"country",e.target.value)} placeholder="UAE" /></div>
                    <div><span className="lbl">City</span><input value={hv.city} onChange={e=>updH(hv.id,"city",e.target.value)} placeholder="Dubai" /></div>
                    <div><span className="lbl">Hotel Name</span><input value={hv.hotelName} onChange={e=>updH(hv.id,"hotelName",e.target.value)} placeholder="Atlantis The Palm" /></div>
                    <div>
                      <span className="lbl">Hotel Photo <span style={{opacity:.6}}>(optional — proposal me hotel ke saath dikhegi)</span></span>
                      {hv.photoUrl?(
                        <div style={{display:"flex",alignItems:"center",gap:10,background:"#f4f7fc",border:"1px solid #d4e0f5",borderRadius:8,padding:"6px 10px"}}>
                          <img src={hv.photoUrl} alt="hotel" style={{width:86,height:54,objectFit:"cover",borderRadius:6}} onError={e=>{e.target.style.opacity=.3;}}/>
                          <span style={{flex:1,fontSize:11,color:"#15803d",fontWeight:700}}>✅ Photo attached</span>
                          <button onClick={()=>updH(hv.id,"photoUrl","")} style={{background:"transparent",border:"1px solid #fdeaea",color:"#b91c1c",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕ Remove</button>
                        </div>
                      ):(
                        <div tabIndex={0}
                          onPaste={e=>{const it=Array.from(e.clipboardData.items||[]).find(x=>x.type&&x.type.indexOf("image")===0); if(it){e.preventDefault(); const f=it.getAsFile(); if(f) window.__veImgToData(f,(d)=>updH(hv.id,"photoUrl",d));} else {const t=e.clipboardData.getData("text"); if(t&&t.trim()) updH(hv.id,"photoUrl",t.trim());}}}
                          style={{border:"2px dashed #c2d2ee",borderRadius:8,padding:"14px 12px",textAlign:"center",fontSize:11.5,color:"#334e82",background:"#f8fafd",cursor:"text",outline:"none"}}>
                          📋 <b>Yahan click karke Ctrl+V</b> se hotel ki photo direct paste karo
                          <span style={{display:"block",fontSize:10,color:"#7d8bab",marginTop:4}}>(photo copy karo — Google Images me photo pe right-click → Copy Image — ya niche se file choose karo)</span>
                          <label style={{display:"inline-block",marginTop:8,background:"#eef3fc",border:"1px solid #c2d2ee",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                            📁 Choose file
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files&&e.target.files[0]; if(f) window.__veImgToData(f,(d)=>updH(hv.id,"photoUrl",d)); e.target.value="";}}/>
                          </label>
                        </div>
                      )}
                    </div>
                    <div><span className="lbl">Hotel Category <span style={{opacity:.6}}>(stars)</span></span><select value={hv.starRating||""} onChange={e=>updH(hv.id,"starRating",e.target.value)}><option value="">Not specified</option><option value="3">3-Star ★★★</option><option value="4">4-Star ★★★★</option><option value="5">5-Star ★★★★★</option></select></div>
                    <div><span className="lbl">Room Category</span><select value={hv.roomCategory} onChange={e=>updH(hv.id,"roomCategory",e.target.value)}>{ROOM_CATEGORIES.map(r=><option key={r}>{r}</option>)}</select></div>
                    <div><span className="lbl">Check-In</span><input type="date" value={hv.checkIn} onChange={e=>updH(hv.id,"checkIn",e.target.value)} /></div>
                    <div><span className="lbl">Check-Out</span><input type="date" value={hv.checkOut} onChange={e=>updH(hv.id,"checkOut",e.target.value)} /></div>
                    <div><span className="lbl">Nights</span><input readOnly value={nightsBetween(hv.checkIn,hv.checkOut)||"—"} style={{opacity:.7,cursor:"default",textAlign:"center",fontFamily:"monospace",fontWeight:700,color:"#f97316"}} /></div>
                  </div>

                  {/* Payments */}
                  {isExp&&(
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #d4e0f5"}}>
                      <div style={{fontSize:11,color:"#4169E1",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>
                        Payments to {hv.hotelName||hv.name||"Hotel"} · <span className="mono">Paid: {fmtINR(paidINR)}</span> · <span className="mono" style={{color:(costINR-paidINR)>0?"#ef4444":"#10b981"}}>Bal: {fmtINR(costINR-paidINR)}</span>
                      </div>
                      <div style={{fontSize:11,color:"#6b7a99",marginBottom:8}}>⚠ All vendor payments entered in INR</div>
                      {hv.payments.map((pmt,pi)=>(
                        <div key={pmt.id} className="prow">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1.8fr 1fr 1.5fr auto",gap:8,alignItems:"end"}}>
                            <div><span className="lbl">#{pi+1} Amount (₹)</span><input className="mono" type="number" value={pmt.amount} onChange={e=>updVPmt("hotelVendors",hv.id,pmt.id,"amount",e.target.value)} placeholder="0" /></div>
                            <div><span className="lbl">Mode</span><select value={pmt.mode} onChange={e=>updVPmt("hotelVendors",hv.id,pmt.id,"mode",e.target.value)}>{VENDOR_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                            <div><span className="lbl">Date</span><input type="date" value={pmt.date} onChange={e=>updVPmt("hotelVendors",hv.id,pmt.id,"date",e.target.value)} /></div>
                            <div><span className="lbl">Note</span><input value={pmt.note} onChange={e=>updVPmt("hotelVendors",hv.id,pmt.id,"note",e.target.value)} placeholder="Ref..." /></div>
                            <button className="btn btn-danger" style={{marginBottom:1}} onClick={()=>rmVPmt("hotelVendors",hv.id,pmt.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addVPmt("hotelVendors",hv.id)}>+ Add Payment</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ LAND TAB ══ */}
        {tab==="land"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>🚌 Land Vendors</h2>
              {deal.landVendors.length<10&&<button className="btn btn-ind" onClick={addLV}>+ Add Land Vendor</button>}
              <button onClick={()=>setAiX("land")} className="btn" style={{background:"linear-gradient(135deg,#6d28d9,#8b5cf6)",color:"#fff",border:"none"}}>✨ AI Extract (pic/email)</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[{l:"Total Cost",v:fmtINR(land.cost),c:"#5a6b8c"},{l:"Total Selling",v:fmtINR(land.sell),c:"#1a2c52"},{l:"Profit",v:fmtINR(land.sell-land.cost),c:(land.sell-land.cost)>=0?"#10b981":"#ef4444"},{l:"Paid",v:fmtINR(land.paid),c:"#4169E1"},{l:"Balance",v:fmtINR(land.cost-land.paid),c:(land.cost-land.paid)>0?"#ef4444":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>

            {deal.landVendors.map((lv,li)=>{
              const {costINR,sellINR,paidINR}=vendorINR(lv);
              const isExp=expandedVendor===lv.id;
              const needsRate=lv.currency!=="INR";
              return (
                <div key={lv.id} className="vrow" style={{border:isExp?"1px solid #4169E144":"1px solid #d4e0f5"}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:12,flexWrap:"wrap"}}>
                    <div style={{width:26,height:26,background:"linear-gradient(135deg,#f97316,#f59e0b)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,flexShrink:0,marginBottom:2}}>{li+1}</div>
                    <div style={{flex:"0 0 200px"}}><span className="lbl">Vendor Name</span><VendorInput value={lv.name} onChange={v=>{updL(lv.id,"name",v);saveVendorName(v);}} /></div>
                    <div style={{flex:"0 0 100px"}}><span className="lbl">Currency</span><select value={lv.currency} onChange={e=>updL(lv.id,"currency",e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
                    {needsRate&&<div style={{flex:"0 0 140px"}}><span className="lbl">1 {lv.currency} = ₹</span><input className="mono" type="number" value={lv.exchangeRate} onChange={e=>updL(lv.id,"exchangeRate",e.target.value)} placeholder="e.g. 95" /></div>}
                    <div style={{flex:"0 0 140px"}}>
                      <span className="lbl">Cost {needsRate?`(${lv.currency})`:""}</span>
                      <input className="mono" type="number" value={lv.costPrice} onChange={e=>updL(lv.id,"costPrice",e.target.value)} placeholder="0" /><PPHelper onApply={v=>updL(lv.id,"costPrice",v)}/>
                      {needsRate&&lv.costPrice&&lv.exchangeRate&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2}}>= {fmtINR(costINR)}</div>}
                    </div>
                    <div style={{flex:"0 0 140px"}}>
                      <span className="lbl">Selling {needsRate?`(${lv.currency})`:""}</span>
                      <input className="mono" type="number" value={lv.sellingPrice} onChange={e=>updL(lv.id,"sellingPrice",e.target.value)} placeholder="0" />
                      {needsRate&&lv.sellingPrice&&lv.exchangeRate&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2}}>= {fmtINR(sellINR)}</div>}
                    </div>
                    <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>PROFIT</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(sellINR-costINR)>=0?"#10b981":"#ef4444"}}>{fmtINR(sellINR-costINR)}</div>
                      </div>
                      <button onClick={()=>setExpandedVendor(isExp?null:lv.id)} className="btn btn-sm" style={{fontSize:11,padding:"5px 10px",fontWeight:800,whiteSpace:"nowrap"}}>{isExp?"▲ Close":"💳 Payments"}</button>
                      <button onClick={()=>rmLV(lv.id)} className="btn btn-danger">✕</button>
                    </div>
                  </div>

                  {/* Itinerary box */}
                  <div>
                    <span className="lbl">Itinerary / Notes (paste your full itinerary here)</span>
                    <textarea value={lv.itinerary||""} onChange={e=>updL(lv.id,"itinerary",e.target.value)} placeholder="Day 1: Dubai arrival, airport transfer, check-in...\nDay 2: Desert safari..." rows={5} style={{resize:"vertical",lineHeight:1.6}} />
                  </div>

                  {/* Payments */}
                  {isExp&&(
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #d4e0f5"}}>
                      <div style={{fontSize:11,color:"#4169E1",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>
                        Payments to {lv.name||"Vendor"} · Paid: {fmtINR(paidINR)} · Balance: {fmtINR(costINR-paidINR)}
                      </div>
                      {lv.payments.map((pmt,pi)=>(
                        <div key={pmt.id} className="prow">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1.8fr 1fr 1.5fr auto",gap:8,alignItems:"end"}}>
                            <div><span className="lbl">#{pi+1} Amount (₹)</span><input className="mono" type="number" value={pmt.amount} onChange={e=>updVPmt("landVendors",lv.id,pmt.id,"amount",e.target.value)} placeholder="0" /></div>
                            <div><span className="lbl">Mode</span><select value={pmt.mode} onChange={e=>updVPmt("landVendors",lv.id,pmt.id,"mode",e.target.value)}>{VENDOR_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                            <div><span className="lbl">Date</span><input type="date" value={pmt.date} onChange={e=>updVPmt("landVendors",lv.id,pmt.id,"date",e.target.value)} /></div>
                            <div><span className="lbl">Note</span><input value={pmt.note} onChange={e=>updVPmt("landVendors",lv.id,pmt.id,"note",e.target.value)} placeholder="Ref..." /></div>
                            <button className="btn btn-danger" style={{marginBottom:1}} onClick={()=>rmVPmt("landVendors",lv.id,pmt.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addVPmt("landVendors",lv.id)}>+ Add Payment</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ VISA TAB ══ */}
        {tab==="visa"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>🛂 Visa Vendors</h2>
              <button className="btn btn-ind" onClick={addVisaV}>+ Add Visa Vendor</button>
            </div>
            {deal.visaVendors.map((vv,vi)=>{
              const isExp=expandedVendor===vv.id;
              const needsRate=vv.currency!=="INR";
              return (
                <div key={vv.id} className="vrow" style={{border:isExp?"1px solid #4169E144":"1px solid #d4e0f5"}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap",marginBottom:4}}>
                    <div style={{width:26,height:26,background:"linear-gradient(135deg,#f97316,#f59e0b)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,flexShrink:0,marginBottom:2}}>{vi+1}</div>
                    <div style={{flex:"0 0 180px"}}><span className="lbl">Vendor Name</span><VendorInput value={vv.name} onChange={v=>{updVisa(vv.id,"name",v);saveVendorName(v);}} /></div>
                    <div style={{flex:"0 0 90px"}}><span className="lbl">Currency</span><select value={vv.currency} onChange={e=>updVisa(vv.id,"currency",e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
                    {needsRate&&<div style={{flex:"0 0 120px"}}><span className="lbl">1 {vv.currency} = ₹</span><input className="mono" type="number" value={vv.exchangeRate} onChange={e=>updVisa(vv.id,"exchangeRate",e.target.value)} placeholder="95" /></div>}
                    <div style={{flex:"0 0 120px"}}><span className="lbl">Cost {needsRate?`(${vv.currency})`:""}</span><input className="mono" type="number" value={vv.costPrice} onChange={e=>updVisa(vv.id,"costPrice",e.target.value)} placeholder="0" /><PPHelper onApply={v=>updVisa(vv.id,"costPrice",v)}/></div>
                    <div style={{flex:"0 0 120px"}}><span className="lbl">Selling {needsRate?`(${vv.currency})`:""}</span><input className="mono" type="number" value={vv.sellingPrice} onChange={e=>updVisa(vv.id,"sellingPrice",e.target.value)} placeholder="0" /></div>
                    <div style={{flex:"0 0 150px"}}><span className="lbl">Visa Status</span><select value={vv.visaStatus||"Not Applied"} onChange={e=>updVisa(vv.id,"visaStatus",e.target.value)} style={{borderColor:VISA_STATUS_COLORS[vv.visaStatus||"Not Applied"]+"66"}}>{VISA_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                    <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:VISA_STATUS_COLORS[vv.visaStatus||"Not Applied"]+"22",color:VISA_STATUS_COLORS[vv.visaStatus||"Not Applied"]}}>{vv.visaStatus||"Not Applied"}</span>
                      <button onClick={()=>setExpandedVendor(isExp?null:vv.id)} className="btn btn-sm" style={{fontSize:11,padding:"5px 10px",fontWeight:800,whiteSpace:"nowrap"}}>{isExp?"▲ Close":"💳 Payments"}</button>
                      <button onClick={()=>rmVisaV(vv.id)} className="btn btn-danger">✕</button>
                    </div>
                  </div>
                  {isExp&&(
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #d4e0f5"}}>
                      {vv.payments.map((pmt,pi)=>(
                        <div key={pmt.id} className="prow">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1.8fr 1fr 1.5fr auto",gap:8,alignItems:"end"}}>
                            <div><span className="lbl">#{pi+1} Amount (₹)</span><input className="mono" type="number" value={pmt.amount} onChange={e=>updVPmt("visaVendors",vv.id,pmt.id,"amount",e.target.value)} placeholder="0" /></div>
                            <div><span className="lbl">Mode</span><select value={pmt.mode} onChange={e=>updVPmt("visaVendors",vv.id,pmt.id,"mode",e.target.value)}>{VENDOR_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                            <div><span className="lbl">Date</span><input type="date" value={pmt.date} onChange={e=>updVPmt("visaVendors",vv.id,pmt.id,"date",e.target.value)} /></div>
                            <div><span className="lbl">Note</span><input value={pmt.note} onChange={e=>updVPmt("visaVendors",vv.id,pmt.id,"note",e.target.value)} placeholder="Ref..." /></div>
                            <button className="btn btn-danger" style={{marginBottom:1}} onClick={()=>rmVPmt("visaVendors",vv.id,pmt.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-dashed" onClick={()=>addVPmt("visaVendors",vv.id)}>+ Add Payment</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ PAYMENTS TAB ══ */}
        {tab==="travellers"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card" style={{borderColor:"#0891b2"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:6}}>
                <div className="sec-head" style={{color:"#0891b2",margin:0}}>🧑‍🤝‍🧑 Travellers <span style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>({(deal.travellers||[]).length})</span></div>
                <div style={{display:"flex",gap:8}}>
                  {(deal.travellers||[]).length===0 && <button onClick={seedTravellers} className="btn btn-sm" style={{background:"#e0f7fb",color:"#0e7490",border:"1px solid #a5e5ef"}}>✨ Auto-fill from {(Number(deal.adults)||0)+(Number(deal.children)||0)+(Number(deal.infants)||0)} pax</button>}
                  <button onClick={addTraveller} className="btn btn-ind">+ Add Traveller</button>
                </div>
              </div>
              <div style={{fontSize:11.5,color:"#6b7a99",marginBottom:14}}>Har traveller ka naam ek baar daalo — aage rooms, flights aur cancellation mein inhe checkbox se use karoge. Sirf First &amp; Last name zaroori hai.</div>

              {(deal.travellers||[]).length===0 && <div style={{textAlign:"center",color:"#a9bce0",fontSize:13,padding:"22px 0"}}>Koi traveller nahi. "Auto-fill" ya "Add Traveller" se shuru karo.</div>}

              {(deal.travellers||[]).map((t,i)=>{
                const nameMissing=!(t.firstName||"").trim() || !(t.lastName||"").trim();
                const expSoon = t.passportExpiry && (new Date(t.passportExpiry)-new Date())/(1000*60*60*24) < 180;
                return <div key={t.id} style={{border:"1px solid "+(t.isLead?"#c9942a":nameMissing?"#f3c6c6":"#e3eaf7"),borderRadius:12,padding:"13px 15px",marginBottom:10,background:t.isLead?"#fffdf6":"#fff"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:800,color:"#94a3b8",minWidth:20}}>{i+1}</span>
                    {t.isLead
                      ? <span style={{fontSize:9,fontWeight:800,letterSpacing:.5,padding:"2px 8px",borderRadius:20,background:"#faf1dc",color:"#c9942a"}}>★ LEAD PAX</span>
                      : <button onClick={()=>setLeadTraveller(t.id)} style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#f1f5f9",color:"#94a3b8",border:"none",cursor:"pointer"}}>set as lead</button>}
                    <span style={{marginLeft:"auto",fontSize:12.5,fontWeight:700,color:"#0f2350"}}>{travellerName(t)}</span>
                    <button onClick={()=>rmTraveller(t.id)} title="Remove" style={{border:"none",background:"transparent",color:"#cbd5e1",cursor:"pointer",fontSize:14,fontWeight:700}}>✕</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                    <div><div style={lbl3}>Salutation</div>
                      <select value={t.salutation} onChange={e=>updTraveller(t.id,"salutation",e.target.value)} style={inp3}>{SALUTATIONS.map(s=><option key={s}>{s}</option>)}</select></div>
                    <div><div style={lbl3}>First Name *</div>
                      <input value={t.firstName} onChange={e=>updTraveller(t.id,"firstName",e.target.value)} placeholder="required" style={{...inp3,borderColor:(t.firstName||"").trim()?"#d4e0f5":"#f3c6c6"}}/></div>
                    <div><div style={lbl3}>Last Name / Surname *</div>
                      <input value={t.lastName} onChange={e=>updTraveller(t.id,"lastName",e.target.value)} placeholder="required" style={{...inp3,borderColor:(t.lastName||"").trim()?"#d4e0f5":"#f3c6c6"}}/></div>
                    <div><div style={lbl3}>Type</div>
                      <select value={t.type} onChange={e=>updTraveller(t.id,"type",e.target.value)} style={inp3}>{TRAVELLER_TYPES.map(s=><option key={s}>{s}</option>)}</select></div>
                    <div><div style={lbl3}>Date of Birth</div>
                      <input type="date" value={t.dob} onChange={e=>updTraveller(t.id,"dob",e.target.value)} style={inp3}/></div>
                    <div><div style={lbl3}>ID Type</div>
                      <select value={t.idType} onChange={e=>updTraveller(t.id,"idType",e.target.value)} style={inp3}><option>Passport</option><option>Aadhaar</option><option>Other</option></select></div>
                    <div><div style={lbl3}>{t.idType} No.</div>
                      <input value={t.passportNo} onChange={e=>updTraveller(t.id,"passportNo",e.target.value)} style={inp3}/></div>
                    {t.idType==="Passport"&&<><div><div style={lbl3}>Passport Issue</div>
                      <input type="date" value={t.passportIssue} onChange={e=>updTraveller(t.id,"passportIssue",e.target.value)} style={inp3}/></div>
                    <div><div style={lbl3}>Passport Expiry</div>
                      <input type="date" value={t.passportExpiry} onChange={e=>updTraveller(t.id,"passportExpiry",e.target.value)} style={{...inp3,borderColor:expSoon?"#f0a04b":"#d4e0f5"}}/></div></>}
                  </div>
                  {expSoon&&<div style={{fontSize:10.5,color:"#b45309",marginTop:6}}>⚠️ Passport 6 mahine ke andar expire ho raha hai — travel se pehle check karo.</div>}
                </div>;
              })}
            </div>
          </div>
        )}

        {tab==="payments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>💰 Client Payments</h2>
              <button className="btn btn-ind" onClick={addCPmt}>+ Add Payment</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[{l:"Total to Receive"+(totalRefunded>0?" (net)":""),v:fmtINR(netSell),c:"#1a2c52"},{l:"Received"+(totalRefunded>0?" (net)":""),v:fmtINR(netClientReceived),c:"#10b981"},...(totalRefunded>0?[{l:"Refunded",v:"− "+fmtINR(totalRefunded),c:"#b91c1c"}]:[]),{l:"Balance Pending",v:fmtINR(balanceFromClient),c:balanceFromClient>0?"#f97316":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
              ))}
            </div>
            <div className="card">
              <div className="sec-head">Payment Entries — {deal.clientName||"Client"}</div>
              {(deal.clientPayments||[]).length===0&&<div style={{textAlign:"center",padding:30,color:"#a9bce0"}}>No payments recorded yet.</div>}
              {(deal.clientPayments||[]).map((pmt,i)=>(
                <div key={pmt.id} className="prow" style={{border:"1px solid #d4e0f5",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,color:"#f97316",fontWeight:700}}>Payment #{i+1}</span>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setReceiptPayment(pmt)} className="btn btn-sm" style={{fontSize:11}}>🧾 Receipt</button>
                      <button onClick={()=>rmCPmt(pmt.id)} className="btn btn-danger">✕ Remove</button>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 2fr",gap:10,alignItems:"end"}}>
                    <div><span className="lbl">Amount (₹)</span><input className="mono" type="number" value={pmt.amount} onChange={e=>updCPmt(pmt.id,"amount",e.target.value)} placeholder="0" /></div>
                    <div><span className="lbl">Mode of Payment</span><select value={pmt.mode} onChange={e=>updCPmt(pmt.id,"mode",e.target.value)}>{CLIENT_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                    <div><span className="lbl">Date</span><input type="date" value={pmt.date} onChange={e=>updCPmt(pmt.id,"date",e.target.value)} /></div>
                    <div><span className="lbl">Note / Reference</span><input value={pmt.note} onChange={e=>updCPmt(pmt.id,"note",e.target.value)} placeholder="Transaction ID, remark..." /></div>
                  </div>
                </div>
              ))}
              {(deal.clientPayments||[]).length>0&&(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#ffffff",borderRadius:8,padding:"12px 16px",marginTop:10}}>
                  <span style={{fontWeight:700}}>Total Received</span>
                  <span className="mono" style={{fontSize:18,fontWeight:800,color:"#10b981"}}>{fmtINR(totalClientReceived)}</span>
                </div>
              )}

              {balanceFromClient>0&&(deal.contactNo||"").trim()&&(
                <a href={"https://wa.me/"+String(deal.contactNo).replace(/[^0-9]/g,"").replace(/^(?!91)/,"91")+"?text="+encodeURIComponent("Namaste "+(deal.clientName||"ji")+"! 🙏\n\nAapke "+(deal.destination||"trip")+" package (Ref: "+(deal.reference||"")+") ka balance payment ₹"+balanceFromClient.toLocaleString("en-IN")+" pending hai — kindly clear before travel date so everything stays confirmed.\n\nUPI / Bank transfer dono chalega. Koi bhi sawaal ho toh bata dijiye!\n\n— Team Voyage-Ed Travels ✈️")}
                  target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"linear-gradient(135deg,#128c4b,#25d366)",color:"#fff",borderRadius:10,padding:"12px",marginTop:12,textDecoration:"none",fontSize:13,fontWeight:800}}>
                  📲 WhatsApp Balance Reminder bhejo — ₹{balanceFromClient.toLocaleString("en-IN")}
                </a>
              )}

              {/* ══ 💸 REFUNDS ══ */}
              <div style={{marginTop:24,borderTop:"2px dashed #f3c6c6",paddingTop:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:14,fontWeight:800,color:"#b91c1c"}}>💸 Refunds to Client</span>
                  <button onClick={addRefund} className="btn btn-sm" style={{background:"#fdf1f1",color:"#b91c1c",border:"1px solid #f3c6c6"}}>+ Add Refund</button>
                </div>
                {totalRefunded>totalClientReceived&&(
                  <div style={{background:"#fdf1f1",border:"1px solid #f3c6c6",borderRadius:8,padding:"8px 12px",fontSize:11.5,color:"#b91c1c",fontWeight:700,marginBottom:10}}>⚠️ Total refund (₹{totalRefunded.toLocaleString("en-IN")}) client se received amount (₹{totalClientReceived.toLocaleString("en-IN")}) se ZYADA hai — amounts check karo</div>
                )}
                {(deal.refunds||[]).length===0&&<div style={{textAlign:"center",padding:16,color:"#c9a0a0",fontSize:12}}>No refunds issued.</div>}
                {(deal.refunds||[]).map((r,i)=>(
                  <div key={r.id} className="prow" style={{border:"1px solid #f3c6c6",background:"#fffafa",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:12,color:"#b91c1c",fontWeight:700}}>Refund #{i+1}</span>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>printRefundReceipt(r)} className="btn btn-sm" title="Client ko refund ka proof">🧾 Receipt</button>
                        <button onClick={()=>rmRefund(r.id)} className="btn btn-danger">✕ Remove</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1.6fr 1.4fr",gap:10,alignItems:"end"}}>
                      <div><span className="lbl">Amount (₹)</span><input className="mono" type="number" min="0" value={r.amount} onChange={e=>updRefund(r.id,"amount",e.target.value)} placeholder="0"/></div>
                      <div><span className="lbl">Mode of Refund</span><select value={r.mode} onChange={e=>updRefund(r.id,"mode",e.target.value)}>{REFUND_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                      <div><span className="lbl">Reason</span><select value={r.reason} onChange={e=>updRefund(r.id,"reason",e.target.value)}>{REFUND_REASONS.map(m=><option key={m}>{m}</option>)}</select></div>
                      <div><span className="lbl">Approved By</span><select value={r.approvedBy} onChange={e=>updRefund(r.id,"approvedBy",e.target.value)}>{REFUND_APPROVERS.map(m=><option key={m}>{m}</option>)}</select></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 3fr",gap:10,alignItems:"end",marginTop:10}}>
                      <div><span className="lbl">Date</span><input type="date" value={r.date} onChange={e=>updRefund(r.id,"date",e.target.value)}/></div>
                      <div><span className="lbl">UTR / Ref No.</span><input value={r.refNo} onChange={e=>updRefund(r.id,"refNo",e.target.value)} placeholder="Transaction reference"/></div>
                      <div><span className="lbl">Note</span><input value={r.note} onChange={e=>updRefund(r.id,"note",e.target.value)} placeholder="e.g. 2 pax dropped, partial visa refund..."/></div>
                    </div>
                  </div>
                ))}
                {(deal.refunds||[]).length>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fdf1f1",borderRadius:8,padding:"12px 16px",marginTop:6}}>
                    <span style={{fontWeight:700,color:"#b91c1c"}}>Total Refunded <span style={{fontSize:10.5,fontWeight:600,color:"#c9a0a0"}}>(selling & profit dono se minus)</span></span>
                    <span className="mono" style={{fontSize:18,fontWeight:800,color:"#b91c1c"}}>− {fmtINR(totalRefunded)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ══ CANCELLATION LOG ══ */}
            <div className="card" style={{borderColor:"#b91c1c"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:800,color:"#b91c1c"}}>⛔ Cancellation Log</span>
                <button onClick={addCancellation} className="btn btn-sm" style={{background:"#fdf1f1",color:"#b91c1c",border:"1px solid #f3c6c6"}}>+ Record Cancellation</button>
              </div>
              <div style={{fontSize:11.5,color:"#6b7a99",marginBottom:12}}>Cancel the whole package or only specific components. For each component: how many travellers, what the vendor retained, penalty charged to the client, and your own profit — the refund and revised booking profit are calculated automatically.</div>

              {(deal.cancellations||[]).length===0 && <div style={{textAlign:"center",color:"#a9bce0",fontSize:12.5,padding:"14px 0"}}>No cancellations. Everything is on track ✅</div>}

              {(deal.cancellations||[]).map(c=>{
                const R=cancelCompute(c,deal);
                const pending=c.status==="Pending";
                const comps=dealComponents(deal);
                const money=(x)=>"₹"+Math.round(x||0).toLocaleString("en-IN");
                const inLine=(comp)=>(c.lines||[]).some(l=>l.compKind===comp.compKind && l.compId===comp.compId);
                return <div key={c.id} style={{border:"1px solid "+(pending?"#f3c6c6":"#e3eaf7"),background:pending?"#fffafa":"#fbfdff",borderRadius:13,padding:"14px 15px",marginBottom:12}}>
                  {/* Header */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
                    <select value={c.reason} onChange={e=>updCancellation(c.id,"reason",e.target.value)} style={{border:"1px solid #d4e0f5",borderRadius:8,padding:"7px 9px",fontSize:12,background:"#fff"}}>
                      {CANCEL_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                    <input type="date" value={c.date} onChange={e=>updCancellation(c.id,"date",e.target.value)} style={{border:"1px solid #d4e0f5",borderRadius:8,padding:"7px 9px",fontSize:12}}/>
                    <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:20,
                      background:c.status==="Pending"?"#fef3c7":c.status==="No Refund Due"?"#f1f5f9":"#e6f7ee",
                      color:c.status==="Pending"?"#92400e":c.status==="No Refund Due"?"#64748b":"#15803d"}}>{c.status}</span>
                    <button onClick={()=>rmCancellation(c.id)} title="Delete" style={{border:"none",background:"transparent",color:"#cbd5e1",cursor:"pointer",fontSize:14,fontWeight:700}}>✕</button>
                  </div>

                  {/* STEP 1 — scope */}
                  <div style={{fontSize:10,fontWeight:800,color:"#334e82",letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>1 · What was cancelled?</div>
                  <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                    {[["full","🚫 Whole Package"],["components","🧩 Specific Components"]].map(([v,l])=>(
                      <button key={v} onClick={()=>updCancellation(c.id,"scope",v)}
                        style={{border:"1px solid "+(c.scope===v?"#b91c1c":"#d4e0f5"),background:c.scope===v?"#fdf1f1":"#fff",
                          color:c.scope===v?"#b91c1c":"#6b7a99",borderRadius:9,padding:"9px 15px",cursor:"pointer",fontSize:12.5,fontWeight:800}}>{l}</button>
                    ))}
                  </div>

                  {/* STEP 2 — component picker (only for partial) */}
                  {c.scope==="components"&&<div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:800,color:"#334e82",letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>2 · Which components were cancelled?</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {comps.map(comp=>{
                        const on=inLine(comp);
                        return <button key={comp.compKind+comp.compId} onClick={()=>toggleCancelComp(c.id,comp)}
                          style={{border:"1px solid "+(on?"#0891b2":"#d4e0f5"),background:on?"#e0f7fb":"#fff",borderRadius:9,padding:"8px 12px",cursor:"pointer",textAlign:"left"}}>
                          <div style={{fontSize:11.5,fontWeight:800,color:on?"#0e7490":"#334e82"}}>{on?"✓ ":""}{comp.label}</div>
                          <div style={{fontSize:9.5,color:"#94a3b8"}}>Paid to vendor: {money(comp.paidToVendor)}</div>
                        </button>;
                      })}
                      {comps.length===0&&<div style={{fontSize:12,color:"#94a3b8"}}>No components found in this deal.</div>}
                    </div>
                  </div>}

                  {/* STEP 3 — per-component calculator lines */}
                  {(c.lines||[]).length>0&&<div style={{marginBottom:8}}>
                    <div style={{fontSize:10,fontWeight:800,color:"#334e82",letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>{c.scope==="full"?"2":"3"} · Har component ka hisaab</div>
                    {R.lines.map(L=>(
                      <div key={L.compKind+L.compId} style={{border:"1px solid #e3eaf7",borderRadius:11,padding:"12px 13px",marginBottom:10,background:"#fff"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
                          <span style={{fontSize:13,fontWeight:800,color:"#0f2350"}}>{L.label}</span>
                          <span style={{fontSize:11,color:"#6b7a99"}}>Paid to vendor: <b className="mono" style={{color:"#0f2350"}}>{money(L.paidToVendor)}</b></span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:9,marginBottom:10}}>
                          <div>
                            <div style={{fontSize:9,color:"#6b7a99",letterSpacing:.6,textTransform:"uppercase",marginBottom:3}}>Travellers cancelled</div>
                            <input type="number" value={L.paxCancelled} onChange={e=>updCancelLine(c.id,L.compKind,L.compId,"paxCancelled",e.target.value)} placeholder={"of "+R.paxTotal} style={{width:"100%",border:"1px solid #d4e0f5",borderRadius:8,padding:"8px",fontSize:12}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,color:"#b45309",letterSpacing:.6,textTransform:"uppercase",marginBottom:3}}>Vendor retained ₹</div>
                            <input type="number" value={L.vendorRetained} onChange={e=>updCancelLine(c.id,L.compKind,L.compId,"vendorRetained",e.target.value)} placeholder="0" title="What the vendor kept out of what you had paid them (your real liability)" style={{width:"100%",border:"1px solid #f3c6c6",borderRadius:8,padding:"8px",fontSize:12}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,color:"#6b7a99",letterSpacing:.6,textTransform:"uppercase",marginBottom:3}}>Penalty charged to client ₹</div>
                            <input type="number" value={L.vendorPenaltyToClient} onChange={e=>updCancelLine(c.id,L.compKind,L.compId,"vendorPenaltyToClient",e.target.value)} placeholder="0" title="The cancellation charge you levied on the client" style={{width:"100%",border:"1px solid #d4e0f5",borderRadius:8,padding:"8px",fontSize:12}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,color:"#15803d",letterSpacing:.6,textTransform:"uppercase",marginBottom:3}}>My profit ₹</div>
                            <input type="number" value={L.profit} onChange={e=>updCancelLine(c.id,L.compKind,L.compId,"myProfit",e.target.value)} placeholder="0" title="Your own extra profit on this cancellation (separate from the penalty)" style={{width:"100%",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px",fontSize:12}}/>
                          </div>
                        </div>
                        {/* line outcome */}
                        <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11.5,color:"#475569",background:"#f8fafd",borderRadius:8,padding:"8px 11px"}}>
                          <span>Client refund: <b className="mono" style={{color:"#2563eb"}}>{money(L.refund)}</b></span>
                          <span style={{marginLeft:"auto"}}>Net {L.isLoss?"loss":"profit"}: <b className="mono" style={{color:L.isLoss?"#dc2626":"#15803d"}}>{L.isLoss?"− ":""}{money(Math.abs(L.netProfit))}</b> <span style={{color:"#94a3b8"}}>(kept {money(L.penalty+L.profit)} − vendor {money(L.vendorRetained)})</span></span>
                        </div>
                      </div>
                    ))}
                  </div>}

                  {/* SUMMARY */}
                  {(c.lines||[]).length>0&&<><div style={{display:"flex",gap:9,flexWrap:"wrap",background:"#0d1b3e",borderRadius:11,padding:"12px 14px",marginBottom:8}}>
                    <div style={{flex:"1 1 80px"}}><div style={{fontSize:9,color:"#8fa0c8",letterSpacing:.5,textTransform:"uppercase"}}>Total Refund</div><div className="mono" style={{fontSize:14,fontWeight:800,color:"#60a5fa"}}>{money(R.refund)}</div></div>
                    <div style={{flex:"1 1 80px"}}><div style={{fontSize:9,color:"#8fa0c8",letterSpacing:.5,textTransform:"uppercase"}}>Vendor retained</div><div className="mono" style={{fontSize:14,fontWeight:800,color:"#f0a04b"}}>{money(R.vendorRetained)}</div></div>
                    <div style={{flex:"1 1 80px",borderLeft:"1px solid #24345e",paddingLeft:10}}>
                      <div style={{fontSize:9,color:"#8fa0c8",letterSpacing:.5,textTransform:"uppercase"}}>Cxl {R.isLoss?"Loss":"Profit"}</div>
                      <div className="mono" style={{fontSize:14,fontWeight:800,color:R.isLoss?"#f87171":"#4ade80"}}>{R.isLoss?"− ":""}{money(Math.abs(R.profit))}</div>
                    </div>
                    <div style={{flex:"1 1 90px",borderLeft:"1px solid #24345e",paddingLeft:10}}>
                      <div style={{fontSize:9,color:"#8fa0c8",letterSpacing:.5,textTransform:"uppercase"}}>Revised Booking Profit</div>
                      <div className="mono" style={{fontSize:14,fontWeight:800,color:"#fff"}}>{money(dealFinance({...deal,cancellations:(deal.cancellations||[]).map(x=>x.id===c.id?{...c,status:"Refund Approved"}:x)}).revisedProfit)}</div>
                    </div>
                  </div></>}

                  {/* Actions */}
                  <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
                    <select value={c.status} onChange={e=>confirmCancellation(c.id,e.target.value)} style={{border:"1px solid #d4e0f5",borderRadius:8,padding:"7px 9px",fontSize:11.5,fontWeight:700}}>
                      {CANCEL_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    {pending&&(c.lines||[]).length>0&&<button onClick={()=>confirmCancellation(c.id, R.refund>0?"Refund Approved":"No Refund Due")}
                      style={{border:"none",borderRadius:8,padding:"8px 13px",cursor:"pointer",fontSize:11.5,fontWeight:800,background:"#b91c1c",color:"#fff"}}>
                      ✓ Confirm {c.scope==="full"?"Full ":""}Cancellation
                    </button>}
                    {R.refund>0 && !pending && <button onClick={()=>{ setDeal(d=>({...d,refunds:[...(d.refunds||[]),{...emptyRefund(),amount:String(R.refund),reason:"Travel Plan Cancelled",note:"Auto from cancellation",mode:c.refundMode}]})); confirmCancellation(c.id,"Refund Processed"); window.veToast&&window.veToast("Refund entry created — see the Refunds section","success"); }}
                      className="btn btn-sm" style={{background:"#fdf1f1",color:"#b91c1c",border:"1px solid #f3c6c6"}}>↪ Create Refund Entry</button>}
                    <input value={c.note} onChange={e=>updCancellation(c.id,"note",e.target.value)} placeholder="Note (optional)" style={{flex:1,minWidth:120,border:"1px solid #d4e0f5",borderRadius:8,padding:"7px 9px",fontSize:11.5}}/>
                  </div>
                </div>;
              })}

            </div>
          </div>
        )}

        {/* ══ ATTACHMENTS TAB ══ */}
        {tab==="attachments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>📎 Attachments</h2>
              <button className="btn btn-ind" onClick={()=>fileInputRef.current.click()}>+ Attach Files</button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />

            <div style={{background:"#ffffff",border:"2px dashed #c2d2ee",borderRadius:12,padding:32,textAlign:"center",cursor:"pointer"}}
              onClick={()=>fileInputRef.current.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}>
              <div style={{fontSize:32,marginBottom:8}}>📁</div>
              <div style={{fontWeight:700,marginBottom:4}}>Drop files here or click to browse</div>
              <div style={{fontSize:12,color:"#6b7a99"}}>Supports: PDF, DOC, DOCX, JPG, JPEG, PNG · Passports, email threads, quotations</div>
            </div>

            {deal.attachments.length===0&&<div style={{textAlign:"center",color:"#a9bce0",fontSize:13}}>No files attached yet.</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {deal.attachments.map(att=>{
                const isImg=att.type.startsWith("image/");
                const isPdf=att.type==="application/pdf";
                const sizeKb=(att.size/1024).toFixed(0);
                return (
                  <div key={att.id} style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:10,overflow:"hidden"}}>
                    {isImg?(
                      <div style={{height:120,overflow:"hidden",background:"#ffffff"}}>
                        <img src={att.data} alt={att.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      </div>
                    ):(
                      <div style={{height:80,display:"flex",alignItems:"center",justifyContent:"center",background:"#ffffff",fontSize:36}}>
                        {isPdf?"📄":"📝"}
                      </div>
                    )}
                    <div style={{padding:"10px 12px"}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</div>
                      <div style={{fontSize:10,color:"#6b7a99",marginTop:2}}>{sizeKb} KB</div>
                      <div style={{display:"flex",gap:6,marginTop:8}}>
                        <a href={att.data} download={att.name} style={{flex:1,textAlign:"center",background:"#d4e0f5",border:"1px solid #c2d2ee",borderRadius:5,padding:"4px 0",fontSize:11,color:"#5a6b8c",textDecoration:"none",fontWeight:600}}>Download</a>
                        <button onClick={()=>rmAttachment(att.id)} className="btn btn-danger" style={{fontSize:11,padding:"4px 10px"}}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ SUMMARY TAB ══ */}
        {tab==="summary"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <h2 style={{fontSize:18,fontWeight:800}}>📋 Full Deal Summary</h2>

            {/* AUTO-SUGGEST: full payment received → mark booked */}
            {(()=>{
              const recv=sum(deal.clientPayments||[],"amount");
              const fullyPaid=totalSell>0 && recv>=totalSell;
              if(fullyPaid && deal.status!=="Booked" && deal.status!=="Cancelled"){
                return (
                  <div style={{background:"#e6f7ee",border:"1px solid #16a34a",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                    <div style={{fontSize:13,color:"#15803d"}}>💡 Client has fully paid ({fmtINR(recv)}). Mark this deal as <b>Booked</b>?</div>
                    <button onClick={()=>upd("status","Booked")} className="btn btn-ind">Mark as Booked</button>
                  </div>
                );
              }
              return null;
            })()}

            {/* AI ITINERARY GENERATOR */}
            <div className="card">
              <div className="sec-head" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                <span>✨ AI Itinerary &amp; Quotation</span>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={generateAIItinerary} disabled={aiBusy} className="btn btn-ind">
                    {aiBusy?"Generating...":"✨ Quick Itinerary"}</button>
                  <button onClick={generateQuotation} disabled={quoteBusy} className="btn btn-ind" style={{background:"linear-gradient(135deg,#4169E1,#5b7fff)"}}>
                    {quoteBusy?"Building PDF...":"📄 Generate Quotation PDF"}</button>
                </div>
              </div>
              <div style={{fontSize:11,color:"#6b7a99",marginBottom:10}}>
                Reads your Flights (onward / return / multi-city), Hotels and sightseeing notes, then builds a client-ready Voyage-Ed itinerary.
              </div>
              {aiItinerary&&(
                <div>
                  <textarea readOnly value={aiItinerary} style={{width:"100%",minHeight:320,background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:8,color:"#1a2c52",padding:"14px",fontSize:13,lineHeight:1.6,fontFamily:"'Segoe UI',sans-serif",whiteSpace:"pre-wrap"}}/>
                  <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
                    <button onClick={()=>{navigator.clipboard.writeText(aiItinerary);window.veToast&&window.veToast("Itinerary copied!");}} className="btn btn-sm">📋 Copy</button>
                    <button onClick={()=>{const msg=encodeURIComponent(aiItinerary);window.open(`https://wa.me/?text=${msg}`,"_blank");}} className="btn btn-sm">💬 Share on WhatsApp</button>
                    <button onClick={()=>setAiItinerary("")} className="btn btn-sm">Clear</button>
                  </div>
                </div>
              )}
            </div>

            {/* Client */}
            <div className="card">
              <div className="sec-head">Client Details</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
                {[["Name",deal.clientName||"—"],["Contact",deal.contactNo||"—"],["Email",deal.email||"—"],["Destination",deal.destination||"—"],["Dates",deal.travelDates||"—"],["Query Via",deal.modeOfQuery],["Adults",deal.adults],["Children",deal.children],["Infants",deal.infants],["Total Pax",n(deal.adults)+n(deal.children)+n(deal.infants)],["Rooms",deal.rooms]].map(([l,v])=>(
                  <div key={l} className="stat"><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>
                ))}
              </div>
              {deal.remarks&&<div style={{marginTop:12,padding:"10px 14px",background:"#ffffff",borderRadius:8,fontSize:13,color:"#5a6b8c",borderLeft:"3px solid #f97316"}}>📝 {deal.remarks}</div>}
            </div>

            {/* P&L */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <div style={{background:"linear-gradient(135deg,#052e1650,#064e3b30)",border:"1px solid #10b98133",borderRadius:10,padding:18}}>
                <div style={{fontSize:10,color:"#6ee7b7",letterSpacing:2,marginBottom:6}}>GROSS PROFIT MARGIN (GPM)</div>
                <div className="mono" style={{fontSize:24,fontWeight:800,color:gpm>=0?"#10b981":"#ef4444"}}>{fmtINR(gpm)}</div>
                <div style={{fontSize:12,color:"#6ee7b7",marginTop:4}}>{marginPct}% of selling price · Before GST</div>
              </div>
              <div style={{background:"linear-gradient(135deg,#1e1b4b50,#c2d2ee30)",border:"1px solid #4169E133",borderRadius:10,padding:18}}>
                <div style={{fontSize:10,color:"#4169E1",letterSpacing:2,marginBottom:6}}>GST TYPE</div>
                <div style={{display:"flex",gap:6,margin:"8px 0"}}>
                  {[
                    {mode:"profit",label:"18% on Profit",desc:"Applicable on GPM"},
                    {mode:"package",label:"5% on Package",desc:"Applicable on Total Sell"},
                    {mode:"none",label:"No GST",desc:"Remove GST fully"},
                  ].map(opt=>(
                    <button key={opt.mode}
                      onClick={()=>upd("gstMode",opt.mode)}
                      style={{flex:1,padding:"8px 6px",borderRadius:8,border:"1px solid",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,transition:"all .15s",
                        borderColor:deal.gstMode===opt.mode?"#4169E1":"#c2d2ee",
                        background:deal.gstMode===opt.mode?"#4169E120":"transparent",
                        color:deal.gstMode===opt.mode?"#4169E1":"#6b7a99"
                      }}>
                      <div>{opt.label}</div>
                      <div style={{fontSize:9,fontWeight:400,marginTop:2,opacity:.7}}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {deal.gstMode!=="none"&&(
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"10px 0 8px"}}>
                    <span style={{fontSize:10,color:"#5a6b8c",alignSelf:"center"}}>Exempt from GST:</span>
                    {["flights","hotels","land","visa"].map(sec=>{
                      const isExempt = (deal.gstExemptSections||[]).includes(sec);
                      return (
                        <button key={sec} onClick={()=>{
                          const cur = deal.gstExemptSections||[];
                          upd("gstExemptSections", isExempt ? cur.filter(s=>s!==sec) : [...cur,sec]);
                        }} style={{fontSize:11,padding:"4px 10px",borderRadius:6,cursor:"pointer",border:"1px solid",fontWeight:600,
                          background:isExempt?"#fdeaea":"transparent",borderColor:isExempt?"#dc2626":"#c2d2ee",color:isExempt?"#b91c1c":"#6b7a99"}}>
                          {isExempt?"✖":"✔"} {sec.charAt(0).toUpperCase()+sec.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mono" style={{fontSize:24,fontWeight:800,color:"#4169E1"}}>{fmtINR(gst)}</div>
                <div style={{fontSize:12,color:"#4169E1",marginTop:4}}>
                  {deal.gstMode==="none"
                    ? "GST removed from this deal"
                    : deal.gstMode==="package"
                    ? `5% × Selling ${fmtINR(totalSell)}`
                    : `18% × GPM ${fmtINR(gpm)}`}
                </div>
              </div>
              <div style={{background:"linear-gradient(135deg,#451a0350,#78350f30)",border:"1px solid #f9731633",borderRadius:10,padding:18}}>
                <div style={{fontSize:10,color:"#fdba74",letterSpacing:2,marginBottom:6}}>NET PROFIT (After GST)</div>
                <div className="mono" style={{fontSize:24,fontWeight:800,color:netProfit>=0?"#f97316":"#ef4444"}}>{fmtINR(netProfit)}</div>
                <div style={{fontSize:12,color:"#fdba74",marginTop:4}}>{netMarginPct}% margin · GPM − GST</div>
              </div>
            </div>

            {/* Vendor table */}
            <div className="card">
              <div className="sec-head">Section-wise P&L (all converted to INR)</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#ffffff"}}>{["Section","Vendors","Cost (INR)","Selling (INR)","Profit","Paid","Balance"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#a9bce0",fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {[{label:"🏨 Hotels",c:hotel},{label:"✈️ Flights",c:flight},{label:"🚌 Land",c:land},{label:"🛂 Visa",c:visa}].map(({label,c})=>{
                    const profit=c.sell-c.cost; const bal=c.cost-c.paid;
                    return <tr key={label} style={{borderTop:"1px solid #d4e0f5"}}>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{label}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#6b7a99"}}>—</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(c.cost)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(c.sell)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:profit>=0?"#10b981":"#ef4444",fontWeight:700}}>{fmtINR(profit)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#4169E1"}}>{fmtINR(c.paid)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:bal>0?"#ef4444":"#10b981",fontWeight:700}}>{fmtINR(bal)}</td>
                    </tr>;
                  })}
                  <tr style={{borderTop:"2px solid #c2d2ee",background:"#ffffff",fontWeight:800}}>
                    <td style={{padding:"10px 12px"}}>TOTAL</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#6b7a99"}}>—</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(totalCost)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(totalSell)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:gpm>=0?"#10b981":"#ef4444"}}>{fmtINR(gpm)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#4169E1"}}>{fmtINR(totalPaidToVendors)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:balanceToVendors>0?"#ef4444":"#10b981"}}>{fmtINR(balanceToVendors)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash flows */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div className="card">
                <div className="sec-head">Client Cash Flow</div>
                {[["Total to Receive"+(totalRefunded>0?" (net)":""),fmtINR(netSell),"#1a2c52"],["Total Received"+(totalRefunded>0?" (net)":""),fmtINR(netClientReceived),"#10b981"],...(totalRefunded>0?[["Refunded","− "+fmtINR(totalRefunded),"#b91c1c"]]:[]),["Balance Pending",fmtINR(balanceFromClient),balanceFromClient>0?"#f97316":"#10b981"]].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #d4e0f5"}}>
                    <span style={{fontSize:13}}>{l}</span><span className="mono" style={{fontSize:16,fontWeight:800,color:c}}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="sec-head">Vendor Cash Flow</div>
                {[["Total to Pay",fmtINR(totalCost),"#1a2c52"],["Total Paid",fmtINR(totalPaidToVendors),"#4169E1"],["Balance to Pay",fmtINR(balanceToVendors),balanceToVendors>0?"#ef4444":"#10b981"]].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #d4e0f5"}}>
                    <span style={{fontSize:13}}>{l}</span><span className="mono" style={{fontSize:16,fontWeight:800,color:c}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visa status */}
            {deal.visaVendors.length>0&&(
              <div className="card">
                <div className="sec-head">Visa Status Summary</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {deal.visaVendors.map(v=>(
                    <div key={v.id} className="stat" style={{minWidth:160}}>
                      <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>{v.name||"Unnamed"}</div>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:VISA_STATUS_COLORS[v.visaStatus||"Not Applied"]+"22",color:VISA_STATUS_COLORS[v.visaStatus||"Not Applied"]}}>{v.visaStatus||"Not Applied"}</span>
                      <div className="mono" style={{fontSize:12,color:"#6b7a99",marginTop:6}}>{fmtINR(vendorINR(v).costINR)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-thumb{background:#dde6f5;border-radius:4px}
  input,select,textarea{font-family:'Syne',sans-serif;background:#eef3fc;border:1px solid #dde6f5;border-radius:6px;padding:8px 10px;font-size:13px;color:#1a2c52;outline:none;width:100%;transition:border .18s,box-shadow .18s}
  input:focus,select:focus,textarea:focus{border-color:#4169E1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
  select option{background:#eef3fc}
  .mono{font-family:'IBM Plex Mono',monospace}
  .btn{border:none;border-radius:6px;cursor:pointer;font-family:'Syne',sans-serif;font-weight:600;transition:all .18s}
  .btn-ind{background:linear-gradient(135deg,#f97316,#f59e0b);color:#fff;padding:8px 18px;font-size:13px}
  .btn-ind:hover{opacity:.88;transform:translateY(-1px)}
  .btn-sm{background:#d4e0f5;border:1px solid #c2d2ee;color:#5a6b8c;padding:5px 12px;font-size:12px}
  .btn-sm:hover{border-color:#4169E1;color:#4169E1}
  .btn-danger{background:transparent;border:1px solid #ef444433;color:#ef4444;padding:4px 10px;font-size:11px}
  .btn-danger:hover{background:#ef444410}
  .btn-dashed{background:transparent;border:1px dashed #c2d2ee;color:#4169E1;padding:7px;font-size:12px;width:100%;margin-top:8px}
  .btn-dashed:hover{border-color:#4169E1;background:#4169E108}
  .card{background:#ffffff;border:1px solid #d4e0f5;border-radius:12px;padding:20px}
  .sec-head{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#4169E1;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #d4e0f5}
  .lbl{font-size:11px;color:#6b7a99;font-weight:600;letter-spacing:.3px;display:block;margin-bottom:4px}
  .stat{background:#ffffff;border:1px solid #d4e0f5;border-radius:10px;padding:14px 18px}
  .vrow{background:#ffffff;border:1px solid #d4e0f5;border-radius:10px;padding:16px;margin-bottom:10px;transition:border .2s}
  .prow{background:#ffffff;border:1px solid #d4e0f5;border-radius:6px;padding:10px;margin-bottom:6px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}
  .tab{padding:10px 16px;border:none;background:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;color:#a9bce0;border-bottom:2px solid transparent;white-space:nowrap;transition:all .2s}
  .tab.on{color:#f97316;border-bottom-color:#f97316}
  .tab:hover:not(.on){color:#5a6b8c}

  /* ═══════════ MOBILE RESPONSIVE (tablets & phones) ═══════════ */
  @media(max-width:820px){
    .grid3{grid-template-columns:1fr 1fr!important;gap:10px!important}
    .card{padding:16px!important}
    .crm-header{padding:14px 16px!important}
    .crm-body{padding:16px!important}
    .tab-bar{overflow-x:auto!important;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch}
    .tab{flex:0 0 auto!important;white-space:nowrap}
    table{font-size:12px!important}
    th,td{padding:7px 8px!important}
  }
  @media(max-width:560px){
    .grid3,.grid2{grid-template-columns:1fr!important}
    .card{padding:14px!important;border-radius:10px!important}
    .crm-header{flex-direction:column!important;align-items:stretch!important;gap:10px!important}
    .crm-header .hdr-actions{display:flex;flex-wrap:wrap;gap:8px!important}
    .crm-header .hdr-actions .btn{flex:1 1 auto;min-height:44px;font-size:13px!important}
    .btn{min-height:44px}
    input,select,textarea{font-size:16px!important;padding:11px 12px!important}
    .sec-head{font-size:11px!important}
    .dash-cards{grid-template-columns:1fr 1fr!important}
    .summary-row{flex-direction:column!important}
    /* scrollable tables on phones */
    .table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
    table{min-width:520px}
    h2{font-size:16px!important}
  }
  @media(max-width:380px){
    .dash-cards{grid-template-columns:1fr!important}
    .cc-grid{grid-template-columns:1fr 1fr!important}
  }
  /* Larger tap targets everywhere on touch devices */
  @media(hover:none){
    .btn,.tab,select,button{min-height:42px}
    a,button{touch-action:manipulation}
  }
`;
const dashStyles = sharedStyles;
const dealStyles = sharedStyles;