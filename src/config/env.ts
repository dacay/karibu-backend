import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({

  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),

  // CORS (comma-separated list of origins)
  CORS_ORIGIN: z.string()
    .transform((val) => val.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.string().url())),
})

const parseEnv = () => {

  try {

    return envSchema.parse(process.env)

  } catch (error) {

    if (error instanceof z.ZodError) {

      console.error('Invalid environment variables:')

      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
      })

      process.exit(1)
    }

    throw error
  }
}

export const env = parseEnv()
