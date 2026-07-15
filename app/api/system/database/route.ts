import { sqlClient } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtensionRow = { name: string; default_version: string | null; installed_version: string | null };

export async function GET() {
  try {
    const extensions = await sqlClient<ExtensionRow[]>`
      select name, default_version, installed_version
      from pg_available_extensions
      where name in ('vector', 'age')
      order by name
    `;

    const vector = extensions.find((item) => item.name === "vector");
    const age = extensions.find((item) => item.name === "age");
    let graphReady = false;

    if (age?.installed_version) {
      await sqlClient.unsafe("LOAD 'age'");
      await sqlClient.unsafe('SET search_path = ag_catalog, "$user", public');
      const graphs = await sqlClient<{ exists: boolean }[]>`
        select exists(select 1 from ag_catalog.ag_graph where name = 'kiduna') as exists
      `;
      graphReady = Boolean(graphs[0]?.exists);
    }

    return Response.json({
      postgres: true,
      pgvector: { available: Boolean(vector), installed: Boolean(vector?.installed_version), version: vector?.installed_version ?? null },
      apacheAge: { available: Boolean(age), installed: Boolean(age?.installed_version), version: age?.installed_version ?? null, graphReady },
    });
  } catch (error) {
    console.error("Database capability check failed", error);
    return Response.json({ postgres: false, error: "Database capability check failed." }, { status: 503 });
  }
}
