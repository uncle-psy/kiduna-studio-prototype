import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { sqlClient } from "@/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; password?: string };
  const email = normalizeEmail(body.email ?? "");
  const [user] = await sqlClient<{ id: string; handle: string; password_hash: string; email_verified_at: Date | null; status: string }[]>`
    select id, handle, password_hash, email_verified_at, status from prototype_users where email = ${email} limit 1
  `;
  if (!user || !(await verifyPassword(body.password ?? "", user.password_hash))) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  if (user.status !== "active") return Response.json({ error: "This account is not active." }, { status: 403 });
  if (!user.email_verified_at) return Response.json({ error: "Verify your email before entering the Field." }, { status: 403 });
  await createSession(user.id);
  return Response.json({ ok: true, handle: user.handle });
}
