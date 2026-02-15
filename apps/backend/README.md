# Karibu Backend

TypeScript backend API built with Hono, Drizzle ORM, and PostgreSQL.

## Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` and set your configuration:
```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database (For Supabase: postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres)
DATABASE_URL=postgresql://user:password@host:port/database

# CORS (comma-separated for multiple origins)
CORS_ORIGIN=http://localhost:3001,https://app.example.com
```

3. **Start development server:**
```bash
pnpm dev
```

4. **Test the health check:**
```bash
curl http://localhost:3000/status
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-...",
  "database": "connected"
}
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes directly to database
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

## Project Structure

```
src/
├── index.ts              # Server entry point
├── config/
│   ├── env.ts           # Environment configuration with Zod
│   └── logger.ts        # Pino logger configuration
├── db/
│   ├── index.ts         # Database connection
│   └── schema.ts        # Database schema
├── middleware/
│   └── cors.ts          # CORS configuration
└── routes/
    ├── index.ts         # Route registration
    └── health.ts        # Health check endpoint
```

## Logging

The project uses **Pino** for structured logging:
- **Development**: Pretty-printed colored logs
- **Production**: JSON-formatted logs for log aggregation
- **Log levels**: fatal, error, warn, info, debug, trace (configure via `LOG_LEVEL` env var)
- **HTTP logging**: Automatic request/response logging via hono-pino middleware

## API Endpoints

- `GET /status` - Health check endpoint
