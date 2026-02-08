import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { pinoLogger } from 'hono-pino'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { corsMiddleware } from './middleware/cors.js'
import { registerRoutes } from './routes/index.js'
import { sql, testConnection } from './db/index.js'

const app = new Hono()

// Apply logging middleware
app.use('*', pinoLogger({ pino: logger }))

// Apply CORS middleware
app.use('*', corsMiddleware())

// Register routes
registerRoutes(app)

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
