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
    const accessNotes = String(body.accessNotes ?? "").trim();
    const emails = accessNotes.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [];
    const grantedUserIds: string[] = [];
    for (const email of emails) {
      const [grantee] = await sqlClient<{ id: string }[]>`select id from prototype_users where email = ${email.toLowerCase()} and email_verified_at is not null limit 1`;
      if (grantee) grantedUserIds.push(grantee.id);
    }
    const code = await issueKinshipCode(account, String(body.personaId ?? "") || null, {
      audience,
      boundName: String(body.boundName ?? ""),
      boundEmail: String(body.boundEmail ?? ""),
      trustLevel,
      purpose: String(body.purpose),
      contextSummary: String(body.contextSummary),
      relationshipDescription: String(body.relationshipDescription),
      accessLevel,
      accessGrants: { notes: accessNotes, userIds: grantedUserIds },
      maxUses,
      redeemBy: duration === null ? null : new Date(Date.now() + duration),
    });
    return Response.json({ code }, { status: 201 });
  } catch (error) {
    console.error("Kinship Code creation failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "The Code could not be created." }, { status: 400 });
  }
}
