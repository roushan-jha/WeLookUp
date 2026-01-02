import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// --- 1. User Registration Route ---
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body; // 'role' removed from body for security

  try {
    // 1. Senior Guard: Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // 2. Create new user instance
    // Note: 'domain' is automatically extracted by our User Model's pre-save hook
    user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: "User", // Default to 'User' as discussed
    });

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Save user to database
    await user.save();

    // 5. Generate JWT Token (Including domain for performance)
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        domain: user.domain, // Embedded so profile/review routes don't need a DB hit
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token,
          user: { id: user.id, name: user.name, domain: user.domain },
        });
      }
    );
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({ error: "Server Error during registration" });
  }
});

// --- 2. User Login Route ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    // 3. Generate JWT Token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        domain: user.domain,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { id: user.id, name: user.name, domain: user.domain },
        });
      }
    );
  } catch (err) {
    res.status(500).send("Server Error during login");
  }
});

// --- 3. Current User Route ---
router.get("/me", auth, async (req, res) => {
  try {
    // req.user.id is coming from the auth middleware
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).send("Server Error fetching user info");
  }
});

export default router;
