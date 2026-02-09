import { Hono } from 'hono';
import { z } from 'zod';
import { loginWithPassword, loginWithToken } from '../services/auth.js';
import { logger } from '../config/logger.js';

const auth = new Hono();

// Request validation schemas
const emailPasswordLoginSchema = z.object({

  email: z.string().email(),
  password: z.string().min(8),
});

const tokenLoginSchema = z.object({

  token: z.string().min(1),
});

/**
 * POST /auth/login
 * Dual login mechanism: email+password OR token
 */
auth.post('/login', async (c) => {

  try {

    // Get request body
    const body = await c.req.json();

    // Attempt to parse as email+password login
    const emailPasswordResult = emailPasswordLoginSchema.safeParse(body);

    // If parsed as email+password login, process it
    if (emailPasswordResult.success) {

      // Extract email and password from request body
      const { email, password } = emailPasswordResult.data;

      // Get organization from context (set by organization middleware)
      const organization = c.get('organization');

      // Get IP address and user agent from request headers
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
      const userAgent = c.req.header('user-agent');

      // Log the login attempt
      logger.debug({ email }, 'Processing email/password login...');

      // Attempt to login with email and password
      const result = await loginWithPassword(email, password, organization, ipAddress, userAgent);

      if (!result.success) {

        return c.json({ error: result.error }, 401);
      }

      return c.json({
        token: result.token,
        user: result.user,
      });
    }

    // Attempt to parse as token login
    const tokenResult = tokenLoginSchema.safeParse(body);

    // If parsed as token login, process it
    if (tokenResult.success) {

      const { token } = tokenResult.data;

      // Get organization from context (set by organization middleware)
      const organization = c.get('organization');

      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
      const userAgent = c.req.header('user-agent');

      logger.info('Processing token login...');

      const result = await loginWithToken(token, organization, ipAddress, userAgent);

      if (!result.success) {

        return c.json({ error: result.error }, 401);
      }

      return c.json({
        token: result.token,
        user: result.user,
      });
    }

    // Neither schema matched
    return c.json(
      {
        error: 'Invalid request body',
        details: 'Provide either { email, password } or { token }',
      },
      400
    );

  } catch (error) {

    logger.error({ error }, 'Login endpoint error.');

    return c.json({ error: 'Internal server error' }, 500);
  }
})

export default auth;
