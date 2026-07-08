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
  ["30+ Days from Date of Booking","Communication Charges Only"],
  ["21–30 Days Prior to Departure","25% of Total Tour Cost"],
  ["11–20 Days Prior to Departure","50% of Total Tour Cost"],
  ["Within 10 Days of Departure","100% – Full Cancellation (No Refund)"],
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
  @media print{.bar{display:none}body{background:#fff}.page{max-width:100%}}
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
  <div class="sec-title">■ PRICING SUMMARY</div>
  <div class="body">
    <div class="price">
      <div class="opt">TOTAL PACKAGE PRICE</div>
      <div class="amt">${inr(totalSell)}</div>
      <div class="per">${meta.pax>0?("Approx "+inr(perPax)+" per person × "+meta.pax+" pax"):""}</div>
    </div>
    <div style="font-size:12px;color:#6b7a99">* GST extra as applicable. Quotation valid for mentioned travel dates only.</div>
  </div>
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
const fmtINR = (val) => "₹"+(Math.round(n(val))).toLocaleString("en-IN");
const today = () => new Date().toISOString().split("T")[0];
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
  country:"", city:"", hotelName:"", photoUrl:"", roomCategory:"Deluxe Room",
  checkIn:"", checkOut:"", nights:0,
  costPrice:"", sellingPrice:"", payments:[],
});
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
  modeOfQuery:"Call", travelDates:"", destination:"",
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
  attachments:[],
};

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
const STORAGE_KEY = "travelcrm_deal";
const VENDORS_KEY = "travelcrm_vendors";
const DEALS_KEY = "travelcrm_all_deals";

