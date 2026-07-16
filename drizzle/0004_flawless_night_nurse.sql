CREATE TABLE "prototype_organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'Member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prototype_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"org_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prototype_organization_members" ADD CONSTRAINT "prototype_organization_members_organization_id_prototype_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."prototype_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_organization_members" ADD CONSTRAINT "prototype_organization_members_user_id_prototype_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prototype_organizations" ADD CONSTRAINT "prototype_organizations_created_by_user_id_prototype_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."prototype_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_organization_members_pair_idx" ON "prototype_organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "prototype_organization_members_user_idx" ON "prototype_organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prototype_organizations_org_id_idx" ON "prototype_organizations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "prototype_organizations_creator_idx" ON "prototype_organizations" USING btree ("created_by_user_id");