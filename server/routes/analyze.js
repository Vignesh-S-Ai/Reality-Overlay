import express from "express";
import { analyzeStudyText } from "../services/aiService.js";

const router = express.Router();

router.post("/", async (request, response, next) => {
  try {
    const { text } = request.body;

    if (!text || !text.trim()) {
      return response.status(400).json({
        error: "Text is required.",
      });
    }

    const result = await analyzeStudyText(text);
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;

