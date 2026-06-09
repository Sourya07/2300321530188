export type LogStack = "backend" | "frontend";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogPackage =
  | "cache" | "controller" | "cron_job" | "db" | "domain"
  | "handler" | "repository" | "route" | "service"
  | "api" | "component" | "hook" | "page" | "state" | "style"
  | "auth" | "config" | "middleware" | "utils";