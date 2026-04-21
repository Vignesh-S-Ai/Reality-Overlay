import { createWorker } from "tesseract.js";

let workerPromise;

async function getWorker() {
  if (!workerPromise) {
    // Reuse one worker so repeat OCR requests do not reinitialize Tesseract every time.
    workerPromise = createWorker("eng");
  }

  return workerPromise;
}

export async function extractTextFromBuffer(imageBuffer) {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(imageBuffer);

  return text.trim();
}

export async function closeOcrWorker() {
  if (!workerPromise) {
    return;
  }

  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
