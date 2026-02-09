import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, authSessions, authTokens } from '../db/schema.js';
import { verifyPassword } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';
import { LRUCache } from '../utils/cache.js';
import { logger } from '../config/logger.js';
import type { Organization } from '../types/auth.js';

const sessionValidityCache = new LRUCache<string, boolean>(10_000);

export interface LoginResult {

  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
    organizationId: string;
    organizationName: string;
  };
  error?: string;
}

/**
 * Authenticate user with email and password
 */
export const loginWithPassword = async (
  email: string,
  password: string,
  organization: Organization,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> => {

  try {

    // Find user by email and organization
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.organizationId, organization.id)
        )
      )
      .limit(1);

    if (!user) {

      logger.debug({ email, organizationId: organization.id }, 'Login attempt with invalid email or wrong organization.');

      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {

      logger.debug({ userId: user.id, email }, 'Login attempt with invalid password.');

      return { success: false, error: 'Invalid email or password' };
    }

    // Generate JWT token
    const { token, jti, expiresAt } = await generateToken(
      user.id,
      user.role,
      organization.name
    );

    // Create session record
    await db.insert(authSessions).values({
      id: jti,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
    });

    logger.debug({ userId: user.id, email }, 'User logged in successfully.');

    return {

      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    };

  } catch (error) {

    logger.error({ error, email }, 'Login with password failed.');

    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Authenticate user with login token
 */
export const loginWithToken = async (
  token: string,
  organization: Organization,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> => {

  try {

    // Find valid login token
    const [loginToken] = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.token, token),
          isNull(authTokens.usedAt)
        )
      )
      .limit(1);

    if (!loginToken) {

      logger.debug({ token: token.substring(0, 8) + '...' }, 'Login attempt with invalid token.');

      return { success: false, error: 'Invalid or expired token' };
    }

    // Check if token is expired
    if (loginToken.expiresAt < new Date()) {

      logger.debug({ tokenId: loginToken.id }, 'Login attempt with expired token.');

      return { success: false, error: 'Invalid or expired token' };
    }

    // Mark token as used
    await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(eq(authTokens.id, loginToken.id));

    // Find user by ID and organization
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, loginToken.userId),
          eq(users.organizationId, organization.id)
        )
      )
      .limit(1);

    if (!user) {

      logger.debug({ userId: loginToken.userId, organizationId: organization.id }, 'User not found for valid login token.');

      return { success: false, error: 'Authentication failed' };
    }

    // Generate JWT token
    const { token: jwtToken, jti, expiresAt } = await generateToken(
      user.id,
      user.role,
      organization.name
    );

    // Create session record
    await db.insert(authSessions).values({
      id: jti,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
    });

    logger.debug({ userId: user.id, email: user.email }, 'User logged in with token successfully.');

    return {

      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    };

  } catch (error) {

    logger.error({ error }, 'Login with token failed.');

    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if a JWT session is valid (not revoked).
 * Caches the result (valid or invalid) by jti; on cache miss we hit the DB.
 */
export const isSessionValid = async (jti: string): Promise<boolean> => {

  const cached = sessionValidityCache.get(jti);

  if (cached !== undefined) {

    return cached;
  }

  try {

    const [session] = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, jti),
          isNull(authSessions.revokedAt)
        )
      )
      .limit(1);

    const valid = !!session && session.expiresAt > new Date();

    sessionValidityCache.set(jti, valid);

    return valid;

  } catch (error) {

    logger.error({ error, jti }, 'Failed to validate session.');

    return false;
  }
}

/**
 * Revoke a session (logout)
 */
export const revokeSession = async (jti: string): Promise<boolean> => {

  try {

    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, jti));

    sessionValidityCache.set(jti, false);

    logger.debug({ jti }, 'Session revoked.');

    return true;

  } catch (error) {

    logger.error({ error, jti }, 'Failed to revoke session.');

    return false;
  }
}
