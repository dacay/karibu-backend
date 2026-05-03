import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { organizations, serviceAccounts } from '../db/schema.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  console.error('Usage: pnpm tsx src/scripts/create-service-account.ts --org <uuid-or-subdomain> --label <name>');
  process.exit(2);
};

async function main() {

  const args = parseArgs(process.argv.slice(2));
  const orgArg = args.org;
  const label = args.label;

  if (!orgArg || !label) usage();

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  const [org] = await db
    .select()
    .from(organizations)
    .where(UUID_REGEX.test(orgArg)
      ? eq(organizations.id, orgArg)
      : eq(organizations.subdomain, orgArg))
    .limit(1);

  if (!org) {
    console.error(`Organization not found: ${orgArg}`);
    await client.end();
    process.exit(1);
  }

  const [created] = await db
    .insert(serviceAccounts)
    .values({ label, organizationId: org.id })
    .returning();

  console.log(JSON.stringify({
    serviceAccountId: created.id,
    label: created.label,
    organizationId: created.organizationId,
  }, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
