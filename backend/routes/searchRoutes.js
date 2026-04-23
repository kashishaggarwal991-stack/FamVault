const express = require("express");
const router = express.Router();
const { listDocuments } = require("../data/documents");
const { protect } = require("../middleware/auth");
const {
  createGroqChatCompletion,
  extractAssistantText,
  parseJsonResponse,
} = require("../services/groqClient");

const canAccessDocument = (user, document) => {
  if (!user || !document) return false;

  if (user.familyId) {
    return document.familyId === user.familyId;
  }

  return document.uploadedBy === user._id;
};

/**
 * Uses Groq to convert a natural language query into search filters.
 * Falls back to simple regex search if AI fails.
 */
const extractSearchIntent = async (query) => {
  try {
    const prompt = `
A user is searching their Family Digital Vault with this query: "${query}"

Extract search intent and return ONLY this JSON (no extra text):
{
  "keywords": ["word1", "word2"],
  "category": "category name or null",
  "tags": ["tag1", "tag2"]
}

Categories available: Identity Proof, Medical Record, Insurance Policy,
Financial Document, Educational Certificate, Legal Document,
Property Document, Tax Document, Other
`;

    const response = await createGroqChatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 150,
    });

    return parseJsonResponse(extractAssistantText(response));
  } catch (err) {
    console.error("⚠️  Search AI failed, using basic fallback:", err.message);
    // Fallback: treat the whole query as keyword search
    return {
      keywords: query.toLowerCase().split(" ").filter(Boolean),
      category: null,
      tags: [],
    };
  }
};

// ── GET /api/search?q=your+query ─────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "Query parameter 'q' is required" });
    }

    // Get search intent from AI
    const intent = await extractSearchIntent(q);

    // Strip any accidental # prefix that AI may echo back
    const stripHash = (str) => String(str).replace(/^#/, "").toLowerCase();

    const keywords = Array.isArray(intent.keywords)
      ? intent.keywords.map((keyword) => String(keyword).toLowerCase()).filter(Boolean)
      : [];
    const tags = Array.isArray(intent.tags)
      ? intent.tags.map((tag) => String(tag).toLowerCase()).filter(Boolean)
      : [];

    const scopedDocuments = await listDocuments((document) => canAccessDocument(req.user, document));

    const results = scopedDocuments
      .filter((document) => {
        if (intent.category && document.category !== intent.category) {
          return false;
        }

        if (keywords.length === 0 && tags.length === 0) {
          return true;
        }

        const searchableFields = [
          document.originalName,
          document.summary,
          document.label,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        const keywordMatch = keywords.some((keyword) =>
          searchableFields.some((field) => field.includes(keyword))
        );

        const tagMatch = tags.some((tag) =>
          (Array.isArray(document.tags) ? document.tags : []).some(
            (docTag) => String(docTag).toLowerCase() === tag
          )
        );

        return keywordMatch || tagMatch;
      })
      .slice(0, 20);

    res.json({
      query: q,
      intent,          // Handy for debugging during demo
      count: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Search failed" });
  }
});

module.exports = router;
