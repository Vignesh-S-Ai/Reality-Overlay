import express from "express";

const router = express.Router();

const VOICE_COMMAND_PATTERNS = {
  health: /^(health|food|nutrition|diet|eat|calories|healthy|eating)/i,
  tech: /^(tech|technology|device|computer|laptop|phone|tablet|gadget|electronic)/i,
  study: /^(study|studying|notes|lecture|exam|revision|read|book)/i,
  quick_info: /^(quick|info|what is|define|tell me|explain)/i,
  deep_explain: /^(explain|how|why|process|detail|deep|break down)/i,
};

function extractCommand(text) {
  const cleaned = text.trim().toLowerCase();
  return cleaned;
}

function matchMode(text) {
  const command = extractCommand(text);

  for (const [mode, pattern] of Object.entries(VOICE_COMMAND_PATTERNS)) {
    if (pattern.test(command)) {
      return mode;
    }
  }

  return "auto";
}

function extractQuery(text) {
  const cleaned = text.trim();
  return cleaned;
}

router.post("/process", (request, response) => {
  const { command = "", currentText = "" } = request.body;

  if (!command.trim()) {
    return response.status(400).json({
      error: "Voice command is required.",
    });
  }

  const mode = matchMode(command);
  const query = extractQuery(command);

  const responseText =
    mode === "health"
      ? "Switching to Health Mode for nutritional information."
      : mode === "tech"
        ? "Switching to Tech Mode for device information."
        : mode === "study"
          ? "Switching to Study Mode for notes."
          : mode === "deep_explain"
            ? "Switching to Deep Explain Mode."
            : "Analyzing in Auto Mode.";

  return response.json({
    recognizedCommand: query,
    mode,
    responseText,
    query: query || currentText,
  });
});

export default router;