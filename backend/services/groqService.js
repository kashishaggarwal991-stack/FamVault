const {
  createGroqChatCompletion,
  extractAssistantText,
  parseJsonResponse,
} = require("./groqClient");

/**
 * Calls Groq API to classify, summarize, and tag a document.
 * Falls back to mock data if API fails — safe for hackathon demos.
 *
 * @param {string} filename - Original uploaded filename
 * @param {string} fileType - MIME type of the file
 * @returns {object} { category, summary, extractedInfo, tags }
 */
const processDocumentWithAI = async (filename, fileType) => {
  const prompt = `
You are an AI assistant for a Family Digital Vault application.
A document has been uploaded with the following details:
- Filename: "${filename}"
- File type: "${fileType}"

Based on the filename and type, do the following:
1. Classify the document into one of these categories:
   Identity Proof, Medical Record, Insurance Policy, Financial Document,
   Educational Certificate, Legal Document, Property Document, Tax Document, Other
2. Write a short 1-line summary of what this document likely contains.
3. Extract 3-5 likely key fields as JSON key-value pairs (e.g., "Document Type", "Issuing Authority").
4. Generate 5 relevant search tags (lowercase, single words or short phrases).

Respond ONLY with this exact JSON format, no extra text:
{
  "category": "...",
  "summary": "...",
  "extractedInfo": {
    "key1": "value1",
    "key2": "value2"
  },
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

  try {
    const response = await createGroqChatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    });
    const parsed = parseJsonResponse(extractAssistantText(response));

    return {
      category: parsed.category || "Other",
      summary: parsed.summary || "",
      extractedInfo: parsed.extractedInfo || {},
      tags: parsed.tags || [],
    };
  } catch (err) {
    console.error("⚠️  Groq AI failed, using mock fallback:", err.message);

    // ── Mock fallback — demo won't break if API is down ──
    return getMockAIResult(filename, fileType);
  }
};

// Deterministic mock based on filename keywords
const getMockAIResult = (filename, fileType) => {
  const name = filename.toLowerCase();

  if (name.includes("aadhaar") || name.includes("aadhar")) {
    return {
      category: "Identity Proof",
      summary: "Aadhaar card — government-issued identity document",
      extractedInfo: { "Document Type": "Aadhaar Card", "Issued By": "UIDAI" },
      tags: ["aadhaar", "identity", "government", "uid", "id proof"],
    };
  }
  if (name.includes("pan")) {
    return {
      category: "Identity Proof",
      summary: "PAN card — permanent account number issued by Income Tax dept",
      extractedInfo: { "Document Type": "PAN Card", "Issued By": "Income Tax Dept" },
      tags: ["pan", "income tax", "identity", "financial", "id proof"],
    };
  }
  if (name.includes("insurance")) {
    return {
      category: "Insurance Policy",
      summary: "Insurance policy document with coverage details",
      extractedInfo: { "Document Type": "Insurance Policy", "Type": "Unknown" },
      tags: ["insurance", "policy", "coverage", "premium", "claim"],
    };
  }
  if (name.includes("medical") || name.includes("prescription") || name.includes("report")) {
    return {
      category: "Medical Record",
      summary: "Medical document — could be prescription or health report",
      extractedInfo: { "Document Type": "Medical Record", "Department": "Healthcare" },
      tags: ["medical", "health", "doctor", "prescription", "report"],
    };
  }
  if (name.includes("marksheet") || name.includes("certificate") || name.includes("degree")) {
    return {
      category: "Educational Certificate",
      summary: "Educational certificate or marksheet",
      extractedInfo: { "Document Type": "Certificate", "Field": "Education" },
      tags: ["education", "certificate", "marks", "degree", "academic"],
    };
  }

  // Generic fallback
  const isPDF = fileType === "application/pdf";
  return {
    category: "Other",
    summary: `Uploaded ${isPDF ? "PDF" : "image"} document — manual review recommended`,
    extractedInfo: { "Document Type": "Unknown", "File Type": fileType },
    tags: ["document", "uploaded", isPDF ? "pdf" : "image", "family", "vault"],
  };
};

module.exports = { processDocumentWithAI };
