function OCRViewer({
  extractedText,
  onTextChange,
  onExtract,
  onAnalyze,
  onCopy,
  hasImage,
  isOcrLoading,
  isAnalyzeLoading,
  wordCount,
}) {
  return (
    <section className="glass-card rounded-[2rem] border border-white/70 p-6 shadow-glow dark:border-slate-700/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
            2. Extracted Text
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Review the OCR output</h2>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {wordCount} words
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onExtract}
          disabled={!hasImage || isOcrLoading || isAnalyzeLoading}
          className="rounded-2xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOcrLoading ? "Extracting..." : "Run OCR"}
        </button>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!extractedText.trim() || isOcrLoading || isAnalyzeLoading}
          className="rounded-2xl bg-sky-600 px-4 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzeLoading ? "Analyzing..." : "Analyze Text"}
        </button>
        <button
          type="button"
          onClick={onCopy}
          disabled={!extractedText.trim()}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          Copy text
        </button>
      </div>

      <textarea
        value={extractedText}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Your OCR text will appear here. You can also paste notes manually."
        className="mt-6 min-h-[22rem] w-full rounded-[1.5rem] border border-slate-200 bg-white/80 p-5 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
      />
    </section>
  );
}

export default OCRViewer;

