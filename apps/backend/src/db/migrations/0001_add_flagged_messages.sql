-- Migration: Add flagged_messages table for message flagging feature
-- Run: pnpm --filter backend db:push  OR  apply manually

CREATE TYPE "public"."flagged_message_status" AS ENUM('open', 'reviewed', 'dismissed');

CREATE TABLE IF NOT EXISTS "flagged_messages" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id"      text NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "chat_id"         text NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
  "flagged_by"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "reason"          text,
  "status"          "flagged_message_status" NOT NULL DEFAULT 'open',
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "flagged_messages_organization_id_idx" ON "flagged_messages" ("organization_id");
CREATE INDEX IF NOT EXISTS "flagged_messages_status_idx" ON "flagged_messages" ("status");
