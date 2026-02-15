import type { MiddlewareHandler } from 'hono';
import { isSessionValid } from '../services/auth.js';
import { logger } from '../config/logger.js';
import { verifyToken } from '../utils/jwt.js';
import type { AuthContext } from '../types/auth.js';

/**
 * JWT authentication middleware
 * Validates JWT token and checks if session is not revoked
 */
export const authMiddleware = (): MiddlewareHandler => {

  return async (c, next) => {

    try {

      // Get Authorization header
      const authHeader = c.req.header('Authorization');

      // Check if Authorization header is missing or invalid
      if (!authHeader || !authHeader.startsWith('Bearer ')) {

        logger.debug('Missing or invalid Authorization header.');

        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Extract token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify JWT token
      const payload = await verifyToken(token);

      if (!payload.jti) {

        // That shouldn't happen
        logger.warn('JWT token missing jti claim.');

        return c.json({ error: 'Invalid token' }, 401);
      }

      // Check if session is revoked
      const isValid = await isSessionValid(payload.jti);

      if (!isValid) {

        logger.debug({ jti: payload.jti }, 'Revoked or expired session.');

        return c.json({ error: 'Session expired or revoked' }, 401);
      }

      // Map to lean auth context for use in handlers
      c.set('auth', {
        userId: payload.sub,
        organizationId: payload.organizationId,
        sessionId: payload.jti,
        role: payload.role,
      } satisfies AuthContext);

      // Session is valid, proceed
      await next();

    } catch (error) {

      logger.debug({ error }, 'Authentication failed.');

      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
}

/**
 * Role-based access control middleware
 * Requires authMiddleware to be applied first
 */
export const requireRole = (...roles: Array<'admin' | 'user'>): MiddlewareHandler => {

  return async (c, next) => {

    const auth = c.get('auth');

    if (!auth) {

      logger.warn('Role check attempted without auth context.');

      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!roles.includes(auth.role)) {

      logger.debug(
        { userId: auth.userId, role: auth.role, requiredRoles: roles },
        'Insufficient permissions.'
      );

      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  }
}
