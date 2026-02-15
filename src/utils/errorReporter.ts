import * as Sentry from '@sentry/node'

import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

const isDev = env.NODE_ENV !== 'production'

export function initErrorReporter(): void {

  if (env.SENTRY_DSN) {

    Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV })

    logger.info('Sentry error reporting initialized.')

  } else {

    logger.warn('SENTRY_DSN not set — error reporting disabled.')

  }
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {

  if (isDev || !env.SENTRY_DSN) {
    logger.error({ error, ...context }, 'Reported error')
  }

  if (env.SENTRY_DSN) {

    Sentry.withScope((scope) => {

      if (context) scope.setExtras(context)

      Sentry.captureException(error)
    })
  }
}

export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'error',
  context?: Record<string, unknown>
): void {

  if (isDev || !env.SENTRY_DSN) {
    logger[level === 'warning' ? 'warn' : level]({ ...context }, message)
  }

  if (env.SENTRY_DSN) {

    Sentry.withScope((scope) => {

      if (context) scope.setExtras(context)

      Sentry.captureMessage(message, level)
    })
  }
}
