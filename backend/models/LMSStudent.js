// LMSStudent — a Voyage-Ed GDS training student with their own login
// separate from the CRM User accounts. Admin (Vishal) creates these from
// the CRM's GDS Students panel; students log in from voyage-ed.com/lms.
//
// username is the student's unique handle (e.g. ve-2027-001, or an email).
// We index on it so login lookup is O(log n) even with a few hundred
// enrolments.  password stores a bcrypt hash — never the plaintext.
//
// status lets the admin suspend an account (dropped out, fee pending,
// batch ended) without deleting it, so chat history stays intact.
const mongoose = require("mongoose");

const lmsStudentSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  password:    { type: String, required: true },     // bcrypt hash, never plaintext
  name:        { type: String, required: true, trim: true },
  email:       { type: String, default: "", trim: true, lowercase: true },
  phone:       { type: String, default: "", trim: true },
  batchName:   { type: String, default: "", trim: true },    // e.g. "Jan-2027 Amadeus Weekday Batch"
  college:     { type: String, default: "", trim: true },
  course:      { type: String, default: "Amadeus GDS", trim: true },
  enrolledOn:  { type: Date, default: Date.now },
  expiresOn:   { type: Date },                       // optional access cut-off
  status:      { type: String, enum: ["active", "suspended"], default: "active" },
  lastLoginAt: { type: Date },
  loginCount:  { type: Number, default: 0 },
  chatCount:   { type: Number, default: 0 },         // running tally; cheap read for admin list
  createdBy:   { type: String, default: "" },        // CRM user email who created this student
}, { timestamps: true });

module.exports = mongoose.model("LMSStudent", lmsStudentSchema);
