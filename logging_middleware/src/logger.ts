import { LogStack, LogLevel, LogPackage } from "./types";
import { sendLog } from "./transport";

function assertLowercase(value: string, field: string) {
  if (value !== value.toLowerCase()) {
    throw new Error(`${field} must be lowercase`);
  }
}

export async function Log(
  stack: LogStack,
  level: LogLevel,
  pkg: LogPackage,
  message: string
) {
  assertLowercase(stack, "stack");
  assertLowercase(level, "level");
  assertLowercase(pkg, "package");

  const payload = {
    stack,
    level,
    package: pkg,
    message,
    timestamp: new Date().toISOString(),
  };

  await sendLog(payload);
}