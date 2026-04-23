const express = require("express");
const { protect } = require("../middleware/auth");
const { getDatabase, mutateDatabase } = require("../data/database");
const { sanitizeDocument } = require("../data/documents");

const router = express.Router();

// Helper to populate document with uploader info
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

// ── GET /api/emergency ─────────────────────────────────────
// Any authenticated family member can get emergency documents
router.get("/", protect, async (req, res) => {
  try {
    const db = await getDatabase();
    const emergencyIds = db.emergencyDocuments || [];
    const userFamilyId = req.user.familyId;

    // Map IDs to documents, filter by family and existing docs
    const documents = emergencyIds
      .map((id) => {
        const doc = db.documents.find((d) => d._id === id);
        if (!doc) return null;
        if (doc.familyId !== userFamilyId) return null;
        return populateDocument(doc, db.users);
      })
      .filter((doc) => doc !== null);

    res.json({ documents });
  } catch (err) {
    console.error("Error fetching emergency documents:", err);
    res.status(500).json({ message: "Failed to fetch emergency documents" });
  }
});

// ── POST /api/emergency/add ────────────────────────────────
// Admin only - add document to emergency list
router.post("/add", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }

    const db = await getDatabase();
    const document = db.documents.find((d) => d._id === documentId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.familyId !== req.user.familyId) {
      return res.status(403).json({ message: "Document does not belong to your family" });
    }

    const emergencyDocs = db.emergencyDocuments || [];
    if (emergencyDocs.includes(documentId)) {
      return res.status(409).json({ message: "Already in emergency tab" });
    }

    await mutateDatabase(async (db) => {
      if (!Array.isArray(db.emergencyDocuments)) {
        db.emergencyDocuments = [];
      }
      db.emergencyDocuments.push(documentId);
    });

    res.status(201).json({ message: "Added to emergency", documentId });
  } catch (err) {
    console.error("Error adding to emergency:", err);
    res.status(500).json({ message: "Failed to add to emergency" });
  }
});

// ── DELETE /api/emergency/:documentId ─────────────────────
// Admin only - remove document from emergency list
router.delete("/:documentId", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { documentId } = req.params;

    const db = await getDatabase();
    const emergencyDocs = db.emergencyDocuments || [];
    const index = emergencyDocs.indexOf(documentId);

    if (index === -1) {
      return res.status(404).json({ message: "Document not found in emergency list" });
    }

    await mutateDatabase(async (db) => {
      const idx = db.emergencyDocuments.indexOf(documentId);
      if (idx !== -1) {
        db.emergencyDocuments.splice(idx, 1);
      }
    });

    res.json({ message: "Removed from emergency", documentId });
  } catch (err) {
    console.error("Error removing from emergency:", err);
    res.status(500).json({ message: "Failed to remove from emergency" });
  }
});

// ── GET /api/emergency/check/:documentId ───────────────────
// Admin only - check if document is in emergency list
router.get("/check/:documentId", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { documentId } = req.params;

    const db = await getDatabase();
    const emergencyDocs = db.emergencyDocuments || [];
    const inEmergency = emergencyDocs.includes(documentId);

    res.json({ inEmergency });
  } catch (err) {
    console.error("Error checking emergency status:", err);
    res.status(500).json({ message: "Failed to check emergency status" });
  }
});

module.exports = router;
