CREATE TABLE "prototype_code_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"code_id" text NOT NULL,
	"redeemed_by_user_id" text NOT NULL,
	"redeemed_email" text NOT NULL,
	"lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_email_verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_kinship_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"issuer_user_id" text NOT NULL,
	"issuer_persona_id" text,
	"audience" text DEFAULT 'personal' NOT NULL,
	"bound_name" text,
	"bound_email" text,
	"trust_level" text NOT NULL,
	"purpose" text NOT NULL,
	"context_summary" text NOT NULL,
	"relationship_description" text NOT NULL,
	"access_level" text DEFAULT 'private' NOT NULL,
	"access_grants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"redeem_by" timestamp with time zone,
	"access_ttl" text,
	"parent_code_id" text,
	"lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claims" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_personas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"initials" text NOT NULL,
	"role" text DEFAULT 'Member' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_relationship_namespaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"subject_user_id" text,
	"subject_name" text NOT NULL,
	"subject_email" text,
	"code_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_relationship_wisdom" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"perspective" text NOT NULL,
	"content" text NOT NULL,
	"access_level" text NOT NULL,
	"access_grants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"person_a_user_id" text NOT NULL,
	"person_b_user_id" text NOT NULL,
	"formed_by_code_id" text,
	"a_trust_level" text NOT NULL,
	"b_trust_level" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"invited_by_code_id" text,
	"lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prototype_code_redemptions" ADD CONSTRAINT "prototype_code_redemptions_code_id_prototype_kinship_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."prototype_kinship_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_code_redemptions" ADD CONSTRAINT "prototype_code_redemptions_redeemed_by_user_id_prototype_users_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_email_verification_tokens" ADD CONSTRAINT "prototype_email_verification_tokens_user_id_prototype_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_kinship_codes" ADD CONSTRAINT "prototype_kinship_codes_issuer_user_id_prototype_users_id_fk" FOREIGN KEY ("issuer_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_kinship_codes" ADD CONSTRAINT "prototype_kinship_codes_issuer_persona_id_prototype_personas_id_fk" FOREIGN KEY ("issuer_persona_id") REFERENCES "public"."prototype_personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_personas" ADD CONSTRAINT "prototype_personas_user_id_prototype_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationship_namespaces" ADD CONSTRAINT "prototype_relationship_namespaces_owner_user_id_prototype_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationship_namespaces" ADD CONSTRAINT "prototype_relationship_namespaces_subject_user_id_prototype_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationship_namespaces" ADD CONSTRAINT "prototype_relationship_namespaces_code_id_prototype_kinship_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."prototype_kinship_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationship_wisdom" ADD CONSTRAINT "prototype_relationship_wisdom_namespace_id_prototype_relationship_namespaces_id_fk" FOREIGN KEY ("namespace_id") REFERENCES "public"."prototype_relationship_namespaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationship_wisdom" ADD CONSTRAINT "prototype_relationship_wisdom_author_user_id_prototype_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationships" ADD CONSTRAINT "prototype_relationships_person_a_user_id_prototype_users_id_fk" FOREIGN KEY ("person_a_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationships" ADD CONSTRAINT "prototype_relationships_person_b_user_id_prototype_users_id_fk" FOREIGN KEY ("person_b_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_relationships" ADD CONSTRAINT "prototype_relationships_formed_by_code_id_prototype_kinship_codes_id_fk" FOREIGN KEY ("formed_by_code_id") REFERENCES "public"."prototype_kinship_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_sessions" ADD CONSTRAINT "prototype_sessions_user_id_prototype_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_code_redemptions_code_user_idx" ON "prototype_code_redemptions" USING btree ("code_id","redeemed_by_user_id");--> statement-breakpoint
CREATE INDEX "prototype_code_redemptions_user_idx" ON "prototype_code_redemptions" USING btree ("redeemed_by_user_id");--> statement-breakpoint
CREATE INDEX "prototype_email_verification_user_idx" ON "prototype_email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_kinship_codes_code_idx" ON "prototype_kinship_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "prototype_kinship_codes_issuer_idx" ON "prototype_kinship_codes" USING btree ("issuer_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_personas_handle_idx" ON "prototype_personas" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "prototype_personas_user_idx" ON "prototype_personas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prototype_relationship_namespaces_owner_idx" ON "prototype_relationship_namespaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "prototype_relationship_namespaces_subject_idx" ON "prototype_relationship_namespaces" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "prototype_relationship_wisdom_namespace_idx" ON "prototype_relationship_wisdom" USING btree ("namespace_id","created_at");--> statement-breakpoint
CREATE INDEX "prototype_relationship_wisdom_embedding_idx" ON "prototype_relationship_wisdom" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_relationships_pair_idx" ON "prototype_relationships" USING btree ("person_a_user_id","person_b_user_id");--> statement-breakpoint
CREATE INDEX "prototype_relationships_person_b_idx" ON "prototype_relationships" USING btree ("person_b_user_id");--> statement-breakpoint
CREATE INDEX "prototype_sessions_user_idx" ON "prototype_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_users_email_idx" ON "prototype_users" USING btree ("email");