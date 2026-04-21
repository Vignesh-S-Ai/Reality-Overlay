import express from "express";
import multer from "multer";
import { extractTextFromBuffer } from "../services/ocrService.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/", upload.single("image"), async (request, response, next) => {
  try {
    if (!request.file?.buffer) {
      return response.status(400).json({
        error: "An image file is required.",
      });
    }

    const text = await extractTextFromBuffer(request.file.buffer);
    return response.json({ text });
  } catch (error) {
    return next(error);
  }
});

export default router;
