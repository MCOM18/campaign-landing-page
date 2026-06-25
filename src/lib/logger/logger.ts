import { appConfig } from "../config/app.config";

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, meta?: unknown) {
  if (!appConfig.flags.enableLogger) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case "info":
      console.info(prefix, message, meta ?? "");
      break;
    case "warn":
      console.warn(prefix, message, meta ?? "");
      break;
    case "error":
      console.error(prefix, message, meta ?? "");
      break;
    case "debug":
      console.debug(prefix, message, meta ?? "");
      break;
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
  debug: (msg: string, meta?: unknown) => log("debug", msg, meta),
};
