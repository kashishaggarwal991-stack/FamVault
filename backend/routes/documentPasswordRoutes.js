const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { deleteOtp, getOtp, isExpired, storeOtp } = require("../data/otpStore");
const {
  getRawDocumentWithPassword,
  updateDocumentById,
} = require("../data/documents");
const { protect } = require("../middleware/auth");
const { generateOtp, sendDocumentPasswordResetOtp } = require("../services/emailService");

const canAccessDocument = (user, document) => {
  if (!user || !document) return false;

  if (user.familyId) {
    return document.familyId === user.familyId;
  }

  return document.uploadedBy === user._id;
};

const canManageDocumentPassword = (user, document) =>
  Boolean(
    user &&
      document &&
      (document.uploadedBy === user._id || (user.role === "admin" && user.familyId === document.familyId))
  );

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "";
  return `${name[0]}***@${domain}`;
};

const loadAccessibleDocument = async (req, res) => {
  const doc = await getRawDocumentWithPassword(req.params.id);
  if (!doc) {
    res.status(404).json({ message: "Document not found" });
    return null;
  }

  if (!canAccessDocument(req.user, doc)) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }

  return doc;
};

router.post("/:id/verify-password", protect, async (req, res) => {
  try {
    const doc = await loadAccessibleDocument(req, res);
    if (!doc) return;

    if (!doc.isPasswordProtected) {
      return res.status(200).json({ message: "Document is not password protected", protected: false });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Document password is required" });
    }

    const matches = await bcrypt.compare(String(password), doc.documentPassword || "");
    if (!matches) {
      return res.status(401).json({ message: "Incorrect document password" });
    }

    // Security: this access token unlocks only this document for this user and expires in 30 minutes.
    const accessToken = jwt.sign(
      { userId: req.user._id, documentId: req.params.id, purpose: "doc-access" },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.status(200).json({ accessToken, expiresIn: 1800 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to verify document password" });
  }
});

router.post("/:id/set-password", protect, async (req, res) => {
  try {
    const doc = await loadAccessibleDocument(req, res);
    if (!doc) return;

    if (!canManageDocumentPassword(req.user, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const password = String(req.body.password || "");
    if (password.length < 4) {
      return res.status(400).json({ message: "Document password must be at least 4 characters" });
    }

    const hash = await bcrypt.hash(password, 10);
    await updateDocumentById(req.params.id, {
      isPasswordProtected: true,
      documentPassword: hash,
    });

    res.status(200).json({ message: "Document password set successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to set document password" });
  }
});

router.delete("/:id/remove-password", protect, async (req, res) => {
  try {
    const doc = await loadAccessibleDocument(req, res);
    if (!doc) return;

    if (!canManageDocumentPassword(req.user, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Current document password is required" });
    }

    // Security: password protection cannot be removed without the current password.
    const matches = await bcrypt.compare(String(password), doc.documentPassword || "");
    if (!matches) {
      return res.status(401).json({ message: "Incorrect document password" });
    }

    await updateDocumentById(req.params.id, {
      isPasswordProtected: false,
      documentPassword: null,
    });

    res.status(200).json({ message: "Password protection removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove password protection" });
  }
});

router.post("/:id/forgot-password", protect, async (req, res) => {
  try {
    const doc = await loadAccessibleDocument(req, res);
    if (!doc) return;

    if (!doc.isPasswordProtected) {
      return res.status(400).json({ message: "Document is not password protected" });
    }

    const otp = generateOtp();
    // Security: document password reset OTPs reuse the 10-minute OTP store expiry.
    storeOtp(req.user.email, otp, "doc-password-reset", { documentId: req.params.id });

    try {
      await sendDocumentPasswordResetOtp(req.user.email, otp, doc.originalName);
    } catch (emailError) {
      console.error(emailError);
      deleteOtp(req.user.email);
      return res.status(500).json({ message: "Failed to send OTP email. Check email settings." });
    }

    res.status(200).json({
      message: "OTP sent to your registered email address",
      email: maskEmail(req.user.email),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to start document password reset" });
  }
});

router.post("/:id/reset-password", protect, async (req, res) => {
  try {
    const doc = await loadAccessibleDocument(req, res);
    if (!doc) return;

    const { otp, newPassword, confirmPassword } = req.body;
    const password = String(newPassword || "");

    if (password !== String(confirmPassword || "")) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "Document password must be at least 4 characters" });
    }

    const entry = getOtp(req.user.email);
    if (!entry) {
      return res.status(400).json({ message: "No pending document password reset. Please request a new OTP." });
    }

    if (entry.purpose !== "doc-password-reset") {
      return res.status(400).json({ message: "Invalid OTP purpose." });
    }

    if (entry.userData?.documentId !== req.params.id) {
      return res.status(400).json({ message: "OTP does not match this document." });
    }

    if (isExpired(entry)) {
      deleteOtp(req.user.email);
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    if (entry.otp !== String(otp)) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    const hash = await bcrypt.hash(password, 10);
    await updateDocumentById(req.params.id, {
      isPasswordProtected: true,
      documentPassword: hash,
    });
    deleteOtp(req.user.email);

    res.status(200).json({ message: "Document password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset document password" });
  }
});

router.get("/:id/protection-status", protect, async (req, res) => {
  try {
    const doc = await loadAccessibleDocument(req, res);
    if (!doc) return;

    res.status(200).json({
      isPasswordProtected: Boolean(doc.isPasswordProtected),
      documentName: doc.originalName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch document protection status" });
  }
});

module.exports = router;
