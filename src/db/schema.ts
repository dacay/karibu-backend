import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Role enum
export const roleEnum = pgEnum('role', ['admin', 'user']);

// Timestamp helpers
const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
};

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  ...timestamps,
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // bcrypt hashed
  phoneNumber: text('phone_number'), // E.164 format (e.g., +14155552671)
  role: roleEnum('role').notNull().default('user'),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ...timestamps,
});

// Auth sessions table - tracks active JWT tokens for revocation
export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(), // JWT ID (jti claim)
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'), // null = active, set = revoked
  ipAddress: text('ip_address'), // Optional: track where session was created
  userAgent: text('user_agent'), // Optional: track client info
  createdAt: timestamps.createdAt,
});

// Auth tokens table - for direct URL login (magic links, etc.)
export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Unique token (use crypto.randomBytes)
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'), // Track if token has been used
  createdAt: timestamps.createdAt,
});
