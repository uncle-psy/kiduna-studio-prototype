import { index, jsonb, pgTable, serial, text, timestamp, vector } from "drizzle-orm/pg-core";
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

export const studioWisdom = pgTable("studio_prototype_wisdom", {
  id: serial("id").primaryKey(),
  containerType: text("container_type").notNull(),
  containerId: text("container_id").notNull(),
  kind: text("kind").notNull().default("source"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull().default({}),
  accessScope: jsonb("access_scope").$type<Record<string, unknown>>().notNull().default({}),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("studio_wisdom_container_idx").on(table.containerType, table.containerId),
  index("studio_wisdom_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);
