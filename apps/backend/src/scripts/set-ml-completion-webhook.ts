import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { microlearnings } from '../db/schema.js';

// Sets (or clears) the per-ML completion webhook URL on a single microlearning row.
// Usage:
//   tsx src/scripts/set-ml-completion-webhook.ts <ml_id> <url>
//   tsx src/scripts/set-ml-completion-webhook.ts <ml_id> --clear

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const [, , mlId, urlArg] = process.argv;
if (!mlId || !urlArg) {
  console.error('Usage: tsx src/scripts/set-ml-completion-webhook.ts <ml_id> <url|--clear>');
  process.exit(1);
}

const newUrl: string | null = urlArg === '--clear' ? null : urlArg;
if (newUrl !== null) {
  try {
    new URL(newUrl);
  } catch {
    console.error(`Invalid URL: ${newUrl}`);
    process.exit(1);
  }
}

async function run() {
  const client = postgres(DATABASE_URL!);
  const db = drizzle(client);

  const updated = await db
    .update(microlearnings)
    .set({ completionWebhookUrl: newUrl })
    .where(eq(microlearnings.id, mlId!))
    .returning({ id: microlearnings.id, title: microlearnings.title, url: microlearnings.completionWebhookUrl });

  if (updated.length === 0) {
    console.error(`No microlearning found with id ${mlId}`);
    await client.end();
    process.exit(1);
  }

  const row = updated[0]!;
  console.log(
    newUrl === null
      ? `Cleared completion webhook for "${row.title}" (${row.id})`
      : `Set completion webhook for "${row.title}" (${row.id}) → ${row.url}`,
  );

  await client.end();
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
