const mongoose = require("mongoose");

const chatLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  clientName: { type: String, default: "" },
  clientPhone: { type: String, default: "" },
  question: { type: String, required: true },
  answer: { type: String, default: "" },
  destination: { type: String, default: "" },
  answered: { type: Boolean, default: true },
  needsAnswer: { type: Boolean, default: false },
  adminAnswer: { type: String, default: "" }, // Admin can add correct answer
  leadCaptured: { type: Boolean, default: false },
  addedToKB: { type: Boolean, default: false }, // Added to knowledge base
}, { timestamps: true });

module.exports = mongoose.model("ChatLog", chatLogSchema);
