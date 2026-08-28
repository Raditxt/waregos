// ============================================
// LOGGER — Singleton Pattern
// Structured logging untuk production
// ============================================

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: unknown
  error?: string
}

class Logger {
  private static instance: Logger
  private isDevelopment: boolean

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production'
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private format(entry: LogEntry): string {
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(data !== undefined ? { data } : {}),
    }

    if (this.isDevelopment) {
      const colors = {
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        debug: '\x1b[90m',
      }
      const reset = '\x1b[0m'
      console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${message}`, data ?? '')
    } else {
      console.log(this.format(entry))
    }
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log('info', message, context, data)
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log('warn', message, context, data)
  }

  error(message: string, context?: string, error?: unknown): void {
    const errorStr = error instanceof Error ? error.message : String(error)
    this.log('error', message, context, { error: errorStr })
  }

  debug(message: string, context?: string, data?: unknown): void {
    if (this.isDevelopment) {
      this.log('debug', message, context, data)
    }
  }
}

export const logger = Logger.getInstance()