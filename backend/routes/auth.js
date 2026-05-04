const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
    });

    await user.save();

    res.json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json(err);
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("User not found");

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(400).send("Wrong password");

    const token = jwt.sign({ id: user._id }, "SECRET123");

    res.json({ token });

  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;