import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { pinoLogger } from 'hono-pino'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { corsMiddleware } from './middleware/cors.js'
import { errorReporterMiddleware } from './middleware/errorReporter.js'
import { registerRoutes } from './routes/index.js'
import { sql, testConnection } from './db/index.js'
import { initErrorReporter } from './utils/errorReporter.js'

initErrorReporter()

const app = new Hono()

// Apply logging middleware
// At debug level: logs method, url, status. At trace level: logs full headers too.
app.use('*', pinoLogger({
  pino: logger,
  http: {
    onReqBindings: (c) => ({ req: { method: c.req.method, url: c.req.path } }),
    onResBindings: (c) => ({ res: { status: c.res.status } }),
    onResLevel: (c) => c.error ? 'error' : 'trace',
  },
}))

// Apply CORS middleware
app.use('*', corsMiddleware())

// Register routes
registerRoutes(app)

// Catch and report unexpected errors
app.onError(errorReporterMiddleware)

// Test database connection before starting server
const dbConnected = await testConnection()

if (!dbConnected) {

  logger.fatal('Due to database connection failure, the server will not start. Exiting.')
  process.exit(1)
}

// Start server
const server = serve({
  fetch: app.fetch,
  port: env.PORT
}, (info) => {

  logger.info(`Server is running on http://localhost:${info.port}...`)
})

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...')
  await sql.end()
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
