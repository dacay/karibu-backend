import pino from 'pino'
import { env } from './env.js'

export const logger = pino({
  // Global log level
  level: env.LOG_LEVEL,
  // Transport for logging
  transport:
    // Development mode: pretty-print logs with colors
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})
