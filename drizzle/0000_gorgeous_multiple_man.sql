CREATE TABLE "studio_prototype_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_slug" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_prototype_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_prototype_workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "studio_events_workspace_created_idx" ON "studio_prototype_events" USING btree ("workspace_slug","created_at");