import { LogStack, LogLevel, LogPackage } from "./types";
import { sendLog } from "./transport";

/**
 * Validates that a value is lowercase.
 */
function assertLowercase(value: string, field: string): void {
  if (value !== value.toLowerCase()) {
    throw new Error(`${field} must be lowercase, got "${value}"`);
  }
}

/**
 * Core logging function — sends a structured log to the evaluation server.
 *
 * @param stack   - "backend" or "frontend"
 * @param level   - "debug" | "info" | "warn" | "error" | "fatal"
 * @param pkg     - logical layer e.g. "handler", "service", "route"
 * @param message - descriptive, contextual log message
 *
 * This function is fire-and-forget by default; it does not throw on failure.
 */
export function Log(
  stack: LogStack,
  level: LogLevel,
  pkg: LogPackage,
  message: string
): void {
  assertLowercase(stack, "stack");
  assertLowercase(level, "level");
  assertLowercase(pkg, "package");

  const payload = {
    stack,
    level,
    package: pkg,
    message,
  };

  // Fire-and-forget: don't block the caller
  sendLog(payload).catch(() => {
    // Already handled inside sendLog
  });
}