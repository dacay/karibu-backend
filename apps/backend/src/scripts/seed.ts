import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { organizations, users, authTokens } from '../db/schema.js';
import { hashPassword } from '../utils/crypto.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// Static dev token for easy testing - use POST /auth/login { token: "dev-learner-token" }
const DEV_LEARNER_TOKEN = 'dev-learner-token';

async function seed() {
  console.log('Seeding development data...');

  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({ name: 'Karibu Demo', subdomain: 'demo' })
    .onConflictDoNothing()
    .returning();

  if (!org) {
    console.log('Organization "demo" already exists, skipping user creation.');
    await client.end();
    return;
  }

  console.log(`Created organization: ${org.name} (subdomain: ${org.subdomain})`);

  // Create org admin user
  const adminPassword = await hashPassword('admin123');
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@demo.com',
      password: adminPassword,
      role: 'admin',
      organizationId: org.id,
    })
    .returning();

  console.log(`Created admin user: ${admin.email} (password: admin123)`);

  // Create learner user
  const learnerPassword = await hashPassword('learner123');
  const [learner] = await db
    .insert(users)
    .values({
      email: 'learner@demo.com',
      password: learnerPassword,
      role: 'user',
      organizationId: org.id,
    })
    .returning();

  console.log(`Created learner user: ${learner.email} (password: learner123)`);

  // Create a static dev login token for the learner (never expires)
  await db
    .insert(authTokens)
    .values({
      userId: learner.id,
      token: DEV_LEARNER_TOKEN,
      expiresAt: new Date('2099-01-01'),
    })
    .onConflictDoNothing();

  console.log('\nSeed complete!');
  console.log('  Organization subdomain: demo');
  console.log('  Admin:   admin@demo.com   / admin123');
  console.log('  Learner: learner@demo.com / learner123');
  console.log(`  Learner token login: POST /auth/login { "token": "${DEV_LEARNER_TOKEN}" }`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
