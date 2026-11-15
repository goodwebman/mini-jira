ALTER TABLE "task_comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_id_unique" UNIQUE("task_id","id");--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parent_fk" FOREIGN KEY ("task_id","parent_id") REFERENCES "public"."task_comments"("task_id","id") ON DELETE no action ON UPDATE no action;
