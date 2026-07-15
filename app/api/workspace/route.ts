import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studioEvents, studioWorkspaces } from "@/db/schema";
import {
  defaultStudioState,
  normalizeStudioState,
  type MemberId,
  type StudioAction,
  type StudioReceipt,
  type StudioState,
} from "@/lib/studio-state";

export const runtime = "nodejs";

const WORKSPACE_SLUG = "kinship-studio-field";
const names: Record<MemberId, string> = { david: "David", jeya: "Jeya", aashik: "Aashik" };

async function getWorkspace() {
  const existing = await db.query.studioWorkspaces.findFirst({ where: eq(studioWorkspaces.slug, WORKSPACE_SLUG) });
  if (existing) return existing;
  await db.insert(studioWorkspaces).values({ slug: WORKSPACE_SLUG, state: defaultStudioState })
    .onConflictDoNothing({ target: studioWorkspaces.slug });
  return db.query.studioWorkspaces.findFirst({ where: eq(studioWorkspaces.slug, WORKSPACE_SLUG) });
}

async function responsePayload() {
  const workspace = await getWorkspace();
  const state = normalizeStudioState(workspace?.state);
  const events = await db.select().from(studioEvents)
    .where(eq(studioEvents.workspaceSlug, WORKSPACE_SLUG))
    .orderBy(desc(studioEvents.createdAt)).limit(20);
  return { state, events };
}

export async function GET() {
  try { return Response.json(await responsePayload()); }
  catch (error) {
    console.error("Studio workspace read failed", error);
    return Response.json({ error: "The living workspace is momentarily quiet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: StudioAction; memberId?: MemberId };
    if (!body.action) return Response.json({ error: "Action is required." }, { status: 400 });
    const memberId = body.memberId && names[body.memberId] ? body.memberId : "david";
    const workspace = await getWorkspace();
    const current = normalizeStudioState(workspace?.state);
    let next: StudioState = structuredClone(current);
    let summary = "";

    switch (body.action) {
      case "INVITE_MEMBERS":
        next.community.status = "inviting";
        next.community.invitations = { jeya: "delivered", aashik: "delivered" };
        summary = "The Studio Makers invitations reached Jeya and Aashik through their Allies.";
        break;
      case "ACCEPT_INVITATIONS":
        next.community.status = "active";
        next.community.invitations = { jeya: "accepted", aashik: "accepted" };
        summary = "Studio Makers became active when Jeya and Aashik joined.";
        break;
      case "START_PROJECT":
        next.community.status = "active";
        next.community.invitations = { jeya: "accepted", aashik: "accepted" };
        next.project.status = "active";
        summary = "Studio Field Prototype began inside Studio Makers.";
        break;
      case "OPEN_WISDOM":
        next.project.status = "active";
        next.project.materialCount = 3;
        next.wisdom.sourceCount = 3;
        next.wisdom.synthesis = "Three private sources now reinforce a single principle: the Field stays alive while attention gathers into calm, contextual surfaces.";
        summary = "Three private sources became project Wisdom, available through each member's Ally.";
        break;
      case "RUN_MAPPER":
        next.project.mapperStatus = "ready";
        next.wisdom.sourceCount = Math.max(3, next.wisdom.sourceCount);
        next.direction.status = "proposed";
        summary = "Mapper found a design direction and prepared it as a small, cited signal.";
        break;
      case "PROPOSE_DIRECTION":
        next.direction.status = "proposed";
        summary = "The project Envoy surfaced one decision that benefits from David's attention.";
        break;
      case "APPROVE_DIRECTION":
        next.direction = { ...next.direction, version: "0.2", status: "accepted" };
        summary = "Direction 0.2 became part of the project's living Wisdom.";
        break;
      case "RESET":
        next = structuredClone(defaultStudioState);
        summary = "The UX demonstration returned to its beginning.";
        break;
      default:
        return Response.json({ error: "That prototype action is not available." }, { status: 400 });
    }

    const receipt: StudioReceipt = {
      id: crypto.randomUUID(), action: body.action, actor: names[memberId], summary, createdAt: new Date().toISOString(),
    };
    next.receipts = [receipt, ...next.receipts].slice(0, 20);

    await db.update(studioWorkspaces).set({ state: next, updatedAt: new Date() })
      .where(eq(studioWorkspaces.slug, WORKSPACE_SLUG));
    await db.insert(studioEvents).values({
      workspaceSlug: WORKSPACE_SLUG, action: body.action, actor: names[memberId], summary, payload: { memberId },
    });
    return Response.json(await responsePayload());
  } catch (error) {
    console.error("Studio workspace action failed", error);
    return Response.json({ error: "That movement could not be carried into the Field." }, { status: 500 });
  }
}
