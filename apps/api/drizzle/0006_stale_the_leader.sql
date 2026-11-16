ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type_check";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "task_key" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "comment_id" uuid;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "mentions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('board_member_added', 'board_role_changed', 'board_member_removed', 'task_assigned', 'task_unassigned', 'task_updated', 'task_status_changed', 'task_review_rejected', 'task_test_failed', 'task_activity', 'comment_added', 'comment_reply', 'comment_mention'));