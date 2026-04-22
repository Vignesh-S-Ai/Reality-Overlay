export const AVAILABLE_INTENTS = ["study", "quick_info", "deep_explain"];
export const AVAILABLE_MODES = ["auto", ...AVAILABLE_INTENTS];

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function countMatches(text, expressions) {
  return expressions.reduce((total, expression) => {
    const matches = text.match(expression);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

export function normalizeRequestedMode(mode) {
  if (typeof mode !== "string") {
    return "auto";
  }

  const normalizedMode = mode.trim().toLowerCase();
  return AVAILABLE_MODES.includes(normalizedMode) ? normalizedMode : "auto";
}

export function sanitizeModeResult(result) {
  return {
    summary: typeof result?.summary === "string" ? result.summary.trim() : "",
    keyPoints: Array.isArray(result?.keyPoints)
      ? result.keyPoints
          .map((point) => (typeof point === "string" ? point.trim() : ""))
          .filter(Boolean)
      : [],
    flashcards: Array.isArray(result?.flashcards)
      ? result.flashcards
          .filter((card) => card?.question && card?.answer)
          .map((card) => ({
            question: String(card.question).trim(),
            answer: String(card.answer).trim(),
          }))
      : [],
    explanation: typeof result?.explanation === "string" ? result.explanation.trim() : "",
  };
}

export function createIdleResult(mode) {
  const message = "Point the camera at readable notes, a handout, or a slide.";

  if (mode === "study") {
    return {
      summary: message,
      keyPoints: [],
      flashcards: [],
      explanation: "Study mode will generate revision-friendly notes once readable text appears.",
    };
  }

  if (mode === "deep_explain") {
    return {
      summary: message,
      keyPoints: [],
      flashcards: [],
      explanation: "Deep Explain mode will break the text down step by step once content is detected.",
    };
  }

  return {
    summary: message,
    keyPoints: [],
    flashcards: [],
    explanation: message,
  };
}

export function detectIntent(text) {
  const normalizedText = normalizeWhitespace(text);
  const lowerText = normalizedText.toLowerCase();
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const words = normalizedText ? normalizedText.split(/\s+/).filter(Boolean) : [];
  const sentences = normalizedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const bulletLineCount = lines.filter((line) => /^([-*]|\d+\.)\s+/.test(line)).length;
  const definitionMatches = countMatches(lowerText, [
    /\bdefinition\b/g,
    /\bdefined as\b/g,
    /\brefers to\b/g,
    /\bmeans\b/g,
    /\bis\s+(an?|the)\b/g,
  ]);
  const studySignalCount = countMatches(lowerText, [
    /\bnotes?\b/g,
    /\blecture\b/g,
    /\bchapter\b/g,
    /\btopic\b/g,
    /\bsummary\b/g,
    /\bkey point\b/g,
    /\bformula\b/g,
    /\btheorem\b/g,
    /\bexam\b/g,
    /\bquiz\b/g,
    /\brevision\b/g,
    /\bflashcards?\b/g,
  ]);
  const explainSignalCount = countMatches(lowerText, [
    /\bhow\b/g,
    /\bwhy\b/g,
    /\bprocess\b/g,
    /\bmechanism\b/g,
    /\btherefore\b/g,
    /\bbecause\b/g,
    /\bstep\b/g,
    /\bbreak down\b/g,
    /\bderive\b/g,
    /\banalysis\b/g,
  ]);
  const hasQuestion = /\?/.test(text);
  const averageSentenceLength = sentences.length ? words.length / sentences.length : words.length;

  const scores = {
    study: 0,
    quick_info: 0,
    deep_explain: 0,
  };

  if (words.length <= 24) {
    scores.quick_info += 2.2;
  }

  if (definitionMatches > 0) {
    scores.quick_info += 2 + Math.min(definitionMatches, 2);
  }

  if (hasQuestion) {
    scores.quick_info += 1.6;
  }

  if (studySignalCount > 0) {
    scores.study += 1.8 + Math.min(studySignalCount, 3) * 0.6;
  }

  if (bulletLineCount >= 2) {
    scores.study += 2.4;
  }

  if (lines.length >= 3) {
    scores.study += 0.9;
  }

  if (words.length >= 75) {
    scores.deep_explain += 2.6;
  }

  if (sentences.length >= 4) {
    scores.deep_explain += 1.8;
  }

  if (averageSentenceLength >= 16) {
    scores.deep_explain += 1.2;
  }

  if (explainSignalCount > 0) {
    scores.deep_explain += 1.3 + Math.min(explainSignalCount, 3) * 0.5;
  }

  if (hasQuestion && /\b(how|why|explain)\b/i.test(lowerText)) {
    scores.deep_explain += 1.8;
  }

  if (studySignalCount >= 2 && words.length >= 35) {
    scores.study += 1.4;
  }

  const rankedIntents = Object.entries(scores).sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1]);
  const [intent, topScore] = rankedIntents[0];
  const secondScore = rankedIntents[1]?.[1] || 0;
  const confidenceScore = roundToTwoDecimals(
    clamp(0.52 + topScore / 8 + (topScore - secondScore) / 6, 0.55, 0.98)
  );

  return {
    intent,
    confidenceScore,
    scores,
    metrics: {
      wordCount: words.length,
      sentenceCount: sentences.length,
      lineCount: lines.length,
      bulletLineCount,
    },
  };
}
