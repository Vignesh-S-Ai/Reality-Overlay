import { useEffect, useMemo, useState } from "react";
import CameraCapture from "./components/CameraCapture";
import OCRViewer from "./components/OCRViewer";
import ResultsPanel from "./components/ResultsPanel";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

function buildApiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const wordCount = useMemo(() => {
    return extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;
  }, [extractedText]);

  function handleImageSelected(file, previewUrl) {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedFile(file);
    setImagePreview(previewUrl);
    setExtractedText("");
    setAnalysis(null);
    setError("");
  }

  async function handleExtractText() {
    if (!selectedFile) {
      setError("Select or capture an image first.");
      return;
    }

    setError("");
    setIsOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(buildApiUrl("/api/ocr"), {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OCR failed.");
      }

      setExtractedText(data.text || "");
    } catch (requestError) {
      setError(requestError.message || "Unable to process image.");
    } finally {
      setIsOcrLoading(false);
    }
  }

  async function handleAnalyzeText() {
    if (!extractedText.trim()) {
      setError("Extract or enter some text before analysis.");
      return;
    }

    setError("");
    setIsAnalyzeLoading(true);

    try {
      const response = await fetch(buildApiUrl("/api/analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: extractedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAnalysis(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to analyze notes.");
    } finally {
      setIsAnalyzeLoading(false);
    }
  }

  async function copyExtractedText() {
    if (!extractedText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(extractedText);
    } catch (clipboardError) {
      setError(clipboardError.message || "Clipboard access failed.");
    }
  }

  async function copyResults() {
    if (!analysis) {
      return;
    }

    const payload = [
      `Summary:\n${analysis.summary}`,
      `Key Points:\n- ${analysis.keyPoints.join("\n- ")}`,
      `Simple Explanation:\n${analysis.simpleExplanation}`,
      `Flashcards:\n${analysis.flashcards
        .map((card, index) => `${index + 1}. Q: ${card.question}\n   A: ${card.answer}`)
        .join("\n")}`,
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(payload);
    } catch (clipboardError) {
      setError(clipboardError.message || "Clipboard access failed.");
    }
  }

  function downloadFlashcards() {
    if (!analysis?.flashcards?.length) {
      return;
    }

    const blob = new Blob([JSON.stringify(analysis.flashcards, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = "study-flashcards.json";
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <main className="min-h-screen px-4 py-8 text-slate-900 transition-colors dark:text-slate-100 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="noise-overlay glass-card mb-8 overflow-hidden rounded-[2rem] border border-white/60 p-6 shadow-glow dark:border-slate-700/60">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
                  Reality Overlay
                </span>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                  Study faster from any page, handout, or whiteboard snapshot.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  Capture a study image, extract the text with OCR, then turn it into a concise summary,
                  easy explanation, and flashcards.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDarkMode((currentMode) => !currentMode)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {darkMode ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <CameraCapture
                imagePreview={imagePreview}
                onImageSelected={handleImageSelected}
                isBusy={isOcrLoading || isAnalyzeLoading}
              />

              <OCRViewer
                extractedText={extractedText}
                onTextChange={setExtractedText}
                onExtract={handleExtractText}
                onAnalyze={handleAnalyzeText}
                onCopy={copyExtractedText}
                hasImage={Boolean(selectedFile)}
                isOcrLoading={isOcrLoading}
                isAnalyzeLoading={isAnalyzeLoading}
                wordCount={wordCount}
              />
            </div>

            <ResultsPanel
              analysis={analysis}
              isLoading={isAnalyzeLoading}
              onCopyResults={copyResults}
              onDownloadFlashcards={downloadFlashcards}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
