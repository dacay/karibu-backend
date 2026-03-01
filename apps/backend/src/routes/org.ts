import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organizations } from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getLogoUploadUrl } from '../services/s3.js';
import { logger } from '../config/logger.js';

const org = new Hono();

// All org config routes require authentication and admin role
org.use('*', authMiddleware());
org.use('*', requireRole('admin'));

const updateConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pronunciation: z.string().max(200).optional().nullable(),
});

const presignSchema = z.object({
  variant: z.enum(['light', 'dark']),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
});

/**
 * GET /org/config
 * Returns the current organization's configurable fields.
 */
org.get('/config', async (c) => {

  try {

    const organization = c.get('organization');

    const [row] = await db
      .select({
        name: organizations.name,
        subdomain: organizations.subdomain,
        pronunciation: organizations.pronunciation,
      })
      .from(organizations)
      .where(eq(organizations.id, organization.id))
      .limit(1);

    if (!row) {
      return c.json({ error: 'Organization not found.' }, 404);
    }

    return c.json(row);

  } catch (error) {

    logger.error({ error }, 'Failed to fetch org config.');

    return c.json({ error: 'Internal server error.' }, 500);
  }
})

/**
 * PATCH /org/config
 * Updates the organization's name and/or pronunciation.
 */
org.patch('/config', zValidator('json', updateConfigSchema), async (c) => {

  try {

    const organization = c.get('organization');
    const body = c.req.valid('json');

    const updates: Record<string, string | null> = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }

    if (body.pronunciation !== undefined) {
      updates.pronunciation = body.pronunciation;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No fields to update.' }, 400);
    }

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, organization.id))
      .returning({
        name: organizations.name,
        subdomain: organizations.subdomain,
        pronunciation: organizations.pronunciation,
      });

    logger.info({ organizationId: organization.id }, 'Org config updated.');

    return c.json(updated);

  } catch (error) {

    logger.error({ error }, 'Failed to update org config.');

    return c.json({ error: 'Internal server error.' }, 500);
  }
})

/**
 * POST /org/logo/presign
 * Returns a presigned S3 URL for uploading a logo variant.
 */
org.post('/logo/presign', zValidator('json', presignSchema), async (c) => {

  try {

    const organization = c.get('organization');
    const { variant, contentType } = c.req.valid('json');

    const { uploadUrl, key } = await getLogoUploadUrl(
      organization.subdomain,
      variant,
      contentType,
    );

    return c.json({ uploadUrl, key });

  } catch (error) {

    const message = error instanceof Error ? error.message : 'Internal server error.';

    if (message.includes('S3_ORG_BUCKET')) {
      logger.warn('S3 org bucket not configured.');
      return c.json({ error: 'Logo upload is not configured.' }, 503);
    }

    logger.error({ error }, 'Failed to generate presigned URL.');

    return c.json({ error: 'Internal server error.' }, 500);
  }
})

export default org;
