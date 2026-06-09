import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { Log } from "logging_middleware";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", apiRouter);

// Global error handler (must be last)
app.use(errorHandler);

// Log app initialization
Log("backend", "info", "config", "Express app initialized with all middleware and routes");

export default app;