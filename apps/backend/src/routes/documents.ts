import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { uploadToS3, deleteFromS3, buildDocumentKey } from '../services/s3.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

const documentsRouter = new Hono();

// All document routes require authentication
documentsRouter.use('*', authMiddleware());

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]);

const MAX_FILE_SIZE_BYTES = env.S3_MAX_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * POST /documents/upload
 * Upload a document to S3 and record it in the database.
 * Admin only.
 */
documentsRouter.post('/upload', requireRole('admin'), async (c) => {

  const auth = c.get('auth');

  let formData: FormData;

  try {

    formData = await c.req.formData();

  } catch {

    return c.json({ error: 'Invalid multipart form data.' }, 400);
  }

  const file = formData.get('file');

  if (!file || !(file instanceof File)) {

    return c.json({ error: 'No file provided. Include a "file" field in the form data.' }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {

    return c.json({
      error: `Unsupported file type: ${file.type}. Allowed types: PDF, Word documents, plain text, Markdown.`,
    }, 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {

    return c.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` }, 400);
  }

  // Insert a pending record first to get the document ID for the S3 key
  const [document] = await db.insert(documents).values({
    organizationId: auth.organizationId,
    uploadedBy: auth.userId,
    name: file.name,
    s3Key: '', // will be updated after upload
    s3Bucket: '',
    mimeType: file.type,
    sizeBytes: file.size,
    status: 'uploaded',
  }).returning();

  const s3Key = buildDocumentKey(auth.organizationId, document.id, file.name);

  try {

    const buffer = Buffer.from(await file.arrayBuffer());
    const { s3Bucket } = await uploadToS3(s3Key, buffer, file.type);

    // Update record with S3 location
    const [updated] = await db
      .update(documents)
      .set({ s3Key, s3Bucket })
      .where(eq(documents.id, document.id))
      .returning();

    logger.info({ documentId: updated.id, organizationId: auth.organizationId }, 'Document uploaded.');

    return c.json({ document: updated }, 201);

  } catch (error) {

    // Clean up the DB record if S3 upload failed
    await db.delete(documents).where(eq(documents.id, document.id));

    logger.error({ error, documentId: document.id }, 'S3 upload failed.');

    return c.json({ error: 'Failed to upload file. Please try again.' }, 500);
  }
})

/**
 * GET /documents
 * List all documents for the current organization.
 */
documentsRouter.get('/', requireRole('admin'), async (c) => {

  const auth = c.get('auth');

  const results = await db
    .select()
    .from(documents)
    .where(eq(documents.organizationId, auth.organizationId))
    .orderBy(desc(documents.createdAt));

  return c.json({ documents: results });
})

/**
 * DELETE /documents/:id
 * Delete a document from S3 and remove its DB record.
 * Admin only.
 */
documentsRouter.delete('/:id', requireRole('admin'), async (c) => {

  const auth = c.get('auth');
  const id = c.req.param('id');

  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.organizationId, auth.organizationId)
      )
    )
    .limit(1);

  if (!document) {

    return c.json({ error: 'Document not found.' }, 404);
  }

  try {

    if (document.s3Key) {

      await deleteFromS3(document.s3Key);
    }

  } catch (error) {

    logger.warn({ error, documentId: id }, 'Failed to delete document from S3, proceeding with DB deletion.');
  }

  await db.delete(documents).where(eq(documents.id, id));

  logger.info({ documentId: id, organizationId: auth.organizationId }, 'Document deleted.');

  return c.json({ success: true });
})

export default documentsRouter;
