import { MODE_OPTIONS, formatConfidenceScore, getModeLabel } from "../utils/modes";

function MetaChip({ children, tone = "neutral" }) {
  const toneClasses = {
    neutral:
      "border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  };

  return (
    <span className={`rounded-full border px-3 py-1.5 text-sm ${toneClasses[tone] || toneClasses.neutral}`}>
      {children}
    </span>
  );
}

function ModeSelector({ selectedMode, onModeChange, activeData, isLiveMode }) {
  return (
    <section className="glass-card rounded-[2rem] border border-white/70 p-6 shadow-glow dark:border-slate-700/60">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300">
            Intent Engine
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Multi-mode intelligence with auto intent detection.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            Auto mode detects the text intent and routes it to the right AI behavior. Manual mode locks the
            system to a specific output style for both upload analysis and the live overlay.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {MODE_OPTIONS.map((option) => {
            const isActive = selectedMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value)}
                className={`rounded-2xl border px-4 py-2.5 font-semibold transition hover:-translate-y-0.5 ${
                  isActive
                    ? "mode-chip-active border-amber-400/40 bg-amber-500/15 text-amber-700 dark:border-amber-400/30 dark:text-amber-200"
                    : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <MetaChip tone="amber">Preference: {getModeLabel(selectedMode)}</MetaChip>
        <MetaChip tone="emerald">
          Active mode: {activeData?.mode ? getModeLabel(activeData.mode) : selectedMode === "auto" ? "Waiting" : getModeLabel(selectedMode)}
        </MetaChip>
        <MetaChip tone="cyan">
          Intent: {activeData?.intent ? getModeLabel(activeData.intent) : "Waiting"}
        </MetaChip>
        <MetaChip>
          Confidence: {activeData ? formatConfidenceScore(activeData.confidenceScore) : "N/A"}
        </MetaChip>
        <MetaChip>{isLiveMode ? "Live overlay is active" : "Applies to upload and live analysis"}</MetaChip>
      </div>
    </section>
  );
}

export default ModeSelector;
