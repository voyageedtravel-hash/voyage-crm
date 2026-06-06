const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const authRoutes = require("./routes/auth");

// ─── JWT AUTH MIDDLEWARE ──────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "VE_SECRET_CHANGE_THIS");
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

    // ─── AI CHAT PROXY ────────────────────────────────────────────────────────
    app.post("/api/chat", async (req, res) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1000,
            system: req.body.system,
            messages: req.body.messages,
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
    app.post("/api/leads/webhook", async (req, res) => {
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
    app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));

  } catch (err) {
    console.log("DB Error ❌", err);
    process.exit(1);
  }
};

start();
