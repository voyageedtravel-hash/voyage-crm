const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 👉 IMPORT AUTH ROUTES
const authRoutes = require("./routes/auth");

// ===== START SERVER AFTER DB CONNECT =====
const start = async () => {
  try {
    await mongoose.connect(
      "mongodb://enquiry_db_user:z0wYXgCQFyGRbrEj@ac-opis1z5-shard-00-00.co5rnd9.mongodb.net:27017,ac-opis1z5-shard-00-01.co5rnd9.mongodb.net:27017,ac-opis1z5-shard-00-02.co5rnd9.mongodb.net:27017/test?ssl=true&replicaSet=atlas-1encph-shard-0&authSource=admin&retryWrites=true&w=majority",
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      }
    );

    console.log("MongoDB Connected ✅");

    // ===== LEAD SCHEMA =====
    const leadSchema = new mongoose.Schema({}, { strict: false });
    const Lead = mongoose.model("Lead", leadSchema);

    // ===== LEAD ROUTES =====
    app.post("/api/leads", async (req, res) => {
      try {
        const lead = new Lead(req.body);
        await lead.save();
        res.json(lead);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get("/api/leads", async (req, res) => {
      try {
        const leads = await Lead.find().sort({ _id: -1 });
        res.json(leads);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ===== AUTH ROUTES (🔥 IMPORTANT) =====
    app.use("/api/auth", authRoutes);

    // ===== TEST ROUTE =====
    app.get("/", (req, res) => {
      res.send("Voyage-Ed CRM Backend Running 🚀");
    });

    // ===== START SERVER =====
    app.listen(5000, () => {
      console.log("Server running on port 5000 🚀");
    });

  } catch (err) {
    console.log("DB Error ❌", err);
  }
};

start();