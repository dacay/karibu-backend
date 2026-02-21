CREATE TYPE "public"."chat_type" AS ENUM('microlearning', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."microlearning_progress_status" AS ENUM('active', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('sms');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "chat_type" NOT NULL,
	"microlearning_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"name" text NOT NULL,
	"s3_key" text NOT NULL,
	"s3_bucket" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"chroma_document_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microlearning_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"microlearning_id" uuid NOT NULL,
	"status" "microlearning_progress_status" DEFAULT 'active' NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"expired_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "microlearning_sequence_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microlearning_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microlearnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sequence_id" uuid,
	"position" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subdomain" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone_number" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_microlearning_id_microlearnings_id_fk" FOREIGN KEY ("microlearning_id") REFERENCES "public"."microlearnings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_progress" ADD CONSTRAINT "microlearning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_progress" ADD CONSTRAINT "microlearning_progress_microlearning_id_microlearnings_id_fk" FOREIGN KEY ("microlearning_id") REFERENCES "public"."microlearnings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_sequence_assignments" ADD CONSTRAINT "microlearning_sequence_assignments_sequence_id_microlearning_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."microlearning_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_sequence_assignments" ADD CONSTRAINT "microlearning_sequence_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_sequences" ADD CONSTRAINT "microlearning_sequences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearnings" ADD CONSTRAINT "microlearnings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearnings" ADD CONSTRAINT "microlearnings_sequence_id_microlearning_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."microlearning_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_chat_id_idx" ON "chat_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_organization_id_idx" ON "documents" USING btree ("organization_id");