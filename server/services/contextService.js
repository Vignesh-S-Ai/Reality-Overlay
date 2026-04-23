const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || "http://localhost:5001";

const objectCache = {
  key: "",
  value: null,
  timestamp: 0,
};

const CACHE_TTL_MS = 3000;

const FOOD_KEYWORDS = [
  "apple", "banana", "orange", "pizza", "burger", "sandwich", "cake",
  "broccoli", "carrot", "tomato", "lettuce", "egg", "bread",
  "rice", "pasta", "chicken", "meat", "fish", "cheese", "milk",
  "juice", "coffee", "tea", "wine", "beer", "bowl", "cup", "plate",
  "spoon", "fork", "knife", "banana", "grape", "strawberry"
];

const TECH_KEYWORDS = [
  "laptop", "computer", "monitor", "keyboard", "mouse", "phone",
  "smartphone", "tablet", "tv", "television", "remote", "camera",
  "headphones", "speaker", "charger", "cable", "router", "printer",
  "gamepad", "controller", "console", "watch", "clock", "radio"
];

const STUDY_KEYWORDS = [
  "book", "notebook", "paper", "pen", "pencil", "eraser", "ruler",
  "backpack", "magazine", "newspaper", "document", "textbook",
  "dictionary", "folder", "envelope", "stamp", "letter"
];

function normalizeComparisonText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getCacheKey(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return "";
  }
  return imageBase64.slice(-200);
}

function getObjectKeyFromObjects(objects) {
  if (!objects || !Array.isArray(objects) || objects.length === 0) {
    return "";
  }
  return objects.map(o => `${o.label}:${Math.round((o.confidence || 0) * 10) / 10}`).sort().join("|");
}

export async function detectObjects(imageBase64) {
  const currentTime = Date.now();
  const cacheKey = getCacheKey(imageBase64);

  if (objectCache.key === cacheKey &&
      objectCache.value &&
      currentTime - objectCache.timestamp < CACHE_TTL_MS) {
    return { objects: objectCache.value, cached: true };
  }

  try {
    const response = await fetch(`${YOLO_SERVICE_URL}/detect-objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
      throw new Error(`YOLO service returned ${response.status}`);
    }

    const data = await response.json();

    const detectedObjects = data.objects || [];
    objectCache.key = cacheKey;
    objectCache.value = detectedObjects;
    objectCache.timestamp = currentTime;

    return { objects: detectedObjects, cached: false };
  } catch (error) {
    console.error("Object detection error:", error);
    return { objects: [], cached: false };
  }
}

export function detectObjectContext(objects) {
  const labels = objects.map(o => o.label.toLowerCase());

  const foodCount = labels.filter(label => FOOD_KEYWORDS.some(kw => label.includes(kw))).length;
  const techCount = labels.filter(label => TECH_KEYWORDS.some(kw => label.includes(kw))).length;
  const studyCount = labels.filter(label => STUDY_KEYWORDS.some(kw => label.includes(kw))).length;

  const contexts = [];
  if (foodCount > 0) contexts.push({ type: "health", score: foodCount });
  if (techCount > 0) contexts.push({ type: "tech", score: techCount });
  if (studyCount > 0) contexts.push({ type: "study", score: studyCount });

  contexts.sort((a, b) => b.score - a.score);

  return contexts.length > 0 ? contexts[0].type : "general";
}

export function generateSceneContext(ocrText, objects) {
  const context = {
    hasText: Boolean(ocrText?.trim()),
    textPreview: "",
    objects: objects || [],
    objectLabels: [],
    primaryContext: "general",
  };

  if (ocrText?.trim()) {
    context.textPreview = normalizeComparisonText(ocrText).slice(0, 100);
  }

  if (objects && objects.length > 0) {
    context.objectLabels = objects.map(o => o.label);
    context.primaryContext = detectObjectContext(objects);
  }

  return context;
}

export function buildContextAwarePayload(ocrResult, yoloResult) {
  const text = ocrResult?.text || "";
  const objects = yoloResult?.objects || [];
  const sceneContext = generateSceneContext(text, objects);

  return {
    text,
    ocrSnippets: ocrResult?.snippets || [],
    ocrRegions: ocrResult?.regions || [],
    objects,
    objectLabels: sceneContext.objectLabels,
    primaryContext: sceneContext.primaryContext,
    context: sceneContext,
    yoloCached: yoloResult?.cached || false,
  };
}