import React, { useState, useEffect, useRef } from "react";
import Login from "./Login";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CURRENCIES = ["INR","USD","EUR","GBP","SGD","THB","MYR"];
const CURRENCY_SYMBOLS = {INR:"₹",USD:"$",EUR:"€",GBP:"£",SGD:"S$",THB:"฿",MYR:"RM"};
const CLIENT_MODES = ["UPI","Cash deposited by client in bank","Cash collected by Vishal","Cash collected by Sahitya","Bank Transfer","Cheque","Other"];
const VENDOR_MODES = ["UPI","Bank Transfer","Cash collected by vendor","Cash deposited by us in vendor account","Cheque","Other"];
const VISA_STATUSES = ["Not Applied","Not Required","In Progress","Approved","Rejected"];
const VISA_STATUS_COLORS = {"Not Applied":"#64748b","Not Required":"#94a3b8","In Progress":"#f59e0b","Approved":"#10b981","Rejected":"#ef4444"};
const QUERY_MODES = ["Call","Website","Sahitya Reference","Vishal Reference","Other Reference"];
const GST_RATE = 0.18;

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
const fmtFC = (val,curr) => (CURRENCY_SYMBOLS[curr]||curr)+n(val).toLocaleString("en-IN",{maximumFractionDigits:2});
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
const saveAllDeals = (deals) => { try { localStorage.setItem(DEALS_KEY,JSON.stringify(deals)); } catch(e){} };

// ─── API LAYER ────────────────────────────────────────────────────────────────
const API_BASE = "https://voyage-crm.onrender.com";

