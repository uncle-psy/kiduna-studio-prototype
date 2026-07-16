import { createSession, tokenHash } from "@/lib/auth";
import { redeemKinshipCode } from "@/lib/kinship-codes";
import { sqlClient } from "@/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const [verification] = await sqlClient<{ id: string; user_id: string; code_id: string; expires_at: Date; used_at: Date | null }[]>`
    select id, user_id, code_id, expires_at, used_at from prototype_email_verification_tokens where id = ${tokenHash(token)} limit 1
  `;
  if (!verification || verification.used_at || new Date(verification.expires_at).getTime() <= Date.now()) return Response.redirect(new URL("/?verification=invalid", request.url));
  const [user] = await sqlClient<{ id: string; email: string; name: string }[]>`select id, email, name from prototype_users where id = ${verification.user_id}`;
  if (!user) return Response.redirect(new URL("/?verification=invalid", request.url));

  try {
    await redeemKinshipCode(code, user);
    await sqlClient.begin(async (tx) => {
      await tx`update prototype_email_verification_tokens set used_at = now() where id = ${verification.id} and used_at is null`;
      await tx`update prototype_users set email_verified_at = now(), updated_at = now() where id = ${user.id}`;
    });
    await createSession(user.id);
    return Response.redirect(new URL("/studio?verified=1", request.url));
  } catch (error) {
    console.error("Kinship Code redemption failed", error);
    return Response.redirect(new URL("/?verification=code", request.url));
  }
}
