const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs/promises");
const { initializeDatabase } = require("./data/database");

dotenv.config();

const app = express();

// ── Core Middleware ─────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically for frontend preview
// e.g. GET /uploads/1234567890-doc.pdf
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ──────────────────────────────────────────
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/documents", require("./routes/documentRoutes"));
app.use("/api/documents", require("./routes/documentPasswordRoutes"));
app.use("/api/family",    require("./routes/familyRoutes"));
app.use("/api/pins",      require("./routes/pinRoutes"));
app.use("/api/search",    require("./routes/searchRoutes"));
app.use("/api/users",     require("./routes/userRoutes"));
app.use("/api/emergency", require("./routes/emergencyRoutes"));

// ── Health Check ────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "🏠 Family Digital Vault API is running" });
});

// ── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global Error Handler ────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  res.status(500).json({ message: err.message || "Internal server error" });
});

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();
    await fs.mkdir(path.join(__dirname, "uploads"), { recursive: true });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
