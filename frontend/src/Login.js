import { useState } from "react";

const API_BASE = "https://voyage-crm.onrender.com";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("login"); // login | reset
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [info, setInfo] = useState("");

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("ve_user", JSON.stringify(data.user || {}));
        if (onLogin) onLogin(data.user);
        else window.location.href = "/";
      } else {
        setErr(data.error || "Login failed");
      }
    } catch (e) {
      setErr("Network error. Check connection and try again.");
    } finally { setLoading(false); }
  };

  const sendOtp = async () => {
    setErr(""); setInfo(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
        setInfo("OTP sent to admin WhatsApp. Enter it below.");
        setResetStep(2);
      } else setErr(data.error || "Could not send OTP");
    } catch { setErr("Network error"); }
    finally { setLoading(false); }
  };

  const doReset = async () => {
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo("Password reset! You can log in now.");
        setMode("login"); setResetStep(1); setPassword("");
      } else setErr(data.error || "Reset failed");
    } catch { setErr("Network error"); }
    finally { setLoading(false); }
  };

  const onKey = (e) => { if (e.key === "Enter" && mode === "login") handleLogin(); };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg,#f4f7fc,#4169E1 60%,#5b7fff)",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:"#ffffff",border:"1px solid #d4e0f5",
        borderRadius:18,padding:"40px 34px",boxShadow:"0 30px 80px -20px rgba(0,0,0,.6)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:11,letterSpacing:4,color:"#4169E1",fontWeight:800}}>VOYAGE-ED</div>
          <div style={{fontSize:22,fontWeight:800,color:"#0f2350",marginTop:4}}>CRM Login</div>
          <div style={{fontSize:12,color:"#6b7a99",marginTop:4}}>Learn · Travel · Explore</div>
        </div>

        {err && <div style={{background:"#fdeaea",border:"1px solid #dc2626",color:"#b91c1c",
          padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:16}}>{err}</div>}
        {info && <div style={{background:"#e6f7ee",border:"1px solid #16a34a",color:"#15803d",
          padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:16}}>{info}</div>}

        {mode === "login" && (
          <>
            <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={onKey}
              style={inp}/>
            <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={onKey}
              style={inp}/>
            <button onClick={handleLogin} disabled={loading} style={btn}>
              {loading ? "Logging in..." : "Login"}</button>
            <div style={{textAlign:"center",marginTop:16}}>
              <span onClick={()=>{setMode("reset");setErr("");setInfo("");}}
                style={{color:"#4169E1",fontSize:13,cursor:"pointer",fontWeight:600}}>Forgot password?</span>
            </div>
          </>
        )}

        {mode === "reset" && (
          <>
            <input placeholder="Your account email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
            {resetStep === 1 && (
              <button onClick={sendOtp} disabled={loading||!email} style={btn}>
                {loading ? "Sending..." : "Send OTP via WhatsApp"}</button>
            )}
            {resetStep === 2 && (
              <>
                <input placeholder="6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value)} style={inp}/>
                <input placeholder="New password (min 6 chars)" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={inp}/>
                <button onClick={doReset} disabled={loading} style={btn}>
                  {loading ? "Resetting..." : "Reset Password"}</button>
              </>
            )}
            <div style={{textAlign:"center",marginTop:16}}>
              <span onClick={()=>{setMode("login");setErr("");setInfo("");setResetStep(1);}}
                style={{color:"#5a6b8c",fontSize:13,cursor:"pointer"}}>← Back to login</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inp = {width:"100%",background:"#ffffff",border:"1px solid #c2d2ee",borderRadius:9,
  color:"#0f2350",padding:"13px 15px",fontSize:14,marginBottom:14,outline:"none",boxSizing:"border-box"};
const btn = {width:"100%",background:"linear-gradient(135deg,#4169E1,#5b7fff)",border:"none",borderRadius:9,
  color:"#f4f7fc",padding:"13px",fontSize:15,fontWeight:800,cursor:"pointer",marginTop:4};

export default Login;
