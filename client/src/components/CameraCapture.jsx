import { useEffect, useRef, useState } from "react";

function CameraCapture({ imagePreview, onImageSelected, isBusy }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API unavailable");
      }

      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
    } catch (error) {
      setCameraError("Camera access was denied or is not available in this browser.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
  }

  async function captureImage() {
    if (!videoRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const file = await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        resolve(
          new File([blob], `capture-${Date.now()}.png`, {
            type: "image/png",
          })
        );
      }, "image/png");
    });

    if (!file) {
      setCameraError("Could not capture the current frame.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
    stopCamera();
  }

  return (
    <section className="glass-card rounded-[2rem] border border-white/70 p-6 shadow-glow dark:border-slate-700/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
            1. Camera / Upload
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Import a study image</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-900">
            Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isBusy}
              onChange={handleFileUpload}
            />
          </label>

          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              disabled={isBusy}
              className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-500 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-400/30 dark:text-sky-200"
            >
              Open camera
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={captureImage}
                className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-500/15 dark:border-emerald-400/30 dark:text-emerald-200"
              >
                Capture frame
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Stop camera
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-950 shadow-lg dark:border-slate-700">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline className="h-full min-h-72 w-full object-cover" />
          ) : imagePreview ? (
            <img src={imagePreview} alt="Study preview" className="h-full min-h-72 w-full object-cover" />
          ) : (
            <div className="flex min-h-72 items-center justify-center px-6 text-center text-sm text-slate-300">
              Start the camera or upload an image to preview your study material here.
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">What works best</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <li>Use a bright image with strong contrast between text and background.</li>
            <li>Keep the page flat to reduce skew before OCR runs.</li>
            <li>After extraction, edit the text manually before sending it for analysis.</li>
          </ul>

          {cameraError ? (
            <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
              {cameraError}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default CameraCapture;
