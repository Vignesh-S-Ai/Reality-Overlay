function LoadingState() {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 px-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-400" />
      <p className="mt-5 text-sm font-medium text-slate-600 dark:text-slate-300">
        Generating study insights...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 px-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">AI results will appear here</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
        Extract your text first, then run analysis to generate a summary, key points, flashcards, and a
        simple explanation.
      </p>
    </div>
  );
}

function ResultsPanel({ analysis, isLoading, onCopyResults, onDownloadFlashcards }) {
  return (
    <section className="glass-card rounded-[2rem] border border-white/70 p-6 shadow-glow dark:border-slate-700/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-700 dark:text-fuchsia-300">
            3. AI Results
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Study-ready output</h2>
        </div>

        {analysis ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCopyResults}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              Copy results
            </button>
            <button
              type="button"
              onClick={onDownloadFlashcards}
              className="rounded-2xl bg-fuchsia-600 px-4 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-fuchsia-500"
            >
              Download flashcards
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {isLoading ? <LoadingState /> : null}
        {!isLoading && !analysis ? <EmptyState /> : null}

        {!isLoading && analysis ? (
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Summary</h3>
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-700 dark:border-fuchsia-400/30 dark:text-fuchsia-200">
                  {analysis.provider}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{analysis.summary}</p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Key Points</h3>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {analysis.keyPoints.map((point, index) => (
                  <li key={`${point}-${index}`} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Simple Explanation</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                {analysis.simpleExplanation}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Flashcards</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {analysis.flashcards.map((card, index) => (
                  <article
                    key={`${card.question}-${index}`}
                    className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/70"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Card {index + 1}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                      {card.question}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ResultsPanel;
