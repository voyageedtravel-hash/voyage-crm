const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: { type: String, default: "" },
  role: {
    type: String,
    enum: ["admin", "agent", "viewer", "sales_manager", "consultant", "accounts"],
    default: "agent"
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
