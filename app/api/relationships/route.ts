import { randomUUID } from "node:crypto";
import { getCurrentAccount } from "@/lib/auth";
import { sqlClient } from "@/db";
import { prototypeEmbedding, vectorLiteral } from "@/lib/ki-retrieval";

type Wisdom = { id: string; authorUserId: string; perspective: string; content: string; accessLevel: string; accessGrants: { userIds?: string[]; notes?: string }; createdAt: Date };

function abstractWisdom(value: string, subjectName: string) {
  const clean = value.replace(/\s+/g, " ").trim().replace(/^(i think|i feel|i believe|for me,?)\s+/i, "");
  const first = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  const summary = first.length > 240 ? `${first.slice(0, 237).replace(/\s+\S*$/, "")}…` : first;
  return `Relationship insight about ${subjectName}: ${summary[0]?.toLowerCase() ?? ""}${summary.slice(1)}`;
}

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const namespaces = await sqlClient<{ id: string; ownerUserId: string; ownerName: string; ownerHandle: string; subjectUserId: string | null; subjectName: string; subjectHandle: string | null; subjectEmail: string | null; codeId: string | null; code: string | null; trustLevel: string | null; usesCount: number; lastSeenAt: Date | null }[]>`
    select n.id, n.owner_user_id as "ownerUserId", owner.name as "ownerName", owner.handle as "ownerHandle",
      n.subject_user_id as "subjectUserId", n.subject_name as "subjectName", subject.handle as "subjectHandle",
      n.subject_email as "subjectEmail", n.code_id as "codeId", code.code,
      coalesce(case when relationship.person_a_user_id = ${account.id} then relationship.a_trust_level else relationship.b_trust_level end, code.trust_level) as "trustLevel",
      coalesce(code.uses_count, 0) as "usesCount",
      (select max(session.created_at) from prototype_sessions session where session.user_id = case when n.owner_user_id = ${account.id} then n.subject_user_id else n.owner_user_id end and session.expires_at > now()) as "lastSeenAt"
    from prototype_relationship_namespaces n
    join prototype_users owner on owner.id = n.owner_user_id
    left join prototype_users subject on subject.id = n.subject_user_id
    left join prototype_kinship_codes code on code.id = n.code_id
    left join prototype_relationships relationship on relationship.formed_by_code_id = n.code_id
    where n.owner_user_id = ${account.id} or n.subject_user_id = ${account.id} order by n.created_at desc
  `;
  const result = [];
  for (const namespace of namespaces) {
    const entries = await sqlClient<Wisdom[]>`select id, author_user_id as "authorUserId", perspective, content, access_level as "accessLevel", access_grants as "accessGrants", created_at as "createdAt" from prototype_relationship_wisdom where namespace_id = ${namespace.id} order by created_at`;
    const visible = entries.filter((entry) => entry.authorUserId === account.id || entry.accessLevel === "public" || (["private", "secret"].includes(entry.accessLevel) && entry.accessGrants?.userIds?.includes(account.id)));
    result.push({ ...namespace, viewerRole: namespace.ownerUserId === account.id ? "owner" : "subject", joined: Boolean(namespace.subjectUserId), isOnline: Boolean(namespace.lastSeenAt && Date.now() - new Date(namespace.lastSeenAt).getTime() < 5 * 60_000), entries: visible });
  }
  return Response.json({ namespaces: result });
}

export async function PATCH(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json() as { namespaceId?: string; trustLevel?: string };
  if (!["high", "medium", "low"].includes(body.trustLevel ?? "")) return Response.json({ error: "Choose high, medium, or low trust." }, { status: 400 });
  const trustLevel = body.trustLevel as string;
  const [namespace] = await sqlClient<{ id: string; ownerUserId: string; subjectUserId: string | null; codeId: string | null }[]>`
    select id, owner_user_id as "ownerUserId", subject_user_id as "subjectUserId", code_id as "codeId"
    from prototype_relationship_namespaces where id = ${body.namespaceId ?? ""} and (owner_user_id = ${account.id} or subject_user_id = ${account.id}) limit 1`;
  if (!namespace) return Response.json({ error: "That Relationship is not available." }, { status: 404 });
  if (namespace.subjectUserId) {
    if (namespace.ownerUserId === account.id) await sqlClient`update prototype_relationships set a_trust_level = ${trustLevel}, updated_at = now() where formed_by_code_id = ${namespace.codeId}`;
    else await sqlClient`update prototype_relationships set b_trust_level = ${trustLevel}, updated_at = now() where formed_by_code_id = ${namespace.codeId}`;
  } else if (namespace.ownerUserId === account.id) {
    await sqlClient`update prototype_kinship_codes set trust_level = ${trustLevel}, updated_at = now() where id = ${namespace.codeId} and uses_count = 0`;
  }
  return Response.json({ trustLevel });
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json() as { namespaceId?: string; content?: string; accessLevel?: string; allowUserIds?: string[]; accessNotes?: string };
  const content = body.content?.trim() ?? "";
  if (content.length < 3 || content.length > 3000) return Response.json({ error: "Write between 3 and 3,000 characters." }, { status: 400 });
  const accessLevel = body.accessLevel ?? "";
  if (!["public", "private", "secret", "personal"].includes(accessLevel)) return Response.json({ error: "Choose a visibility level." }, { status: 400 });
  const [namespace] = await sqlClient<{ id: string; ownerUserId: string; subjectUserId: string | null; subjectName: string }[]>`select id, owner_user_id as "ownerUserId", subject_user_id as "subjectUserId", subject_name as "subjectName" from prototype_relationship_namespaces where id = ${body.namespaceId ?? ""} and (owner_user_id = ${account.id} or subject_user_id = ${account.id})`;
  if (!namespace) return Response.json({ error: "That Relationship is not available." }, { status: 404 });
  const perspective = namespace.subjectUserId === account.id ? "self_shared" : "owner_belief";
  const accessNotes = body.accessNotes?.trim() ?? "";
  const resolvedUserIds = [...(body.allowUserIds ?? [])];
  for (const email of accessNotes.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? []) {
    const [grantee] = await sqlClient<{ id: string }[]>`select id from prototype_users where email = ${email.toLowerCase()} and email_verified_at is not null limit 1`;
    if (grantee && !resolvedUserIds.includes(grantee.id)) resolvedUserIds.push(grantee.id);
  }
  const grants = accessLevel === "personal" ? {} : { userIds: resolvedUserIds, notes: accessNotes };
  const abstract = abstractWisdom(content, namespace.subjectUserId === account.id ? "this relationship" : namespace.subjectName);
  const embedding = vectorLiteral(prototypeEmbedding(abstract));
  const id = randomUUID();
  await sqlClient`insert into prototype_relationship_wisdom (id, namespace_id, author_user_id, perspective, content, access_level, access_grants, provenance, embedding) values (${id}, ${namespace.id}, ${account.id}, ${perspective}, ${abstract}, ${accessLevel}, ${JSON.stringify(grants)}::jsonb, ${JSON.stringify({ source: "member_authored", prototype: true, transformed: true })}::jsonb, ${embedding}::vector)`;
  return Response.json({ entry: { id, authorUserId: account.id, perspective, content: abstract, accessLevel, accessGrants: grants, createdAt: new Date() } }, { status: 201 });
}
