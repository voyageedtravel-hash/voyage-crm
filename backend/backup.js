// ── DAILY BACKUP + EMAIL ─────────────────────────────────────────────────
// Dumps the full CRM database as a single JSON attachment and emails it to a
// configured recipient every night. Also exposes /api/backup/download for a
// manual on-demand pull (admin only) and /api/backup/send-now to trigger the
// email immediately, used by the frontend "Backup Now" button.
//
// Setup: install `node-cron` and `resend` (already in package.json), and set
// these env vars on Render:
//   BACKUP_EMAIL_TO   default voyageedtravel@gmail.com
//   BACKUP_EMAIL_FROM default enquiry@voyage-ed.com
//   RESEND_API_KEY    already used elsewhere
//   BACKUP_CRON       optional, default "0 2 * * *" (2 AM IST when TZ=Asia/Kolkata)
//   BACKUP_TZ         optional, default "Asia/Kolkata"

const mongoose = require("mongoose");

let cron, Resend;
try { cron = require("node-cron"); }
catch(e){ console.warn("[backup] node-cron not installed — daily schedule off"); }
try { Resend = require("resend").Resend; }
catch(e){ console.warn("[backup] resend not installed — email disabled"); }

const TO   = process.env.BACKUP_EMAIL_TO   || "voyageedtravel@gmail.com";
const FROM = process.env.BACKUP_EMAIL_FROM || "enquiry@voyage-ed.com";
const KEY  = process.env.RESEND_API_KEY    || "";
const SCHEDULE = process.env.BACKUP_CRON   || "0 2 * * *";
const TZ = process.env.BACKUP_TZ           || "Asia/Kolkata";

// ── Collect everything worth backing up into one JSON object ──
async function buildBackupSnapshot() {
  const snapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "voyage-crm backend",
    collections: {},
  };
  // Every mongoose model registered so far (Lead, User, Counter, ChatLog).
  // Using models directly, not names, so we don't have to know their names here.
  const modelNames = mongoose.modelNames();
  for (const name of modelNames) {
    try {
      const Model = mongoose.model(name);
      // .lean() returns plain JS objects, faster and smaller for JSON export.
      const docs = await Model.find({}).lean();
      snapshot.collections[name] = docs;
    } catch (e) {
      snapshot.collections[name] = { error: e.message };
    }
  }
  // Totals for a quick email summary.
  snapshot.summary = Object.fromEntries(
    Object.entries(snapshot.collections).map(([k, v]) => [k, Array.isArray(v) ? v.length : "err"])
  );
  return snapshot;
}

function humanSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1024/1024).toFixed(2) + " MB";
}

async function sendBackupEmail(reason = "scheduled") {
  if (!Resend) return { ok:false, error:"resend not installed" };
  if (!KEY)    return { ok:false, error:"RESEND_API_KEY not set" };
  const snapshot = await buildBackupSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const stamp = new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  const filename = `voyage-crm-backup-${stamp}.json`;
  const buf = Buffer.from(json, "utf-8");

  const summaryLines = Object.entries(snapshot.summary)
    .map(([k,v]) => `<li><b>${k}</b>: ${v} document${v===1?"":"s"}</li>`).join("");
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f4f7fc;color:#1a2c52">
      <div style="background:linear-gradient(135deg,#0d1b3e,#1a3060);color:#fff;padding:22px 24px;border-radius:12px 12px 0 0">
        <div style="font-size:10px;letter-spacing:3px;color:#f0c842;font-weight:800">VOYAGE-ED CRM</div>
        <div style="font-size:20px;font-weight:800;margin-top:4px">Daily Backup — ${new Date().toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
      <div style="background:#fff;padding:22px 24px;border-radius:0 0 12px 12px;border:1px solid #d4e0f5;border-top:0">
        <p style="font-size:14px;line-height:1.6;margin:0 0 14px">Aapke CRM ka poora backup attach kiya gaya hai (${humanSize(buf.length)}).</p>
        <div style="background:#f8fafd;border:1px solid #eef2f8;border-radius:10px;padding:14px 16px;margin-bottom:14px">
          <div style="font-size:10px;color:#8b98b4;letter-spacing:2px;font-weight:800;margin-bottom:8px">CONTENTS</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.8;color:#33446b">${summaryLines || "<li style='color:#94a3b8'>no data</li>"}</ul>
        </div>
        <div style="font-size:11.5px;color:#6b7a99;line-height:1.6">
          <b>Trigger:</b> ${reason === "manual" ? "Manual (dashboard button)" : "Scheduled daily ("+SCHEDULE+", "+TZ+")"}<br>
          <b>Restore:</b> ye JSON file safe rakhein — data recover karna ho toh Anthropic/Vishal se contact karein.
        </div>
        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef2f8;font-size:11px;color:#94a3b8;text-align:center">Voyage-Ed Travels · voyage-ed.com</div>
      </div>
    </div>`;

  const resend = new Resend(KEY);
  const { data, error } = await resend.emails.send({
    from: `Voyage-Ed CRM <${FROM}>`,
    to:   [TO],
    subject: `📦 CRM Backup — ${new Date().toLocaleDateString("en-IN")} (${humanSize(buf.length)})`,
    html,
    attachments: [{ filename, content: buf.toString("base64") }],
  });
  if (error) throw new Error(error.message || String(error));
  return { ok:true, id: data && data.id, filename, bytes: buf.length, to: TO, summary: snapshot.summary };
}

function attachBackupRoutes(app, authMiddleware) {
  // Manual download — returns the raw JSON, admin only.
  app.get("/api/backup/download", authMiddleware, async (req, res) => {
    try {
      if (req.user && req.user.role && req.user.role !== "admin") return res.status(403).json({ error: "admin only" });
      const snapshot = await buildBackupSnapshot();
      const stamp = new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="voyage-crm-backup-${stamp}.json"`);
      res.send(JSON.stringify(snapshot, null, 2));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // Trigger the scheduled email now, admin only.
  app.post("/api/backup/send-now", authMiddleware, async (req, res) => {
    try {
      if (req.user && req.user.role && req.user.role !== "admin") return res.status(403).json({ error: "admin only" });
      const r = await sendBackupEmail("manual");
      res.json(r);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

function startBackupCron() {
  if (!cron) return;
  if (!KEY) { console.warn("[backup] RESEND_API_KEY missing — cron disabled"); return; }
  try {
    cron.schedule(SCHEDULE, async () => {
      try {
        console.log("[backup] running scheduled backup…");
        const r = await sendBackupEmail("scheduled");
        console.log("[backup] sent:", r.filename, r.bytes, "bytes");
      } catch (e) {
        console.error("[backup] scheduled send failed:", e.message);
      }
    }, { timezone: TZ });
    console.log(`[backup] cron scheduled: ${SCHEDULE} (${TZ}) → ${TO}`);
  } catch (e) {
    console.error("[backup] cron init failed:", e.message);
  }
}

module.exports = { attachBackupRoutes, startBackupCron, sendBackupEmail, buildBackupSnapshot };
