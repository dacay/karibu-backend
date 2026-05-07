import { logger } from '../config/logger.js';

const log = logger.child({ module: 'completion-webhook' });

interface MlCompletionPayload {
  url: string;
  karibuUserId: string;
  organizationId: string;
  microlearningId: string;
  completedAt: Date;
  email?: string;
}

/**
 * Fire-and-forget POST to a per-ML completion webhook URL. The URL is read off
 * the microlearning row at completion time (`microlearnings.completion_webhook_url`).
 * Failures are logged, never thrown — the chat handler must not surface them.
 */
export async function notifyMlCompletion(payload: MlCompletionPayload): Promise<void> {

  try {
    const res = await fetch(payload.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        karibuUserId: payload.karibuUserId,
        organizationId: payload.organizationId,
        microlearningId: payload.microlearningId,
        completedAt: payload.completedAt.toISOString(),
        email: payload.email,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.error(
        { status: res.status, body: body.slice(0, 500), microlearningId: payload.microlearningId, url: payload.url },
        'completion webhook returned non-2xx',
      );
      return;
    }

    log.info(
      { microlearningId: payload.microlearningId, karibuUserId: payload.karibuUserId, url: payload.url },
      'fired ML completion webhook',
    );
  } catch (err) {
    log.error(
      { err, microlearningId: payload.microlearningId, url: payload.url },
      'failed to call completion webhook',
    );
  }
}
