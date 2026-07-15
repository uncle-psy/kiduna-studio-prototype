import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { StudioState } from "@/lib/studio-state";

export const studioWorkspaces = pgTable("studio_prototype_workspaces", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  state: jsonb("state").$type<StudioState>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studioEvents = pgTable("studio_prototype_events", {
  id: serial("id").primaryKey(),
  workspaceSlug: text("workspace_slug").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  summary: text("summary").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("studio_events_workspace_created_idx").on(table.workspaceSlug, table.createdAt)]);
