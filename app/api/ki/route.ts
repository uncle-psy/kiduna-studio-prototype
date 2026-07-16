import { sqlClient } from "@/db";
import { prototypeEmbedding, vectorLiteral } from "@/lib/ki-retrieval";
import { getCurrentAccount } from "@/lib/auth";

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
  const lower = message.toLowerCase();
  let retrievalQuery = message;
  if (/what is this|what.*place|where am i|how.*work|show me around/.test(lower)) {
    retrievalQuery = "Field canonical always-live projection Studio HUD Clear Context Focus conversation Ally";
  } else if (/invite|bring.*in|someone|not so empty|together/.test(lower)) {
    retrievalQuery = "invitations Profiler person-specific code zero spam Relationship context invite one person well";
  } else if (/project|make something|start building|begin building|genesis studio/.test(lower)) {
    retrievalQuery = "Create from Within Project Studio artifacts Actors first running system member Ally";
  } else if (/kinship duna|organization|duna|let'?s begin|start here|create.*community/.test(lower)) {
    retrievalQuery = "Genesis bootstrap Kinship Duna Organization genesis in sequence not authority";
  } else if (/who are you|what are you|tell me about you|your name/.test(lower)) {
    retrievalQuery = "Ki Genesis Ally Kinship Intelligence Source initial interface identity mandate";
  }
  const embedding = vectorLiteral(prototypeEmbedding(retrievalQuery));
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
      reply: `I’m Ki—Kinship Intelligence, the Genesis Ally. I’m here with you at the Inception Point. You are my Source, ${persona}; I can bring Wisdom into context, help the world take shape around what matters to you, and make every proposed Action and consequence clear.`,
      suggestedPrompts: ["What can we make from here?", "How will you work with me?"],
      primaryAction: null,
    };
  }

  if (/what is this|what.*place|where am i|how.*work|show me around/.test(lower)) {
    return {
      effect: "ORIENT_FIELD",
      reply: "This is the Field: an always-present view of what is real and relevant around you. It is mostly empty because we’re just getting started. Tell me what you’d like to do first.",
      suggestedPrompts: ["Tell me about Kinship Duna.", "Who are you, Ki?"],
      primaryAction: { label: "Begin with Kinship Duna", prompt: "Let’s begin with Kinship Duna." },
    };
  }

  if (/invite|bring.*in|someone|not so empty|together/.test(lower)) {
    return {
      effect: "PREPARE_INVITES",
      reply: "Who would you like to invite?",
      suggestedPrompts: ["I need a general invite for a group"],
      primaryAction: null,
    };
  }

  if (/project|make something|start building|begin building|genesis studio/.test(lower)) {
    return {
      effect: "SEED_PROJECT",
      reply: "I’ve shaped a private Project preview called Genesis Studio. It has no artifacts or Actors yet, and nothing has been committed. Tell me the first outcome it should hold; then I can propose the Project, its initial people, and the first piece of Wisdom to bring in.",
      suggestedPrompts: ["Let’s define the first outcome.", "What belongs in this Project?"],
      primaryAction: null,
    };
  }

  if (/kinship duna|organization|duna|let'?s begin|start here|create.*community/.test(lower)) {
    return {
      effect: "SEED_ORGANIZATION",
      reply: "I’ve brought Kinship Duna into context as the first Organization—not as a place above the others, but as the Genesis in sequence. This is still a preview. We can define the intention that belongs here, or invite someone so the Field is not only ours.",
      suggestedPrompts: ["What belongs to an Organization?", "Why is Kinship Duna first?"],
      primaryAction: { label: "Invite someone", prompt: "I want to invite someone." },
    };
  }

  return {
    effect: stage === 0 ? "ORIENT_FIELD" : "NONE",
    reply: `The closest part of Wisdom is “${heading(wisdom[0] ?? { title: "The Field", content: "", provenance: null, similarity: null })}.” It says: ${basis} Tell me what you want that understanding to make possible, and I’ll shape the next visible Action.`,
    suggestedPrompts: ["Show me the next possibility."],
    primaryAction: null,
  };
}

export async function GET() {
  try {
    const [count] = await sqlClient<{ count: number }[]>`
      select count(*)::int as count from studio_prototype_wisdom
      where provenance->>'corpus' = 'ki-genesis-v2.5'
    `;
    return Response.json({ stance: "loaded", wisdomChunks: count?.count ?? 0, skills: 15, executionMode: "simulated" });
  } catch {
    return Response.json({ stance: "loaded", wisdomChunks: 0, skills: 15, executionMode: "simulated" });
  }
}

export async function POST(request: Request) {
  try {
    const account = await getCurrentAccount();
    if (!account) return Response.json({ error: "Sign in to talk with Ki." }, { status: 401 });
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
      runtime: { wisdomChunks: count?.count ?? 0, skills: 15, executionMode: "simulated" },
    });
  } catch (error) {
    console.error("Ki response failed", error);
    return Response.json({ error: "Ki could not reach Wisdom just now." }, { status: 503 });
  }
}
