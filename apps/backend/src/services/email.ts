import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Build the invitation sign-in URL for a given organization subdomain and auth token.
 * Prepends the subdomain to the configured FRONTEND_URL.
 * e.g. FRONTEND_URL="https://karibu.ai", subdomain="acme" → "https://acme.karibu.ai/?token=..."
 */
export const buildInviteUrl = (subdomain: string, token: string): string => {

  const base = new URL(env.FRONTEND_URL);

  return `${base.protocol}//${subdomain}.${base.host}/?token=${token}`;
}

/**
 * Create a reusable nodemailer transporter, or null if SMTP is not configured.
 */
const createTransporter = () => {

  if (!env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });
}

/**
 * Send an invitation email to a user with their sign-in link.
 * Logs a warning and skips silently if SMTP is not configured.
 */
export const sendInvitationEmail = async (
  to: string,
  organizationName: string,
  signInUrl: string
): Promise<void> => {

  const transporter = createTransporter();

  if (!transporter) {

    logger.warn({ to }, 'SMTP not configured; skipping invitation email.');

    return;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px;">You have been invited to ${organizationName}</h2>
      <p style="margin: 0 0 24px; color: #555;">
        Click the button below to sign in. This link is personal to you — do not share it.
      </p>
      <a href="${signInUrl}"
         style="display: inline-block; padding: 12px 24px; background: #000; color: #fff;
                text-decoration: none; border-radius: 6px; font-weight: 600;">
        Sign in to ${organizationName}
      </a>
      <p style="margin: 24px 0 0; font-size: 12px; color: #999;">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="${signInUrl}" style="color: #999;">${signInUrl}</a>
      </p>
    </div>
  `;

  const text = `You have been invited to ${organizationName}.\n\nSign in here: ${signInUrl}\n\nDo not share this link.`;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `You have been invited to ${organizationName}`,
    text,
    html,
  });

  logger.info({ to }, 'Invitation email sent.');
}
