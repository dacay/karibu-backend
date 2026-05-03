import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import type { StringValue } from 'ms';
import { serviceAccounts, apiKeys } from '../db/schema.js';
import { generateApiKey } from '../utils/jwt.js';

const parseArgs = (argv: string[]): Record<string, string> => {

  const out: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {

    const arg = argv[i];

    if (arg.startsWith('--')) {

      const key = arg.slice(2);
      const next = argv[i + 1];

      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = 'true';
      }
    }
  }

  return out;
};

const usage = () => {
  console.error('Usage: pnpm tsx src/scripts/mint-api-key.ts --service-account <uuid> [--expires-in <duration>]');
  console.error('  --expires-in defaults to "5y" (e.g. "30d", "1y", "5y")');
  process.exit(2);
};

async function main() {

  const args = parseArgs(process.argv.slice(2));
  const serviceAccountId = args['service-account'];
  const expiresIn = (args['expires-in'] ?? '5y') as StringValue;

  if (!serviceAccountId) usage();

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  const [serviceAccount] = await db
    .select()
    .from(serviceAccounts)
    .where(eq(serviceAccounts.id, serviceAccountId))
    .limit(1);

  if (!serviceAccount) {
    console.error(`Service account not found: ${serviceAccountId}`);
    await client.end();
    process.exit(1);
  }

  const apiKeyId = crypto.randomUUID();

  const { token, expiresAt } = await generateApiKey(
    serviceAccount.id,
    apiKeyId,
    serviceAccount.organizationId,
    expiresIn,
  );

  await db.insert(apiKeys).values({
    id: apiKeyId,
    serviceAccountId: serviceAccount.id,
    expiresAt,
  });

  console.log(JSON.stringify({
    serviceAccountId: serviceAccount.id,
    apiKeyId,
    expiresAt: expiresAt.toISOString(),
    token,
  }, null, 2));
  console.error('\nStore the token now — it is not stored anywhere and cannot be retrieved later.');

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
