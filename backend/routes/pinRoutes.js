const express = require("express");
const { randomUUID } = require("crypto");
const { getDatabase, mutateDatabase } = require("../data/database");
const { sanitizeDocument } = require("../data/documents");
const { protect } = require("../middleware/auth");

const router = express.Router();

const canAccessDocument = (user, document) => {
  if (!user || !document) return false;

  if (user.familyId) {
    return document.familyId === user.familyId;
  }

  return document.uploadedBy === user._id;
};

const buildUploader = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    username: user.username || "",
    email: user.email,
    role: user.role,
  };
};

const populateDocument = (document, users) => ({
  ...sanitizeDocument(document),
  uploadedBy: buildUploader(users.find((user) => user._id === document.uploadedBy)),
});

// ── GET /api/pins ───────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const db = await getDatabase();
    const userPins = (Array.isArray(db.pins) ? db.pins : [])
      .filter((pin) => pin.userId === req.user._id)
      .sort((a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime());

    const pins = userPins
      .map((pin) => {
        const document = db.documents.find((doc) => doc._id === pin.documentId);
        if (!document || !canAccessDocument(req.user, document)) return null;

        return {
          pinId: pin._id,
          pinnedAt: pin.pinnedAt,
          document: populateDocument(document, db.users),
        };
      })
      .filter(Boolean);

    res.json({ pins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pinned documents" });
  }
});

// ── POST /api/pins ──────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const db = await getDatabase();
    const document = db.documents.find((doc) => doc._id === documentId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(req.user, document)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const alreadyPinned = (Array.isArray(db.pins) ? db.pins : []).find(
      (pin) => pin.userId === req.user._id && pin.documentId === documentId
    );

    if (alreadyPinned) {
      return res.status(409).json({ message: "Document is already pinned" });
    }

    const pin = await mutateDatabase(async (workingDb) => {
      if (!Array.isArray(workingDb.pins)) {
        workingDb.pins = [];
      }

      const newPin = {
        _id: randomUUID(),
        userId: req.user._id,
        documentId,
        pinnedAt: new Date().toISOString(),
      };

      workingDb.pins.push(newPin);
      return newPin;
    });

    res.status(201).json({ message: "Document pinned", pin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to pin document" });
  }
});

// ── DELETE /api/pins/:documentId ────────────────────────
router.delete("/:documentId", protect, async (req, res) => {
  try {
    const result = await mutateDatabase(async (db) => {
      if (!Array.isArray(db.pins)) {
        db.pins = [];
      }

      const index = db.pins.findIndex(
        (pin) => pin.userId === req.user._id && pin.documentId === req.params.documentId
      );

      if (index === -1) {
        return null;
      }

      db.pins.splice(index, 1);
      return { documentId: req.params.documentId };
    });

    if (!result) {
      return res.status(404).json({ message: "Pin not found" });
    }

    res.json({ message: "Document unpinned", documentId: result.documentId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to unpin document" });
  }
});

// ── GET /api/pins/check/:documentId ─────────────────────
router.get("/check/:documentId", protect, async (req, res) => {
  try {
    const db = await getDatabase();
    const pin = (Array.isArray(db.pins) ? db.pins : []).find(
      (entry) => entry.userId === req.user._id && entry.documentId === req.params.documentId
    );

    res.json({ isPinned: Boolean(pin), pinId: pin?._id || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to check pin status" });
  }
});

module.exports = router;
