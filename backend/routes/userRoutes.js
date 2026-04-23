const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { searchAvailableMembersByUsername } = require("../data/users");

router.get("/search", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can search members" });
    }

    const username = String(req.query.username || "").trim();

    if (!username) {
      return res.status(400).json({ message: "Query parameter 'username' is required" });
    }

    const users = await searchAvailableMembersByUsername(username);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to search users" });
  }
});

module.exports = router;
