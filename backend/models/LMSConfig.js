// LMSConfig — single-document collection holding the QRG text that the
// AI tutor reads from, plus a few tunables.  Single-document pattern
// (fixed _id "default") keeps reads trivial and lets admins swap the
// QRG by overwriting one record from the admin panel.
//
// qrgText holds the full Amadeus QRG as extracted plain text.  Large:
// a 200-page QRG is ~300 KB, well inside MongoDB's 16 MB doc cap and
// well inside Claude's 200 K-token context window when injected as a
// system prompt.
const mongoose = require("mongoose");

const lmsConfigSchema = new mongoose.Schema({
  _id:           { type: String, default: "default" },
  qrgText:       { type: String, default: "" },       // the full QRG as text
  qrgTitle:      { type: String, default: "Amadeus Quick Reference Guide" },
  qrgUpdatedAt:  { type: Date },
  qrgUpdatedBy:  { type: String, default: "" },
  welcomeMsg:    { type: String, default: "Namaste! Main tumhara Amadeus AI Tutor hoon. Koi bhi question pucho — command, format, entry, ya kuch bhi QRG se." },
  tutorModel:    { type: String, default: "claude-sonnet-4-6" },  // Sonnet is better at technical GDS Q&A
  dailyLimit:    { type: Number, default: 50 },       // per-student daily chat cap
}, { timestamps: true });

module.exports = mongoose.model("LMSConfig", lmsConfigSchema);
