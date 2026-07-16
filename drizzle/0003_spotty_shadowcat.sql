ALTER TABLE "prototype_users" ADD COLUMN "handle" text;--> statement-breakpoint
UPDATE "prototype_users" SET "handle" = CASE WHEN "email" = 'david@kiduna.club' THEN 'moto' ELSE 'member-' || left(replace("id", '-', ''), 12) END;--> statement-breakpoint
ALTER TABLE "prototype_users" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_users_handle_idx" ON "prototype_users" USING btree ("handle");
