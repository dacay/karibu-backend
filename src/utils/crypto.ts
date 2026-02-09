import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {

  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {

  return await bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token for login URLs
 * Returns a URL-safe base64 string (32 bytes = 44 chars)
 */
export const generateLoginToken = (): string => {

  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a unique session ID (used as JWT jti claim).
 */
export const generateSessionId = (): string => {

  return crypto.randomUUID();
}
