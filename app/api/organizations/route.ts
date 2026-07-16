import { randomUUID } from "node:crypto";
import { getCurrentAccount } from "@/lib/auth";
import { sqlClient } from "@/db";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (account.email.toLowerCase() === "david@kiduna.club") {
    await sqlClient.begin(async (tx) => {
      await tx`insert into prototype_organizations (id, name, org_id, description, created_by_user_id)
        values (${randomUUID()}, 'Kinship Duna', '628407', 'The founding Duna of the Kidunaverse.', ${account.id})
        on conflict (org_id) do nothing`;
      const [kinshipDuna] = await tx<{ id: string }[]>`select id from prototype_organizations where org_id = '628407' limit 1`;
      if (kinshipDuna) await tx`insert into prototype_organization_members (id, organization_id, user_id, role)
        values (${randomUUID()}, ${kinshipDuna.id}, ${account.id}, 'Steward')
        on conflict (organization_id, user_id) do nothing`;
    });
  }
  const organizations = await sqlClient`
    select o.id, o.name, o.org_id as "orgId", o.description, m.role,
      (select count(*)::int from prototype_organization_members members where members.organization_id = o.id) as "memberCount"
    from prototype_organizations o
    join prototype_organization_members m on m.organization_id = o.id and m.user_id = ${account.id}
    where o.status = 'active'
    order by o.created_at
  `;
  return Response.json({ organizations });
}

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json() as { name?: string; orgId?: string; description?: string };
  const name = body.name?.trim() ?? "";
  const orgId = body.orgId?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  if (name.length < 2 || name.length > 100) return Response.json({ error: "Give the Duna a name." }, { status: 400 });
  if (orgId.length < 2 || orgId.length > 100) return Response.json({ error: "Add its registered organization ID." }, { status: 400 });
  const id = randomUUID();
  try {
    await sqlClient.begin(async (tx) => {
      await tx`insert into prototype_organizations (id, name, org_id, description, created_by_user_id) values (${id}, ${name}, ${orgId}, ${description}, ${account.id})`;
      await tx`insert into prototype_organization_members (id, organization_id, user_id, role) values (${randomUUID()}, ${id}, ${account.id}, 'Steward')`;
    });
    return Response.json({ organization: { id, name, orgId, description, role: "Steward", memberCount: 1 } }, { status: 201 });
  } catch (error) {
    console.error("Duna creation failed", error);
    return Response.json({ error: "That organization ID is already registered, or the Duna could not be created." }, { status: 400 });
  }
}
