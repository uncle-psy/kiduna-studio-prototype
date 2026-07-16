import { getCurrentAccount } from "@/lib/auth";
import { redeemKinshipCode } from "@/lib/kinship-codes";

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json() as { code?: string };
  try {
    const result = await redeemKinshipCode(body.code ?? "", account);
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "That Code could not be accepted." }, { status: 400 });
  }
}
