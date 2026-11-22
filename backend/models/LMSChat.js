// LMSChat — one row per student question + AI answer pair.  Lets us:
//   (a) show the student their own chat history when they come back,
//   (b) let the admin audit any student's conversations from the CRM,
//   (c) build FAQ / "most-asked" analytics later without replaying logs.
//
// We store the raw question and answer as plain strings — no attachments,
// no multi-turn blobs — because the chat UI itself is single-shot
// Q&A (every message is its own API call, system prompt carries the
// whole QRG).  Multi-turn context is not yet needed.
const mongoose = require("mongoose");

const lmsChatSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "LMSStudent", required: true, index: true },
  username:  { type: String, default: "" },    // denormalised so admin lists don't need a join
  question:  { type: String, required: true },
  answer:    { type: String, required: true },
  model:     { type: String, default: "" },
  latencyMs: { type: Number, default: 0 },     // round-trip time to Anthropic, for cost tracking
  helpful:   { type: String, enum: ["", "yes", "no"], default: "" },  // optional student feedback
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("LMSChat", lmsChatSchema);
