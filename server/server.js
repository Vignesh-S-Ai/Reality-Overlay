import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import analyzeRouter from "./routes/analyze.js";
import ocrRouter from "./routes/ocr.js";
import { closeOcrWorker } from "./services/ocrService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/analyze", analyzeRouter);
app.use("/api/ocr", ocrRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: "Something went wrong while processing your request.",
  });
});

app.listen(port, () => {
  console.log(`Study assistant server running on http://localhost:${port}`);
});

async function shutdown() {
  await closeOcrWorker();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

