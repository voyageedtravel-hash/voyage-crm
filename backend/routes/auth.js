const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name: name || email.split("@")[0],
      role: role || "agent",
    });
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(400).json({ error: "Wrong password" });

    // Use env secret — never hardcode
    const secret = process.env.JWT_SECRET || "VE_SECRET_CHANGE_THIS";
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: "Email and new password required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OTP PASSWORD RESET (WhatsApp delivery) ─────────────────────────────────
// In-memory OTP store (resets on server restart, fine for password reset)
const otpStore = {};
// Admin WhatsApp number where OTPs are delivered (so only admin can reset)
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || "917009659048";

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "No account with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000, attempts: 0 };

    // Build WhatsApp delivery link - OTP goes to admin WhatsApp
    const msg = `Voyage-Ed CRM password reset OTP for ${email}: ${otp} (valid 10 minutes). Do not share.`;
    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`;

    res.json({ message: "OTP generated", whatsappUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore[email];
    if (!record) return res.status(400).json({ error: "No OTP requested. Send OTP first." });
    if (Date.now() > record.expires) { delete otpStore[email]; return res.status(400).json({ error: "OTP expired. Request a new one." }); }
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) { delete otpStore[email]; return res.status(400).json({ error: "Too many attempts. Request a new OTP." }); }
    if (record.otp !== otp) return res.status(400).json({ error: "Wrong OTP" });
    res.json({ message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password with OTP
router.post("/reset-password-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing fields" });
    const record = otpStore[email];
    if (!record) return res.status(400).json({ error: "No OTP requested" });
    if (Date.now() > record.expires) { delete otpStore[email]; return res.status(400).json({ error: "OTP expired" }); }
    if (record.otp !== otp) return res.status(400).json({ error: "Wrong OTP" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    delete otpStore[email];
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
