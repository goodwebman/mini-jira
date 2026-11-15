CREATE TABLE "task_pauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interval_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "task_pauses_dates_check" CHECK ("task_pauses"."ended_at" is null or "task_pauses"."ended_at" >= "task_pauses"."started_at")
);
--> statement-breakpoint
ALTER TABLE "task_pauses" ADD CONSTRAINT "task_pauses_interval_id_task_status_intervals_id_fk" FOREIGN KEY ("interval_id") REFERENCES "public"."task_status_intervals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_pauses_interval_started_idx" ON "task_pauses" USING btree ("interval_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_pauses_open_idx" ON "task_pauses" USING btree ("interval_id") WHERE "task_pauses"."ended_at" is null;--> statement-breakpoint
INSERT INTO "task_pauses" ("interval_id", "started_at")
SELECT i."id", t."paused_at"
FROM "tasks" t JOIN "task_status_intervals" i ON i."task_id" = t."id" AND i."left_at" IS NULL
WHERE t."paused_at" IS NOT NULL;
