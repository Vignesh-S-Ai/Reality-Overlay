import OpenAI from "openai";

const analysisSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 6,
    },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
        additionalProperties: false,
      },
      minItems: 3,
      maxItems: 6,
    },
    simpleExplanation: { type: "string" },
  },
  required: ["summary", "keyPoints", "flashcards", "simpleExplanation"],
  additionalProperties: false,
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function splitIntoSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function pickImportantLines(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 24);

  if (lines.length >= 3) {
    return lines.slice(0, 5);
  }

  return splitIntoSentences(text).slice(0, 5);
}

function generateFallbackFlashcards(points) {
  return points.slice(0, 4).map((point, index) => ({
    question: `What is a key idea from point ${index + 1}?`,
    answer: point,
  }));
}

function buildFallbackAnalysis(text) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const sentences = splitIntoSentences(normalizedText);
  const points = pickImportantLines(text);
  const summary = sentences.slice(0, 2).join(" ") || normalizedText.slice(0, 280);
  const simpleExplanation = points.length
    ? `In simple terms, this topic is mainly about ${points
        .slice(0, 2)
        .join(" and ")
        .replace(/\.$/, "")}.`
    : "This text explains a study topic in a more detailed academic way.";

  return {
    provider: "local fallback",
    summary,
    keyPoints: points.length ? points : ["No key points generated."],
    flashcards: generateFallbackFlashcards(points.length ? points : [summary]),
    simpleExplanation,
  };
}

function normalizeAnalysis(rawAnalysis, provider) {
  const safeKeyPoints = Array.isArray(rawAnalysis.keyPoints)
    ? rawAnalysis.keyPoints.filter(Boolean).slice(0, 6)
    : [];
  const safeFlashcards = Array.isArray(rawAnalysis.flashcards)
    ? rawAnalysis.flashcards
        .filter((card) => card?.question && card?.answer)
        .slice(0, 6)
        .map((card) => ({
          question: card.question,
          answer: card.answer,
        }))
    : [];

  return {
    provider,
    summary: rawAnalysis.summary?.trim() || "No summary generated.",
    keyPoints: safeKeyPoints.length ? safeKeyPoints : ["No key points generated."],
    flashcards: safeFlashcards.length
      ? safeFlashcards
      : [{ question: "What is the main idea?", answer: rawAnalysis.summary?.trim() || "Not available." }],
    simpleExplanation: rawAnalysis.simpleExplanation?.trim() || "No simple explanation generated.",
  };
}

export async function analyzeStudyText(text) {
  const normalizedText = text.trim();
  const client = getOpenAIClient();

  if (!client) {
    // Keep the app usable without an API key during local setup or demos.
    return buildFallbackAnalysis(normalizedText);
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      reasoning: {
        effort: "low",
      },
      input: [
        {
          role: "system",
          content:
            "You are a helpful study assistant. Return valid JSON that matches the provided schema. Keep the writing concise, accurate, and student-friendly.",
        },
        {
          role: "user",
          content: `Summarize the following text, extract key points, generate flashcards, and explain it simply.\n\nTEXT:\n${normalizedText}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "study_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    return normalizeAnalysis(parsed, "OpenAI");
  } catch (error) {
    console.error("OpenAI analysis failed, switching to local fallback.", error);
    return buildFallbackAnalysis(normalizedText);
  }
}
