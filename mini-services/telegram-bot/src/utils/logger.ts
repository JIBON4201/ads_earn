type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_COLORS: Record<LogLevel, string> = {
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  debug: '\x1b[90m',  // gray
};

const RESET = '\x1b[0m';

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(msg: string, data?: unknown) {
    console.log(`${LOG_COLORS.info}[INFO]${RESET} ${timestamp()} - ${msg}`, data !== undefined ? JSON.stringify(data) : '');
  },
  warn(msg: string, data?: unknown) {
    console.warn(`${LOG_COLORS.warn}[WARN]${RESET} ${timestamp()} - ${msg}`, data !== undefined ? JSON.stringify(data) : '');
  },
  error(msg: string, data?: unknown) {
    console.error(`${LOG_COLORS.error}[ERROR]${RESET} ${timestamp()} - ${msg}`, data !== undefined ? JSON.stringify(data) : '');
  },
  debug(msg: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${LOG_COLORS.debug}[DEBUG]${RESET} ${timestamp()} - ${msg}`, data !== undefined ? JSON.stringify(data) : '');
    }
  },
};