import { randomBytes, randomUUID } from "node:crypto";
import { sqlClient } from "@/db";
import { prototypeEmbedding, vectorLiteral } from "@/lib/ki-retrieval";
import { normalizeEmail } from "@/lib/auth";

export type CodeAccess = "public" | "private" | "secret" | "personal";
export type CodeTrust = "high" | "medium" | "low";
export type CodeAudience = "personal" | "open";

export type IssueCodeInput = {
  audience: CodeAudience;
  boundName?: string;
  boundEmail?: string;
  trustLevel: CodeTrust;
  purpose: string;
  contextSummary: string;
  relationshipDescription: string;
  accessLevel: CodeAccess;
  accessGrants?: { notes?: string; userIds?: string[]; personaIds?: string[]; communityIds?: string[]; organizationIds?: string[]; projectIds?: string[] };
  maxUses: number | null;
  redeemBy: Date | null;
};

type CodeRow = {
  id: string; code: string; issuer_user_id: string; audience: CodeAudience; bound_name: string | null;
  bound_email: string | null; trust_level: CodeTrust; purpose: string; context_summary: string;
  relationship_description: string; access_level: CodeAccess; access_grants: Record<string, unknown>;
  max_uses: number | null; uses_count: number; redeem_by: Date | null; lineage: string[]; status: string;
};

function humanCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `KIN-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

function relationshipAbstract(subjectName: string, input: IssueCodeInput) {
  const source = `${input.relationshipDescription.trim()} ${input.contextSummary.trim()}`.replace(/\s+/g, " ").trim();
  const sentence = source.split(/(?<=[.!?])\s+/)[0] || `${subjectName} was invited into Kiduna.`;
  const concise = sentence.length > 220 ? `${sentence.slice(0, 217).trimEnd()}…` : sentence;
  return `Relationship insight about ${subjectName}: ${concise}`;
}

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export async function inspectRedeemableCode(rawCode: string, email: string) {
  const code = normalizeCode(rawCode);
  const [row] = await sqlClient<CodeRow[]>`select * from prototype_kinship_codes where code = ${code} limit 1`;
  if (!row || row.status !== "active") return { ok: false, error: "That Kinship Code is not active." } as const;
  if (row.redeem_by && new Date(row.redeem_by).getTime() <= Date.now()) return { ok: false, error: "That Kinship Code has expired." } as const;
  if (row.max_uses !== null && row.uses_count >= row.max_uses) return { ok: false, error: "That Kinship Code has already been used." } as const;
  if (row.audience === "personal" && row.bound_email && normalizeEmail(row.bound_email) !== normalizeEmail(email)) {
    return { ok: false, error: "That personal Kinship Code was prepared for a different email address." } as const;
  }
  return { ok: true, code: row } as const;
}

export async function issueKinshipCode(issuer: { id: string; lineage: string[] }, personaId: string | null, input: IssueCodeInput) {
  if (input.audience === "personal" && !input.boundName?.trim()) throw new Error("A personal Code needs the person’s name.");
  const id = randomUUID();
  const code = humanCode();
  const inherited = issuer.lineage ?? [];
  const lineage = [...inherited, ...(inherited.at(-1) === issuer.id ? [] : [issuer.id]), id];
  const boundEmail = input.boundEmail ? normalizeEmail(input.boundEmail) : null;
  const maxUses = input.audience === "personal" ? 1 : input.maxUses;
  const namespaceId = randomUUID();
  const wisdomId = randomUUID();
  const subjectName = input.boundName?.trim() || "A future member";
  const accessGrants = input.accessGrants ?? {};
  const claims = {
    version: "prototype-v1", issuer: issuer.id, persona: personaId, audience: input.audience,
    boundTo: boundEmail, trust: input.trustLevel, purpose: input.purpose, context: input.contextSummary,
    maxUses, redeemBy: input.redeemBy?.toISOString() ?? null, lineage,
  };
  const wisdomContent = relationshipAbstract(subjectName, input);
  const embedding = vectorLiteral(prototypeEmbedding(wisdomContent));

  await sqlClient.begin(async (tx) => {
    await tx`insert into prototype_kinship_codes
      (id, code, issuer_user_id, issuer_persona_id, audience, bound_name, bound_email, trust_level, purpose, context_summary, relationship_description, access_level, access_grants, max_uses, redeem_by, lineage, claims)
      values (${id}, ${code}, ${issuer.id}, ${personaId}, ${input.audience}, ${input.boundName?.trim() || null}, ${boundEmail}, ${input.trustLevel}, ${input.purpose.trim()}, ${input.contextSummary.trim()}, ${input.relationshipDescription.trim()}, ${input.accessLevel}, ${JSON.stringify(accessGrants)}::jsonb, ${maxUses}, ${input.redeemBy?.toISOString() ?? null}::timestamptz, ${JSON.stringify(lineage)}::jsonb, ${JSON.stringify(claims)}::jsonb)`;
    await tx`insert into prototype_relationship_namespaces (id, owner_user_id, subject_name, subject_email, code_id)
      values (${namespaceId}, ${issuer.id}, ${subjectName}, ${boundEmail}, ${id})`;
    await tx`insert into prototype_relationship_wisdom
      (id, namespace_id, author_user_id, perspective, content, access_level, access_grants, provenance, embedding)
      values (${wisdomId}, ${namespaceId}, ${issuer.id}, 'owner_belief', ${wisdomContent}, ${input.accessLevel}, ${JSON.stringify(accessGrants)}::jsonb, ${JSON.stringify({ source: "kinship_code_issuance", codeId: id, transformed: true })}::jsonb, ${embedding}::vector)`;
  });
  return { ...input, id, code, namespaceId, lineage, maxUses, boundEmail };
}

export async function redeemKinshipCode(rawCode: string, user: { id: string; email: string; name: string }) {
  return sqlClient.begin(async (tx) => {
    const [row] = await tx<CodeRow[]>`select * from prototype_kinship_codes where code = ${normalizeCode(rawCode)} for update`;
    if (!row || row.status !== "active") throw new Error("That Kinship Code is not active.");
    if (row.issuer_user_id === user.id) throw new Error("You can’t redeem a Code you issued yourself.");
    if (row.redeem_by && new Date(row.redeem_by).getTime() <= Date.now()) throw new Error("That Kinship Code has expired.");
    if (row.max_uses !== null && row.uses_count >= row.max_uses) throw new Error("That Kinship Code has already been used.");
    if (row.audience === "personal" && row.bound_email && normalizeEmail(row.bound_email) !== normalizeEmail(user.email)) throw new Error("That personal Kinship Code belongs to a different email address.");

    const redemptionId = randomUUID();
    const relationshipId = randomUUID();
    const lineage = [...(row.lineage ?? []), user.id];
    await tx`update prototype_kinship_codes set uses_count = uses_count + 1, updated_at = now() where id = ${row.id}`;
    await tx`insert into prototype_code_redemptions (id, code_id, redeemed_by_user_id, redeemed_email, lineage)
      values (${redemptionId}, ${row.id}, ${user.id}, ${normalizeEmail(user.email)}, ${JSON.stringify(lineage)}::jsonb)`;
    await tx`update prototype_users set invited_by_code_id = ${row.id}, lineage = ${JSON.stringify(lineage)}::jsonb, updated_at = now() where id = ${user.id}`;
    await tx`update prototype_relationship_namespaces set subject_user_id = ${user.id}, subject_name = ${user.name}, subject_email = ${normalizeEmail(user.email)}, updated_at = now() where code_id = ${row.id}`;
    await tx`update prototype_relationship_wisdom w set access_grants = jsonb_set(w.access_grants, '{userIds}', coalesce(w.access_grants->'userIds', '[]'::jsonb) || to_jsonb(${user.id}::text), true)
      from prototype_relationship_namespaces n where w.namespace_id = n.id and n.code_id = ${row.id} and w.access_level = 'private'`;
    await tx`insert into prototype_relationships (id, person_a_user_id, person_b_user_id, formed_by_code_id, a_trust_level)
      values (${relationshipId}, ${row.issuer_user_id}, ${user.id}, ${row.id}, ${row.trust_level})
      on conflict (person_a_user_id, person_b_user_id) do update set formed_by_code_id = excluded.formed_by_code_id, a_trust_level = excluded.a_trust_level, updated_at = now()`;
    for (const organizationId of (row.access_grants?.organizationIds as string[] | undefined) ?? []) {
      await tx`insert into prototype_organization_members (id, organization_id, user_id, role)
        values (${randomUUID()}, ${organizationId}, ${user.id}, 'Member')
        on conflict (organization_id, user_id) do nothing`;
    }
    return { codeId: row.id, lineage, issuerUserId: row.issuer_user_id };
  });
}
