import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, vector } from "drizzle-orm/pg-core";
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

export type AccessGrants = {
  userIds?: string[];
  personaIds?: string[];
  communityIds?: string[];
  organizationIds?: string[];
  projectIds?: string[];
  notes?: string;
};

export const prototypeUsers = pgTable("prototype_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("active"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  invitedByCodeId: text("invited_by_code_id"),
  lineage: jsonb("lineage").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("prototype_users_email_idx").on(table.email), uniqueIndex("prototype_users_handle_idx").on(table.handle)]);

export const prototypePersonas = pgTable("prototype_personas", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull().default("Member"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prototype_personas_handle_idx").on(table.handle),
  index("prototype_personas_user_idx").on(table.userId),
]);

export const prototypeSessions = pgTable("prototype_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("prototype_sessions_user_idx").on(table.userId)]);

export const prototypeEmailVerificationTokens = pgTable("prototype_email_verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  codeId: text("code_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("prototype_email_verification_user_idx").on(table.userId)]);

export const prototypeKinshipCodes = pgTable("prototype_kinship_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  issuerUserId: text("issuer_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  issuerPersonaId: text("issuer_persona_id").references(() => prototypePersonas.id, { onDelete: "set null" }),
  audience: text("audience").notNull().default("personal"),
  boundName: text("bound_name"),
  boundEmail: text("bound_email"),
  trustLevel: text("trust_level").notNull(),
  purpose: text("purpose").notNull(),
  contextSummary: text("context_summary").notNull(),
  relationshipDescription: text("relationship_description").notNull(),
  accessLevel: text("access_level").notNull().default("private"),
  accessGrants: jsonb("access_grants").$type<AccessGrants>().notNull().default({}),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  redeemBy: timestamp("redeem_by", { withTimezone: true }),
  accessTtl: text("access_ttl"),
  parentCodeId: text("parent_code_id"),
  lineage: jsonb("lineage").$type<string[]>().notNull().default([]),
  claims: jsonb("claims").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prototype_kinship_codes_code_idx").on(table.code),
  index("prototype_kinship_codes_issuer_idx").on(table.issuerUserId, table.createdAt),
]);

export const prototypeCodeRedemptions = pgTable("prototype_code_redemptions", {
  id: text("id").primaryKey(),
  codeId: text("code_id").notNull().references(() => prototypeKinshipCodes.id, { onDelete: "cascade" }),
  redeemedByUserId: text("redeemed_by_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  redeemedEmail: text("redeemed_email").notNull(),
  lineage: jsonb("lineage").$type<string[]>().notNull().default([]),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prototype_code_redemptions_code_user_idx").on(table.codeId, table.redeemedByUserId),
  index("prototype_code_redemptions_user_idx").on(table.redeemedByUserId),
]);

export const prototypeRelationshipNamespaces = pgTable("prototype_relationship_namespaces", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  subjectUserId: text("subject_user_id").references(() => prototypeUsers.id, { onDelete: "set null" }),
  subjectName: text("subject_name").notNull(),
  subjectEmail: text("subject_email"),
  codeId: text("code_id").references(() => prototypeKinshipCodes.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("prototype_relationship_namespaces_owner_idx").on(table.ownerUserId),
  index("prototype_relationship_namespaces_subject_idx").on(table.subjectUserId),
]);

export const prototypeRelationshipWisdom = pgTable("prototype_relationship_wisdom", {
  id: text("id").primaryKey(),
  namespaceId: text("namespace_id").notNull().references(() => prototypeRelationshipNamespaces.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  perspective: text("perspective").notNull(),
  content: text("content").notNull(),
  accessLevel: text("access_level").notNull(),
  accessGrants: jsonb("access_grants").$type<AccessGrants>().notNull().default({}),
  provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull().default({}),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("prototype_relationship_wisdom_namespace_idx").on(table.namespaceId, table.createdAt),
  index("prototype_relationship_wisdom_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

export const prototypeRelationships = pgTable("prototype_relationships", {
  id: text("id").primaryKey(),
  personAUserId: text("person_a_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  personBUserId: text("person_b_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  formedByCodeId: text("formed_by_code_id").references(() => prototypeKinshipCodes.id, { onDelete: "set null" }),
  aTrustLevel: text("a_trust_level").notNull(),
  bTrustLevel: text("b_trust_level"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prototype_relationships_pair_idx").on(table.personAUserId, table.personBUserId),
  index("prototype_relationships_person_b_idx").on(table.personBUserId),
]);

export const prototypeOrganizations = pgTable("prototype_organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  orgId: text("org_id").notNull(),
  description: text("description").notNull().default(""),
  createdByUserId: text("created_by_user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prototype_organizations_org_id_idx").on(table.orgId),
  index("prototype_organizations_creator_idx").on(table.createdByUserId),
]);

export const prototypeOrganizationMembers = pgTable("prototype_organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => prototypeOrganizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => prototypeUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("Member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("prototype_organization_members_pair_idx").on(table.organizationId, table.userId),
  index("prototype_organization_members_user_idx").on(table.userId),
]);
