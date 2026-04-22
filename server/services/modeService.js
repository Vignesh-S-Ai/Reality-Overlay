import { analyzeTextByMode } from "./aiService.js";
import {
  createIdleResult,
  detectIntent,
  normalizeRequestedMode,
} from "./intentService.js";

const intentCache = {
  key: "",
  value: null,
};

const resultCache = {
  key: "",
  value: null,
};

function normalizeCacheText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getModeSource(requestedMode) {
  return requestedMode === "auto" ? "auto" : "manual";
}

export function buildIdleModePayload(requestedMode, live = false) {
  const safeMode = normalizeRequestedMode(requestedMode);
  const resolvedMode = safeMode === "auto" ? "quick_info" : safeMode;

  return {
    intent: "quick_info",
    mode: resolvedMode,
    modeSource: getModeSource(safeMode),
    confidenceScore: 0,
    provider: "system",
    reusedAnalysis: false,
    result: createIdleResult(live ? resolvedMode : "quick_info"),
  };
}

export async function processTextThroughModeEngine(
  text,
  { requestedMode = "auto", live = false, allowCache = true } = {}
) {
  const normalizedText = text.trim();
  const safeRequestedMode = normalizeRequestedMode(requestedMode);
  const intentKey = normalizeCacheText(normalizedText);

  let intentPayload = allowCache && intentCache.key === intentKey ? intentCache.value : null;

  if (!intentPayload) {
    intentPayload = detectIntent(normalizedText);
    intentCache.key = intentKey;
    intentCache.value = intentPayload;
  }

  const mode = safeRequestedMode === "auto" ? intentPayload.intent : safeRequestedMode;
  const responseKey = `${live ? "live" : "standard"}::${mode}::${intentKey}`;

  if (allowCache && resultCache.key === responseKey && resultCache.value) {
    return {
      ...resultCache.value,
      reusedAnalysis: true,
    };
  }

  const analysis = await analyzeTextByMode(normalizedText, { mode, live });
  const payload = {
    intent: intentPayload.intent,
    mode,
    modeSource: getModeSource(safeRequestedMode),
    confidenceScore: intentPayload.confidenceScore,
    provider: analysis.provider,
    reusedAnalysis: false,
    result: analysis.result,
  };

  resultCache.key = responseKey;
  resultCache.value = payload;

  return payload;
}
