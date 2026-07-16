import { sqlClient } from "@/db";
import { prototypeEmbedding, vectorLiteral } from "@/lib/ki-retrieval";

export const runtime = "nodejs";

type WisdomRow = {
  title: string;
  content: string;
  provenance: { headingPath?: string[]; sourceFile?: string } | null;
  similarity: number | null;
};

function cleanSentence(content: string) {
  const clean = content
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const match = clean.match(/^(.{45,300}?[.!?])(?:\s|$)/);
  return match?.[1] ?? clean.slice(0, 260);
}

async function retrieveWisdom(message: string) {
  const embedding = vectorLiteral(prototypeEmbedding(message));
  const rows = await sqlClient<WisdomRow[]>`
    select title, content, provenance,
      1 - (embedding <=> ${embedding}::vector) as similarity
    from studio_prototype_wisdom
    where embedding is not null
      and provenance->>'corpus' = 'ki-genesis-v2.5'
    order by embedding <=> ${embedding}::vector
    limit 3
  `;
  return rows;
}

function heading(row: WisdomRow) {
  return row.provenance?.headingPath?.at(-1) || row.title;
}

function resolveResponse(message: string, persona: string, stage: number, wisdom: WisdomRow[]) {
  const lower = message.toLowerCase();
  const basis = wisdom[0] ? cleanSentence(wisdom[0].content) : "The Field is the always-live projection of the people, work, and relationships in context.";

  if (/who are you|what are you|tell me about you|your name/.test(lower)) {
    return {
      effect: "ORIENT_FIELD",
      reply: `I’m Ki—Kinship Intelligence, the Genesis Ally. I’m the first interface to this system, but I’m not its authority. You are my Source, ${persona}; I can understand what you want, bring the right Wisdom and Skills into context, propose Actions, and show you exactly what changed.`,
    };
  }

  if (/what is this|what.*place|where am i|how.*work|show me around/.test(lower)) {
    return {
      effect: "ORIENT_FIELD",
      reply: "This is the Field: an always-present view of what is real and relevant around you. It is empty because you haven’t made an Organization, invited anyone, or begun a Project here. You don’t navigate it through menus—you tell me what you want, and the people, work, and Actions become visible in context.",
    };
  }

  if (/jeya|aashik|invite|bring.*in|with them|together/.test(lower)) {
    return {
      effect: "PREPARE_INVITES",
      reply: "Yes. I can help you bring Jeya and Aashik in well. First, tell me how you know each of them and what you hope the three of you will make together. I’ll use that to prepare their context and two person-specific invitations. I won’t contact them; when the invitations are ready, you will send them yourself.",
    };
  }

  if (/project|make something|start building|begin building|genesis studio/.test(lower)) {
    return {
      effect: "SEED_PROJECT",
      reply: "I’ve shaped a private Project preview called Genesis Studio. It has no artifacts or Actors yet, and nothing has been committed. Tell me the first outcome it should hold; then I can propose the Project, its initial people, and the first piece of Wisdom to bring in.",
    };
  }

  if (/kinship duna|organization|duna|let'?s begin|start here|create.*community/.test(lower)) {
    return {
      effect: "SEED_ORGANIZATION",
      reply: "I’ve brought Kinship Duna into context as the first Organization—not as a place above the others, but as the Genesis in sequence. This is still a preview. We can define the intention that belongs here, or begin with the two people you want beside you.",
    };
  }

  return {
    effect: stage === 0 ? "ORIENT_FIELD" : "NONE",
    reply: `The closest part of Wisdom is “${heading(wisdom[0] ?? { title: "The Field", content: "", provenance: null, similarity: null })}.” It says: ${basis} Tell me what you want that understanding to make possible, and I’ll shape the next visible Action.`,
  };
}

export async function GET() {
  try {
    const [count] = await sqlClient<{ count: number }[]>`
      select count(*)::int as count from studio_prototype_wisdom
      where provenance->>'corpus' = 'ki-genesis-v2.5'
    `;
    return Response.json({ stance: "loaded", wisdomChunks: count?.count ?? 0, skills: 14, executionMode: "simulated" });
  } catch {
    return Response.json({ stance: "loaded", wisdomChunks: 0, skills: 14, executionMode: "simulated" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; persona?: string; stage?: number };
    const message = body.message?.trim();
    if (!message || message.length > 2000) return Response.json({ error: "Message must contain 1–2,000 characters." }, { status: 400 });

    const wisdom = await retrieveWisdom(message);
    const response = resolveResponse(message, body.persona || "David", body.stage ?? 0, wisdom);
    const citations = wisdom.slice(0, 2).map((row) => ({ title: row.title, heading: heading(row) }));
    const [count] = await sqlClient<{ count: number }[]>`
      select count(*)::int as count from studio_prototype_wisdom
      where provenance->>'corpus' = 'ki-genesis-v2.5'
    `;

    return Response.json({
      ...response,
      citations,
      runtime: { wisdomChunks: count?.count ?? 0, skills: 14, executionMode: "simulated" },
    });
  } catch (error) {
    console.error("Ki response failed", error);
    return Response.json({ error: "Ki could not reach Wisdom just now." }, { status: 503 });
  }
}
