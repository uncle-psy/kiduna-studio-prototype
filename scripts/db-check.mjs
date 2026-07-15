import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  const extensions = await sql`
    select extname as name, extversion as version
    from pg_extension
    where extname in ('vector', 'age')
    order by extname
  `;
  const names = new Set(extensions.map((item) => item.name));

  if (!names.has("vector")) throw new Error("pgvector is not installed");
  if (!names.has("age")) throw new Error("Apache AGE is not installed");

  const [distance] = await sql`select '[1,0,0]'::vector(3) <=> '[0,1,0]'::vector(3) as cosine_distance`;
  await sql.unsafe("LOAD 'age'");
  await sql.unsafe('SET search_path = ag_catalog, "$user", public');
  const [graph] = await sql`select exists(select 1 from ag_catalog.ag_graph where name = 'kiduna') as ready`;

  if (!graph?.ready) throw new Error("Kiduna AGE graph is not initialized");

  const [graphCount] = await sql.unsafe(`
    SELECT nodes::text::int AS nodes
    FROM cypher('kiduna', $$ MATCH (n) RETURN count(n) $$) AS (nodes agtype)
  `);
  const [wisdomCount] = await sql`select count(*)::int as count from public.studio_prototype_wisdom`;

  console.log(JSON.stringify({
    postgres: true,
    extensions,
    vectorCosineDistance: Number(distance.cosine_distance),
    graph: { name: "kiduna", nodes: Number(graphCount.nodes) },
    wisdomRows: wisdomCount.count,
  }, null, 2));
} finally {
  await sql.end();
}
