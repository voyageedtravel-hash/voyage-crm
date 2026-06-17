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
  country:"", city:"", hotelName:"", roomCategory:"Deluxe Room",
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
  const updFrom = (code) => {
    const upper = code.toUpperCase();
    onChange({...sector, from:upper, fromName:AIRPORT_MAP[upper]||sector.fromName});
  };
  const updTo = (code) => {
    const upper = code.toUpperCase();
    onChange({...sector, to:upper, toName:AIRPORT_MAP[upper]||sector.toName});
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
  const upd=(key,val)=>setDeal(d=>({...d,[key]:val}));

  const updH=(id,key,val)=>
    setDeal(d=>({...d,hotelVendors:d.hotelVendors.map(v=>{
      if(v.id!==id) return v;
      const updated={...v,[key]:val};
      if(key==="checkIn"||key==="checkOut") updated.nights=nightsBetween(updated.checkIn,updated.checkOut);
      return updated;
    })}));
  const addHV=()=>setDeal(d=>({...d,hotelVendors:[...d.hotelVendors,emptyHotelVendor()]}));
  const rmHV=(id)=>setDeal(d=>({...d,hotelVendors:d.hotelVendors.filter(v=>v.id!==id)}));

  const updF=(id,key,val)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>v.id===id?{...v,[key]:val}:v)}));
  const updSector=(vid,idx,sec,sectorData)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>{
    if(v.id!==vid) return v;
    const arr=[...v[sec]]; arr[idx]=sectorData; return {...v,[sec]:arr};
  })}));
  const addSector=(vid,sec)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>v.id===vid?{...v,[sec]:[...v[sec],emptySector()]}:v)}));
  const rmSector=(vid,idx,sec)=>setDeal(d=>({...d,flightVendors:d.flightVendors.map(v=>v.id===vid?{...v,[sec]:v[sec].filter((_,i)=>i!==idx)}:v)}));
  const addFV=()=>setDeal(d=>({...d,flightVendors:[...d.flightVendors,emptyFlightVendor()]}));
  const rmFV=(id)=>setDeal(d=>({...d,flightVendors:d.flightVendors.filter(v=>v.id!==id)}));

  const updL=(id,key,val)=>setDeal(d=>({...d,landVendors:d.landVendors.map(v=>v.id===id?{...v,[key]:val}:v)}));
  const addLV=()=>setDeal(d=>({...d,landVendors:[...d.landVendors,emptyLandVendor()]}));
  const rmLV=(id)=>setDeal(d=>({...d,landVendors:d.landVendors.filter(v=>v.id!==id)}));

  const updVisa=(id,key,val)=>setDeal(d=>({...d,visaVendors:d.visaVendors.map(v=>v.id===id?{...v,[key]:val}:v)}));
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
  const gst = deal.gstMode === "package"
    ? totalSell * GST_RATE_PACKAGE
    : (gpm > 0 ? gpm * GST_RATE_PROFIT : 0);
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
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {l:"Selling",v:fmtINR(totalSell),c:"#1a2c52"},
                {l:"GPM",v:fmtINR(gpm),c:gpm>=0?"#10b981":"#ef4444"},
                {l:`GST (${deal.gstMode==="package"?"5% pkg":"18% profit"})`,v:fmtINR(gst),c:"#4169E1"},
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
                <span>✨ AI Itinerary Generator</span>
                <button onClick={generateAIItinerary} disabled={aiBusy} className="btn btn-ind">
                  {aiBusy?"Generating...":"✨ Generate Itinerary"}</button>
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
                <div className="mono" style={{fontSize:24,fontWeight:800,color:"#4169E1"}}>{fmtINR(gst)}</div>
                <div style={{fontSize:12,color:"#4169E1",marginTop:4}}>
                  {deal.gstMode==="package"
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