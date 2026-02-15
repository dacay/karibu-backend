import type { Context } from 'hono'

import { logger } from '../config/logger.js'
import { reportError } from '../utils/errorReporter.js'

export const errorReporterMiddleware = (err: Error, c: Context) => {
  
  logger.error({ err, path: c.req.path, method: c.req.method }, err.message)

  reportError(err, { path: c.req.path, method: c.req.method })

  return c.json({ error: 'Internal server error' }, 500)
}
