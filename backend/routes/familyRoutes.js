const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { mutateDatabase } = require("../data/database");

router.post("/request", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can send requests" });
    }

    if (!req.user.familyId) {
      return res.status(400).json({ message: "Admin must belong to a family" });
    }

    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    const result = await mutateDatabase(async (db) => {
      const member = db.users.find((user) => user._id === memberId);
      if (!member) {
        return { status: 404, body: { message: "Member not found" } };
      }

      if (member.role !== "member") {
        return { status: 400, body: { message: "Admin cannot send request to admin" } };
      }

      if (member.familyId) {
        return { status: 400, body: { message: "Member already belongs to a family" } };
      }

      const requests = Array.isArray(member.requests) ? member.requests : [];
      const duplicate = requests.find((request) => request.status === "pending");

      if (duplicate) {
        return { status: 409, body: { message: "Request already sent" } };
      }

      const nextRequest = {
        _id: randomUUID(),
        adminId: req.user._id,
        adminName: req.user.name,
        familyId: req.user.familyId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      member.requests = [...requests, nextRequest];
      member.updatedAt = new Date().toISOString();

      return {
        status: 201,
        body: { message: "Join request sent", request: nextRequest },
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: "Failed to send request" });
  }
});

router.post("/accept", protect, async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    const result = await mutateDatabase(async (db) => {
      const member = db.users.find((user) => user._id === req.user._id);
      if (!member) {
        return { status: 404, body: { message: "User not found" } };
      }

      if (member.role !== "member") {
        return { status: 403, body: { message: "Only members can accept requests" } };
      }

      if (member.familyId) {
        return { status: 400, body: { message: "Member already belongs to a family" } };
      }

      const requests = Array.isArray(member.requests) ? member.requests : [];
      const request = requests.find((entry) => entry._id === requestId);
      if (!request) {
        return { status: 404, body: { message: "Request not found" } };
      }

      if (request.status !== "pending") {
        return { status: 400, body: { message: `Request already ${request.status}` } };
      }

      const admin = db.users.find((user) => user._id === request.adminId);
      if (!admin || admin.role !== "admin" || !admin.familyId) {
        return { status: 400, body: { message: "Admin family is no longer available" } };
      }

      member.familyId = admin.familyId;
      db.documents.forEach((document) => {
        if (document.uploadedBy === member._id && !document.familyId) {
          document.familyId = admin.familyId;
          document.updatedAt = new Date().toISOString();
        }
      });
      member.requests = requests.map((entry) =>
        entry._id === requestId ? { ...entry, status: "accepted" } : entry
      );
      member.updatedAt = new Date().toISOString();

      return {
        status: 200,
        body: {
          message: "Join request accepted",
          user: {
            _id: member._id,
            name: member.name,
            username: member.username || "",
            email: member.email,
            role: member.role,
            familyId: member.familyId,
            requests: member.requests,
          },
        },
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: "Failed to accept request" });
  }
});

router.post("/reject", protect, async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    const result = await mutateDatabase(async (db) => {
      const member = db.users.find((user) => user._id === req.user._id);
      if (!member) {
        return { status: 404, body: { message: "User not found" } };
      }

      if (member.role !== "member") {
        return { status: 403, body: { message: "Only members can reject requests" } };
      }

      const requests = Array.isArray(member.requests) ? member.requests : [];
      const request = requests.find((entry) => entry._id === requestId);
      if (!request) {
        return { status: 404, body: { message: "Request not found" } };
      }

      if (request.status !== "pending") {
        return { status: 400, body: { message: `Request already ${request.status}` } };
      }

      member.requests = requests.map((entry) =>
        entry._id === requestId ? { ...entry, status: "rejected" } : entry
      );
      member.updatedAt = new Date().toISOString();

      return {
        status: 200,
        body: {
          message: "Join request rejected",
          user: {
            _id: member._id,
            name: member.name,
            username: member.username || "",
            email: member.email,
            role: member.role,
            familyId: member.familyId || null,
            requests: member.requests,
          },
        },
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: "Failed to reject request" });
  }
});

router.post("/remove-member", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    if (!req.user.familyId) {
      return res.status(400).json({ message: "Admin must belong to a family" });
    }

    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    const result = await mutateDatabase(async (db) => {
      const member = db.users.find((user) => user._id === memberId);
      if (!member) {
        return { status: 404, body: { message: "Member not found" } };
      }

      if (member._id === req.user._id) {
        return { status: 400, body: { message: "Admin cannot remove themselves" } };
      }

      if (member.role !== "member") {
        return { status: 400, body: { message: "Only members can be removed" } };
      }

      if (member.familyId !== req.user.familyId) {
        return { status: 403, body: { message: "Member does not belong to your family" } };
      }

      const previousFamilyId = member.familyId;
      member.familyId = null;
      member.updatedAt = new Date().toISOString();
      db.documents.forEach((document) => {
        if (document.uploadedBy === member._id && document.familyId === previousFamilyId) {
          document.familyId = null;
          document.updatedAt = new Date().toISOString();
        }
      });

      return {
        status: 200,
        body: {
          message: "Member removed from family",
          user: {
            _id: member._id,
            name: member.name,
            username: member.username || "",
            email: member.email,
            role: member.role,
            familyId: member.familyId,
            requests: member.requests,
          },
        },
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: "Failed to remove member" });
  }
});

router.post("/leave", protect, async (req, res) => {
  try {
    if (req.user.role !== "member") {
      return res.status(403).json({ message: "Only members can leave a family" });
    }

    const result = await mutateDatabase(async (db) => {
      const member = db.users.find((user) => user._id === req.user._id);
      if (!member) {
        return { status: 404, body: { message: "User not found" } };
      }

      if (!member.familyId) {
        return { status: 400, body: { message: "You are not part of a family" } };
      }

      const previousFamilyId = member.familyId;
      member.familyId = null;
      member.updatedAt = new Date().toISOString();
      db.documents.forEach((document) => {
        if (document.uploadedBy === member._id && document.familyId === previousFamilyId) {
          document.familyId = null;
          document.updatedAt = new Date().toISOString();
        }
      });

      return {
        status: 200,
        body: {
          message: "You left the family",
          user: {
            _id: member._id,
            name: member.name,
            username: member.username || "",
            email: member.email,
            role: member.role,
            familyId: member.familyId,
            requests: member.requests,
          },
        },
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: "Failed to leave family" });
  }
});

module.exports = router;

// ── GET /api/family/members ──────────────────────────────
// Returns all users in the same family as the logged-in user
router.get("/members", protect, async (req, res) => {
  try {
    if (!req.user.familyId) {
      return res.json([]);
    }

    const { getDatabase } = require("../data/database");
    const db = await getDatabase();

    const members = db.users
      .filter((user) => user.familyId === req.user.familyId)
      .map(({ password, ...safe }) => safe);

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch family members" });
  }
});
