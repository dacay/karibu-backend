import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import * as schema from './schema.js'

// Create Postgres connection
export const sql = postgres(env.DATABASE_URL)

// Create Drizzle client
export const db = drizzle(sql, { schema })

// Test database connection
export const testConnection = async (): Promise<boolean> => {

  logger.info('Testing database connection...')

  try {

    await sql`SELECT 1`

    logger.info('Database connection successful.')

    return true

  } catch (error) {

    logger.error({ error }, 'Database connection failed.')
    return false
  }
}