const loadDeal = () => { try { const d=localStorage.getItem(STORAGE_KEY); return d?JSON.parse(d):null; } catch(e){return null;} };
const saveDeal = (d) => { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); } catch(e){} };
const loadVendorNames = () => { try { const v=localStorage.getItem(VENDORS_KEY); return v?JSON.parse(v):[]; } catch(e){return[];} };
const saveVendorName = (name) => {
  const list = loadVendorNames();
  if(name && !list.includes(name)){ list.push(name); try{localStorage.setItem(VENDORS_KEY,JSON.stringify(list));}catch(e){} }
};
const loadAllDeals = () => { try { const d=localStorage.getItem(DEALS_KEY); return d?JSON.parse(d):[]; } catch(e){return[];} };
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
const STATUS_OPTIONS = ["Not Actioned","In Progress","Quoted","Booked","Cancelled","Completed"];
const PIPELINE_STAGES = ["New Lead","Contacted","Quoted","Negotiation","Booked","Travelled","Lost"];
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
  const [deal,setDeal]=useState(()=>loadDeal()||{...initDeal});
  const [tab,setTab]=useState("client");
  const [expandedVendor,setExpandedVendor]=useState(null);
  const [receiptPayment,setReceiptPayment]=useState(null);
  const [proposalOpen,setProposalOpen]=useState(false);
  const [propFlights,setPropFlights]=useState("with");   // with | without | only
  const [propShowPrice,setPropShowPrice]=useState(true);
  const [propCoverUrl,setPropCoverUrl]=useState("");
  const [saveStatus,setSaveStatus]=useState("");
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
    const sellOf=(d)=>dv(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
    const recvOf=(d)=>sum(d.clientPayments||[],"amount");
    return {
      totalDeals:allDeals.length,
      hotLeads:allDeals.filter(d=>(d.priority==="Hot 🔥"||d.priority==="High")&&!["Booked","Cancelled","Lost"].includes(d.stage||"")).map(d=>d.clientName),
      followUpsDue:allDeals.filter(d=>d.followUpDate&&d.followUpDate<=new Date().toISOString().slice(0,10)).map(d=>({client:d.clientName,date:d.followUpDate})),
      toCollect:allDeals.filter(d=>(d.status||d.stage)==="Booked").reduce((s,d)=>s+Math.max(0,sellOf(d)-recvOf(d)),0),
      currentDeal:deal.clientName?{client:deal.clientName,destination:deal.destination,stage:deal.stage,status:deal.status}:null,
      stages:PIPELINE_STAGES,
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
      const sellOf=(d)=>dv(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
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
        grossProfitBooked: booked.reduce((s,d)=>s+(sellOf(d)-costOf(d)),0),
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
  const generateQuotation = async () => {
    if(!deal.clientName){ window.veToast && window.veToast("Add client name first","warning"); return; }
    setQuoteBusy(true);
    try {
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

      // 3. Build branded print-ready HTML and open in new window
      const html = buildQuotationHTML(deal, flights, hotels, parsed, {pax,totalNights,fmtDate});
      const w = window.open("","_blank");
      if(!w){ window.veToast && window.veToast("Allow popups to view the quotation","warning"); setQuoteBusy(false); return; }
      w.document.write(html); w.document.close();
    } catch(e){
      window.veToast && window.veToast("Quotation failed: "+e.message,"error");
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

  const saveToAllDeals = async () => {
    if (!deal.clientName) { window.veToast && window.veToast("Please enter client name first", "warning"); return; }
    setApiLoading(true);
    // Always keep a local copy first so a deal can NEVER be lost, even if the network fails.
    const persistLocal = (d) => {
      const all = loadAllDeals();
      const idx = all.findIndex(x => (d._id && x._id === d._id) || (d._localId && x._localId === d._localId));
      if (idx >= 0) all[idx] = d; else all.unshift(d);
      saveAllDeals(all); setAllDeals(all);
      setDeal(d); saveDeal(d);
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
      window.veToast && window.veToast("✅ Deal saved successfully!", "success");
    } catch (e) {
      console.error("Save error:", e?.message);
      // Network/auth failed — DO NOT lose the deal. Keep it locally and tell the user clearly.
      const localCopy = { ...deal, _localId: deal._localId || uid(), _savedAt: new Date().toISOString() };
      persistLocal(localCopy);
      window.veToast && window.veToast("⚠️ Saved on this device, but server sync failed. Check login/connection.", "warning");
    } finally {
      setApiLoading(false);
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

  const newDeal=()=>{ if(window.confirm("Start a new deal? Current draft is auto-saved.")){const d={...initDeal};setDeal(d);saveDeal(d);setTab("client");} };
  const openDeal=(d)=>{ setDeal(d); saveDeal(d); setScreen("deal"); setTab("client"); };

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
  const totalSell=hotel.sell+flight.sell+land.sell+visa.sell;
  const totalPaidToVendors=hotel.paid+flight.paid+land.paid+visa.paid;
  const gpm=totalSell-totalCost;
  // Per-component GST exclusion: exempt sections' amounts are subtracted from GST base
  const exempt = deal.gstExemptSections || [];
  const gstSell = totalSell - (exempt.includes("flights")?flight.sell:0) - (exempt.includes("hotels")?hotel.sell:0)
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
  const balanceFromClient=totalSell-totalClientReceived;
  const balanceToVendors=totalCost-totalPaidToVendors;

  const tabs=[
    {id:"client",label:"👤 Client"},
    {id:"flights",label:"✈️ Flights"},
    {id:"hotels",label:"🏨 Hotels"},
    {id:"land",label:"🚌 Land"},
    {id:"visa",label:"🛂 Visa"},
    {id:"payments",label:"💰 Payments"},
    {id:"attachments",label:"📎 Attachments"},
    {id:"summary",label:"📋 Summary"},
  ];

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }
// ── USERS SCREEN (admin only) ─────────────────────────────────────────────
  // ─── 📊 REPORTS SCREEN (repeat customers, vendor performance, monthly P&L) ──
  if(screen==="reports"){
    const allD = loadAllDeals();
    const dvAll = (d)=>[...(d.hotelVendors||[]),...(d.flightVendors||[]),...(d.landVendors||[]),...(d.visaVendors||[])];
    const dSell = (d)=>dvAll(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
    const dCost = (d)=>dvAll(d).reduce((s,v)=>s+toINR(v.costPrice,v.currency,v.exchangeRate),0);
    const isBooked = (d)=>(d.status||d.stage)==="Booked";
    const inr = (x)=>"₹"+Math.round(x).toLocaleString("en-IN");

    // ── 1. REPEAT CUSTOMERS: group by phone (fallback name) ──
    const byCust = {};
    allD.forEach(d=>{
      const key = (d.contactNo||"").replace(/[^0-9]/g,"").slice(-10) || (d.clientName||"").toLowerCase().trim();
      if(!key) return;
      if(!byCust[key]) byCust[key]={name:d.clientName,phone:d.contactNo,deals:[]};
      byCust[key].deals.push(d);
    });
    const repeats = Object.values(byCust).filter(c=>c.deals.length>1)
      .map(c=>({...c, total:c.deals.reduce((s,d)=>s+dSell(d),0), booked:c.deals.filter(isBooked).length}))
      .sort((a,b)=>b.deals.length-a.deals.length);

    // ── 2. VENDOR PERFORMANCE: aggregate by vendor name ──
    const byVendor = {};
    allD.forEach(d=>dvAll(d).forEach(v=>{
      const name=(v.name||"").trim(); if(!name) return;
      if(!byVendor[name]) byVendor[name]={name,deals:0,sell:0,cost:0,profit:0};
      const s=toINR(v.sellingPrice,v.currency,v.exchangeRate), c=toINR(v.costPrice,v.currency,v.exchangeRate);
      byVendor[name].deals++; byVendor[name].sell+=s; byVendor[name].cost+=c; byVendor[name].profit+=(s-c);
    }));
    const vendors = Object.values(byVendor).sort((a,b)=>b.profit-a.profit);

    // ── 3. MONTHLY P&L: bucket booked deals by month ──
    const byMonth = {};
    allD.filter(isBooked).forEach(d=>{
      const dt = d.bookedDate||d.createdAt||d.travelDate||"";
      const mon = dt ? new Date(dt).toLocaleDateString("en-GB",{month:"short",year:"numeric"}) : "Undated";
      if(!byMonth[mon]) byMonth[mon]={mon,deals:0,sell:0,cost:0,profit:0};
      const s=dSell(d), c=dCost(d);
      byMonth[mon].deals++; byMonth[mon].sell+=s; byMonth[mon].cost+=c; byMonth[mon].profit+=(s-c);
    });
    const months = Object.values(byMonth);

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
            <div style={{fontSize:12,color:"#6b7a99",marginBottom:14}}>Clients who came back more than once — your most loyal, easiest to upsell.</div>
            {repeats.length===0 ? <div style={{color:"#6b7a99",fontSize:13}}>No repeat customers yet.</div> :
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>CLIENT</th><th style={th}>PHONE</th><th style={th}>TRIPS</th><th style={th}>BOOKED</th><th style={th}>TOTAL VALUE</th></tr></thead>
              <tbody>{repeats.map((c,i)=>(
                <tr key={i}><td style={{...td,fontWeight:700}}>{c.name||"—"}</td><td style={td}>{c.phone||"—"}</td>
                  <td style={td}><span style={{background:"#e8efff",color:"#4169E1",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{c.deals.length}×</span></td>
                  <td style={td}>{c.booked}</td><td style={{...td,fontWeight:700}}>{inr(c.total)}</td></tr>
              ))}</tbody>
            </table></div>}
          </div>

          {/* VENDOR PERFORMANCE */}
          <div style={card}>
            <div style={{fontSize:16,fontWeight:800,color:"#4169E1",marginBottom:4}}>🤝 Vendor Performance</div>
            <div style={{fontSize:12,color:"#6b7a99",marginBottom:14}}>Which vendors you use most and which give the best margin.</div>
            {vendors.length===0 ? <div style={{color:"#6b7a99",fontSize:13}}>No vendor data yet.</div> :
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><th style={th}>VENDOR</th><th style={th}>TIMES USED</th><th style={th}>TOTAL COST</th><th style={th}>TOTAL SELL</th><th style={th}>PROFIT</th></tr></thead>
              <tbody>{vendors.map((v,i)=>(
                <tr key={i}><td style={{...td,fontWeight:700}}>{v.name}</td><td style={td}>{v.deals}</td>
                  <td style={td}>{inr(v.cost)}</td><td style={td}>{inr(v.sell)}</td>
                  <td style={{...td,fontWeight:700,color:v.profit>=0?"#15803d":"#b91c1c"}}>{inr(v.profit)}</td></tr>
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
                <td style={{...td,fontWeight:800,color:"#15803d"}}>{inr(months.reduce((s,m)=>s+m.profit,0))}</td>
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
  const PROP_COVERS = {
    "kashmir":"https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1400&q=85",
    "srinagar":"https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1400&q=85",
    "gulmarg":"https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1400&q=85",
    "pahalgam":"https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1400&q=85",
    "sonamarg":"https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1400&q=85",
    "ladakh":"https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=1400&q=85",
    "leh":"https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=1400&q=85",
    "pangong":"https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=1400&q=85",
    "nubra":"https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=1400&q=85",
    "himachal":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "manali":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "shimla":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "dharamshala":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "kasol":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "spiti":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "dalhousie":"https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=85",
    "goa":"https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1400&q=85",
    "kerala":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85",
    "munnar":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85",
    "alleppey":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85",
    "kochi":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85",
    "kovalam":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85",
    "wayanad":"https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=85",
    "rajasthan":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85",
    "jaipur":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85",
    "udaipur":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85",
    "jodhpur":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85",
    "jaisalmer":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85",
    "pushkar":"https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1400&q=85",
    "uttarakhand":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    "rishikesh":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    "mussoorie":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    "nainital":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    "auli":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    "haridwar":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    "sikkim":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=85",
    "darjeeling":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=85",
    "gangtok":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=85",
    "arunachal":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "meghalaya":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "shillong":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "tawang":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "cherrapunji":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "north east":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "northeast":"https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=1400&q=85",
    "madhya pradesh":"https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1400&q=85",
    "khajuraho":"https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1400&q=85",
    "bandhavgarh":"https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1400&q=85",
    "kanha":"https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1400&q=85",
    "pench":"https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1400&q=85",
    "tamil nadu":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85",
    "chennai":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85",
    "madurai":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85",
    "ooty":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85",
    "rameshwaram":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85",
    "kodaikanal":"https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=1400&q=85",
    "karnataka":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "coorg":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "hampi":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "mysore":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "bengaluru":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "bangalore":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "gokarna":"https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=1400&q=85",
    "gujarat":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85",
    "rann":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85",
    "kutch":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85",
    "dwarka":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85",
    "somnath":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85",
    "andaman":"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=85",
    "havelock":"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=85",
    "port blair":"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=85",
    "agra":"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85",
    "taj mahal":"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85",
    "varanasi":"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85",
    "golden triangle":"https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=85",
    "bali":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1400&q=85",
    "ubud":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1400&q=85",
    "indonesia":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1400&q=85",
    "thailand":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1400&q=85",
    "bangkok":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1400&q=85",
    "phuket":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1400&q=85",
    "pattaya":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1400&q=85",
    "krabi":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1400&q=85",
    "koh samui":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1400&q=85",
    "vietnam":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "da nang":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "danang":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "hanoi":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "ho chi minh":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "phu quoc":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "hoi an":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "halong":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "nha trang":"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    "singapore":"https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1400&q=85",
    "sentosa":"https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1400&q=85",
    "maldives":"https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1400&q=85",
    "dubai":"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1400&q=85",
    "abu dhabi":"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1400&q=85",
    "uae":"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1400&q=85",
    "united arab":"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1400&q=85",
    "sri lanka":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85",
    "srilanka":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85",
    "colombo":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85",
    "kandy":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85",
    "ella":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85",
    "bentota":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1400&q=85",
    "georgia":"https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=1400&q=85",
    "tbilisi":"https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=1400&q=85",
    "kazbegi":"https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=1400&q=85",
    "batumi":"https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=1400&q=85",
    "gudauri":"https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=1400&q=85",
    "armenia":"https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1400&q=85",
    "yerevan":"https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1400&q=85",
    "azerbaijan":"https://images.unsplash.com/photo-1601059625985-6da10d56ec22?w=1400&q=85",
    "baku":"https://images.unsplash.com/photo-1601059625985-6da10d56ec22?w=1400&q=85",
    "kazakhstan":"https://images.unsplash.com/photo-1474401941244-3a13d3107b51?w=1400&q=85",
    "almaty":"https://images.unsplash.com/photo-1474401941244-3a13d3107b51?w=1400&q=85",
    "astana":"https://images.unsplash.com/photo-1474401941244-3a13d3107b51?w=1400&q=85",
    "turkey":"https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1400&q=85",
    "istanbul":"https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1400&q=85",
    "cappadocia":"https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1400&q=85",
    "antalya":"https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1400&q=85",
    "egypt":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85",
    "cairo":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85",
    "giza":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85",
    "luxor":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85",
    "nile":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85",
    "sharm":"https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1400&q=85",
    "kenya":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1400&q=85",
    "masai":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1400&q=85",
    "nairobi":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1400&q=85",
    "south africa":"https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1400&q=85",
    "cape town":"https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1400&q=85",
    "johannesburg":"https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1400&q=85",
    "kruger":"https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=1400&q=85",
    "seychelles":"https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=1400&q=85",
    "mahe":"https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=1400&q=85",
    "praslin":"https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=1400&q=85",
    "mauritius":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85",
    "victoria falls":"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1400&q=85",
    "zimbabwe":"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1400&q=85",
    "zambia":"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1400&q=85",
    "greece":"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=85",
    "santorini":"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=85",
    "athens":"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=85",
    "mykonos":"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=85",
    "crete":"https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=85",
    "switzerland":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "swiss":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "zurich":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "interlaken":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "france":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "paris":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "italy":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "rome":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "venice":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "milan":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "europe":"https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=85",
    "germany":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "berlin":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "munich":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "austria":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "vienna":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "hungary":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "budapest":"https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=1400&q=85",
    "prague":"https://images.unsplash.com/photo-1541849546-216549ae216d?w=1400&q=85",
    "czech":"https://images.unsplash.com/photo-1541849546-216549ae216d?w=1400&q=85",
    "poland":"https://images.unsplash.com/photo-1541849546-216549ae216d?w=1400&q=85",
    "krakow":"https://images.unsplash.com/photo-1541849546-216549ae216d?w=1400&q=85",
    "norway":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "oslo":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "finland":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "helsinki":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "northern lights":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "scandinavia":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "lapland":"https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=85",
    "london":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "england":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "scotland":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "united kingdom":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "ireland":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "dublin":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "edinburgh":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
    "russia":"https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1400&q=85",
    "moscow":"https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1400&q=85",
    "petersburg":"https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1400&q=85",
    "japan":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85",
    "tokyo":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85",
    "kyoto":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85",
    "osaka":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85",
    "korea":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85",
    "seoul":"https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1400&q=85",
    "new york":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1400&q=85",
    "washington dc":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1400&q=85",
    "boston":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1400&q=85",
    "niagara usa":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1400&q=85",
    "los angeles":"https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1400&q=85",
    "san francisco":"https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1400&q=85",
    "las vegas":"https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1400&q=85",
    "california":"https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1400&q=85",
    "hollywood":"https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1400&q=85",
    "yellowstone":"https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1400&q=85",
    "grand canyon":"https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1400&q=85",
    "national parks":"https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1400&q=85",
    "orlando":"https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85",
    "disney":"https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85",
    "miami":"https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85",
    "florida":"https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1400&q=85",
    "canada":"https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=1400&q=85",
    "toronto":"https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=1400&q=85",
    "montreal":"https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=1400&q=85",
    "niagara":"https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=1400&q=85",
    "ottawa":"https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=1400&q=85",
    "vancouver":"https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85",
    "calgary":"https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85",
    "banff":"https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85",
    "whistler":"https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85",
    "rocky mountaineer":"https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85",
    "queenstown":"https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=85",
    "new zealand":"https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1400&q=85",
    "auckland":"https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1400&q=85",
    "christchurch":"https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1400&q=85",
    "rotorua":"https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1400&q=85",
    "australia":"https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1400&q=85",
    "sydney":"https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1400&q=85",
    "melbourne":"https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1400&q=85",
    "great barrier reef":"https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=1400&q=85",
    "cairns":"https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=1400&q=85",
    "whitsundays":"https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=1400&q=85",
    "gold coast":"https://images.unsplash.com/photo-1524397057410-1e775ed476f3?w=1400&q=85",
    "brisbane":"https://images.unsplash.com/photo-1524397057410-1e775ed476f3?w=1400&q=85"
  };
  const PROP_KEYMAP = {"kashmir":"kashmir","srinagar":"kashmir","gulmarg":"kashmir","pahalgam":"kashmir","sonamarg":"kashmir","ladakh":"ladakh","leh":"ladakh","pangong":"ladakh","nubra":"ladakh","himachal":"himachal","manali":"himachal","shimla":"himachal","dharamshala":"himachal","kasol":"himachal","spiti":"himachal","dalhousie":"himachal","goa":"goa","kerala":"kerala","munnar":"kerala","alleppey":"kerala","kochi":"kerala","kovalam":"kerala","wayanad":"kerala","rajasthan":"rajasthan","jaipur":"rajasthan","udaipur":"rajasthan","jodhpur":"rajasthan","jaisalmer":"rajasthan","pushkar":"rajasthan","uttarakhand":"uttarakhand","rishikesh":"uttarakhand","mussoorie":"uttarakhand","nainital":"uttarakhand","auli":"uttarakhand","haridwar":"uttarakhand","sikkim":"sikkim-darjeeling","darjeeling":"sikkim-darjeeling","gangtok":"sikkim-darjeeling","arunachal":"arunachal-meghalaya","meghalaya":"arunachal-meghalaya","shillong":"arunachal-meghalaya","tawang":"arunachal-meghalaya","cherrapunji":"arunachal-meghalaya","north east":"arunachal-meghalaya","northeast":"arunachal-meghalaya","madhya pradesh":"madhya-pradesh","khajuraho":"madhya-pradesh","bandhavgarh":"madhya-pradesh","kanha":"madhya-pradesh","pench":"madhya-pradesh","tamil nadu":"tamil-nadu","chennai":"tamil-nadu","madurai":"tamil-nadu","ooty":"tamil-nadu","rameshwaram":"tamil-nadu","kodaikanal":"tamil-nadu","karnataka":"karnataka","coorg":"karnataka","hampi":"karnataka","mysore":"karnataka","bengaluru":"karnataka","bangalore":"karnataka","gokarna":"karnataka","gujarat":"gujarat","rann":"gujarat","kutch":"gujarat","dwarka":"gujarat","somnath":"gujarat","andaman":"andaman-nicobar","havelock":"andaman-nicobar","port blair":"andaman-nicobar","agra":"delhi-agra-varanasi","taj mahal":"delhi-agra-varanasi","varanasi":"delhi-agra-varanasi","golden triangle":"delhi-agra-varanasi","bali":"bali","ubud":"bali","indonesia":"bali","thailand":"thailand","bangkok":"thailand","phuket":"thailand","pattaya":"thailand","krabi":"thailand","koh samui":"thailand","vietnam":"vietnam","da nang":"vietnam","danang":"vietnam","hanoi":"vietnam","ho chi minh":"vietnam","phu quoc":"vietnam","hoi an":"vietnam","halong":"vietnam","nha trang":"vietnam","singapore":"singapore","sentosa":"singapore","maldives":"maldives","dubai":"dubai","abu dhabi":"dubai","uae":"dubai","united arab":"dubai","sri lanka":"sri-lanka","srilanka":"sri-lanka","colombo":"sri-lanka","kandy":"sri-lanka","ella":"sri-lanka","bentota":"sri-lanka","georgia":"georgia","tbilisi":"georgia","kazbegi":"georgia","batumi":"georgia","gudauri":"georgia","armenia":"armenia","yerevan":"armenia","azerbaijan":"azerbaijan","baku":"azerbaijan","kazakhstan":"kazakhstan","almaty":"kazakhstan","astana":"kazakhstan","turkey":"turkey","istanbul":"turkey","cappadocia":"turkey","antalya":"turkey","egypt":"egypt","cairo":"egypt","giza":"egypt","luxor":"egypt","nile":"egypt","sharm":"egypt","kenya":"kenya","masai":"kenya","nairobi":"kenya","south africa":"south-africa","cape town":"south-africa","johannesburg":"south-africa","kruger":"south-africa","seychelles":"seychelles","mahe":"seychelles","praslin":"seychelles","mauritius":"mauritius","victoria falls":"victoria-falls","zimbabwe":"victoria-falls","zambia":"victoria-falls","greece":"greece","santorini":"greece","athens":"greece","mykonos":"greece","crete":"greece","switzerland":"france-switzerland-italy","swiss":"france-switzerland-italy","zurich":"france-switzerland-italy","interlaken":"france-switzerland-italy","france":"france-switzerland-italy","paris":"france-switzerland-italy","italy":"france-switzerland-italy","rome":"france-switzerland-italy","venice":"france-switzerland-italy","milan":"france-switzerland-italy","europe":"france-switzerland-italy","germany":"germany-austria-hungary","berlin":"germany-austria-hungary","munich":"germany-austria-hungary","austria":"germany-austria-hungary","vienna":"germany-austria-hungary","hungary":"germany-austria-hungary","budapest":"germany-austria-hungary","prague":"prague-budapest-poland","czech":"prague-budapest-poland","poland":"prague-budapest-poland","krakow":"prague-budapest-poland","norway":"norway-finland","oslo":"norway-finland","finland":"norway-finland","helsinki":"norway-finland","northern lights":"norway-finland","scandinavia":"norway-finland","lapland":"norway-finland","london":"uk-ireland","england":"uk-ireland","scotland":"uk-ireland","united kingdom":"uk-ireland","ireland":"uk-ireland","dublin":"uk-ireland","edinburgh":"uk-ireland","russia":"russia","moscow":"russia","petersburg":"russia","japan":"japan-korea","tokyo":"japan-korea","kyoto":"japan-korea","osaka":"japan-korea","korea":"japan-korea","seoul":"japan-korea","new york":"us-east-coast","washington dc":"us-east-coast","boston":"us-east-coast","los angeles":"us-west-coast","san francisco":"us-west-coast","las vegas":"us-west-coast","california":"us-west-coast","hollywood":"us-west-coast","yellowstone":"us-national-parks","grand canyon":"us-national-parks","national parks":"us-national-parks","orlando":"orlando","disney":"orlando","miami":"orlando","florida":"orlando","canada":"eastern-canada","toronto":"eastern-canada","montreal":"eastern-canada","niagara":"eastern-canada","ottawa":"eastern-canada","vancouver":"western-canada","calgary":"western-canada","banff":"western-canada","whistler":"western-canada","rocky mountaineer":"rocky-mountaineer","queenstown":"nz-queenstown","new zealand":"nz-north-south","auckland":"nz-north-south","christchurch":"nz-north-south","rotorua":"nz-north-south","australia":"australia-sydney-melbourne","sydney":"australia-sydney-melbourne","melbourne":"australia-sydney-melbourne","great barrier reef":"australia-great-barrier-reef","cairns":"australia-great-barrier-reef","whitsundays":"australia-great-barrier-reef","gold coast":"australia-gold-coast","brisbane":"australia-gold-coast"};
  const PROP_GALLERY = {"kashmir":["https://images.unsplash.com/photo-1566837945700-30057527ade0?w=700&q=80","https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=700&q=80","https://images.unsplash.com/photo-1587474260584-136574528ed5?w=700&q=80"],"ladakh":["https://images.unsplash.com/photo-1626176329831-4cf8ccb8bc45?w=700&q=80","https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=700&q=80","https://images.unsplash.com/photo-1589308454676-21178b783dc1?w=700&q=80"],"rajasthan":["https://images.unsplash.com/photo-1477587458883-47145ed94245?w=700&q=80","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=700&q=80","https://images.unsplash.com/photo-1599661046827-dacde63e9860?w=700&q=80"],"himachal":["https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=700&q=80","https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=700&q=80","https://images.unsplash.com/photo-1572213426852-0e4ed8f69e0f?w=700&q=80"],"goa":["https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=700&q=80","https://images.unsplash.com/photo-1583294955284-3a9a56b1d427?w=700&q=80","https://images.unsplash.com/photo-1587474260584-136574528ed5?w=700&q=80"],"kerala":["https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=700&q=80","https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=700&q=80","https://images.unsplash.com/photo-1590001155093-a3c66f9f85b4?w=700&q=80"],"tamil-nadu":["https://images.unsplash.com/photo-1621318104153-4a25bf9e7e43?w=700&q=80","https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=700&q=80","https://images.unsplash.com/photo-1597277478408-8df2e6a9a3ce?w=700&q=80"],"arunachal-meghalaya":["https://images.unsplash.com/photo-1606134459088-89b3e2ff3af9?w=700&q=80","https://images.unsplash.com/photo-1571606428253-b7bda8a64a1a?w=700&q=80","https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=700&q=80"],"uttarakhand":["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80","https://images.unsplash.com/photo-1564507592333-c60657eea523?w=700&q=80","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=700&q=80"],"bali":["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=700&q=80","https://images.unsplash.com/photo-1604999333679-b86d54738315?w=700&q=80","https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=700&q=80"],"thailand":["https://images.unsplash.com/photo-1528181304800-259b08848526?w=700&q=80","https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=700&q=80","https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=700&q=80"],"maldives":["https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=700&q=80","https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80","https://images.unsplash.com/photo-1540202404-a2f29016b523?w=700&q=80"],"dubai":["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&q=80","https://images.unsplash.com/photo-1518684079-3c830dcef090?w=700&q=80","https://images.unsplash.com/photo-1546412414-e1885e51cfa5?w=700&q=80"],"singapore":["https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=700&q=80","https://images.unsplash.com/photo-1540202404-a2f29016b523?w=700&q=80","https://images.unsplash.com/photo-1565967511849-76a60a516170?w=700&q=80"],"vietnam":["https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=700&q=80","https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=700&q=80","https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=700&q=80"],"egypt":["https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=700&q=80","https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=700&q=80","https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=700&q=80"],"victoria-falls":["https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=700&q=80","https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=700&q=80","https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=700&q=80"],"kenya":["https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=700&q=80","https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=700&q=80","https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=700&q=80"],"sri-lanka":["https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=700&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80","https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=700&q=80"],"georgia":["https://images.unsplash.com/photo-1626776877737-d5ff85d6d44b?w=700&q=80","https://images.unsplash.com/photo-1567103472667-6898f3a79cf2?w=700&q=80","https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=700&q=80"],"armenia":["https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=700&q=80","https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=700&q=80","https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=700&q=80"],"azerbaijan":["https://images.unsplash.com/photo-1601059625985-6da10d56ec22?w=700&q=80","https://images.unsplash.com/photo-1593011951104-f30e76c2c4cd?w=700&q=80","https://images.unsplash.com/photo-1558618047-3c8c76ca0d31?w=700&q=80"],"kazakhstan":["https://images.unsplash.com/photo-1474401941244-3a13d3107b51?w=700&q=80","https://images.unsplash.com/photo-1596397360628-7b27e25c5cbf?w=700&q=80","https://images.unsplash.com/photo-1609825488888-3a766db05542?w=700&q=80"],"rocky-mountaineer":["https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&q=80","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80","https://images.unsplash.com/photo-1531321293222-7e6cdd9b75bb?w=700&q=80"],"eastern-canada":["https://images.unsplash.com/photo-1548679847-1d4ff48016c9?w=700&q=80","https://images.unsplash.com/photo-1569161031678-f49d0e38e2be?w=700&q=80","https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=700&q=80"],"western-canada":["https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&q=80","https://images.unsplash.com/photo-1505832268823-414c63a48fb4?w=700&q=80","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80"],"australia-great-barrier-reef":["https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=700&q=80","https://images.unsplash.com/photo-1559828583-c93b69cf94c4?w=700&q=80","https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=700&q=80"],"andaman-nicobar":["https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80","https://images.unsplash.com/photo-1534710961216-75c88202f43e?w=700&q=80","https://images.unsplash.com/photo-1583212292454-1d6a5b13cca1?w=700&q=80"],"delhi-agra-varanasi":["https://images.unsplash.com/photo-1564507592333-c60657eea523?w=700&q=80","https://images.unsplash.com/photo-1587474260584-136574528ed5?w=700&q=80","https://images.unsplash.com/photo-1561361513-2d8efce48e9e?w=700&q=80"],"sikkim-darjeeling":["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80","https://images.unsplash.com/photo-1566837945700-30057527ade0?w=700&q=80","https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=700&q=80"],"gujarat":["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80","https://images.unsplash.com/photo-1477587458883-47145ed94245?w=700&q=80","https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=700&q=80"],"karnataka":["https://images.unsplash.com/photo-1565030606948-e5d7ee4d17f6?w=700&q=80","https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=700&q=80","https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=700&q=80"],"madhya-pradesh":["https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=700&q=80","https://images.unsplash.com/photo-1571126770897-2d612d1f7b89?w=700&q=80","https://images.unsplash.com/photo-1530053969600-caed2596d242?w=700&q=80"],"australia-gold-coast":["https://images.unsplash.com/photo-1524397057410-1e775ed476f3?w=700&q=80","https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=700&q=80","https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=700&q=80"],"australia-sydney-melbourne":["https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=700&q=80","https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=700&q=80","https://images.unsplash.com/photo-1538688423619-a81d3f23454b?w=700&q=80"],"france-switzerland-italy":["https://images.unsplash.com/photo-1431274172761-fca41d930114?w=700&q=80","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80","https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=700&q=80"],"germany-austria-hungary":["https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=700&q=80","https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=700&q=80","https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=700&q=80"],"greece":["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=700&q=80","https://images.unsplash.com/photo-1555993539-1732b0258235?w=700&q=80","https://images.unsplash.com/photo-1533105079780-92b9be482077?w=700&q=80"],"japan-korea":["https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=700&q=80","https://images.unsplash.com/photo-1522383225653-ed111181a951?w=700&q=80","https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=700&q=80"],"mauritius":["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80","https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80","https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80"],"norway-finland":["https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=700&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80","https://images.unsplash.com/photo-1484447330491-de89c23be34a?w=700&q=80"],"nz-north-south":["https://images.unsplash.com/photo-1517935706615-2717063c2225?w=700&q=80","https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=700&q=80","https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80"],"nz-queenstown":["https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80","https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=700&q=80","https://images.unsplash.com/photo-1517935706615-2717063c2225?w=700&q=80"],"orlando":["https://images.unsplash.com/photo-1534430480872-3498386e7856?w=700&q=80","https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=700&q=80","https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=700&q=80"],"prague-budapest-poland":["https://images.unsplash.com/photo-1541849546-216549ae216d?w=700&q=80","https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=700&q=80","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80"],"russia":["https://images.unsplash.com/photo-1513326738677-b964603b136d?w=700&q=80","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=700&q=80","https://images.unsplash.com/photo-1547448415-e9f5b28e570d?w=700&q=80"],"seychelles":["https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=700&q=80","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80","https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80"],"south-africa":["https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=700&q=80","https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=700&q=80","https://images.unsplash.com/photo-1517783999520-f068d7431a60?w=700&q=80"],"turkey":["https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=700&q=80","https://images.unsplash.com/photo-1545241047-6083a3684587?w=700&q=80","https://images.unsplash.com/photo-1502301197179-65228ab57f78?w=700&q=80"],"uk-ireland":["https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=700&q=80","https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=700&q=80","https://images.unsplash.com/photo-1512075135822-67cdd9dd7314?w=700&q=80"],"us-east-coast":["https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=700&q=80","https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=700&q=80","https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=700&q=80"],"us-national-parks":["https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=700&q=80","https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=700&q=80","https://images.unsplash.com/photo-1504870712357-65ea720d6078?w=700&q=80"],"us-west-coast":["https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=700&q=80","https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=700&q=80","https://images.unsplash.com/photo-1534430480872-3498386e7856?w=700&q=80"]};

  function propCover(){
    if(propCoverUrl.trim()) return propCoverUrl.trim();
    const dest=(deal.destination||"").toLowerCase();
    const _pk=Object.keys(PROP_COVERS).sort(function(a,b){return b.length-a.length;}); for(var _i=0;_i<_pk.length;_i++){ if(dest.indexOf(_pk[_i])>=0) return PROP_COVERS[_pk[_i]]; }
    return ""; // gradient fallback — never a wrong photo
  }
  function propSell(){
    let vend=[];
    if(propFlights==="only") vend=[...(deal.flightVendors||[])];
    else if(propFlights==="without") vend=[...(deal.hotelVendors||[]),...(deal.landVendors||[]),...(deal.visaVendors||[])];
    else vend=[...(deal.hotelVendors||[]),...(deal.flightVendors||[]),...(deal.landVendors||[]),...(deal.visaVendors||[])];
    return vend.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
  }
  function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function fmtD(d){ if(!d) return ""; try{return new Date(d).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});}catch(e){return d;} }
  function buildProposalHTML(){
    const cover=propCover();
    const pax=`${deal.adults||0} Adults${Number(deal.children)>0?`, ${deal.children} Children`:""}${Number(deal.infants)>0?`, ${deal.infants} Infants`:""}`;
    const hotels=(deal.hotelVendors||[]).filter(h=>h.hotelName||h.city);
    const nightsTotal=hotels.reduce((s,h)=>s+(Number(h.nights)||0),0);
    const flights=(deal.flightVendors||[]).filter(f=>(f.sectors||[]).some(s=>s.from||s.to));
    const ref=deal.dealNumber||("VE"+String(Date.now()).slice(-6));
    const showF=propFlights!=="without" && flights.length>0;
    const showH=propFlights!=="only";
    const sell=propSell();
    const totalPax=(Number(deal.adults)||0)+(Number(deal.children)||0);
    const allDayLines=(deal.landVendors||[]).filter(l=>l.itinerary).map(l=>l.itinerary.split(/\n+/).filter(x=>x.trim())).reduce((a,b)=>a.concat(b),[]);
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
      ${showH&&hotels.length?`<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#0d1b3e">${hotels.length}</div><div style="font-size:9px;letter-spacing:1.5px;color:#c9961a;font-weight:800">PREMIUM STAY${hotels.length>1?"S":""}</div></div>`:""}
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
    const payBlock=(propShowPrice&&sell>0&&totRec>0)?`<div style="background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:16px 20px;margin-top:16px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:10px">PAYMENT SUMMARY</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
        <div style="flex:1;min-width:130px;background:#f0faf4;border-radius:10px;padding:10px 14px"><div style="color:#15803d;font-weight:800;font-size:16px">₹${totRec.toLocaleString("en-IN")}</div><div style="color:#5a6b8c;font-size:10px">RECEIVED — thank you! 🙏</div></div>
        <div style="flex:1;min-width:130px;background:#fff7ed;border-radius:10px;padding:10px 14px"><div style="color:#c2660a;font-weight:800;font-size:16px">₹${Math.max(0,sell-totRec).toLocaleString("en-IN")}</div><div style="color:#5a6b8c;font-size:10px">BALANCE — due before travel</div></div>
      </div>
    </div>`:"";
    let galleryImgs=[];
    {const _dl=(deal.destination||"").toLowerCase();const _gk=Object.keys(PROP_KEYMAP).sort(function(a,b){return b.length-a.length;});
     for(var _gi=0;_gi<_gk.length;_gi++){ if(_dl.indexOf(_gk[_gi])>=0){ galleryImgs=PROP_GALLERY[PROP_KEYMAP[_gk[_gi]]]||[]; break; } }}
    const glimpseHTML=galleryImgs.length?`<div style="margin:0 0 18px">
      <div style="font-size:11px;letter-spacing:2px;color:#c9961a;font-weight:800;margin-bottom:8px">A GLIMPSE OF YOUR DESTINATION</div>
      <div style="display:flex;gap:10px">${galleryImgs.map(g=>`<img src="${g}" style="flex:1;min-width:0;height:130px;object-fit:cover;border-radius:14px"/>`).join("")}</div>
    </div>`:"";
    const qrURL="https://api.qrserver.com/v1/create-qr-code/?size=96x96&data="+encodeURIComponent("https://wa.me/917009659048?text="+encodeURIComponent("Hi! I would like to confirm my "+(deal.destination||"trip")+" proposal (Ref: "+ref+")"));

    const sectorRow=(s)=>`
      <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px dashed #d8e2f3">
        <div style="min-width:52px;text-align:center">
          <div style="font-size:11px;font-weight:800;color:#c9961a;letter-spacing:1px">${esc(s.airlineCode)||"✈"}</div>
          <div style="font-size:9px;color:#7d8bab">${esc(s.airlineName)}</div>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:10px">
          <div><div style="font-size:17px;font-weight:800;color:#0d1b3e">${esc(s.from)}</div><div style="font-size:9px;color:#7d8bab">${esc(s.fromName)}</div><div style="font-size:11px;font-weight:700;color:#334e82">${esc(s.depTime)}</div></div>
          <div style="flex:1;text-align:center;color:#c9961a;font-size:11px">──────✈──────<div style="font-size:9px;color:#7d8bab">${fmtD(s.date)}</div></div>
          <div style="text-align:right"><div style="font-size:17px;font-weight:800;color:#0d1b3e">${esc(s.to)}</div><div style="font-size:9px;color:#7d8bab">${esc(s.toName)}</div><div style="font-size:11px;font-weight:700;color:#334e82">${esc(s.arrTime)}</div></div>
        </div>
      </div>`;

    const flightBlocks = showF ? flights.map(f=>`
      <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;overflow:hidden;margin-bottom:16px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
        <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;padding:10px 18px;font-size:12px;font-weight:700;letter-spacing:1px">✈️ FLIGHT · ${f.flightType==="round-trip"?"ROUND TRIP":f.flightType==="multi-city"?"MULTI-CITY":"ONE WAY"}</div>
        ${(f.sectors||[]).filter(s=>s.from||s.to).map(sectorRow).join("")}
        ${(f.flightType==="round-trip"?(f.returnSectors||[]):[]).filter(s=>s.from||s.to).map(s=>`<div style="background:#f8fafd;font-size:10px;color:#7d8bab;padding:4px 18px;font-weight:700;letter-spacing:1px">RETURN</div>`+sectorRow(s)).join("")}
      </div>`).join("") : "";

    const hotelBlocks = showH ? hotels.map(h=>`
      <div style="background:#fff;border:1px solid #e3eaf7;border-radius:16px;padding:20px 22px;margin-bottom:14px;box-shadow:0 3px 14px rgba(13,27,62,.06)">
        ${h.photoUrl?`<img src="${esc(h.photoUrl)}" style="width:100%;height:170px;object-fit:cover;border-radius:12px;margin-bottom:14px" onerror="this.style.display='none'"/>`:""}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:10px;letter-spacing:2px;color:#c9961a;font-weight:800">🏨 ${esc((h.city||"").toUpperCase())}${h.country?" · "+esc(h.country.toUpperCase()):""}</div>
            <div style="font-size:18px;font-weight:800;color:#0d1b3e;margin:4px 0 2px">${esc(h.hotelName)||"Hotel"}</div>
            <div style="font-size:12px;color:#5a6b8c">${esc(h.roomCategory)} · Breakfast included</div>
          </div>
          <div style="text-align:right">
            <div style="background:#f0f5fd;border-radius:10px;padding:8px 14px;font-size:11px;color:#334e82">
              <b>${h.nights||"?"} night${Number(h.nights)===1?"":"s"}</b><br>
              ${h.checkIn?"In: "+fmtD(h.checkIn):""}<br>${h.checkOut?"Out: "+fmtD(h.checkOut):""}
            </div>
          </div>
        </div>
      </div>`).join("") : "";

    const landBlocks = showH ? (deal.landVendors||[]).filter(l=>l.itinerary).map(l=>{
      const days=l.itinerary.split(/\n+/).filter(x=>x.trim());
      return days.map((d,i)=>`
        <div style="display:flex;gap:14px;margin-bottom:12px">
          <div style="min-width:54px;height:54px;background:linear-gradient(135deg,#c9961a,#f0c842);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0d1b3e;font-weight:800"><div style="font-size:9px">DAY</div><div style="font-size:19px">${i+1}</div></div>
          <div style="flex:1;background:#fff;border:1px solid #e3eaf7;border-radius:14px;padding:13px 16px;font-size:12.5px;line-height:1.65;color:#33415e"><span style="margin-right:7px">${dayIcon(d)}</span>${esc(d)}</div>
        </div>`).join("");
    }).join("") : "";

    const priceBlock = propShowPrice && sell>0 ? `
      <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:18px;padding:26px 28px;color:#fff;margin:8px 0 18px">
        <div style="font-size:10px;letter-spacing:2px;color:#f0c842;font-weight:800;margin-bottom:6px">TOTAL PACKAGE PRICE</div>
        <div style="font-size:34px;font-weight:800">₹${sell.toLocaleString("en-IN")}<span style="font-size:13px;font-weight:600;opacity:.8"> /- all inclusive</span></div>
        ${totalPax>1?`<div style="font-size:12px;opacity:.85;margin-top:4px">≈ ₹${Math.round(sell/totalPax).toLocaleString("en-IN")} per person · ${pax}</div>`:""}
        <div style="font-size:10px;opacity:.6;margin-top:10px">*Subject to availability at the time of booking. Prices may vary with currency fluctuation. Quote valid for 7 days.</div>
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
@media print{ body{background:#fff} .noprint{display:none} .pagebreak{page-break-before:always} }
</style></head><body>
<div class="page">
  <!-- COVER -->
  <div style="position:relative;height:96vh;min-height:640px;${cover?`background:url('${cover}') center/cover no-repeat;`:"background:linear-gradient(155deg,#0a1530,#13265c 55%,#1a3572);"}display:flex;flex-direction:column;justify-content:flex-end">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,21,48,.25),rgba(10,21,48,${cover?".78":".15"}) 75%)"></div>
    <div style="position:absolute;top:26px;left:28px;background:#fff;border-radius:12px;padding:8px 16px"><img src="https://voyage-ed.com/logo.png" style="height:42px;display:block" alt="Voyage-Ed Travels"/></div>
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
    <div style="position:relative;background:rgba(10,21,48,.85);padding:12px 40px;color:#fff;font-size:12px">${deal.clientName?`Get ready, <b style="color:#f0c842">${esc(deal.clientName.split(" ")[0])}</b> — an unforgettable journey awaits ✨ &nbsp;·&nbsp; `:""}Specially prepared for <b>${esc(deal.clientName)||"You"}</b> by <b style="color:#f0c842">VOYAGE-ED TRAVELS</b> · 📞 +91 70096 59048</div>
  </div>

  <!-- BODY -->
  <div class="pagebreak" style="padding:34px 36px">
    ${statsRibbon}
    ${priceBlock}
    ${highlightsHTML}
    ${glimpseHTML}
    ${showF?`<h2 style="font-size:22px;color:#0d1b3e;margin:6px 0 14px">✈️ Your Flights</h2>${flightBlocks}`:""}
    ${showH&&hotels.length?`<h2 style="font-size:22px;color:#0d1b3e;margin:20px 0 14px">🏨 Your Stays</h2>${hotelBlocks}`:""}
    ${landBlocks?`<h2 style="font-size:22px;color:#0d1b3e;margin:20px 0 14px">🗓️ Day-wise Journey</h2>${timelineHTML}${landBlocks}`:""}

    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:22px">
      <div style="flex:1;min-width:250px">
        <h2 style="font-size:16px;color:#15803d;margin:0 0 8px">✅ What's Included</h2>
        <div style="background:#fff;border:1px solid #d3ecd9;border-radius:14px;padding:14px 18px;font-size:12px;line-height:2;color:#33415e">
          ${showF?"✅ Flights as mentioned above<br>":""}${showH&&hotels.length?"✅ Hotel stays with breakfast<br>✅ All transfers & sightseeing as per itinerary<br>":""}✅ Dedicated trip manager on WhatsApp<br>✅ All taxes included — no hidden charges
        </div>
      </div>
      <div style="flex:1;min-width:250px">
        <h2 style="font-size:16px;color:#b4540a;margin:0 0 8px">ℹ️ Not Included</h2>
        <div style="background:#fff;border:1px solid #f3e3cf;border-radius:14px;padding:14px 18px;font-size:12px;line-height:2;color:#33415e">
          ✖ Meals other than specified<br>✖ Visa fees (unless mentioned)<br>✖ Travel insurance & personal expenses<br>✖ Anything not mentioned in inclusions
        </div>
      </div>
    </div>
    <div style="font-size:10px;color:#8a97b5;margin-top:14px;line-height:1.7">This itinerary is a preliminary proposal. All services & prices are subject to availability and currency fluctuation at the time of booking. A deposit constitutes acceptance of our Terms & Conditions.</div>

    ${payBlock}
    <div style="margin-top:22px;display:flex;justify-content:flex-end"><div style="text-align:right">
      <div style="font-family:'Playfair Display',serif;font-size:17px;color:#0d1b3e;font-style:italic">Warm regards,</div>
      <div style="font-size:12.5px;font-weight:800;color:#0d1b3e;margin-top:2px">Vishal Sharma & Sahitya Singh</div>
      <div style="font-size:10.5px;color:#7d8bab">Founders · Voyage-Ed Travels</div>
    </div></div>
    <div style="margin-top:26px;background:linear-gradient(135deg,#0d1b3e,#1a3060);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px;color:#fff;flex-wrap:wrap">
      <div style="background:#fff;border-radius:10px;padding:6px 12px"><img src="https://voyage-ed.com/logo.png" style="height:34px;display:block"/></div>
      <div style="flex:1;font-size:12px;line-height:1.8"><b style="color:#f0c842">Ready to make it happen?</b><br>📞 +91 70096 59048 · ✉️ enquiry@voyage-ed.com · 🌐 voyage-ed.com<br>GMADA Aerocity, Mohali · Learn · Travel · Explore</div>
      <div style="text-align:center"><img src="${qrURL}" style="height:76px;width:76px;border-radius:8px;background:#fff;padding:4px;display:block"/><div style="font-size:8.5px;opacity:.85;margin-top:4px">Scan to confirm<br>on WhatsApp</div></div>
    </div>
  </div>
</div>
<div class="noprint" style="position:fixed;bottom:18px;right:18px"><button onclick="window.print()" style="background:linear-gradient(135deg,#f0c842,#c9961a);border:none;color:#0d1b3e;font-weight:800;padding:13px 22px;border-radius:12px;cursor:pointer;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25)">🖨 Save as PDF</button></div>
</body></html>`;
  }
  function openProposal(){
    const w=window.open("","_blank");
    if(!w){window.veToast("Popup blocked — allow popups","error");return;}
    w.document.write(buildProposalHTML());
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
    m+="\n📄 Detailed PDF proposal attached separately.\n\n— Team Voyage-Ed 🌟\n📞 +91 70096 59048 · voyage-ed.com";
    window.open("https://wa.me/91"+ph+"?text="+encodeURIComponent(m),"_blank");
  }

  if(screen==="dashboard"){
    // Date-range filter (defaults to all-time if blank)
    const inRange=(d)=>{
      const ds=(d._savedAt||"").slice(0,10);
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
    const dealAll=(d)=>[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
    const pendingCollections=allDeals.filter(d=>{
      if((d.status||d.stage)!=="Booked") return false;
      const sell=dealAll(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
      const recv=sum(d.clientPayments||[],"amount");
      return sell-recv>1;
    }).map(d=>{
      const sell=dealAll(d).reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
      const recv=sum(d.clientPayments||[],"amount");
      return {...d,_due:sell-recv};
    }).sort((a,b)=>b._due-a._due);
    const totalToCollect=pendingCollections.reduce((s,d)=>s+d._due,0);
    // Vendor payments we owe on booked deals
    const vendorDues=allDeals.filter(d=>(d.status||d.stage)==="Booked").map(d=>{
      const cost=dealAll(d).reduce((s,v)=>s+toINR(v.costPrice,v.currency,v.exchangeRate),0);
      const paid=dealAll(d).reduce((s,v)=>s+sum(v.payments||[],"amount"),0);
      return {...d,_owe:cost-paid};
    }).filter(d=>d._owe>1).sort((a,b)=>b._owe-a._owe);
    const totalToPay=vendorDues.reduce((s,d)=>s+d._owe,0);
    // Pipeline funnel counts
    const funnel=PIPELINE_STAGES.map(st=>({stage:st,count:allDeals.filter(d=>(d.stage||"New Lead")===st).length}));
    // Conversion rate
    const totalLeads=allDeals.length;
    const bookedCount=allDeals.filter(d=>(d.stage==="Booked"||d.status==="Booked")).length;
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
      const sell=deals.reduce((s,d)=>s+dealSell(d),0);
      const cost=deals.reduce((s,d)=>s+dealCost(d),0);
      const gpm=sell-cost;
      const gst=deals.reduce((s,d)=>s+dealGst(d),0);  // per-deal GST, not flat 18%
      const net=gpm-gst;
      const vendorPaid=deals.reduce((s,d)=>s+dealVendors(d).reduce((ss,v)=>ss+sum(v.payments||[],"amount"),0),0);
      const vendorDue=cost-vendorPaid;
      const clientRec=deals.reduce((s,d)=>s+sum(d.clientPayments||[],"amount"),0);
      const clientDue=sell-clientRec;
      return {count:deals.length,sell,cost,gpm,gst,net,vendorPaid,vendorDue,clientRec,clientDue};
    };

    // Split by status — Booked and Cancelled tracked SEPARATELY
    const bookedDeals=rangedDeals.filter(d=>(d.status||"")==="Booked");
    const cancelledDeals=rangedDeals.filter(d=>(d.status||"")==="Cancelled");
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
            {isAdmin&&<button onClick={()=>{setScreen("users");loadUsers();}} className="btn btn-sm">👥 Users</button>}
            <button onClick={handleLogout} className="btn btn-sm" style={{borderColor:"#dc2626",color:"#b91c1c"}}>Logout</button>
          </div>
        </div>

        <div style={{maxWidth:1120,margin:"0 auto",padding:"28px 32px"}}>
          {/* Date range filter */}
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",marginBottom:22,background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:12,padding:"14px 18px"}}>
            <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>From</div>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:6,color:"#1a2c52",padding:"7px 10px"}}/></div>
            <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>To</div>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:6,color:"#1a2c52",padding:"7px 10px"}}/></div>
            {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} className="btn btn-sm">Clear</button>}
            <div style={{flex:1}}></div>
            <div style={{fontSize:11,color:"#6b7a99"}}>Showing: <b style={{color:"#c9961a"}}>{rangeLabel}</b></div>
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
              {l:"Net (after GST)",v:fmtINR(B.net),c:B.net>=0?"#f97316":"#ef4444"},
              {l:"Vendor Paid",v:fmtINR(B.vendorPaid),c:"#4169E1"},
              {l:"Vendor Pending",v:fmtINR(B.vendorDue),c:B.vendorDue>0?"#ef4444":"#10b981"},
              {l:"Client Received",v:fmtINR(B.clientRec),c:"#10b981"},
              {l:"Client Pending",v:fmtINR(B.clientDue),c:B.clientDue>0?"#f59e0b":"#10b981"},
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

          <div style={{fontSize:12,color:"#6b7a99",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>All Deals ({allDeals.length})</div>
          {allDeals.length===0&&<div style={{textAlign:"center",padding:40,color:"#a9bce0",background:"#ffffff",borderRadius:12,border:"1px dashed #d4e0f5"}}>No deals saved yet. Create a new deal and save it.</div>}
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
            <input value={dealSearch} onChange={e=>setDealSearch(e.target.value)} placeholder="🔍 Search client, destination, deal no..."
              style={{flex:"1 1 260px",background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:8,color:"#1a2c52",padding:"10px 14px",fontSize:13,outline:"none"}}/>
            <span style={{fontSize:11,color:"#6b7a99"}}>{(()=>{const q=dealSearch.toLowerCase().trim();return q?allDeals.filter(d=>(`${d.clientName} ${d.destination} ${d.dealNumber} ${d.contactNo}`).toLowerCase().includes(q)).length:allDeals.length;})()} deals</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {allDeals.filter(d=>{
              const q=dealSearch.toLowerCase().trim();
              if(!q) return true;
              return (`${d.clientName||""} ${d.destination||""} ${d.dealNumber||""} ${d.contactNo||""}`).toLowerCase().includes(q);
            }).map(d=>{
              const all=[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
              const dSell=all.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
              const dCost=all.reduce((s,v)=>s+toINR(v.costPrice,v.currency,v.exchangeRate),0);
              const dGpm=dSell-dCost;
              const dRec=sum(d.clientPayments||[],"amount");
              return (
                <div key={d._id} onClick={()=>openDeal(d)} style={{background:"#ffffff",border:"1px solid #d4e0f5",borderRadius:10,padding:"14px 20px",cursor:"pointer",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:12,alignItems:"center",transition:"border .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#f97316"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#d4e0f5"}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{d.clientName||"Unnamed Client"}</div>
                    <div style={{fontSize:12,color:"#6b7a99"}}>{d.destination||"No destination"} · {d.travelDates||"No dates"}</div>
                  </div>
                  <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>SELLING</div><div style={{fontFamily:"monospace",fontWeight:700}}>{fmtINR(dSell)}</div></div>
                  <div><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1}}>GPM</div><div style={{fontFamily:"monospace",fontWeight:700,color:dGpm>=0?"#10b981":"#ef4444"}}>{fmtINR(dGpm)}</div></div>
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

      {proposalOpen&&(
        <div onClick={()=>setProposalOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,21,48,.55)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:"26px 26px 22px",width:"100%",maxWidth:460,boxShadow:"0 30px 80px rgba(0,0,0,.35)"}}>
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

            <div style={{display:"flex",gap:10}}>
              <button onClick={openProposal} style={{flex:1,background:"linear-gradient(135deg,#0d1b3e,#1a3060)",color:"#fff",border:"none",borderRadius:11,padding:"13px",cursor:"pointer",fontSize:13,fontWeight:800}}>🖨 Preview / PDF</button>
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
              {saveStatus&&<span style={{fontSize:11,color:"#10b981",fontWeight:600}}>✓ {saveStatus}</span>}
              <button onClick={()=>setProposalOpen(true)} style={{background:"linear-gradient(135deg,#f0c842,#c9961a)",border:"none",borderRadius:8,color:"#0d1b3e",padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:800}}>📄 Proposal</button>
              <select value={deal.status||"Not Actioned"} onChange={e=>upd("status",e.target.value)}
                title="Deal status (used in dashboard Booked/Cancelled totals)"
                style={{background:(deal.status==="Booked"?"#e6f7ee":deal.status==="Cancelled"?"#fdeaea":"#eef3fc"),
                  border:"1px solid "+(deal.status==="Booked"?"#16a34a":deal.status==="Cancelled"?"#dc2626":"#c2d2ee"),
                  color:(deal.status==="Booked"?"#15803d":deal.status==="Cancelled"?"#b91c1c":"#1a2c52"),
                  borderRadius:7,padding:"7px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={newDeal} className="btn btn-sm">+ New</button>
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
            <div className="card" style={{borderColor:"#4169E1"}}>
              <div className="sec-head" style={{color:"#4169E1"}}>🎯 Lead Tracking</div>
              <div className="grid3" style={{marginBottom:6}}>
                <div><span className="lbl">Pipeline Stage</span>
                  <select value={deal.stage||"New Lead"} onChange={e=>upd("stage",e.target.value)}>
                    {PIPELINE_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
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
                <div><span className="lbl">Booking Status</span>
                  <select value={deal.status||"Not Actioned"} onChange={e=>upd("status",e.target.value)}>
                    {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
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
                      <input className="mono" type="number" value={fv.costPrice} onChange={e=>updF(fv.id,"costPrice",e.target.value)} placeholder="0" />
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
                      <button onClick={()=>setExpandedVendor(isExp?null:fv.id)} className="btn btn-sm" style={{fontSize:15,padding:"4px 10px"}}>{isExp?"▲":"▼"}</button>
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
                      <input className="mono" type="number" value={hv.costPrice} onChange={e=>updH(hv.id,"costPrice",e.target.value)} placeholder="0" />
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
                      <button onClick={()=>setExpandedVendor(isExp?null:hv.id)} className="btn btn-sm" style={{fontSize:15,padding:"4px 10px"}}>{isExp?"▲":"▼"}</button>
                      <button onClick={()=>rmHV(hv.id)} className="btn btn-danger">✕</button>
                    </div>
                  </div>

                  {/* Row 2: Hotel details */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.5fr 1.5fr 1fr 1fr 0.6fr",gap:10}}>
                    <div><span className="lbl">Country</span><input value={hv.country} onChange={e=>updH(hv.id,"country",e.target.value)} placeholder="UAE" /></div>
                    <div><span className="lbl">City</span><input value={hv.city} onChange={e=>updH(hv.id,"city",e.target.value)} placeholder="Dubai" /></div>
                    <div><span className="lbl">Hotel Name</span><input value={hv.hotelName} onChange={e=>updH(hv.id,"hotelName",e.target.value)} placeholder="Atlantis The Palm" /></div>
                    <div><span className="lbl">Hotel Photo URL <span style={{opacity:.6}}>(optional — proposal me dikhegi)</span></span><input value={hv.photoUrl||""} onChange={e=>updH(hv.id,"photoUrl",e.target.value)} placeholder="Google se image link paste karo" /></div>
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
                      <input className="mono" type="number" value={lv.costPrice} onChange={e=>updL(lv.id,"costPrice",e.target.value)} placeholder="0" />
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
                      <button onClick={()=>setExpandedVendor(isExp?null:lv.id)} className="btn btn-sm" style={{fontSize:15,padding:"4px 10px"}}>{isExp?"▲":"▼"}</button>
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
                    <div style={{flex:"0 0 120px"}}><span className="lbl">Cost {needsRate?`(${vv.currency})`:""}</span><input className="mono" type="number" value={vv.costPrice} onChange={e=>updVisa(vv.id,"costPrice",e.target.value)} placeholder="0" /></div>
                    <div style={{flex:"0 0 120px"}}><span className="lbl">Selling {needsRate?`(${vv.currency})`:""}</span><input className="mono" type="number" value={vv.sellingPrice} onChange={e=>updVisa(vv.id,"sellingPrice",e.target.value)} placeholder="0" /></div>
                    <div style={{flex:"0 0 150px"}}><span className="lbl">Visa Status</span><select value={vv.visaStatus||"Not Applied"} onChange={e=>updVisa(vv.id,"visaStatus",e.target.value)} style={{borderColor:VISA_STATUS_COLORS[vv.visaStatus||"Not Applied"]+"66"}}>{VISA_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                    <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:VISA_STATUS_COLORS[vv.visaStatus||"Not Applied"]+"22",color:VISA_STATUS_COLORS[vv.visaStatus||"Not Applied"]}}>{vv.visaStatus||"Not Applied"}</span>
                      <button onClick={()=>setExpandedVendor(isExp?null:vv.id)} className="btn btn-sm" style={{fontSize:15,padding:"4px 10px"}}>{isExp?"▲":"▼"}</button>
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
        {tab==="payments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontSize:18,fontWeight:800}}>💰 Client Payments</h2>
              <button className="btn btn-ind" onClick={addCPmt}>+ Add Payment</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[{l:"Total to Receive",v:fmtINR(totalSell),c:"#1a2c52"},{l:"Received",v:fmtINR(totalClientReceived),c:"#10b981"},{l:"Balance Pending",v:fmtINR(balanceFromClient),c:balanceFromClient>0?"#f97316":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#6b7a99",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
              ))}
            </div>
            <div className="card">
              <div className="sec-head">Payment Entries — {deal.clientName||"Client"}</div>
              {deal.clientPayments.length===0&&<div style={{textAlign:"center",padding:30,color:"#a9bce0"}}>No payments recorded yet.</div>}
              {deal.clientPayments.map((pmt,i)=>(
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
              {deal.clientPayments.length>0&&(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#ffffff",borderRadius:8,padding:"12px 16px",marginTop:10}}>
                  <span style={{fontWeight:700}}>Total Received</span>
                  <span className="mono" style={{fontSize:18,fontWeight:800,color:"#10b981"}}>{fmtINR(totalClientReceived)}</span>
                </div>
              )}
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
                {[["Total to Receive",fmtINR(totalSell),"#1a2c52"],["Total Received",fmtINR(totalClientReceived),"#10b981"],["Balance Pending",fmtINR(balanceFromClient),balanceFromClient>0?"#f97316":"#10b981"]].map(([l,v,c])=>(
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