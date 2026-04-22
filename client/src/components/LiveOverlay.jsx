import { useEffect, useMemo, useRef, useState } from "react";

const AUTO_ANALYZE_INTERVAL_MS = 1700;
const FOCUS_WINDOW_RATIO = 0.46;
const MAX_CAPTURE_SIDE = 1280;

function getScaledSize(width, height, maxSide = MAX_CAPTURE_SIDE) {
  const largestSide = Math.max(width, height);

  if (!largestSide || largestSide <= maxSide) {
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const scale = maxSide / largestSide;

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function getCropArea(width, height, focusPoint) {
  if (!focusPoint) {
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: width,
      sourceHeight: height,
    };
  }

  const cropWidth = Math.max(220, width * FOCUS_WINDOW_RATIO);
  const cropHeight = Math.max(220, height * FOCUS_WINDOW_RATIO);
  const centerX = focusPoint.x * width;
  const centerY = focusPoint.y * height;
  const sourceX = Math.min(Math.max(0, centerX - cropWidth / 2), Math.max(0, width - cropWidth));
  const sourceY = Math.min(Math.max(0, centerY - cropHeight / 2), Math.max(0, height - cropHeight));

  return {
    sourceX,
    sourceY,
    sourceWidth: Math.min(cropWidth, width),
    sourceHeight: Math.min(cropHeight, height),
  };
}

function renderSourceToCanvas({ canvas, width, height, draw }) {
  const { width: targetWidth, height: targetHeight } = getScaledSize(width, height);
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  draw(context, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", 0.72);
}

function captureVideoFrame(video, canvas, focusPoint) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;

  if (!sourceWidth || !sourceHeight) {
    return "";
  }

  const cropArea = getCropArea(sourceWidth, sourceHeight, focusPoint);

  return renderSourceToCanvas({
    canvas,
    width: cropArea.sourceWidth,
    height: cropArea.sourceHeight,
    draw: (context, targetWidth, targetHeight) => {
      context.drawImage(
        video,
        cropArea.sourceX,
        cropArea.sourceY,
        cropArea.sourceWidth,
        cropArea.sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );
    },
  });
}

function captureImageFrame(imageSource, canvas, focusPoint) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const cropArea = getCropArea(image.naturalWidth, image.naturalHeight, focusPoint);
      const dataUrl = renderSourceToCanvas({
        canvas,
        width: cropArea.sourceWidth,
        height: cropArea.sourceHeight,
        draw: (context, targetWidth, targetHeight) => {
          context.drawImage(
            image,
            cropArea.sourceX,
            cropArea.sourceY,
            cropArea.sourceWidth,
            cropArea.sourceHeight,
            0,
            0,
            targetWidth,
            targetHeight
          );
        },
      });

      resolve(dataUrl);
    };
    image.onerror = () => reject(new Error("Could not prepare the frozen frame."));
    image.src = imageSource;
  });
}

