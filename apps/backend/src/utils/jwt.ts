import { sign, verify } from 'hono/jwt';
import ms, { type StringValue } from 'ms';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { generateSessionId } from './crypto.js';
import type { JWTPayload } from '../types/auth.js';

/**
 * Generate a JWT token for a user
 */
export const generateToken = async (
  userId: string,
  role: 'admin' | 'user',
  organizationId: string
): Promise<{ token: string; jti: string; expiresAt: Date }> => {

  const jti = generateSessionId();
  const expiresInMs = ms(env.JWT_EXPIRATION as StringValue);

  if (typeof expiresInMs !== 'number') {

    throw new Error(`Invalid JWT_EXPIRATION format: ${env.JWT_EXPIRATION}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expiresInMs / 1000);

  const payload: JWTPayload = {
    sub: userId,
    jti,
    role,
    organizationId,
    aud: env.JWT_AUDIENCE,
    iat: now,
    exp,
  };

  try {

    const token = await sign(payload, env.JWT_SECRET, env.JWT_ALGORITHM);

    return {
      token,
      jti,
      expiresAt: new Date(exp * 1000),
    };

  } catch (err) {

    logger.error({ err }, 'Failed to generate JWT token.');

    throw new Error('Token generation failed');
  }
}

/**
 * Verify a JWT token
 */
export const verifyToken = async (token: string): Promise<JWTPayload> => {

  try {

    const payload = await verify(token, env.JWT_SECRET, env.JWT_ALGORITHM);

    return payload as JWTPayload;

  } catch (err) {

    logger.error({ err }, 'Failed to verify JWT token.');
    
    throw new Error('Invalid or expired token');
  }
}