const leadsAPI = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/api/leads`);
    if (!res.ok) throw new Error(`Failed to fetch leads: ${res.status}`);
    return res.json();
  },
  create: async (dealData) => {
    const res = await fetch(`${API_BASE}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dealData),
    });
    if (!res.ok) throw new Error(`Failed to save lead: ${res.status}`);
    return res.json();
  },
};

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
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a1f2e",border:"1px solid #334155",borderRadius:6,zIndex:50,maxHeight:160,overflowY:"auto"}}>
          {list.map(v=>(
            <div key={v} onMouseDown={()=>onChange(v)} style={{padding:"7px 10px",cursor:"pointer",fontSize:13,color:"#e2e8f0"}}
              onMouseEnter={e=>e.currentTarget.style.background="#2d3748"}
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
  const receiptRef=useRef();
  const handlePrint=()=>{
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>Receipt</title><style>
      body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1410;max-width:600px;margin:0 auto}
      .logo{font-size:28px;font-weight:900;color:#f97316;letter-spacing:-1px}
      .sub{font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
      .label{color:#64748b;width:50%} .val{font-weight:600;text-align:right}
      .total{font-size:20px;font-weight:800;color:#f97316}
      .footer{margin-top:32px;text-align:center;font-size:11px;color:#94a3b8}
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
      <div style={{background:"#151b27",border:"1px solid #1e293b",borderRadius:16,padding:32,width:480,maxWidth:"95vw"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:"#f97316",letterSpacing:-1}}>✈ Voyage-Ed</div>
            <div style={{fontSize:10,color:"#64748b",letterSpacing:2,textTransform:"uppercase"}}>Payment Receipt</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{borderTop:"2px solid #f97316",paddingTop:16}}>
          {[
            ["Client",deal.clientName||"—"],["Contact",deal.contactNo||"—"],
            ["Package",deal.destination||"—"],["Travel Dates",deal.travelDates||"—"],
            ["Date",payment.date],["Mode",payment.mode],
            ...(payment.note?[["Reference",payment.note]]:[]),
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e293b",fontSize:13}}>
              <span style={{color:"#64748b"}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
          <div style={{background:"#1a0e00",border:"2px solid #f97316",borderRadius:8,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
            <span style={{fontWeight:700,fontSize:15}}>Amount Received</span>
            <span style={{fontFamily:"monospace",fontSize:22,fontWeight:800,color:"#f97316"}}>{fmtINR(payment.amount)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={handlePrint} style={{flex:1,background:"linear-gradient(135deg,#f97316,#f59e0b)",color:"#fff",border:"none",borderRadius:8,padding:"10px",fontWeight:700,cursor:"pointer",fontSize:14}}>🖨 Print / Save PDF</button>
          <button onClick={onClose} style={{padding:"10px 20px",background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,cursor:"pointer",fontWeight:600}}>Close</button>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:"#475569",marginTop:12}}>Computer generated receipt — no signature required</div>
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
    <div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:8,padding:12,marginBottom:8}}>
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
          {sector.fromName&&<div style={{fontSize:10,color:"#6366f1",marginTop:2}}>{sector.fromName}</div>}
        </div>
        <div>
          <span className="lbl">To (IATA)</span>
          <input value={sector.to} onChange={e=>updTo(e.target.value)} placeholder="DXB" style={{textTransform:"uppercase"}} />
          {sector.toName&&<div style={{fontSize:10,color:"#6366f1",marginTop:2}}>{sector.toName}</div>}
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
  
  // Auto-save to localStorage
  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  useEffect(()=>{
    const t=setTimeout(()=>{ saveDeal(deal); setSaveStatus("Saved"); setTimeout(()=>setSaveStatus(""),1500); },600);
    return ()=>clearTimeout(t);
  },[deal]);

  // Fetch all leads from backend on mount
  useEffect(()=>{
    leadsAPI.getAll()
      .then(data => { setAllDeals(data); saveAllDeals(data); })
      .catch(err => console.warn("Could not fetch leads from server:", err.message));
  },[]);
  const upd=(key,val)=>setDeal(d=>({...d,[key]:val}));

  const updH=(id,key,val)=>
    setDeal(d=>({...d,hotelVendors:d.hotelVendors.map(v=>{
      if(v.id!==id) return v;
      const updated={...v,[key]:val};
      if(key==="checkIn"||key==="checkOut") updated.nights=nightsBetween(updated.checkIn,updated.checkOut);
      return updated;
    })}));
  };
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
    if (!deal.clientName) return alert("Please enter client name first.");
    setApiLoading(true);
    try {
      const toSave = { ...deal, _savedAt: new Date().toISOString() };
      const saved = await leadsAPI.create(toSave);
      const finalDeal = saved || toSave;
      const all = loadAllDeals();
      const existIdx = all.findIndex(d => d._id === finalDeal._id);
      if (existIdx >= 0) all[existIdx] = finalDeal; else all.unshift(finalDeal);
      saveAllDeals(all); setAllDeals(all);
      setDeal(finalDeal); saveDeal(finalDeal);
      alert("Deal saved!");
    } catch(e) {
      console.error("Save error:", e);
      // fallback to localStorage only
      const all = loadAllDeals();
      const toSave = { ...deal, _id: deal._id || uid(), _savedAt: new Date().toISOString() };
      const existIdx = all.findIndex(d => d._id === toSave._id);
      if (existIdx >= 0) all[existIdx] = toSave; else all.unshift(toSave);
      saveAllDeals(all); setAllDeals(all);
      setDeal(toSave); saveDeal(toSave);
    } finally {
      setApiLoading(false);
    }
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
  const gst=gpm>0?gpm*GST_RATE:0;
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




// ── DASHBOARD SCREEN ──────────────────────────────────────────────────────
  if(screen==="dashboard"){
    const thisMonth=new Date().toISOString().slice(0,7);
    const monthDeals=allDeals.filter(d=>(d._savedAt||"").startsWith(thisMonth));
    const mSell=monthDeals.reduce((s,d)=>{
      const all=[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
      return s+all.reduce((ss,v)=>ss+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
    },0);
    const mCost=monthDeals.reduce((s,d)=>{
      const all=[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
      return s+all.reduce((ss,v)=>ss+toINR(v.costPrice,v.currency,v.exchangeRate),0);
    },0);
    const mGpm=mSell-mCost;
    const mGst=mGpm>0?mGpm*GST_RATE:0;
    const mNet=mGpm-mGst;
    const mVendorPaid=monthDeals.reduce((s,d)=>{
      const all=[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
      return s+all.reduce((ss,v)=>ss+sum(v.payments||[],"amount"),0);
    },0);
    const mVendorDue=mCost-mVendorPaid;
    const mClientReceived=monthDeals.reduce((s,d)=>s+sum(d.clientPayments||[],"amount"),0);
    const mClientDue=mSell-mClientReceived;
    const mo=new Date().toLocaleString("en-IN",{month:"long",year:"numeric"});

    return (
      <div style={{minHeight:"100vh",background:"#0a0d13",color:"#e2e8f0",fontFamily:"'Syne','Segoe UI',sans-serif"}}>
        <style>{dashStyles}</style>
        <div style={{background:"linear-gradient(135deg,#0d1117,#151b27)",borderBottom:"1px solid #1e293b",padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:3,color:"#f97316",fontWeight:700,marginBottom:4}}>VOYAGE-ED CRM · DASHBOARD</div>
            <div style={{fontSize:22,fontWeight:800,color:"#f8fafc"}}>Good morning ☀️</div>
            <div style={{fontSize:13,color:"#64748b",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{newDeal();setScreen("deal");}} className="btn btn-ind">+ New Deal</button>
            <button onClick={()=>setScreen("deal")} className="btn btn-sm">Continue Current Draft →</button>
          </div>
        </div>

        <div style={{maxWidth:1120,margin:"0 auto",padding:"28px 32px"}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>{mo} Summary</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:32}}>
            {[
              {l:"Total Sales",v:fmtINR(mSell),c:"#e2e8f0",sub:`${monthDeals.length} deals`},
              {l:"Gross Profit (GPM)",v:fmtINR(mGpm),c:mGpm>=0?"#10b981":"#ef4444",sub:`${mSell>0?((mGpm/mSell)*100).toFixed(1):"0"}% margin`},
              {l:"GST (18%)",v:fmtINR(mGst),c:"#a5b4fc",sub:"On GPM"},
              {l:"Net Profit",v:fmtINR(mNet),c:mNet>=0?"#f97316":"#ef4444",sub:"After GST"},
              {l:"Vendor Paid",v:fmtINR(mVendorPaid),c:"#a5b4fc",sub:"This month"},
              {l:"Vendor Due",v:fmtINR(mVendorDue),c:mVendorDue>0?"#ef4444":"#10b981",sub:"Pending"},
              {l:"Client Received",v:fmtINR(mClientReceived),c:"#10b981",sub:"This month"},
              {l:"Client Pending",v:fmtINR(mClientDue),c:mClientDue>0?"#f59e0b":"#10b981",sub:"Balance"},
            ].map((s,i)=>(
              <div key={i} style={{background:"#151b27",border:"1px solid #1e293b",borderRadius:12,padding:"18px 20px"}}>
                <div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
                <div style={{fontFamily:"monospace",fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:"#475569",marginTop:4}}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:12,color:"#64748b",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>All Deals ({allDeals.length})</div>
          {allDeals.length===0&&<div style={{textAlign:"center",padding:40,color:"#475569",background:"#151b27",borderRadius:12,border:"1px dashed #1e293b"}}>No deals saved yet. Create a new deal and save it.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {allDeals.map(d=>{
              const all=[...d.hotelVendors||[],...d.flightVendors||[],...d.landVendors||[],...d.visaVendors||[]];
              const dSell=all.reduce((s,v)=>s+toINR(v.sellingPrice,v.currency,v.exchangeRate),0);
              const dCost=all.reduce((s,v)=>s+toINR(v.costPrice,v.currency,v.exchangeRate),0);
              const dGpm=dSell-dCost;
              const dRec=sum(d.clientPayments||[],"amount");
              return (
                <div key={d._id} onClick={()=>openDeal(d)} style={{background:"#151b27",border:"1px solid #1e293b",borderRadius:10,padding:"14px 20px",cursor:"pointer",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:12,alignItems:"center",transition:"border .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#f97316"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#1e293b"}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{d.clientName||"Unnamed Client"}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>{d.destination||"No destination"} · {d.travelDates||"No dates"}</div>
                  </div>
                  <div><div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>SELLING</div><div style={{fontFamily:"monospace",fontWeight:700}}>{fmtINR(dSell)}</div></div>
                  <div><div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>GPM</div><div style={{fontFamily:"monospace",fontWeight:700,color:dGpm>=0?"#10b981":"#ef4444"}}>{fmtINR(dGpm)}</div></div>
                  <div><div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>RECEIVED</div><div style={{fontFamily:"monospace",fontWeight:700,color:"#10b981"}}>{fmtINR(dRec)}</div></div>
                  <div><div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>BALANCE</div><div style={{fontFamily:"monospace",fontWeight:700,color:(dSell-dRec)>0?"#f97316":"#10b981"}}>{fmtINR(dSell-dRec)}</div></div>
                    <div style={{textAlign:"right",fontSize:11,color:"#475569"}}>{d._savedAt?new Date(d._savedAt).toLocaleDateString("en-IN"):""}</div>
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
    <div style={{minHeight:"100vh",background:"#0f1117",color:"#e2e8f0",fontFamily:"'Syne','Segoe UI',sans-serif"}}>
      <style>{dealStyles}</style>

      {receiptPayment&&<Receipt deal={deal} payment={receiptPayment} onClose={()=>setReceiptPayment(null)} />}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0d1117,#151b27)",borderBottom:"1px solid #1e293b",padding:"16px 28px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <button onClick={()=>setScreen("dashboard")} style={{background:"none",border:"1px solid #334155",borderRadius:6,color:"#94a3b8",padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>← Dashboard</button>
            <div style={{flex:1}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#f97316",fontWeight:700,marginBottom:3}}>VOYAGE-ED CRM · DEAL P&L</div>
              <input value={deal.destination||""} onChange={e=>upd("destination",e.target.value)} placeholder="Destination / Package Name..." style={{background:"transparent",border:"none",borderBottom:"1px solid #334155",borderRadius:0,color:"#f8fafc",fontSize:18,fontWeight:800,padding:"2px 0",width:300,outline:"none"}} />
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {saveStatus&&<span style={{fontSize:11,color:"#10b981",fontWeight:600}}>✓ {saveStatus}</span>}
              <button onClick={newDeal} className="btn btn-sm">+ New</button>
              <button onClick={saveToAllDeals} className="btn btn-ind" disabled={apiLoading}>{apiLoading?"Saving...":"💾 Save Deal"}</button>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {l:"Selling",v:fmtINR(totalSell),c:"#e2e8f0"},
                {l:"GPM",v:fmtINR(gpm),c:gpm>=0?"#10b981":"#ef4444"},
                {l:"GST",v:fmtINR(gst),c:"#a5b4fc"},
                {l:"Net Profit",v:fmtINR(netProfit),c:netProfit>=0?"#f97316":"#ef4444"},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"6px 12px",background:"#0d1117",border:"1px solid #1e293b",borderRadius:7}}>
                  <div style={{fontSize:9,color:"#475569",letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>{s.l}</div>
                  <div style={{fontFamily:"monospace",fontSize:14,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks bar */}
      <div style={{background:"#0d1117",borderBottom:"1px solid #1e293b",padding:"8px 28px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#f97316",fontWeight:700,whiteSpace:"nowrap"}}>📝 Remarks:</span>
          <input value={deal.remarks||""} onChange={e=>upd("remarks",e.target.value)} placeholder="Add remarks / special notes about this query..." style={{background:"transparent",border:"none",borderBottom:"1px dashed #334155",borderRadius:0,color:"#94a3b8",fontSize:12,flex:1,outline:"none",padding:"3px 0"}} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:"#0d1117",borderBottom:"1px solid #1e293b",padding:"0 28px",overflowX:"auto"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex"}}>
          {tabs.map(t=><button key={t.id} className={`tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 28px"}}>

        {/* ══ CLIENT TAB ══ */}
        {tab==="client"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
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
              {deal.flightVendors.length<3&&<button className="btn btn-ind" onClick={addFV}>+ Add Flight Vendor</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{l:"Total Cost",v:fmtINR(flight.cost),c:"#94a3b8"},{l:"Total Selling",v:fmtINR(flight.sell),c:"#e2e8f0"},{l:"Profit",v:fmtINR(flight.sell-flight.cost),c:(flight.sell-flight.cost)>=0?"#10b981":"#ef4444"},{l:"Balance to Pay",v:fmtINR(flight.cost-flight.paid),c:(flight.cost-flight.paid)>0?"#ef4444":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>

            {deal.flightVendors.map((fv,fi)=>{
              const {costINR,sellINR,paidINR}=vendorINR(fv);
              const isExp=expandedVendor===fv.id;
              return (
                <div key={fv.id} className="vrow" style={{border:isExp?"1px solid #6366f144":"1px solid #1e293b"}}>
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
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#0d1117",border:"1px solid #1e293b",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>PROFIT</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(sellINR-costINR)>=0?"#10b981":"#ef4444"}}>{fmtINR(sellINR-costINR)}</div>
                      </div>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#0d1117",border:"1px solid #1e293b",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>BALANCE</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(costINR-paidINR)>0?"#ef4444":"#10b981"}}>{fmtINR(costINR-paidINR)}</div>
                      </div>
                      <button onClick={()=>setExpandedVendor(isExp?null:fv.id)} className="btn btn-sm" style={{fontSize:15,padding:"4px 10px"}}>{isExp?"▲":"▼"}</button>
                      <button onClick={()=>rmFV(fv.id)} className="btn btn-danger">✕</button>
                    </div>
                  </div>

                  {/* Flight type selector */}
                  <div style={{display:"flex",gap:8,marginBottom:14}}>
                    {["one-way","return","multi-city"].map(ft=>(
                      <button key={ft} onClick={()=>updF(fv.id,"flightType",ft)} style={{padding:"6px 14px",border:"1px solid",borderRadius:20,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit",borderColor:fv.flightType===ft?"#f97316":"#334155",color:fv.flightType===ft?"#f97316":"#64748b",background:fv.flightType===ft?"#f9731610":"transparent",transition:"all .2s"}}>
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
                      <div style={{borderTop:"1px dashed #334155",margin:"14px 0"}} />
                      <div style={{fontSize:10,color:"#a5b4fc",fontWeight:700,letterSpacing:1.5,marginBottom:8}}>RETURN</div>
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
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #1e293b"}}>
                      <div style={{fontSize:11,color:"#6366f1",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>
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
              {deal.hotelVendors.length<8&&<button className="btn btn-ind" onClick={addHV}>+ Add Hotel</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[{l:"Total Cost",v:fmtINR(hotel.cost),c:"#94a3b8"},{l:"Total Selling",v:fmtINR(hotel.sell),c:"#e2e8f0"},{l:"Profit",v:fmtINR(hotel.sell-hotel.cost),c:(hotel.sell-hotel.cost)>=0?"#10b981":"#ef4444"},{l:"Paid",v:fmtINR(hotel.paid),c:"#a5b4fc"},{l:"Balance",v:fmtINR(hotel.cost-hotel.paid),c:(hotel.cost-hotel.paid)>0?"#ef4444":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>

            {deal.hotelVendors.map((hv,hi)=>{
              const {costINR,sellINR,paidINR}=vendorINR(hv);
              const isExp=expandedVendor===hv.id;
              const needsRate=hv.currency!=="INR";
              return (
                <div key={hv.id} className="vrow" style={{border:isExp?"1px solid #6366f144":"1px solid #1e293b"}}>
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
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#0d1117",border:"1px solid #1e293b",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>PROFIT</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:(sellINR-costINR)>=0?"#10b981":"#ef4444"}}>{fmtINR(sellINR-costINR)}</div>
                      </div>
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#0d1117",border:"1px solid #1e293b",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>BALANCE</div>
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
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #1e293b"}}>
                      <div style={{fontSize:11,color:"#6366f1",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>
                        Payments to {hv.hotelName||hv.name||"Hotel"} · <span className="mono">Paid: {fmtINR(paidINR)}</span> · <span className="mono" style={{color:(costINR-paidINR)>0?"#ef4444":"#10b981"}}>Bal: {fmtINR(costINR-paidINR)}</span>
                      </div>
                      <div style={{fontSize:11,color:"#64748b",marginBottom:8}}>⚠ All vendor payments entered in INR</div>
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
              {deal.landVendors.length<3&&<button className="btn btn-ind" onClick={addLV}>+ Add Land Vendor</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[{l:"Total Cost",v:fmtINR(land.cost),c:"#94a3b8"},{l:"Total Selling",v:fmtINR(land.sell),c:"#e2e8f0"},{l:"Profit",v:fmtINR(land.sell-land.cost),c:(land.sell-land.cost)>=0?"#10b981":"#ef4444"},{l:"Paid",v:fmtINR(land.paid),c:"#a5b4fc"},{l:"Balance",v:fmtINR(land.cost-land.paid),c:(land.cost-land.paid)>0?"#ef4444":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>

            {deal.landVendors.map((lv,li)=>{
              const {costINR,sellINR,paidINR}=vendorINR(lv);
              const isExp=expandedVendor===lv.id;
              const needsRate=lv.currency!=="INR";
              return (
                <div key={lv.id} className="vrow" style={{border:isExp?"1px solid #6366f144":"1px solid #1e293b"}}>
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
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#0d1117",border:"1px solid #1e293b",borderRadius:6,minWidth:80}}>
                        <div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>PROFIT</div>
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
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #1e293b"}}>
                      <div style={{fontSize:11,color:"#6366f1",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>
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
              const {costINR,sellINR,paidINR}=vendorINR(vv);
              const isExp=expandedVendor===vv.id;
              const needsRate=vv.currency!=="INR";
              return (
                <div key={vv.id} className="vrow" style={{border:isExp?"1px solid #6366f144":"1px solid #1e293b"}}>
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
                    <div style={{marginTop:16,paddingTop:14,borderTop:"1px dashed #1e293b"}}>
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
              {[{l:"Total to Receive",v:fmtINR(totalSell),c:"#e2e8f0"},{l:"Received",v:fmtINR(totalClientReceived),c:"#10b981"},{l:"Balance Pending",v:fmtINR(balanceFromClient),c:balanceFromClient>0?"#f97316":"#10b981"}].map((s,i)=>(
                <div key={i} className="stat"><div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div className="mono" style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
              ))}
            </div>
            <div className="card">
              <div className="sec-head">Payment Entries — {deal.clientName||"Client"}</div>
              {deal.clientPayments.length===0&&<div style={{textAlign:"center",padding:30,color:"#475569"}}>No payments recorded yet.</div>}
              {deal.clientPayments.map((pmt,i)=>(
                <div key={pmt.id} className="prow" style={{border:"1px solid #1e293b",marginBottom:10}}>
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
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1117",borderRadius:8,padding:"12px 16px",marginTop:10}}>
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

            <div style={{background:"#0d1117",border:"2px dashed #334155",borderRadius:12,padding:32,textAlign:"center",cursor:"pointer"}}
              onClick={()=>fileInputRef.current.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}>
              <div style={{fontSize:32,marginBottom:8}}>📁</div>
              <div style={{fontWeight:700,marginBottom:4}}>Drop files here or click to browse</div>
              <div style={{fontSize:12,color:"#64748b"}}>Supports: PDF, DOC, DOCX, JPG, JPEG, PNG · Passports, email threads, quotations</div>
            </div>

            {deal.attachments.length===0&&<div style={{textAlign:"center",color:"#475569",fontSize:13}}>No files attached yet.</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {deal.attachments.map(att=>{
                const isImg=att.type.startsWith("image/");
                const isPdf=att.type==="application/pdf";
                const sizeKb=(att.size/1024).toFixed(0);
                return (
                  <div key={att.id} style={{background:"#151b27",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden"}}>
                    {isImg?(
                      <div style={{height:120,overflow:"hidden",background:"#0d1117"}}>
                        <img src={att.data} alt={att.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      </div>
                    ):(
                      <div style={{height:80,display:"flex",alignItems:"center",justifyContent:"center",background:"#0d1117",fontSize:36}}>
                        {isPdf?"📄":"📝"}
                      </div>
                    )}
                    <div style={{padding:"10px 12px"}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{sizeKb} KB</div>
                      <div style={{display:"flex",gap:6,marginTop:8}}>
                        <a href={att.data} download={att.name} style={{flex:1,textAlign:"center",background:"#1e293b",border:"1px solid #334155",borderRadius:5,padding:"4px 0",fontSize:11,color:"#94a3b8",textDecoration:"none",fontWeight:600}}>Download</a>
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

            {/* Client */}
            <div className="card">
              <div className="sec-head">Client Details</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
                {[["Name",deal.clientName||"—"],["Contact",deal.contactNo||"—"],["Email",deal.email||"—"],["Destination",deal.destination||"—"],["Dates",deal.travelDates||"—"],["Query Via",deal.modeOfQuery],["Adults",deal.adults],["Children",deal.children],["Infants",deal.infants],["Total Pax",n(deal.adults)+n(deal.children)+n(deal.infants)],["Rooms",deal.rooms]].map(([l,v])=>(
                  <div key={l} className="stat"><div style={{fontSize:9,color:"#64748b",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>
                ))}
              </div>
              {deal.remarks&&<div style={{marginTop:12,padding:"10px 14px",background:"#0d1117",borderRadius:8,fontSize:13,color:"#94a3b8",borderLeft:"3px solid #f97316"}}>📝 {deal.remarks}</div>}
            </div>

            {/* P&L */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <div style={{background:"linear-gradient(135deg,#052e1650,#064e3b30)",border:"1px solid #10b98133",borderRadius:10,padding:18}}>
                <div style={{fontSize:10,color:"#6ee7b7",letterSpacing:2,marginBottom:6}}>GROSS PROFIT MARGIN (GPM)</div>
                <div className="mono" style={{fontSize:24,fontWeight:800,color:gpm>=0?"#10b981":"#ef4444"}}>{fmtINR(gpm)}</div>
                <div style={{fontSize:12,color:"#6ee7b7",marginTop:4}}>{marginPct}% of selling price · Before GST</div>
              </div>
              <div style={{background:"linear-gradient(135deg,#1e1b4b50,#312e8130)",border:"1px solid #6366f133",borderRadius:10,padding:18}}>
                <div style={{fontSize:10,color:"#a5b4fc",letterSpacing:2,marginBottom:6}}>GST @ 18%</div>
                <div className="mono" style={{fontSize:24,fontWeight:800,color:"#a5b4fc"}}>{fmtINR(gst)}</div>
                <div style={{fontSize:12,color:"#a5b4fc",marginTop:4}}>18% × GPM of {fmtINR(gpm)}</div>
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
                <thead><tr style={{background:"#0d1117"}}>{["Section","Vendors","Cost (INR)","Selling (INR)","Profit","Paid","Balance"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"right",fontSize:10,color:"#475569",fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {[{label:"🏨 Hotels",c:hotel},{label:"✈️ Flights",c:flight},{label:"🚌 Land",c:land},{label:"🛂 Visa",c:visa}].map(({label,c})=>{
                    const profit=c.sell-c.cost; const bal=c.cost-c.paid;
                    return <tr key={label} style={{borderTop:"1px solid #1e293b"}}>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{label}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#64748b"}}>—</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(c.cost)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(c.sell)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:profit>=0?"#10b981":"#ef4444",fontWeight:700}}>{fmtINR(profit)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#a5b4fc"}}>{fmtINR(c.paid)}</td>
                      <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:bal>0?"#ef4444":"#10b981",fontWeight:700}}>{fmtINR(bal)}</td>
                    </tr>;
                  })}
                  <tr style={{borderTop:"2px solid #334155",background:"#0d1117",fontWeight:800}}>
                    <td style={{padding:"10px 12px"}}>TOTAL</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#64748b"}}>—</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(totalCost)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right"}}>{fmtINR(totalSell)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:gpm>=0?"#10b981":"#ef4444"}}>{fmtINR(gpm)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:"#a5b4fc"}}>{fmtINR(totalPaidToVendors)}</td>
                    <td className="mono" style={{padding:"10px 12px",textAlign:"right",color:balanceToVendors>0?"#ef4444":"#10b981"}}>{fmtINR(balanceToVendors)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash flows */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div className="card">
                <div className="sec-head">Client Cash Flow</div>
                {[["Total to Receive",fmtINR(totalSell),"#e2e8f0"],["Total Received",fmtINR(totalClientReceived),"#10b981"],["Balance Pending",fmtINR(balanceFromClient),balanceFromClient>0?"#f97316":"#10b981"]].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #1e293b"}}>
                    <span style={{fontSize:13}}>{l}</span><span className="mono" style={{fontSize:16,fontWeight:800,color:c}}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="sec-head">Vendor Cash Flow</div>
                {[["Total to Pay",fmtINR(totalCost),"#e2e8f0"],["Total Paid",fmtINR(totalPaidToVendors),"#a5b4fc"],["Balance to Pay",fmtINR(balanceToVendors),balanceToVendors>0?"#ef4444":"#10b981"]].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #1e293b"}}>
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
                      <div className="mono" style={{fontSize:12,color:"#64748b",marginTop:6}}>{fmtINR(vendorINR(v).costINR)}</div>
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
  ::-webkit-scrollbar-thumb{background:#2d3748;border-radius:4px}
  input,select,textarea{font-family:'Syne',sans-serif;background:#1a1f2e;border:1px solid #2d3748;border-radius:6px;padding:8px 10px;font-size:13px;color:#e2e8f0;outline:none;width:100%;transition:border .18s,box-shadow .18s}
  input:focus,select:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
  select option{background:#1a1f2e}
  .mono{font-family:'IBM Plex Mono',monospace}
  .btn{border:none;border-radius:6px;cursor:pointer;font-family:'Syne',sans-serif;font-weight:600;transition:all .18s}
  .btn-ind{background:linear-gradient(135deg,#f97316,#f59e0b);color:#fff;padding:8px 18px;font-size:13px}
  .btn-ind:hover{opacity:.88;transform:translateY(-1px)}
  .btn-sm{background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:5px 12px;font-size:12px}
  .btn-sm:hover{border-color:#6366f1;color:#a5b4fc}
  .btn-danger{background:transparent;border:1px solid #ef444433;color:#ef4444;padding:4px 10px;font-size:11px}
  .btn-danger:hover{background:#ef444410}
  .btn-dashed{background:transparent;border:1px dashed #334155;color:#6366f1;padding:7px;font-size:12px;width:100%;margin-top:8px}
  .btn-dashed:hover{border-color:#6366f1;background:#6366f108}
  .card{background:#151b27;border:1px solid #1e293b;border-radius:12px;padding:20px}
  .sec-head{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6366f1;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #1e293b}
  .lbl{font-size:11px;color:#64748b;font-weight:600;letter-spacing:.3px;display:block;margin-bottom:4px}
  .stat{background:#0d1117;border:1px solid #1e293b;border-radius:10px;padding:14px 18px}
  .vrow{background:#0d1117;border:1px solid #1e293b;border-radius:10px;padding:16px;margin-bottom:10px;transition:border .2s}
  .prow{background:#151b27;border:1px solid #1e293b;border-radius:6px;padding:10px;margin-bottom:6px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}
  .tab{padding:10px 16px;border:none;background:none;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;color:#475569;border-bottom:2px solid transparent;white-space:nowrap;transition:all .2s}
  .tab.on{color:#f97316;border-bottom-color:#f97316}
  .tab:hover:not(.on){color:#94a3b8}
`;
const dashStyles = sharedStyles;
const dealStyles = sharedStyles;