import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export type LogoVariant = 'light' | 'dark';

const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes

function getS3Client(): S3Client {

  return new S3Client({
    region: env.S3_ORG_REGION,
    credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  })
}

/**
 * Returns the S3 key for an org logo.
 * Pattern: org-logos/{subdomain}/logo-{variant}.png
 */
export function getLogoKey(subdomain: string, variant: LogoVariant): string {

  return `org-logos/${subdomain}/logo-${variant}.png`
}

/**
 * Generates a presigned PUT URL for uploading an org logo to S3.
 * Accepts PNG and JPEG images only.
 */
export async function getLogoUploadUrl(
  subdomain: string,
  variant: LogoVariant,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {

  if (!env.S3_ORG_BUCKET) {
    throw new Error('S3_ORG_BUCKET is not configured.')
  }

  const key = getLogoKey(subdomain, variant);

  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: env.S3_ORG_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

  logger.debug({ subdomain, variant, key }, 'Generated presigned URL for logo upload.');

  return { uploadUrl, key }
}
