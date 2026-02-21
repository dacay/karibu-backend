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

  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_AUDIENCE: z.string().url().default('https://test.karibu.ai'),
  JWT_EXPIRATION: z.string().default('30d'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),

  // Notification Channels (comma-separated, e.g. "sms")
  NOTIFICATION_CHANNELS: z.string()
    .default('')
    .transform((val) => val.split(',')
      .map((ch) => ch.trim().toLowerCase())
      .filter((ch) => ch.length > 0)),

  // Twilio Configuration (SMS Notifications)
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), // E.164 format

  // Error Reporting (Sentry)
  SENTRY_DSN: z.string().url().optional(),

  // AI / LLM
  OPENAI_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),

  // AWS S3 (Document Storage)
  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET_NAME: z.string().min(1).optional(),
  S3_MAX_UPLOAD_SIZE_MB: z.string().default('20').transform(Number),
  S3_KEY_PREFIX: z.string().default('').transform((val) => val.replace(/^\/+|\/+$/g, '')),

  // ChromaDB (Vector Database)
  CHROMA_URL: z.string().url().default('http://localhost:8000'),
  CHROMA_COLLECTION_NAME: z.string().min(1).default('karibu-documents'),
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
