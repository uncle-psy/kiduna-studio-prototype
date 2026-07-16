import { randomUUID } from "node:crypto";
import { sqlClient } from "@/db";
import { handleFor, hashPassword, initialsFor, newOpaqueToken, normalizeEmail, tokenHash } from "@/lib/auth";
import { inspectRedeemableCode, normalizeCode } from "@/lib/kinship-codes";
import { sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string; kinshipCode?: string };
    const name = body.name?.trim() ?? "";
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";
    const rawCode = body.kinshipCode ?? "";
    if (name.length < 2 || name.length > 100) return Response.json({ error: "Enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 10) return Response.json({ error: "Use at least 10 characters for your password." }, { status: 400 });
    if (!rawCode.trim()) return Response.json({ error: "A Kinship Code is required for this prototype." }, { status: 400 });

    const codeCheck = await inspectRedeemableCode(rawCode, email);
    if (!codeCheck.ok) return Response.json({ error: codeCheck.error }, { status: 400 });
    const [existing] = await sqlClient<{ id: string }[]>`select id from prototype_users where email = ${email} limit 1`;
    if (existing) return Response.json({ error: "An account already exists for this email. Sign in instead." }, { status: 409 });

    const userId = randomUUID();
    const personaId = randomUUID();
    const passwordHash = await hashPassword(password);
    const token = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const handleBase = handleFor(name);
    const handle = `${handleBase}-${userId.slice(0, 6)}`;
    await sqlClient.begin(async (tx) => {
      await tx`insert into prototype_users (id, name, email, password_hash, status) values (${userId}, ${name}, ${email}, ${passwordHash}, 'active')`;
      await tx`insert into prototype_personas (id, user_id, name, handle, initials, role, is_default) values (${personaId}, ${userId}, ${name}, ${handle}, ${initialsFor(name)}, 'Member', true)`;
      await tx`insert into prototype_email_verification_tokens (id, user_id, code_id, expires_at) values (${tokenHash(token)}, ${userId}, ${codeCheck.code.id}, ${expiresAt.toISOString()}::timestamptz)`;
    });

    const origin = new URL(request.url).origin;
    const verificationUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}&code=${encodeURIComponent(normalizeCode(rawCode))}`;
    const delivery = await sendVerificationEmail({ email, name, verificationUrl });
    return Response.json({
      ok: true,
      delivered: delivery.delivered,
      message: delivery.delivered ? "Check your email to verify your account." : "Email delivery is not available in this prototype environment. Use the prototype verification link below.",
      ...(delivery.delivered ? {} : { prototypeVerificationUrl: verificationUrl }),
    });
  } catch (error) {
    console.error("Prototype signup failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "We couldn’t create that prototype account." }, { status: 500 });
  }
}
