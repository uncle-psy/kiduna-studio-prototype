import { randomUUID } from "node:crypto";
import { getCurrentAccount } from "@/lib/auth";
import { sqlClient } from "@/db";
import { prototypeEmbedding, vectorLiteral } from "@/lib/ki-retrieval";

type Wisdom = { id: string; authorUserId: string; perspective: string; content: string; accessLevel: string; accessGrants: { userIds?: string[]; notes?: string }; createdAt: Date };

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const namespaces = await sqlClient<{ id: string; ownerUserId: string; subjectUserId: string | null; subjectName: string; subjectEmail: string | null; codeId: string | null }[]>`
    select id, owner_user_id as "ownerUserId", subject_user_id as "subjectUserId", subject_name as "subjectName", subject_email as "subjectEmail", code_id as "codeId"
    from prototype_relationship_namespaces where owner_user_id = ${account.id} or subject_user_id = ${account.id} order by created_at desc
  `;
  const result = [];
  for (const namespace of namespaces) {
    const entries = await sqlClient<Wisdom[]>`select id, author_user_id as "authorUserId", perspective, content, access_level as "accessLevel", access_grants as "accessGrants", created_at as "createdAt" from prototype_relationship_wisdom where namespace_id = ${namespace.id} order by created_at`;
    const visible = entries.filter((entry) => entry.authorUserId === account.id || entry.accessLevel === "public" || (["private", "secret"].includes(entry.accessLevel) && entry.accessGrants?.userIds?.includes(account.id)));
    result.push({ ...namespace, viewerRole: namespace.ownerUserId === account.id ? "owner" : "subject", entries: visible });
  }
  return Response.json({ namespaces: result });
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json() as { namespaceId?: string; content?: string; accessLevel?: string; allowUserIds?: string[]; accessNotes?: string };
  const content = body.content?.trim() ?? "";
  if (content.length < 3 || content.length > 3000) return Response.json({ error: "Write between 3 and 3,000 characters." }, { status: 400 });
  const accessLevel = body.accessLevel ?? "";
  if (!["public", "private", "secret", "personal"].includes(accessLevel)) return Response.json({ error: "Choose a visibility level." }, { status: 400 });
  const [namespace] = await sqlClient<{ id: string; ownerUserId: string; subjectUserId: string | null }[]>`select id, owner_user_id as "ownerUserId", subject_user_id as "subjectUserId" from prototype_relationship_namespaces where id = ${body.namespaceId ?? ""} and (owner_user_id = ${account.id} or subject_user_id = ${account.id})`;
  if (!namespace) return Response.json({ error: "That Relationship is not available." }, { status: 404 });
  const perspective = namespace.subjectUserId === account.id ? "self_shared" : "owner_belief";
  const accessNotes = body.accessNotes?.trim() ?? "";
  const resolvedUserIds = [...(body.allowUserIds ?? [])];
  for (const email of accessNotes.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? []) {
    const [grantee] = await sqlClient<{ id: string }[]>`select id from prototype_users where email = ${email.toLowerCase()} and email_verified_at is not null limit 1`;
    if (grantee && !resolvedUserIds.includes(grantee.id)) resolvedUserIds.push(grantee.id);
  }
  const grants = accessLevel === "personal" ? {} : { userIds: resolvedUserIds, notes: accessNotes };
  const embedding = vectorLiteral(prototypeEmbedding(content));
  const id = randomUUID();
  await sqlClient`insert into prototype_relationship_wisdom (id, namespace_id, author_user_id, perspective, content, access_level, access_grants, provenance, embedding) values (${id}, ${namespace.id}, ${account.id}, ${perspective}, ${content}, ${accessLevel}, ${JSON.stringify(grants)}::jsonb, ${JSON.stringify({ source: "member_authored", prototype: true })}::jsonb, ${embedding}::vector)`;
  return Response.json({ entry: { id, authorUserId: account.id, perspective, content, accessLevel, accessGrants: grants, createdAt: new Date() } }, { status: 201 });
}
