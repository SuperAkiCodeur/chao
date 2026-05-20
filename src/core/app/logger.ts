type LogLevel = "info" | "warn" | "error";

function formatMessage(level: LogLevel, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();

  if (meta === undefined) {
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.log(formatMessage("info", message, meta));
  },

  warn(message: string, meta?: unknown) {
    console.warn(formatMessage("warn", message, meta));
  },

  error(message: string, meta?: unknown) {
    console.error(formatMessage("error", message, meta));
  },
};