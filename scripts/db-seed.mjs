import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  await sql.unsafe("LOAD 'age'");
  await sql.unsafe('SET search_path = ag_catalog, public, "$user"');
  await sql.unsafe(`
    SELECT * FROM cypher('kiduna', $$
      MERGE (org:Organization {id: 'kinship-duna'})
      SET org.name = 'Kinship Duna'
      MERGE (community:Community {id: 'studio-makers'})
      SET community.name = 'Studio Makers', community.privacy = 'private'
      MERGE (project:Project {id: 'field-prototype'})
      SET project.name = 'Studio Field Prototype'
      MERGE (david:Member {id: 'david'}) SET david.name = 'David'
      MERGE (jeya:Member {id: 'jeya'}) SET jeya.name = 'Jeya'
      MERGE (aashik:Member {id: 'aashik'}) SET aashik.name = 'Aashik'
      MERGE (mapper:Actor {id: 'mapper'}) SET mapper.name = 'Mapper'
      MERGE (community)-[:WITHIN]->(org)
      MERGE (project)-[:WITHIN]->(community)
      MERGE (david)-[:MEMBER_OF]->(community)
      MERGE (jeya)-[:MEMBER_OF]->(community)
      MERGE (aashik)-[:MEMBER_OF]->(community)
      MERGE (mapper)-[:ACTS_IN]->(project)
      RETURN project
    $$) AS (result agtype)
  `);

  await sql`
    insert into public.studio_prototype_wisdom
      (container_type, container_id, kind, title, content, provenance, access_scope, embedding)
    select
      'project',
      'field-prototype',
      'principle',
      'The Field remains present',
      'Focused surfaces can become nearly opaque while the spatial Field remains continuously present beneath them.',
      ${sql.json({ source: "prototype-seed", version: "0.1" })},
      ${sql.json({ visibility: "project", projectId: "field-prototype" })},
      array_fill(0::real, array[1536])::vector
    where not exists (
      select 1 from public.studio_prototype_wisdom
      where container_type = 'project'
        and container_id = 'field-prototype'
        and title = 'The Field remains present'
    )
  `;

  const [counts] = await sql`
    select
      (select count(*)::int from public.studio_prototype_wisdom) as wisdom,
      (select count(*)::int from ag_catalog.ag_label where graph = (select graphid from ag_catalog.ag_graph where name = 'kiduna')) as graph_labels
  `;

  console.log(JSON.stringify({ seeded: true, ...counts }, null, 2));
} finally {
  await sql.end();
}
