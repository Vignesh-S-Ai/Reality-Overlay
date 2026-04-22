export const MODE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "study", label: "Study" },
  { value: "quick_info", label: "Quick Info" },
  { value: "deep_explain", label: "Deep Explain" },
];

export const MODE_LABELS = {
  auto: "Auto",
  study: "Study",
  quick_info: "Quick Info",
  deep_explain: "Deep Explain",
};

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || "Auto";
}

export function formatConfidenceScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "N/A";
  }

  return `${Math.round(score * 100)}%`;
}
