CREATE TYPE "public"."ai_draft_kind" AS ENUM('document_content', 'document_links', 'approver_suggestions', 'publish_memo');--> statement-breakpoint
CREATE TYPE "public"."ai_draft_status" AS ENUM('proposed', 'reviewed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('Codex', 'Claude');--> statement-breakpoint
CREATE TYPE "public"."approval_authority" AS ENUM('lead', 'required_reviewer', 'optional_reviewer');--> statement-breakpoint
CREATE TYPE "public"."approval_candidate_source" AS ENUM('workspace_membership', 'github_import');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('approved', 'changes_requested', 'restored');--> statement-breakpoint
CREATE TYPE "public"."document_approval_state" AS ENUM('not_requested', 'pending', 'approved', 'changes_requested', 'invalidated', 'restored');--> statement-breakpoint
CREATE TYPE "public"."document_review_status" AS ENUM('idle', 'review_requested', 'changes_requested', 'approved');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('PRD', 'UX Flow', 'Technical Spec', 'Policy/Decision');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."publish_artifact_kind" AS ENUM('document', 'template');--> statement-breakpoint
CREATE TYPE "public"."publish_notification_kind" AS ENUM('in_app', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."publish_notification_status" AS ENUM('pending', 'queued', 'sent');--> statement-breakpoint
CREATE TYPE "public"."publish_preflight_status" AS ENUM('ready', 'ready_with_warnings', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."publish_record_status" AS ENUM('draft', 'ready_for_publish', 'publishing', 'published');--> statement-breakpoint
CREATE TYPE "public"."publish_staleness_status" AS ENUM('current', 'stale');--> statement-breakpoint
CREATE TYPE "public"."template_source" AS ENUM('system', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('Lead', 'Editor', 'Reviewer');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('active', 'provisioning', 'archived');--> statement-breakpoint
CREATE TABLE "ai_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text,
	"template_id" text,
	"provider" "ai_provider" NOT NULL,
	"kind" "ai_draft_kind" NOT NULL,
	"status" "ai_draft_status" DEFAULT 'proposed' NOT NULL,
	"summary" text NOT NULL,
	"prompt_label" text NOT NULL,
	"authoring_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_linked_document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" text PRIMARY KEY NOT NULL,
	"approval_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_membership_id" text,
	"note" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text NOT NULL,
	"authority" "approval_authority" NOT NULL,
	"source" "approval_candidate_source" NOT NULL,
	"state" "document_approval_state" DEFAULT 'pending' NOT NULL,
	"membership_id" text,
	"github_candidate_login" text,
	"reviewer_label" text NOT NULL,
	"requested_by_membership_id" text,
	"decision" "approval_decision",
	"decision_by_membership_id" text,
	"restoration_by_membership_id" text,
	"restored_from_approval_id" text,
	"invalidated_by_document_id" text,
	"decision_note" text,
	"requested_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"restored_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_invalidations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text NOT NULL,
	"source_document_id" text NOT NULL,
	"reason" text NOT NULL,
	"summary" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"affects_approval_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_review_request" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_links" (
	"source_document_id" text NOT NULL,
	"target_document_id" text NOT NULL,
	"relationship_kind" text DEFAULT 'reference' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_links_pk" PRIMARY KEY("source_document_id","target_document_id")
);
--> statement-breakpoint
CREATE TABLE "document_locks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text NOT NULL,
	"locked_by_membership_id" text NOT NULL,
	"acquired_from_area" text NOT NULL,
	"inactivity_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone NOT NULL,
	"released_by_membership_id" text,
	"release_reason" text,
	"released_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"markdown_source" text NOT NULL,
	"changed_by_membership_id" text NOT NULL,
	"change_summary" text,
	"linked_document_ids_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"type" "document_type" NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"review_status" "document_review_status" DEFAULT 'idle' NOT NULL,
	"approval_state" "document_approval_state" DEFAULT 'not_requested' NOT NULL,
	"freshness_status" "publish_staleness_status" DEFAULT 'current' NOT NULL,
	"stale_rationale_required" boolean DEFAULT false NOT NULL,
	"current_markdown_source" text NOT NULL,
	"owner_membership_id" text NOT NULL,
	"created_by_membership_id" text NOT NULL,
	"template_id" text NOT NULL,
	"active_publish_record_id" text,
	"review_requested_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"last_reviewed_by_membership_id" text,
	"approved_at" timestamp with time zone,
	"stale_evaluated_at" timestamp with time zone,
	"stale_summary" text,
	"stale_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_published_at" timestamp with time zone,
	"last_published_commit_sha" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"publish_record_id" text NOT NULL,
	"kind" "publish_notification_kind" NOT NULL,
	"label" text NOT NULL,
	"membership_id" text,
	"destination" text,
	"status" "publish_notification_status" DEFAULT 'pending' NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_record_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"publish_record_id" text NOT NULL,
	"artifact_kind" "publish_artifact_kind" NOT NULL,
	"target_document_id" text,
	"target_template_id" text,
	"label" text NOT NULL,
	"document_type" "document_type",
	"change_summary" text NOT NULL,
	"linked_document_ids_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"staleness_status" "publish_staleness_status",
	"unresolved_approval_ids_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"invalidation_ids_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_records" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_document_id" text,
	"source_template_id" text,
	"source_label" text NOT NULL,
	"change_summary" text NOT NULL,
	"current_stage_id" text NOT NULL,
	"memo_suggestion_id" text,
	"stale_rationale" text DEFAULT '' NOT NULL,
	"status" "publish_record_status" DEFAULT 'draft' NOT NULL,
	"initiated_by_membership_id" text NOT NULL,
	"repository_owner" text NOT NULL,
	"repository_name" text NOT NULL,
	"default_branch" text NOT NULL,
	"base_branch" text NOT NULL,
	"branch_name" text NOT NULL,
	"github_installation_id" bigint,
	"commit_sha" text,
	"commit_message" text NOT NULL,
	"pull_request_number" integer,
	"pull_request_title" text NOT NULL,
	"pull_request_url" text,
	"preflight_status" "publish_preflight_status" DEFAULT 'ready' NOT NULL,
	"preflight_summary" text DEFAULT '' NOT NULL,
	"stale_rationale_entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unresolved_approvals_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"invalidation_ids_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preflight_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validated_at" timestamp with time zone,
	"branch_created_at" timestamp with time zone,
	"commit_created_at" timestamp with time zone,
	"pull_request_created_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"document_type" "document_type" NOT NULL,
	"source" "template_source" NOT NULL,
	"status" "template_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by_membership_id" text NOT NULL,
	"authoring_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"last_published_commit_sha" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"avatar_initials" text NOT NULL,
	"github_login" text NOT NULL,
	"primary_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"notification_webhook_url" text,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"status" "workspace_status" DEFAULT 'active' NOT NULL,
	"docs_repo_owner" text NOT NULL,
	"docs_repo_name" text NOT NULL,
	"docs_repo_default_branch" text NOT NULL,
	"github_installation_id" bigint,
	"created_by_user_id" text NOT NULL,
	"lead_membership_id" text,
	"provisioned_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_approval_id_approval_requests_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_actor_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("requested_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decision_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("decision_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_restoration_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("restoration_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_invalidated_by_document_id_documents_id_fk" FOREIGN KEY ("invalidated_by_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_invalidations" ADD CONSTRAINT "document_invalidations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_invalidations" ADD CONSTRAINT "document_invalidations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_invalidations" ADD CONSTRAINT "document_invalidations_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_target_document_id_documents_id_fk" FOREIGN KEY ("target_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_locks" ADD CONSTRAINT "document_locks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_locks" ADD CONSTRAINT "document_locks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_locks" ADD CONSTRAINT "document_locks_locked_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("locked_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_locks" ADD CONSTRAINT "document_locks_released_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("released_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_changed_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("changed_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("owner_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_last_reviewed_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("last_reviewed_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_notifications" ADD CONSTRAINT "publish_notifications_publish_record_id_publish_records_id_fk" FOREIGN KEY ("publish_record_id") REFERENCES "public"."publish_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_notifications" ADD CONSTRAINT "publish_notifications_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_record_artifacts" ADD CONSTRAINT "publish_record_artifacts_publish_record_id_publish_records_id_fk" FOREIGN KEY ("publish_record_id") REFERENCES "public"."publish_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_record_artifacts" ADD CONSTRAINT "publish_record_artifacts_target_document_id_documents_id_fk" FOREIGN KEY ("target_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_record_artifacts" ADD CONSTRAINT "publish_record_artifacts_target_template_id_templates_id_fk" FOREIGN KEY ("target_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_source_template_id_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_initiated_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("initiated_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_membership_id_workspace_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."workspace_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_drafts_workspace_document_idx" ON "ai_drafts" USING btree ("workspace_id","document_id");--> statement-breakpoint
CREATE INDEX "approval_events_approval_idx" ON "approval_events" USING btree ("approval_id","created_at");--> statement-breakpoint
CREATE INDEX "approval_requests_document_idx" ON "approval_requests" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "approval_requests_state_idx" ON "approval_requests" USING btree ("workspace_id","state");--> statement-breakpoint
CREATE INDEX "document_invalidations_document_idx" ON "document_invalidations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_invalidations_source_idx" ON "document_invalidations" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "document_links_source_idx" ON "document_links" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "document_links_target_idx" ON "document_links" USING btree ("target_document_id");--> statement-breakpoint
CREATE INDEX "document_locks_document_idx" ON "document_locks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_locks_active_idx" ON "document_locks" USING btree ("document_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_version_idx" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_workspace_slug_idx" ON "documents" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "documents_workspace_type_idx" ON "documents" USING btree ("workspace_id","type");--> statement-breakpoint
CREATE INDEX "documents_workspace_status_idx" ON "documents" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "publish_notifications_publish_record_idx" ON "publish_notifications" USING btree ("publish_record_id");--> statement-breakpoint
CREATE INDEX "publish_record_artifacts_publish_record_idx" ON "publish_record_artifacts" USING btree ("publish_record_id");--> statement-breakpoint
CREATE INDEX "publish_records_workspace_idx" ON "publish_records" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "publish_records_status_idx" ON "publish_records" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_workspace_name_idx" ON "templates" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "templates_workspace_type_idx" ON "templates" USING btree ("workspace_id","document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_idx" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "users_github_login_idx" ON "users" USING btree ("github_login");--> statement-breakpoint
CREATE UNIQUE INDEX "users_primary_email_idx" ON "users" USING btree ("primary_email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_workspace_user_idx" ON "workspace_memberships" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_workspace_role_idx" ON "workspace_memberships" USING btree ("workspace_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_repo_idx" ON "workspaces" USING btree ("docs_repo_owner","docs_repo_name");--> statement-breakpoint
CREATE INDEX "workspaces_created_by_idx" ON "workspaces" USING btree ("created_by_user_id");