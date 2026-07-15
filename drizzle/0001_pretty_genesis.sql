CREATE TABLE "studio_prototype_wisdom" (
	"id" serial PRIMARY KEY NOT NULL,
	"container_type" text NOT NULL,
	"container_id" text NOT NULL,
	"kind" text DEFAULT 'source' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"access_scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "studio_wisdom_container_idx" ON "studio_prototype_wisdom" USING btree ("container_type","container_id");--> statement-breakpoint
CREATE INDEX "studio_wisdom_embedding_hnsw_idx" ON "studio_prototype_wisdom" USING hnsw ("embedding" vector_cosine_ops);