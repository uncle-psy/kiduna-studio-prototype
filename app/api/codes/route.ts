import { getCurrentAccount } from "@/lib/auth";
import { issueKinshipCode, type CodeAccess, type CodeAudience, type CodeTrust } from "@/lib/kinship-codes";
import { sqlClient } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const codes = await sqlClient`
    select id, code, audience, bound_name as "boundName", bound_email as "boundEmail", trust_level as "trustLevel",
      purpose, context_summary as "contextSummary", relationship_description as "relationshipDescription",
      access_level as "accessLevel", access_grants as "accessGrants", max_uses as "maxUses", uses_count as "usesCount",
      redeem_by as "redeemBy", lineage, status, created_at as "createdAt"
    from prototype_kinship_codes where issuer_user_id = ${account.id} order by created_at desc limit 50
  `;
  return Response.json({ codes });
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const audience = body.audience as CodeAudience;
    const trustLevel = body.trustLevel as CodeTrust;
    const accessLevel = body.accessLevel as CodeAccess;
    if (!["personal", "open"].includes(audience)) throw new Error("Choose a personal or open Code.");
    if (!["high", "medium", "low"].includes(trustLevel)) throw new Error("Choose a trust level.");
    if (!["public", "private", "secret", "personal"].includes(accessLevel)) throw new Error("Choose an access level.");
    const required = ["purpose", "contextSummary", "relationshipDescription"] as const;
    for (const key of required) if (String(body[key] ?? "").trim().length < 3) throw new Error("Tell Ki a little more about the invitation and relationship.");
    const expiresIn = String(body.expiresIn ?? "7d");
    const durations: Record<string, number | null> = { "15m": 900_000, "24h": 86_400_000, "7d": 604_800_000, permanent: null };
    if (!(expiresIn in durations)) throw new Error("Choose a valid time boundary.");
    const duration = durations[expiresIn];
    const maxUses = audience === "personal" || body.useLimit === "single" ? 1 : null;
    let boundName = String(body.boundName ?? "");
    let boundEmail = String(body.boundEmail ?? "");
    const targetUserId = String(body.targetUserId ?? "");
    if (audience === "personal" && targetUserId) {
      const [target] = await sqlClient<{ id: string; name: string; email: string }[]>`select id, name, email from prototype_users where id = ${targetUserId} and status = 'active' and email_verified_at is not null and id <> ${account.id} limit 1`;
      if (!target) throw new Error("That member is no longer available.");
      boundName = target.name;
      boundEmail = target.email;
    }
    const accessNotes = String(body.accessNotes ?? "").trim();
    const organizationId = String(body.organizationId ?? "").trim();
    if (organizationId) {
      const [membership] = await sqlClient`select id from prototype_organization_members where organization_id = ${organizationId} and user_id = ${account.id} limit 1`;
      if (!membership) throw new Error("You can only invite someone to a Duna you belong to.");
    }
    const emails = accessNotes.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [];
    const grantedUserIds: string[] = [];
    for (const email of emails) {
      const [grantee] = await sqlClient<{ id: string }[]>`select id from prototype_users where email = ${email.toLowerCase()} and email_verified_at is not null limit 1`;
      if (grantee) grantedUserIds.push(grantee.id);
    }
    const code = await issueKinshipCode(account, String(body.personaId ?? "") || null, {
      audience,
      boundName,
      boundEmail,
      trustLevel,
      purpose: String(body.purpose),
      contextSummary: String(body.contextSummary),
      relationshipDescription: String(body.relationshipDescription),
      accessLevel,
      accessGrants: { notes: accessNotes, userIds: grantedUserIds, organizationIds: organizationId ? [organizationId] : [] },
      maxUses,
      redeemBy: duration === null ? null : new Date(Date.now() + duration),
    });
    return Response.json({ code }, { status: 201 });
  } catch (error) {
    console.error("Kinship Code creation failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "The Code could not be created." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json() as { code?: string; boundEmail?: string };
  const boundEmail = String(body.boundEmail ?? "").trim().toLowerCase();
  if (boundEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(boundEmail)) return Response.json({ error: "Enter a valid email, or leave it blank." }, { status: 400 });
  const [updated] = await sqlClient<{ code: string; boundEmail: string | null }[]>`
    update prototype_kinship_codes set bound_email = ${boundEmail || null}, updated_at = now()
    where code = ${String(body.code ?? "")} and issuer_user_id = ${account.id} and uses_count = 0
    returning code, bound_email as "boundEmail"
  `;
  if (!updated) return Response.json({ error: "That Code can no longer be edited." }, { status: 409 });
  await sqlClient`update prototype_relationship_namespaces set subject_email = ${boundEmail || null}, updated_at = now() where code_id = (select id from prototype_kinship_codes where code = ${updated.code})`;
  return Response.json({ code: updated });
}
