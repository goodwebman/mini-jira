ALTER TABLE "board_favorites" DROP CONSTRAINT "board_favorites_board_id_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "board_members" DROP CONSTRAINT "board_members_board_id_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "sprint_tasks" DROP CONSTRAINT "sprint_tasks_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "sprints" DROP CONSTRAINT "sprints_board_id_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_links" DROP CONSTRAINT "task_links_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_links" DROP CONSTRAINT "task_links_target_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_status_intervals" DROP CONSTRAINT "task_status_intervals_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "board_favorites" ADD CONSTRAINT "board_favorites_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_tasks" ADD CONSTRAINT "sprint_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_links" ADD CONSTRAINT "task_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_links" ADD CONSTRAINT "task_links_target_task_id_tasks_id_fk" FOREIGN KEY ("target_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_intervals" ADD CONSTRAINT "task_status_intervals_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;