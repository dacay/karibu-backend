// Inbound webhook from the Karibu backend: a flagged microlearning was
// completed for a learner. We resolve (nurse, facility), record the verification,
// and write "Karibu Verified" on the originating shift in Teambridge.
//
// Future shifts assigned to the same (nurse, facility) pair are auto-marked by
// `webhook.ts:processShiftUpdate` reading from teambridge_nurse_facility_verifications.

import type { Context } from "hono";
import { and, eq } from "drizzle-orm";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { db } from "./db/client.js";
import {
  teambridgeNurseFacilityInvites,
  teambridgeNurseFacilityVerifications,
} from "./db/schema.js";
import { getFacilityByKaribuOrgId } from "./facilities.js";
import { getSchema } from "./schema.js";
import { setShiftField, deleteRecords } from "./teambridge.js";

const log = logger.child({ module: "karibu_webhook" });

interface MlCompletedBody {
  karibuUserId?: string;
  organizationId?: string;
  microlearningId?: string;
  completedAt?: string;
  email?: string;
}

export async function handleMlCompleted(c: Context): Promise<Response> {
  // Optional bearer (PoC — skip if not configured on either side).
  if (config.karibuWebhookBearer) {
    const auth = c.req.header("authorization");
    const expected = `Bearer ${config.karibuWebhookBearer}`;
    if (auth !== expected) {
      log.warn("ml-completed webhook rejected: bearer mismatch");
      return c.json({ error: "unauthorized" }, 401);
    }
  }

  let body: MlCompletedBody;
  try {
    body = (await c.req.json()) as MlCompletedBody;
  } catch {
    log.warn("ml-completed webhook rejected: invalid JSON body");
    return c.json({ error: "invalid JSON" }, 400);
  }

  const { karibuUserId, organizationId, microlearningId } = body;
  if (!karibuUserId || !organizationId || !microlearningId) {
    log.warn({ body }, "ml-completed webhook rejected: missing fields");
    return c.json({ error: "missing required fields" }, 400);
  }

  const ctx = { karibuUserId, organizationId, microlearningId };

  const mapped = getFacilityByKaribuOrgId(organizationId);
  if (!mapped) {
    log.info(ctx, "ignored: organizationId not in facilities map");
    return c.json({ ok: true, ignored: "untracked organization" });
  }
  const { facilityId, facility } = mapped;

  // Resolve the Teambridge nurse via (karibu_user_id, facility_id) on the
  // onboarding row. If we never onboarded this user at this facility we have
  // no shift to mark — ignore.
  const [invite] = await db
    .select({
      nurseId: teambridgeNurseFacilityInvites.nurseId,
      firstShiftId: teambridgeNurseFacilityInvites.firstShiftId,
      taskRecordId: teambridgeNurseFacilityInvites.taskRecordId,
      accountId: teambridgeNurseFacilityInvites.accountId,
    })
    .from(teambridgeNurseFacilityInvites)
    .where(
      and(
        eq(teambridgeNurseFacilityInvites.karibuUserId, karibuUserId),
        eq(teambridgeNurseFacilityInvites.facilityId, facilityId),
      ),
    )
    .limit(1);

  if (!invite) {
    log.info(
      { ...ctx, facilityId, facilityName: facility.name },
      "ignored: no onboarding row for (karibu_user_id, facility_id)",
    );
    return c.json({ ok: true, ignored: "not onboarded" });
  }

  // Persist the verification first (idempotent via PK on (nurse, facility, ml)).
  // Future shifts read this and auto-populate Karibu Verified.
  await db
    .insert(teambridgeNurseFacilityVerifications)
    .values({
      nurseId: invite.nurseId,
      facilityId,
      microlearningId,
      karibuUserId,
      receivedPayload: body as unknown as object,
    })
    .onConflictDoNothing();

  // Mark the originating shift now. Failures are logged but don't fail the
  // webhook — Karibu won't retry, and the future-shifts auto-populate path
  // still works.
  if (!invite.firstShiftId) {
    log.warn(
      { ...ctx, nurseId: invite.nurseId, facilityId, facilityName: facility.name },
      "verified, but no first_shift_id on the onboarding row — nothing to mark now",
    );
    return c.json({ ok: true });
  }

  const { karibuCompletedFieldId, karibuCompletedValue, tasksCollectionId } = getSchema();
  try {
    await setShiftField(invite.firstShiftId, karibuCompletedFieldId, karibuCompletedValue);
    log.info(
      { ...ctx, nurseId: invite.nurseId, facilityId, facilityName: facility.name, shiftId: invite.firstShiftId },
      "applied Karibu Completed to first shift",
    );
  } catch (err) {
    log.error(
      { ...ctx, nurseId: invite.nurseId, facilityId, shiftId: invite.firstShiftId, err },
      "failed to set Karibu Completed on first shift",
    );
  }

  // Delete the verification task instance from Teambridge once the nurse has
  // completed the corresponding ML in Karibu. The task is no longer actionable.
  // Best-effort: failures are logged but don't fail the webhook (Karibu won't
  // retry, and the shift is already marked verified).
  if (invite.taskRecordId && invite.accountId) {
    try {
      await deleteRecords({
        accountId: invite.accountId,
        collectionId: tasksCollectionId,
        recordIds: [invite.taskRecordId],
      });
      log.info(
        { ...ctx, nurseId: invite.nurseId, facilityId, taskRecordId: invite.taskRecordId },
        "deleted verification task in Teambridge",
      );
    } catch (err) {
      log.error(
        { ...ctx, nurseId: invite.nurseId, facilityId, taskRecordId: invite.taskRecordId, err },
        "failed to delete verification task",
      );
    }
  }

  return c.json({ ok: true });
}
