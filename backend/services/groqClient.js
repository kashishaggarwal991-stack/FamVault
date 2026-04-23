const axios = require("axios");

const DEFAULT_GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const createGroqChatCompletion = async ({
  messages,
  temperature = 0.2,
  max_tokens = 400,
  model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
}) => {
  const apiKey = process.env.GROQ_API_KEY;
  const apiUrl = process.env.GROQ_API_URL || DEFAULT_GROQ_API_URL;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const response = await axios.post(
    apiUrl,
    {
      model,
      messages,
      temperature,
      max_tokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  return response.data;
};

const extractAssistantText = (responseData) => {
  const content = responseData?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
};

const parseJsonResponse = (rawText) => {
  const cleaned = String(rawText || "").replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
};

module.exports = {
  createGroqChatCompletion,
  extractAssistantText,
  parseJsonResponse,
  DEFAULT_GROQ_API_URL,
  DEFAULT_GROQ_MODEL,
};
