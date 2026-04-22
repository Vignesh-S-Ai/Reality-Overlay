import express from "express";
import { analyzeLiveText } from "../services/aiService.js";
import { extractLiveTextFromBase64 } from "../services/ocrService.js";

const router = express.Router();

function normalizeComparisonText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordSet(text) {
  return new Set(
    normalizeComparisonText(text)
      .split(" ")
      .map((word) => word.trim())
      .filter((word) => word.length >= 3)
  );
}

function getOverlapScore(firstText, secondText) {
  const firstWords = getWordSet(firstText);
  const secondWords = getWordSet(secondText);

  if (!firstWords.size || !secondWords.size) {
    return 0;
  }

  let sharedCount = 0;
  for (const word of firstWords) {
    if (secondWords.has(word)) {
      sharedCount += 1;
    }
  }

  return sharedCount / Math.max(firstWords.size, secondWords.size);
}

function isSimilarToPrevious(currentText, previousText) {
  if (!previousText?.trim()) {
    return false;
  }

  const normalizedCurrent = normalizeComparisonText(currentText);
  const normalizedPrevious = normalizeComparisonText(previousText);

  if (!normalizedCurrent || !normalizedPrevious) {
    return false;
  }

  if (normalizedCurrent === normalizedPrevious) {
    return true;
  }

  if (normalizedCurrent.includes(normalizedPrevious) || normalizedPrevious.includes(normalizedCurrent)) {
    return true;
  }

  return getOverlapScore(normalizedCurrent, normalizedPrevious) >= 0.82;
}

router.post("/", async (request, response, next) => {
  try {
    const {
      image,
      previousText = "",
      previousSummary = "",
      previousKeyPoints = [],
      forceAi = false,
    } = request.body;

    if (!image || typeof image !== "string") {
      return response.status(400).json({
        error: "A base64 image is required.",
      });
    }

    const { text, snippets, regions } = await extractLiveTextFromBase64(image);

    if (!text.trim()) {
      return response.json({
        text: "",
        summary: "Point the camera at readable notes, a handout, or a slide.",
        keyPoints: [],
        snippets: [],
        regions: [],
        provider: "system",
        reusedAnalysis: false,
      });
    }

    if (!forceAi && isSimilarToPrevious(text, previousText)) {
      return response.json({
        text,
        summary: previousSummary || "Same study content detected.",
        keyPoints: Array.isArray(previousKeyPoints) ? previousKeyPoints.slice(0, 2) : [],
        snippets,
        regions,
        provider: "cached",
        reusedAnalysis: true,
      });
    }

    const analysis = await analyzeLiveText(text);

    return response.json({
      text,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      snippets,
      regions,
      provider: analysis.provider,
      reusedAnalysis: false,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
