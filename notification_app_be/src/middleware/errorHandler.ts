import { Request, Response, NextFunction } from "express";
import { Log } from "logging_middleware";

/**
 * Global error handler middleware.
 * Catches unhandled errors, logs them, and returns a structured JSON response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  Log("backend", "error", "middleware",
    `Unhandled error: ${err.message} | Stack: ${err.stack?.split("\n")[1]?.trim()}`);

  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
}
