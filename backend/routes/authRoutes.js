const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { deleteOtp, getOtp, isExpired, storeOtp } = require("../data/otpStore");
const {
  countUsers,
  createUser,
  findUserByEmail,
  findUserByUsername,
  matchPassword,
} = require("../data/users");
const { protect } = require("../middleware/auth");
const { generateOtp, sendOtpEmail } = require("../services/emailService");

// Helper: generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const authPayload = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  familyId: user.familyId,
  requests: user.requests,
  token: generateToken(user._id),
});

// ── POST /api/auth/signup ────────────────────────────────
router.post("/signup", async (req, res) => {
  console.log("🔔 Signup hit:", req.body);
  try {
    const { name, username, email, password, role } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await findUserByEmail(email);
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const isFirstUser = (await countUsers()) === 0;
    const normalizedRole = isFirstUser ? "admin" : (role || "member");
    const safeRole = normalizedRole === "admin" ? "admin" : "member";
    const familyId = safeRole === "admin" ? randomUUID() : null;

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const pendingEmail = email.trim().toLowerCase();

    storeOtp(pendingEmail, otp, "signup", {
      name,
      username,
      email: pendingEmail,
      password: hashedPassword,
      role: safeRole,
      familyId,
    });

    try {
      await sendOtpEmail(pendingEmail, otp, "signup");
    } catch (emailError) {
      console.error(emailError);
      deleteOtp(pendingEmail);
      return res.status(500).json({ message: "Failed to send OTP email. Check email address." });
    }

    res.status(200).json({
      message: "OTP sent to your email. Please verify to complete signup.",
      email: pendingEmail,
    });
  } catch (err) {
    console.error(err);
    if (err.code === "EMAIL_EXISTS") {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (err.code === "USERNAME_EXISTS") {
      return res.status(409).json({ message: "Username already taken" });
    }
    res.status(500).json({ message: "Server error during signup" });
  }
});

// ── POST /api/auth/signup/verify ─────────────────────────
router.post("/signup/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const entry = getOtp(email);
    if (!entry) {
      return res.status(400).json({ message: "No pending signup for this email. Please sign up again." });
    }

    if (entry.purpose !== "signup") {
      return res.status(400).json({ message: "Invalid OTP purpose." });
    }

    if (isExpired(entry)) {
      deleteOtp(email);
      return res.status(400).json({ message: "OTP has expired. Please sign up again." });
    }

    if (entry.otp !== String(otp)) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    const user = await createUser({
      ...entry.userData,
      prehashed: true, // Password was already hashed before the OTP was sent.
    });

    deleteOtp(email);
    res.status(201).json(authPayload(user));
  } catch (err) {
    console.error(err);
    if (err.code === "EMAIL_EXISTS") {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (err.code === "USERNAME_EXISTS") {
      return res.status(409).json({ message: "Username already taken" });
    }
    res.status(500).json({ message: "Server error during signup verification" });
  }
});

// ── POST /api/auth/login ─────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await findUserByEmail(email);
    if (!user || !(await matchPassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const otp = generateOtp();
    storeOtp(user.email, otp, "login");

    try {
      await sendOtpEmail(user.email, otp, "login");
    } catch (emailError) {
      console.error(emailError);
      deleteOtp(user.email);
      return res.status(500).json({ message: "Failed to send OTP email. Check email address." });
    }

    res.json({
      message: "OTP sent to your email.",
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ── POST /api/auth/login/verify ──────────────────────────
router.post("/login/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const entry = getOtp(email);
    if (!entry) {
      return res.status(400).json({ message: "No pending login for this email. Please log in again." });
    }

    if (entry.purpose !== "login") {
      return res.status(400).json({ message: "Invalid OTP purpose." });
    }

    if (isExpired(entry)) {
      deleteOtp(email);
      return res.status(400).json({ message: "OTP has expired. Please log in again." });
    }

    if (entry.otp !== String(otp)) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      deleteOtp(email);
      return res.status(400).json({ message: "No pending login for this email. Please log in again." });
    }

    deleteOtp(email);
    res.json(authPayload(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login verification" });
  }
});

// ── POST /api/auth/otp/resend ────────────────────────────
router.post("/otp/resend", async (req, res) => {

  try {
    const { email, purpose } = req.body;

    if (!email || !["signup", "login"].includes(purpose)) {
      return res.status(400).json({ message: "Email and valid purpose required" });
    }

    const entry = getOtp(email);
    if (entry?.sentAt && Date.now() - entry.sentAt < 60 * 1000) {
      return res.status(429).json({ message: "Please wait before requesting another OTP." });
    }

    if (purpose === "login") {
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "No pending login for this email. Please log in again." });
      }
      if (!entry || entry.purpose !== "login") {
        return res.status(400).json({ message: "No pending login for this email. Please log in again." });
      }
    }

    if (purpose === "signup" && (!entry || entry.purpose !== "signup" || !entry.userData)) {
      return res.status(400).json({ message: "No pending signup for this email. Please sign up again." });
    }

    const otp = generateOtp();
    storeOtp(email, otp, purpose, purpose === "signup" ? entry.userData : null);

    try {
      await sendOtpEmail(email, otp, purpose);
    } catch (emailError) {
      console.error(emailError);
      return res.status(500).json({ message: "Failed to send OTP email. Check email address." });
    }

    res.json({ message: "New OTP sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while resending OTP" });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
// Returns logged-in user info (useful for frontend session restore)
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
