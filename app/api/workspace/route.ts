import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studioEvents, studioWorkspaces } from "@/db/schema";
import { defaultStudioState, type StudioAction, type StudioReceipt, type StudioState } from "@/lib/studio-state";

export const runtime = "nodejs";

const WORKSPACE_SLUG = "kinship-studio-field";

async function getWorkspace() {
  const existing = await db.query.studioWorkspaces.findFirst({
    where: eq(studioWorkspaces.slug, WORKSPACE_SLUG),
  });

  if (existing) return existing;

  await db.insert(studioWorkspaces).values({
    slug: WORKSPACE_SLUG,
    state: defaultStudioState,
  }).onConflictDoNothing({ target: studioWorkspaces.slug });

  return db.query.studioWorkspaces.findFirst({
    where: eq(studioWorkspaces.slug, WORKSPACE_SLUG),
  });
}

async function responsePayload() {
  const workspace = await getWorkspace();
  const events = await db.select().from(studioEvents)
    .where(eq(studioEvents.workspaceSlug, WORKSPACE_SLUG))
    .orderBy(desc(studioEvents.createdAt))
    .limit(12);

  return { state: workspace?.state ?? defaultStudioState, events };
}

export async function GET() {
  try {
    return Response.json(await responsePayload());
  } catch (error) {
    console.error("Studio workspace read failed", error);
    return Response.json({ error: "The Studio backend is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: StudioAction; message?: string };
    if (!body.action) return Response.json({ error: "Action is required." }, { status: 400 });

    const workspace = await getWorkspace();
    const current = workspace?.state ?? defaultStudioState;
    let next: StudioState = structuredClone(current);
    let actor = "David";
    let summary = "";

    switch (body.action) {
      case "GATHER_MEMBERS":
        next = { ...next, scene: 1, communityStatus: "gathered" };
        summary = "Gathered Sucil and Ashik without changing authority.";
        break;
      case "CREATE_COMMUNITY":
        next = { ...next, scene: 2, communityStatus: "draft" };
        summary = "Prepared private community invitations for Sucil and Ashik.";
        break;
      case "SEND_INVITATIONS":
        next = { ...next, scene: 3, communityStatus: "active" };
        summary = "Sucil and Ashik accepted invitations to Studio Makers.";
        break;
      case "START_PROJECT":
        next = { ...next, scene: 4, projectStatus: "active" };
        summary = "Created Studio Field Prototype inside Studio Makers.";
        break;
      case "BRING_MATERIALS":
        next = { ...next, scene: 5, materialCount: 3, actorStatus: "comparing" };
        summary = "Added three private source artifacts and invoked Mapper with read-only scope.";
        break;
      case "OPEN_PROJECT_CHAT":
        next = { ...next, scene: 6 };
        summary = "Opened the private Studio Field Prototype conversation.";
        break;
      case "PREPARE_UPDATE":
        next = { ...next, scene: 7, actorStatus: "change-ready" };
        actor = "Mapper";
        summary = "Prepared brief version 0.2 from three cited private sources.";
        break;
      case "APPROVE_UPDATE":
        next = { ...next, scene: 7, actorStatus: "complete", briefVersion: "0.2", briefApproved: true };
        summary = "Accepted Studio Field interaction brief version 0.2 as a private project artifact.";
        break;
      case "SEND_MESSAGE": {
        const message = body.message?.trim();
        if (!message || message.length > 1000) {
          return Response.json({ error: "Message must contain 1–1000 characters." }, { status: 400 });
        }
        next = {
          ...next,
          scene: 6,
          messages: [...next.messages, {
            id: crypto.randomUUID(),
            author: "David",
            initials: "DL",
            body: message,
            createdAt: new Date().toISOString(),
          }],
        };
        summary = "Added a member message to the private project conversation.";
        break;
      }
      case "RESET":
        next = structuredClone(defaultStudioState);
        summary = "Reset the prototype workspace to its initial Field state.";
        break;
      default:
        return Response.json({ error: "Unknown Studio action." }, { status: 400 });
    }

    const receipt: StudioReceipt = {
      id: crypto.randomUUID(),
      action: body.action,
      summary,
      createdAt: new Date().toISOString(),
    };
    next.lastReceipt = receipt;

    await db.update(studioWorkspaces)
      .set({ state: next, updatedAt: new Date() })
      .where(eq(studioWorkspaces.slug, WORKSPACE_SLUG));

    await db.insert(studioEvents).values({
      workspaceSlug: WORKSPACE_SLUG,
      action: body.action,
      actor,
      summary,
      payload: body.action === "SEND_MESSAGE" ? { messageId: next.messages.at(-1)?.id } : {},
    });

    return Response.json(await responsePayload());
  } catch (error) {
    console.error("Studio workspace action failed", error);
    return Response.json({ error: "The Studio action could not be recorded." }, { status: 500 });
  }
}
