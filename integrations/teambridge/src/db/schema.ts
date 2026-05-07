import { pgSchema, text, timestamp, jsonb, primaryKey, index } from "drizzle-orm/pg-core";

export const integrations = pgSchema("integrations");

export const teambridgeEvents = integrations.table(
  "teambridge_events",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    accountId: text("account_id").notNull(),
    recordId: text("record_id").notNull(),
    actorUserId: text("actor_user_id"),
    actorName: text("actor_name"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
  },
  (t) => [index("teambridge_events_received_at_idx").on(t.receivedAt)],
);

export const teambridgeShiftSnapshots = integrations.table("teambridge_shift_snapshots", {
  recordId: text("record_id").primaryKey(),
  fields: jsonb("fields").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Tracks first-time onboarding of a (Teambridge user, Teambridge facility) pair into
// Karibu. The PK is (nurse_id, facility_id); presence of a row means we've already
// claimed the onboarding for this pair (or completed it). On any onboarding failure
// we DELETE the row so the next webhook for the same pair retries; nominal success
// fills in `karibu_invited_at` / `task_template_*`.
//
// Why two task columns: the "template" we POST to /tasks/template carries two
// identifiers — the `display_id` we mint client-side (`task.template.<uuid>`,
// always known) and the `id` Teambridge assigns server-side (response shape isn't
// fully nailed down yet). We persist both so a parser miss on `id` doesn't lose
// the template entirely — assignment can fall back to looking the template up by
// `display_id`.
export const teambridgeNurseFacilityInvites = integrations.table(
  "teambridge_nurse_facility_invites",
  {
    nurseId: text("nurse_id").notNull(),
    facilityId: text("facility_id").notNull(),
    karibuInvitedAt: timestamp("karibu_invited_at"),
    taskCreatedAt: timestamp("task_created_at"),
    taskTemplateId: text("task_template_id"),
    taskTemplateDisplayId: text("task_template_display_id"),
    // The task *instance* recordId (we mint it client-side) returned from
    // POST /collections/v2/create_record after assigning the template to the
    // nurse. This is the handle to update/complete/dismiss the task later.
    taskRecordId: text("task_record_id"),
    // Karibu user UUID returned by /team/invite — needed to resolve the nurse
    // when Karibu fires the ML-completed webhook back at us.
    karibuUserId: text("karibu_user_id"),
    // Teambridge shift record_id from the webhook event that triggered onboarding.
    // We mark the "Karibu Completed" field on this specific shift when the nurse
    // completes their verification ML in Karibu.
    firstShiftId: text("first_shift_id"),
    // Teambridge accountId, captured from the originating webhook. Needed for
    // the web API delete call (DELETE /collections/delete_records) when we
    // remove the verification task after ML completion.
    accountId: text("account_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.nurseId, t.facilityId] })],
);

// One row per (nurse, facility, microlearning) ML completion received from Karibu.
// Presence of any row for (nurse, facility) means the pair is "verified" — the
// shift_updated handler reads this and auto-marks Karibu Verified on every new
// shift assigned to that nurse at the facility.
export const teambridgeNurseFacilityVerifications = integrations.table(
  "teambridge_nurse_facility_verifications",
  {
    nurseId: text("nurse_id").notNull(),
    facilityId: text("facility_id").notNull(),
    microlearningId: text("microlearning_id").notNull(),
    karibuUserId: text("karibu_user_id").notNull(),
    verifiedAt: timestamp("verified_at").notNull().defaultNow(),
    receivedPayload: jsonb("received_payload").notNull(),
  },
  (t) => [primaryKey({ columns: [t.nurseId, t.facilityId, t.microlearningId] })],
);
