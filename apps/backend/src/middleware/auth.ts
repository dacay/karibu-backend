import type { MiddlewareHandler } from 'hono';
import { isSessionValid, loadApiKey, touchApiKeyLastUsed } from '../services/auth.js';
import { logger } from '../config/logger.js';
import { verifyToken } from '../utils/jwt.js';
import type { AuthContext } from '../types/auth.js';

/**
 * JWT authentication middleware
 * Validates JWT token and checks if session/api_key is not revoked
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

      if (payload.kind === 'service') {

        // Service token: validate against api_keys, source org from the joined service_account row
        const apiKey = await loadApiKey(payload.jti);

        if (!apiKey) {

          logger.debug({ jti: payload.jti }, 'Revoked or expired API key.');

          return c.json({ error: 'Session expired or revoked' }, 401);
        }

        // Best-effort lastUsedAt update; do not block the request
        touchApiKeyLastUsed(payload.jti);

        c.set('auth', {
          kind: 'service',
          serviceAccountId: apiKey.serviceAccountId,
          apiKeyId: apiKey.apiKeyId,
          organizationId: apiKey.organizationId,
          role: 'admin',
        } satisfies AuthContext);

      } else {

        // Human session: validate against auth_sessions
        const isValid = await isSessionValid(payload.jti);

        if (!isValid) {

          logger.debug({ jti: payload.jti }, 'Revoked or expired session.');

          return c.json({ error: 'Session expired or revoked' }, 401);
        }

        c.set('auth', {
          kind: 'user',
          userId: payload.sub,
          organizationId: payload.organizationId,
          sessionId: payload.jti,
          role: payload.role,
        } satisfies AuthContext);
      }

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
        { principalId: auth.kind === 'user' ? auth.userId : auth.serviceAccountId, kind: auth.kind, role: auth.role, requiredRoles: roles },
        'Insufficient permissions.'
      );

      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  }
}
