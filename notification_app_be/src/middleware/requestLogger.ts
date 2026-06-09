import { Request, Response, NextFunction } from "express";
import { Log } from "logging_middleware";

/**
 * Request logging middleware.
 * Logs every incoming HTTP request with method, URL, and response time.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log when response finishes
  res.on("finish", () => {
    const duration = Date.now() - start;
    Log("backend", "info", "middleware",
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });

  next();
}
