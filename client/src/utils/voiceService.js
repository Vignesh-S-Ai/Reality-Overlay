const VOICE_DEBOUNCE_MS = 800;
const RECOGNITION_LANGUAGE = "en-US";

let recognition = null;
let synthesis = null;
let isListening = false;
let lastResultCallback = null;

export function initializeVoiceService(onResult) {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.warn("Speech recognition not supported");
    return false;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = RECOGNITION_LANGUAGE;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const results = event.results;
    const lastResult = results[results.length - 1];
    const transcript = lastResult[0].transcript;
    const isFinal = lastResult.isFinal;

    if (isFinal && transcript.trim() && lastResultCallback) {
      lastResultCallback(transcript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    isListening = false;
  };

  recognition.onend = () => {
    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        isListening = false;
      }
    }
  };

  synthesis = window.speechSynthesis;

  if (typeof onResult === "function") {
    lastResultCallback = onResult;
  }

  return true;
}

export function startListening() {
  if (!recognition) {
    return false;
  }

  if (isListening) {
    return true;
  }

  try {
    recognition.start();
    isListening = true;
    return true;
  } catch (error) {
    console.error("Failed to start speech recognition:", error);
    return false;
  }
}

export function stopListening() {
  if (!recognition) {
    return;
  }

  isListening = false;

  try {
    recognition.stop();
  } catch (error) {
    // Ignore errors when stopping
  }
}

export function speak(text, { lang = "en-US", rate = 1.0, pitch = 1.0 } = {}) {
  if (!synthesis) {
    console.warn("Speech synthesis not available");
    return false;
  }

  synthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;

  return new Promise((resolve) => {
    utterance.onend = () => resolve(true);
    synthesis.speak(utterance);
  });
}

export function isSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function getIsListening() {
  return isListening;
}