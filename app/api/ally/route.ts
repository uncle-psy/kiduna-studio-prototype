import type { MemberId, StudioAction, StudioState } from "@/lib/studio-state";

export const runtime = "nodejs";

const people: Record<MemberId, { name: string; ally: string; lens: string }> = {
  david: { name: "David", ally: "Lumen", lens: "stewardship, system coherence, and decisive next movements" },
  jeya: { name: "Jeya", ally: "Mira", lens: "human meaning, language, and whether the work feels alive" },
  aashik: { name: "Aashik", ally: "Kite", lens: "making, feasibility, and how the interface behaves" },
};

function inferAction(message: string, state: StudioState): StudioAction | undefined {
  const text = message.toLowerCase();
  if (/(reset|start over)/.test(text)) return "RESET";
  if (/(approve|accept|yes,? make|go with)/.test(text) && state.direction.status === "proposed") return "APPROVE_DIRECTION";
  if (/(mapper|map this|find the pattern|synthesize)/.test(text) && state.project.status === "active") return "RUN_MAPPER";
  if (/(wisdom|source|material|document|reference|open it up)/.test(text) && state.project.status === "active") return "OPEN_WISDOM";
  if (/(project|prototype|start building|begin the work)/.test(text) && state.community.status === "active") return "START_PROJECT";
  if (/(joined|accept(ed)?|they're here|continue)/.test(text) && state.community.status === "inviting") return "ACCEPT_INVITATIONS";
  if (/(bring together|invite|community|jeya|aashik)/.test(text) && state.community.status === "none") return "INVITE_MEMBERS";
  if (/(direction|recommend|what needs me|decision)/.test(text) && state.project.mapperStatus === "ready") return "PROPOSE_DIRECTION";
}

function fallbackReply(memberId: MemberId, action: StudioAction | undefined) {
  const ally = people[memberId].ally;
  const replies: Partial<Record<StudioAction, string>> = {
    INVITE_MEMBERS: `I’ve shaped a secret community called Studio Makers around your intention and sent Jeya and Aashik a quiet invitation through their Allies. I’ll tell you when each has joined.`,
    ACCEPT_INVITATIONS: `They’re here. Studio Makers now has its own Envoy, private Wisdom, and a shared pulse. You can begin the prototype whenever you’re ready.`,
    START_PROJECT: `Studio Field Prototype is alive inside the community. I carried the three of you in, kept its Wisdom private, and gave the project an Envoy so you can address the work directly.`,
    OPEN_WISDOM: `I opened three private sources to the project’s Wisdom. You don’t need to read them now—I’ll surface the useful patterns, with provenance, when they matter.`,
    RUN_MAPPER: `Mapper has finished quietly. The strongest pattern is ready as one small direction rather than another document to review.`,
    PROPOSE_DIRECTION: `One thing needs your judgment: should focused surfaces become nearly opaque while leaving a faint sense of the living Field behind them?`,
    APPROVE_DIRECTION: `Done. Direction 0.2 is now living Wisdom, with the decision and its sources retained. Nothing was published outside the project.`,
    RESET: `We’re back at the beginning. Nothing outside this prototype was changed.`,
  };
  if (!action) {
    return `${ally} here. I can bring people together, shape a project, open its Wisdom, or tell you the one thing that needs your attention.`;
  }

  return replies[action] ?? `${ally} here. I can bring people together, shape a project, open its Wisdom, or tell you the one thing that needs your attention.`;
}

export async function POST(request: Request) {
  try {
    const { message, memberId = "david", state } = await request.json() as {
      message?: string; memberId?: MemberId; state?: StudioState;
    };
    if (!message?.trim() || !state) return Response.json({ error: "Tell your Ally what you need." }, { status: 400 });
    const person = people[memberId] ?? people.david;
    const action = inferAction(message, state);
    let reply = fallbackReply(memberId, action);
    let mode: "openai" | "prototype" = "prototype";

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
          instructions: `You are ${person.ally}, ${person.name}'s personal Ally in Kiduna, a living interface for the agentic internet. Your lens is ${person.lens}. Speak warmly, precisely, and magically without fantasy clichés. Never describe UI steps. Translate system activity into human meaning. Use 1-3 short sentences. The inferred prototype movement is ${action ?? "none"}. Do not claim any external message, publication, or irreversible action beyond the prototype.`,
          input: `Member: ${message.trim()}\nCurrent Studio state: ${JSON.stringify({ community: state.community, project: state.project, wisdom: state.wisdom, direction: state.direction })}`,
          max_output_tokens: 180,
        }),
      });
      if (response.ok) {
        const data = await response.json() as { output_text?: string };
        if (data.output_text?.trim()) { reply = data.output_text.trim(); mode = "openai"; }
      } else {
        console.error("OpenAI Ally response failed", response.status);
      }
    }

    return Response.json({ reply, action, mode });
  } catch (error) {
    console.error("Ally request failed", error);
    return Response.json({ error: "Your Ally is gathering its thoughts. Try again." }, { status: 500 });
  }
}
