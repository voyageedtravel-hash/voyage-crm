const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

// ─── JWT secret: must be set in env. Warn loudly if using insecure default. ───
const JWT_SECRET = process.env.JWT_SECRET || "VE_SECRET_CHANGE_THIS";
if (JWT_SECRET === "VE_SECRET_CHANGE_THIS") {
  console.warn("⚠️  SECURITY: JWT_SECRET env var is not set — using insecure default. Set JWT_SECRET on Render before going to production!");
}

const app = express();

// ─── CORS: restrict to our own domains (was wide-open before) ───
const ALLOWED_ORIGINS = [
  "https://voyage-ed.com",
  "https://www.voyage-ed.com",
  "https://voyageedtravel-hash.netlify.app",
  "https://remarkable-horse-c2fed5.netlify.app", // CRM frontend
];
app.use(cors({
  origin: function (origin, cb) {
    // allow same-origin / server-to-server (no origin header) and whitelisted browsers
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
let compression=null; try{ compression=require("compression"); app.use(compression()); }catch(e){ console.warn("compression not installed — run npm i compression"); }
app.use(express.json({ limit: "2mb" }));  // was 10mb — booking payloads don't need that; blocks abuse

// ─── Basic security headers ───
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ─── Simple in-memory rate limiter (per IP) for public endpoints ───
function makeRateLimiter(maxPerMin) {
  const store = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) { if (now > v.resetAt) store.delete(k); }
  }, 5 * 60 * 1000).unref();
  return function (req, res, next) {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?")
      .toString().split(",")[0].trim();
    const now = Date.now();
    let rec = store.get(ip);
    if (!rec || now > rec.resetAt) rec = { count: 0, resetAt: now + 60000 };
    rec.count++; store.set(ip, rec);
    if (rec.count > maxPerMin) {
      res.setHeader("Retry-After", Math.ceil((rec.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }
    next();
  };
}
const publicLimiter = makeRateLimiter(10);  // 10 lead/chat submits per IP per minute

const authRoutes = require("./routes/auth");

// ─── JWT AUTH MIDDLEWARE ──────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ─── START ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI ||
      "mongodb://enquiry_db_user:z0wYXgCQFyGRbrEj@ac-opis1z5-shard-00-00.co5rnd9.mongodb.net:27017,ac-opis1z5-shard-00-01.co5rnd9.mongodb.net:27017,ac-opis1z5-shard-00-02.co5rnd9.mongodb.net:27017/test?ssl=true&replicaSet=atlas-1encph-shard-0&authSource=admin&retryWrites=true&w=majority";

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB Connected ✅");

    // ─── LEAD SCHEMA ──────────────────────────────────────────────────────────
    const leadSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
    const Lead = mongoose.model("Lead", leadSchema);

    // ─── DEAL NUMBER COUNTER ──────────────────────────────────────────────────
    const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
    const Counter = mongoose.model("Counter", counterSchema);

    async function getNextDealNumber() {
      const year = new Date().getFullYear();
      const counterId = `deals_${year}`;
      const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      return `VE-${year}-${String(counter.seq).padStart(3, "0")}`;
    }

    // ─── PUBLIC LEAD CAPTURE (Website AI Chat — no auth) ─────────────────────
    app.post("/api/public/lead", publicLimiter, async (req, res) => {
      try {
        const { name, phone, source, page } = req.body || {};
        if (!name || !phone) return res.status(400).json({ error: "name and phone required" });
        const dealNumber = await getNextDealNumber();
        const lead = new Lead({
          dealNumber,
          client: { name: String(name).slice(0, 80), phone: String(phone).slice(0, 20), destination: "" },
          source: source || "Website AI Chat",
          page: page || "",
          status: "new",
          notes: `Auto-captured from ${source || "Website AI Chat"} on ${page || "website"}`,
        });
        await lead.save();
        res.json({ ok: true, dealNumber });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ─── LEAD ROUTES (PROTECTED) ──────────────────────────────────────────────

    // CREATE deal
    app.post("/api/leads", authMiddleware, async (req, res) => {
      try {
        const dealNumber = req.body.dealNumber || await getNextDealNumber();
        const lead = new Lead({ ...req.body, dealNumber, createdBy: req.user.id });
        await lead.save();
        res.json(lead);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // READ all deals
    app.get("/api/leads", authMiddleware, async (req, res) => {
      try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.search) {
          filter.$or = [
            { "client.name": { $regex: req.query.search, $options: "i" } },
            { "client.destination": { $regex: req.query.search, $options: "i" } },
            { dealNumber: { $regex: req.query.search, $options: "i" } },
          ];
        }
        const leads = await Lead.find(filter).sort({ _id: -1 });
        res.json(leads);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // READ single deal
    app.get("/api/leads/:id", authMiddleware, async (req, res) => {
      try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: "Deal not found" });
        res.json(lead);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // UPDATE deal — FIX: was missing, every save created duplicate
    app.put("/api/leads/:id", authMiddleware, async (req, res) => {
      try {
        const lead = await Lead.findByIdAndUpdate(
          req.params.id,
          { ...req.body, updatedAt: new Date() },
          { new: true }
        );
        if (!lead) return res.status(404).json({ error: "Deal not found" });
        res.json(lead);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // DELETE deal
    app.delete("/api/leads/:id", authMiddleware, async (req, res) => {
      try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ error: "Deal not found" });
        res.json({ success: true, message: "Deal deleted" });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ─── CHAT LOG ROUTES ──────────────────────────────────────────────────────
    const ChatLog = require("./models/ChatLog");

    // Save chat log (public - no auth needed for website)
    app.post("/api/chatlogs", publicLimiter, async (req, res) => {
      try {
        const log = new ChatLog(req.body);
        await log.save();
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Get all chat logs (protected)
    app.get("/api/chatlogs", authMiddleware, async (req, res) => {
      try {
        const filter = {};
        if (req.query.needsAnswer === "true") filter.needsAnswer = true;
        if (req.query.unanswered === "true") filter.answered = false;
        if (req.query.destination) filter.destination = { $regex: req.query.destination, $options: "i" };

        const logs = await ChatLog.find(filter)
          .sort({ createdAt: -1 })
          .limit(parseInt(req.query.limit) || 200);
        res.json(logs);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Get conversation sessions (grouped)
    app.get("/api/chatlogs/sessions", authMiddleware, async (req, res) => {
      try {
        const sessions = await ChatLog.aggregate([
          { $group: {
            _id: "$sessionId",
            clientName: { $first: "$clientName" },
            clientPhone: { $first: "$clientPhone" },
            destination: { $first: "$destination" },
            messages: { $sum: 1 },
            leadCaptured: { $max: "$leadCaptured" },
            hasUnanswered: { $max: "$needsAnswer" },
            startTime: { $min: "$createdAt" },
            lastTime: { $max: "$createdAt" }
          }},
          { $sort: { lastTime: -1 } },
          { $limit: 100 }
        ]);
        res.json(sessions);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Get FAQ suggestions (most common questions)
    app.get("/api/chatlogs/faqs", authMiddleware, async (req, res) => {
      try {
        const faqs = await ChatLog.aggregate([
          { $group: {
            _id: { $toLower: "$question" },
            count: { $sum: 1 },
            answered: { $max: "$answered" },
            lastAnswer: { $last: "$answer" },
            needsAnswer: { $max: "$needsAnswer" }
          }},
          { $sort: { count: -1 } },
          { $limit: 50 }
        ]);
        res.json(faqs);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Admin adds answer to FAQ (adds to knowledge base)
    app.put("/api/chatlogs/answer", authMiddleware, async (req, res) => {
      try {
        const { question, answer } = req.body;
        await ChatLog.updateMany(
          { question: { $regex: question, $options: "i" } },
          { $set: { adminAnswer: answer, needsAnswer: false, addedToKB: true } }
        );
        res.json({ success: true, message: "Answer saved to knowledge base" });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ─── USER MANAGEMENT (admin) ──────────────────────────────────────────────
    const User = require("./models/User");
    // List all users (admin only)
    app.get("/api/users", authMiddleware, async (req, res) => {
      try {
        const users = await User.find({}, "-password").sort({ createdAt: -1 });
        res.json(users);
      } catch (err) { res.status(500).json({ error: err.message }); }
    });
    // Create user (admin only)
    app.post("/api/users", authMiddleware, async (req, res) => {
      try {
        if (req.user.role !== "admin")
          return res.status(403).json({ error: "Only admin can create users" });
        const { email, password, name, role } = req.body;
        if (!email || !password)
          return res.status(400).json({ error: "Email and password required" });
        if (password.length < 6)
          return res.status(400).json({ error: "Password must be at least 6 characters" });
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: "User with this email already exists" });
        const bcrypt = require("bcrypt");
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({
          email,
          password: hashed,
          name: name || email.split("@")[0],
          role: role || "agent",
        });
        await user.save();
        const out = user.toObject();
        delete out.password;
        res.json({ success: true, user: out });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });
    // Delete user (admin only)
    app.delete("/api/users/:id", authMiddleware, async (req, res) => {
      try {
        if (req.user.role !== "admin")
          return res.status(403).json({ error: "Only admin can delete users" });
        if (req.params.id === req.user.id)
          return res.status(400).json({ error: "You cannot delete your own account" });
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ─── AI CHAT PROXY ────────────────────────────────────────────────────────
    // ── /api/chat hardening: open-proxy abuse band ──
    const chatLimiter = makeRateLimiter(5);              // 5/min per IP
    const _chatDaily = new Map();                        // per-IP daily cap
    const CHAT_DAY_CAP = 80;
    const ALLOWED_MODELS = new Set(["claude-haiku-4-5-20251001","claude-sonnet-4-6"]);
    app.post("/api/chat", chatLimiter, async (req, res) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
      // browser-origin required (curl/bot direct hits blocked)
      const org = req.get("origin") || req.get("referer") || "";
      if (!ALLOWED_ORIGINS.some(o => org.startsWith(o))) {
        return res.status(403).json({ error: "forbidden" });
      }
      // daily cap per IP
      const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
      const day = new Date().toISOString().slice(0, 10);
      const k = ip + "|" + day;
      const used = (_chatDaily.get(k) || 0) + 1;
      if (used > CHAT_DAY_CAP) return res.status(429).json({ error: "daily limit reached" });
      _chatDaily.set(k, used);
      if (_chatDaily.size > 5000) _chatDaily.clear();
      // payload clamps
      const msgs = Array.isArray(req.body.messages) ? req.body.messages.slice(0, 8) : [];
      let imgCount = 0, tooBig = false;
      msgs.forEach(m => { if (Array.isArray(m.content)) m.content.forEach(c => {
        if (c && c.type === "image") { imgCount++; if (c.source && c.source.data && c.source.data.length > 500000) tooBig = true; }
      }); });
      if (!msgs.length || imgCount > 4 || tooBig) return res.status(400).json({ error: "invalid payload" });
      const model = ALLOWED_MODELS.has(req.body.model) ? req.body.model : "claude-haiku-4-5-20251001";
      const maxTok = Math.min(Number(req.body.max_tokens) || 1000, 3000);
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTok,
            system: typeof req.body.system === "string" ? req.body.system.slice(0, 6000) : undefined,
            messages: msgs,
          }),
        });
        const data = await r.json();
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ─── AUTH ROUTES ──────────────────────────────────────────────────────────
    app.use("/api/auth", authRoutes);

    // ─── PUBLIC WEBHOOK — Website AI → CRM auto-create ──────────────────────
    app.post("/api/leads/webhook", publicLimiter, async (req, res) => {
      try {
        const { clientName, contactNo, destination, email, source, remarks } = req.body;
        if (!clientName && !contactNo) return res.status(400).json({ error: "Name or contact required" });
        const dealNumber = await getNextDealNumber();
        const lead = new Lead({
          clientName: clientName || "Website Enquiry",
          contactNo: contactNo || "",
          email: email || "",
          destination: destination || "",
          source: source || "Website AI",
          modeOfQuery: "Website",
          remarks: remarks || "",
          status: "Not Actioned",
          dealNumber,
          _savedAt: new Date().toISOString(),
        });
        await lead.save();
        res.json({ success: true, dealNumber });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ─── HEALTH CHECK ─────────────────────────────────────────────────────────
    app.get("/", (req, res) => res.send("Voyage-Ed CRM Backend v2.0 🚀"));
    
    // ─── SEO CRAWLER (runs twice daily) ──────────────────────────────────────
    const CrawlResult = mongoose.model("CrawlResult", new mongoose.Schema({
      url: String, title: String, description: String, canonical: String,
      hasSchema: Boolean, h1Count: Number, wordCount: Number,
      status: Number, issues: [String], crawledAt: { type: Date, default: Date.now }
    }));

    const KEY_PAGES = [
      "https://voyage-ed.com",
      "https://voyage-ed.com/canada-flights",
      "https://voyage-ed.com/blog",
      "https://voyage-ed.com/travel",
      "https://voyage-ed.com/education",
      "https://voyage-ed.com/bali-packages",
      "https://voyage-ed.com/dubai-abu-dhabi-packages",
      "https://voyage-ed.com/georgia-packages",
      "https://voyage-ed.com/thailand-packages",
      "https://voyage-ed.com/visa"
    ];

    async function crawlSite() {
      console.log("[SEO Crawler] Starting crawl at", new Date().toISOString());
      const results = [];
      for (const url of KEY_PAGES) {
        try {
          const r = await fetch(url, { headers: { "User-Agent": "VoyageEd-SEO-Bot/1.0" }, signal: AbortSignal.timeout(15000) });
          const html = await r.text();
          const issues = [];
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/si);
          const descMatch = html.match(/meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/si) ||
                            html.match(/meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/si);
          const canonMatch = html.match(/rel=["']canonical["'][^>]+href=["']([^"']+)/si) ||
                             html.match(/href=["']([^"']+)["'][^>]+rel=["']canonical["']/si);
          const h1s = (html.match(/<h1[^>]*>/gi) || []).length;
          const hasSchema = html.includes('application/ld+json');
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g,'').trim() : '';
          const desc = descMatch ? descMatch[1].trim() : '';
          const canonical = canonMatch ? canonMatch[1].trim() : '';
          const wordCount = html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(' ').length;
          if (!title) issues.push('Missing title');
          if (title.length > 60) issues.push('Title too long ('+title.length+' chars)');
          if (!desc) issues.push('Missing meta description');
          if (desc.length > 160) issues.push('Description too long');
          if (canonical.includes('.html')) issues.push('Canonical has .html');
          if (h1s === 0) issues.push('No H1 tag');
          if (h1s > 1) issues.push('Multiple H1 tags ('+h1s+')');
          if (!hasSchema) issues.push('Missing schema markup');
          if (wordCount < 300) issues.push('Thin content (<300 words)');
          results.push({ url, title, description: desc, canonical, hasSchema, h1Count: h1s, wordCount, status: r.status, issues });
        } catch(e) {
          results.push({ url, title:'', description:'', canonical:'', hasSchema:false, h1Count:0, wordCount:0, status:0, issues:['Crawl failed: '+e.message] });
        }
      }
      // Save to DB (keep last 10 crawls per URL)
      for (const r of results) {
        await CrawlResult.create(r);
        await CrawlResult.deleteMany({ url: r.url, crawledAt: { $lt: new Date(Date.now() - 5*24*60*60*1000) } });
      }
      console.log("[SEO Crawler] Done. Issues found:", results.reduce((s,r) => s + r.issues.length, 0));
      return results;
    }

    // Run crawler twice daily (every 12 hours)
    let crawlInterval = null;
    function startCrawlScheduler() {
      crawlSite().catch(e => console.error("[Crawler]", e.message));
      crawlInterval = setInterval(() => {
        crawlSite().catch(e => console.error("[Crawler]", e.message));
      }, 12 * 60 * 60 * 1000);
    }
    setTimeout(startCrawlScheduler, 30000); // Start 30s after server boot

    // Manual crawl trigger
    app.get("/api/seo/crawl", async (req, res) => {
      try {
        const results = await crawlSite();
        res.json({ crawledAt: new Date(), pages: results.length, totalIssues: results.reduce((s,r)=>s+r.issues.length,0), results });
      } catch(e) { res.status(500).json({ error: e.message }); }
    });

    // Get latest crawl results
    app.get("/api/seo/results", async (req, res) => {
      try {
        const latest = await CrawlResult.aggregate([
          { $sort: { crawledAt: -1 } },
          { $group: { _id: "$url", doc: { $first: "$$ROOT" } } },
          { $replaceRoot: { newRoot: "$doc" } },
          { $sort: { url: 1 } }
        ]);
        const totalIssues = latest.reduce((s,r)=>s+r.issues.length,0);
        res.json({ lastCrawl: latest[0]?.crawledAt, pages: latest.length, totalIssues, results: latest });
      } catch(e) { res.status(500).json({ error: e.message }); }
    });

    
    // ─── LIVE FX RATES (with Voyage-Ed markup) ──────────────────────────────
    // USD/EUR/GBP/NZD/AUD/SGD → +1.50 ; all other currencies → +0.50
    let fxCache = { date: null, rates: null };
    const FX_HIGH = ["USD","EUR","GBP","NZD","AUD","SGD"];
    app.get("/api/fx-rates", async (req, res) => {
      try {
        const today = new Date().toISOString().slice(0,10);
        if (fxCache.date === today && fxCache.rates) {
          return res.json({ date: today, cached: true, rates: fxCache.rates });
        }
        // Free, no-key, mid-market rates (same headline number as Google/xe), base = INR
        const r = await fetch("https://open.er-api.com/v6/latest/INR");
        const data = await r.json();
        if (!data || data.result !== "success" || !data.rates) {
          // Fall back to last good cache if available
          if (fxCache.rates) return res.json({ date: fxCache.date, stale: true, rates: fxCache.rates });
          return res.status(502).json({ error: "FX source unavailable" });
        }
        // data.rates gives INR→foreign. We need foreign→INR = 1 / rate. Then add markup.
        const out = {};
        for (const [cur, perINR] of Object.entries(data.rates)) {
          if (!perINR) continue;
          const inrPerUnit = 1 / perINR;                 // e.g. 1 USD = 95 INR (mid-market)
          const markup = FX_HIGH.includes(cur) ? 1.50 : 0.50;
          out[cur] = Math.round((inrPerUnit + markup) * 100) / 100; // e.g. 96.50
        }
        out.INR = 1;
        fxCache = { date: today, rates: out };
        res.json({ date: today, cached: false, rates: out });
      } catch (e) {
        if (fxCache.rates) return res.json({ date: fxCache.date, stale: true, rates: fxCache.rates });
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/version", (req, res) => res.json({ version: "2.4.0-otp-reset", deployed: "2026-06-08", features: ["whatsapp-otp", "role-enum-expanded", "updateOne-reset"] }));
    app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));

  } catch (err) {
    console.log("DB Error ❌", err);
    process.exit(1);
  }
};

start();
