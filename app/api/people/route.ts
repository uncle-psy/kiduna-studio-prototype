import { getCurrentAccount } from "@/lib/auth";
import { sqlClient } from "@/db";

export async function GET(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (query.length < 2) return Response.json({ people: [] });
  const people = await sqlClient<{ id: string; name: string; handle: string; initials: string }[]>`
    select u.id, u.name, u.handle, coalesce(p.initials, upper(left(u.name, 2))) as initials
    from prototype_users u left join prototype_personas p on p.user_id = u.id and p.is_default = true
    where u.id <> ${account.id} and u.status = 'active' and u.email_verified_at is not null
      and (u.name ilike ${`%${query}%`} or u.handle ilike ${`%${query.replace(/^@/, "")}%`})
    order by case when lower(u.name) = ${query.toLowerCase()} or lower(u.handle) = ${query.replace(/^@/, "").toLowerCase()} then 0 else 1 end, u.name
    limit 5
  `;
  return Response.json({ people });
}