function formatSnippetLines(snippets, fallbackText) {
  if (Array.isArray(snippets) && snippets.length) {
    return snippets.slice(0, 3);
  }

  return fallbackText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function getFocusWindowBounds(focusPoint) {
  if (!focusPoint) {
    return {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
  }

  const width = FOCUS_WINDOW_RATIO;
  const height = FOCUS_WINDOW_RATIO;
  const x = Math.min(Math.max(0, focusPoint.x - width / 2), 1 - width);
  const y = Math.min(Math.max(0, focusPoint.y - height / 2), 1 - height);

  return { x, y, width, height };
}

function LiveOverlay({
  buildApiUrl,
  isLiveMode,
  onToggleLiveMode,
  lastProcessedText,
  onLastProcessedTextChange,
  isProcessing,
  onProcessingChange,
  overlayData,
  onOverlayDataChange,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const autoAnalyzeTimeoutRef = useRef(null);
  const inFlightRef = useRef(false);
  const sessionRef = useRef(0);

  const [cameraError, setCameraError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const snippetLines = useMemo(
    () => formatSnippetLines(overlayData?.snippets || [], overlayData?.text || ""),
    [overlayData]
  );
  const focusWindowBounds = useMemo(() => getFocusWindowBounds(focusPoint), [focusPoint]);

  function clearAutoAnalyzeTimer() {
    if (autoAnalyzeTimeoutRef.current) {
      clearTimeout(autoAnalyzeTimeoutRef.current);
      autoAnalyzeTimeoutRef.current = null;
    }
  }

  function stopCamera() {
    clearAutoAnalyzeTimer();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
  }

  useEffect(() => {
    sessionRef.current += 1;

    if (!isLiveMode) {
      stopCamera();
      setIsPaused(false);
      setIsFrozen(false);
      setFrozenFrame("");
      setCameraError("");
      onProcessingChange(false);
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API unavailable");
        }

        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (_error) {
        setCameraError("Camera access was denied or is not available in this browser.");
        onToggleLiveMode(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isLiveMode, onToggleLiveMode]);

  useEffect(() => {
    if (!isLiveMode || isPaused || isFrozen || !cameraReady) {
      clearAutoAnalyzeTimer();
      return undefined;
    }

    let cancelled = false;

    async function queueAutoAnalyze() {
      clearAutoAnalyzeTimer();

      autoAnalyzeTimeoutRef.current = setTimeout(async () => {
        if (cancelled) {
          return;
        }

        await captureAndAnalyze();
        if (!cancelled) {
          queueAutoAnalyze();
        }
      }, AUTO_ANALYZE_INTERVAL_MS);
    }

    queueAutoAnalyze();

    return () => {
      cancelled = true;
      clearAutoAnalyzeTimer();
    };
  }, [cameraReady, isFrozen, isLiveMode, isPaused, lastProcessedText, overlayData]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function getFrameDataUrl() {
    if (!canvasRef.current) {
      throw new Error("Frame buffer is not available.");
    }

    if (isFrozen && frozenFrame) {
      return captureImageFrame(frozenFrame, canvasRef.current, focusPoint);
    }

    if (!videoRef.current) {
      throw new Error("Camera preview is not ready.");
    }

    return captureVideoFrame(videoRef.current, canvasRef.current, focusPoint);
  }

  async function captureAndAnalyze({ forceAi = false, imageOverride = "" } = {}) {
    if (!isLiveMode || inFlightRef.current) {
      return;
    }

    const activeSession = sessionRef.current;

    try {
      inFlightRef.current = true;
      onProcessingChange(true);
      setCameraError("");

      const image = imageOverride || (await getFrameDataUrl());

      if (!image) {
        return;
      }

      const response = await fetch(buildApiUrl("/api/live-analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image,
          previousText: lastProcessedText,
          previousSummary: overlayData?.summary || "",
          previousKeyPoints: overlayData?.keyPoints || [],
          forceAi,
        }),
      });

      const data = await response.json();

      if (activeSession !== sessionRef.current || !isLiveMode) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Live analysis failed.");
      }

      onOverlayDataChange(data);
      if (data.text?.trim()) {
        onLastProcessedTextChange(data.text);
      }
    } catch (error) {
      setCameraError(error.message || "Unable to analyze the live frame.");
    } finally {
      if (activeSession === sessionRef.current) {
        onProcessingChange(false);
      }
      inFlightRef.current = false;
    }
  }

  async function handleFreezeFrame() {
    if (!isLiveMode) {
      return;
    }

    if (isFrozen) {
      setIsFrozen(false);
      setFrozenFrame("");
      setIsPaused(false);
      return;
    }

    try {
      const snapshot = await getFrameDataUrl();
      if (!snapshot) {
        return;
      }

      setFrozenFrame(snapshot);
      setIsFrozen(true);
      setIsPaused(true);
      await captureAndAnalyze({ forceAi: true, imageOverride: snapshot });
    } catch (error) {
      setCameraError(error.message || "Could not freeze the current frame.");
    }
  }

  function handlePreviewClick(event) {
    if (!focusMode) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    setFocusPoint({
      x: Math.min(Math.max(x, 0), 1),
      y: Math.min(Math.max(y, 0), 1),
    });
  }

  return (
    <section className="glass-card rounded-[2rem] border border-white/70 p-6 shadow-glow dark:border-slate-700/60">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
            Live Camera Overlay
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Real-time OCR with AI notes layered over the camera feed.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            The camera samples one frame every few seconds, filters out noisy text, and updates the HUD only
            when the detected content changes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onToggleLiveMode(!isLiveMode)}
            className={`rounded-2xl px-4 py-2.5 font-semibold transition hover:-translate-y-0.5 ${
              isLiveMode
                ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-200"
                : "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            }`}
          >
            {isLiveMode ? "Live Mode ON" : "Live Mode OFF"}
          </button>
          <button
            type="button"
            onClick={() => setIsPaused((currentState) => !currentState)}
            disabled={!isLiveMode}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => captureAndAnalyze({ forceAi: true })}
            disabled={!isLiveMode || isProcessing}
            className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-500 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-400/30 dark:text-sky-200"
          >
            {isProcessing ? "Analyzing..." : "Analyze Now"}
          </button>
          <button
            type="button"
            onClick={handleFreezeFrame}
            disabled={!isLiveMode || isProcessing}
            className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2.5 font-semibold text-fuchsia-700 transition hover:-translate-y-0.5 hover:border-fuchsia-500 hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-fuchsia-400/30 dark:text-fuchsia-200"
          >
            {isFrozen ? "Unfreeze" : "Freeze Frame"}
          </button>
          <button
            type="button"
            onClick={() =>
              setFocusMode((currentMode) => {
                const nextMode = !currentMode;
                if (!nextMode) {
                  setFocusPoint(null);
                }
                return nextMode;
              })
            }
            className={`rounded-2xl px-4 py-2.5 font-semibold transition hover:-translate-y-0.5 ${
              focusMode
                ? "border border-amber-400/40 bg-amber-500/15 text-amber-700 dark:border-amber-400/30 dark:text-amber-200"
                : "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {focusMode ? "Focus Mode ON" : "Focus Mode"}
          </button>
        </div>
      </div>

      <div
        onClick={handlePreviewClick}
        className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-white/60 bg-slate-950 shadow-2xl dark:border-slate-700/70"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.68)_100%)]" />

        {isLiveMode ? (
          <>
            {isFrozen && frozenFrame ? (
              <img src={frozenFrame} alt="Frozen study frame" className="h-[78vh] min-h-[34rem] w-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedData={() => setCameraReady(true)}
                className="h-[78vh] min-h-[34rem] w-full object-cover"
              />
            )}
          </>
        ) : (
          <div className="flex h-[78vh] min-h-[34rem] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.24),transparent_30%),linear-gradient(180deg,#020617_0%,#081120_50%,#020617_100%)] px-6 text-center">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">HUD standby</p>
              <p className="mt-4 text-3xl font-bold text-white">Switch on live mode to start overlay analysis.</p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The preview opens the webcam, samples frames on a debounce, and keeps the overlay light enough
                for continuous use.
              </p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/50" />

        {Array.isArray(overlayData?.regions)
          ? overlayData.regions.map((region) => (
              <div
                key={region.id}
                className="pointer-events-none absolute rounded-2xl border border-cyan-300/80 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.22)]"
                style={{
                  left: `${(focusWindowBounds.x + region.x * focusWindowBounds.width) * 100}%`,
                  top: `${(focusWindowBounds.y + region.y * focusWindowBounds.height) * 100}%`,
                  width: `${region.width * focusWindowBounds.width * 100}%`,
                  height: `${region.height * focusWindowBounds.height * 100}%`,
                }}
              >
                <span className="absolute -top-7 left-0 rounded-full border border-cyan-300/40 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  text
                </span>
              </div>
            ))
          : null}

        {focusPoint ? (
          <div
            className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/70 bg-amber-300/10 shadow-[0_0_24px_rgba(251,191,36,0.2)]"
            style={{
              left: `${focusPoint.x * 100}%`,
              top: `${focusPoint.y * 100}%`,
            }}
          >
            <span className="absolute inset-[28px] rounded-full border border-amber-200/70" />
          </div>
        ) : null}

        <div className="absolute inset-x-4 top-4 z-10 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="overlay-fade max-w-lg rounded-[1.5rem] border border-white/10 bg-slate-950/48 p-4 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">Detected text</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-100">
              {snippetLines.length ? (
                snippetLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                  >
                    {line}
                  </p>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-slate-300">
                  {isLiveMode
                    ? "Waiting for readable study text in the frame."
                    : "No live text yet."}
                </p>
              )}
            </div>
          </div>

          <div className="overlay-fade flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-white/10 bg-slate-950/48 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 backdrop-blur-md">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {isProcessing ? "Scanning" : isFrozen ? "Frozen" : isPaused ? "Paused" : "Tracking"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {overlayData?.provider || "live"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {focusPoint ? "focus lock" : "full frame"}
            </span>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 z-10 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="overlay-fade rounded-[1.6rem] border border-white/10 bg-slate-950/56 p-5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">AI summary</p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white sm:text-lg">
              {overlayData?.summary || "Live AI notes will appear here after the first frame is processed."}
            </p>
            {overlayData?.keyPoints?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {overlayData.keyPoints.map((point, index) => (
                  <span
                    key={`${point}-${index}`}
                    className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100"
                  >
                    {point}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="overlay-fade rounded-[1.4rem] border border-white/10 bg-slate-950/52 px-4 py-3 text-sm text-slate-200 backdrop-blur-md">
            <p>{focusMode ? "Tap the frame to lock a focus region." : "Focus Mode lets you isolate a region."}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        {isProcessing ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-cyan-700 dark:text-cyan-200">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-500" />
            Processing the latest frame
          </div>
        ) : null}
        {overlayData?.reusedAnalysis ? (
          <div className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Reusing previous summary because the text has not changed.
          </div>
        ) : null}
        {cameraError ? (
          <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-200">
            {cameraError}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default LiveOverlay;
