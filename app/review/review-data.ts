export type ReviewGroup = "Onboarding" | "Public" | "Active" | "Studio" | "Market" | "Standalone";

export type ReviewPage = {
  slug: string;
  title: string;
  group: ReviewGroup;
  sourceRoute: string;
};

const sourceRoutes = `
active/account
active/chat
active/directory
active/earn
active/role
active/seek/market/sample
active/seek/member/sample
active/seek/movement/sample/join
active/seek/movement/sample/mission/sample-mission
active/seek/movement/sample
active/seek
active/vibe
active/vote/sample-proposal
active/vote
public/builders
public/catalysts
public/checkout
public/cofounder
public/community
public/delete-account-form
public/duna/apc
public/duna/block
public/duna/hlth
public/duna/mesh
public/duna/nrlt
public/duna/opra
public/duna/prov
public/duna/rhodo
public/duna/srva
public/duna/wvcc
public/dunas
public/founders
public/how-it-works
public/launchpad/sample
public/launchpad
public/learn-more
public/login
public/luminaries
public/members
public/metrics
public/nightpapers
public/home
public/privacy
public/registered-agent
public/showcase
public/signup
public/sponsors
public/start
public/tos
public/upgrade
studio/achievements
studio/agent/sample
studio/agents/avatar
studio/agents/create/avatar
studio/agents/create/performer
studio/agents
studio/agents/performer
studio/align/sample
studio/align
studio/align/trace/sample
studio/alliances/sample
studio/analytics
studio/approve/sample
studio/approve
studio/arcs/create
studio/arcs
studio/assets/sample/edit
studio/assets/sample/knowledge
studio/assets/sample
studio/assets
studio/assets/upload
studio/challenges/sample/edit
studio/challenges/sample
studio/challenges/create
studio/challenges
studio/chat-deprecated
studio/codes/sample
studio/codes/create
studio/codes
studio/coins
studio/context/sample-platform
studio/context/sample-platform/project/sample-project
studio/context
studio/cycles/create
studio/cycles
studio/dashboard
studio/electors
studio/empower
studio/game-editor
studio/game-settings
studio/games
studio/knowledge/sample/edit
studio/knowledge/sample
studio/knowledge/create
studio/knowledge/ingest
studio/knowledge
studio/knowledge/upload
studio/launchpad-legacy/sample
studio/launchpad-legacy
studio/leaderboards
studio/markets/create/basics
studio/markets/create/configure
studio/markets/create/launching
studio/markets/create
studio/markets/create/review
studio/markets
studio/npcs/sample/edit
studio/npcs/sample
studio/npcs/create
studio/npcs
studio/objectives/create
studio/objectives/detail
studio/objectives
studio/offerings/sample
studio/offerings/new
studio/offerings
studio/platform-settings
studio/playtester
studio/profile
studio/progress/growth
studio/progress
studio/progress/rubric
studio/prompts/sample
studio/prompts/create
studio/prompts/global
studio/prompts/guardians
studio/prompts
studio/prompts/scenes/sample-scene
studio/publish
studio/quests/sample/edit
studio/quests/sample
studio/quests/create
studio/quests
studio/realtime
studio/routes/sample/edit
studio/routes/sample
studio/routes/create
studio/routes
studio/scenes/sample/edit
studio/scenes/sample
studio/scenes/create
studio/scenes
studio/settings
studio/setup-ally
studio/studio/directory
studio/studio/role
studio/team/sample-alliance/approval-threshold
studio/team/sample-alliance/members
studio/team/sample-alliance/proposals
studio/team/sample-alliance/send-funds
studio/team/create
studio/team
studio/vibes
studio/wallet
studio/worldmap
standalone/builder
standalone/checkout-success
standalone/faucet
standalone/forgot-password
standalone/guest
market/create-exec
market/create-liquidity
market/create-metadata
market/create-mint
market/create-mixed
market/create-param
market/create-perf
market/create-spend
market/create-start
market/create-with
market/elector-intelligence
market/electors
market/executors
market/market-create-3-token
market/market-create-3
market/market-create-4
market/market-create-5
market/market-create/connect
market/market-create
market/objectives/detail
market/objectives
market/home
market/proposals/sample
market/proposals/launching
market/proposals
market/redeem-history
market/run-live
market/runs
market/send-usdc
market/settings/identity
market/settings/operators/create
market/settings/operators/detail
market/settings/operators
market/tokens
market/treasury
standalone/play/sample-game
standalone/redeem/SAMPLECODE
standalone/redeem
standalone/sites/sample/welcome
standalone/sites/sample/blog/sample-post
standalone/sites/sample/blog
standalone/sites/sample
standalone/sites/sample/preview/sample-doc
`;

const niceWords: Record<string, string> = {
  apc: "APC Duna",
  hlth: "HLTH Duna",
  mesh: "MESH Duna",
  nrlt: "NRLT Duna",
  opra: "OPRA Duna",
  prov: "PROV Duna",
  rhodo: "Rhodo Duna",
  srva: "SRVA Duna",
  wvcc: "WVCC Duna",
  tos: "Terms of Service",
  npcs: "NPCs",
  sample: "Detail",
  "sample-proposal": "Proposal Detail",
  "sample-mission": "Mission Detail",
  "sample-alliance": "Alliance",
  "sample-platform": "Platform",
  "sample-project": "Project",
  "sample-scene": "Scene Prompt",
  "sample-game": "Game",
  SAMPLECODE: "Code Redemption",
};

function label(value: string) {
  if (niceWords[value]) return niceWords[value];
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/Npcs/g, "NPCs")
    .replace(/Usdc/g, "USDC");
}

function titleFor(slug: string) {
  const parts = slug.split("/");
  const last = parts.at(-1) || "Home";
  if (last === "edit") return `Edit ${label(parts.at(-2) || "Item")}`;
  if (last === "create" || last === "new") return `Create ${label(parts.at(-2) || "Item")}`;
  if (last === "upload") return `Upload ${label(parts.at(-2) || "Item")}`;
  if (last === "detail" || last === "sample") return `${label(parts.at(-2) || "Item")} Detail`;
  if (last === "home") return `${label(parts[0])} Home`;
  return label(last);
}

const inferredPages: ReviewPage[] = sourceRoutes
  .trim()
  .split("\n")
  .map((slug) => {
    const head = slug.split("/")[0];
    const group = (head === "active" ? "Active" : head === "public" ? "Public" : head === "studio" ? "Studio" : head === "market" ? "Market" : "Standalone") as ReviewGroup;
    return { slug, title: titleFor(slug), group, sourceRoute: `/${slug.split("/").slice(1).join("/")}` };
  });

const onboarding: ReviewPage[] = Array.from({ length: 6 }, (_, index) => ({
  slug: `onboarding/${index + 1}`,
  title: ["Your account", "Verify email", "Create password", "Phone number", "Verify phone", "Kinship code"][index],
  group: "Onboarding" as const,
  sourceRoute: `/onboarding?step=${index + 1}`,
}));

export const reviewPages = [...onboarding, ...inferredPages];

export const reviewGroups: ReviewGroup[] = ["Onboarding", "Public", "Active", "Studio", "Market", "Standalone"];

export function findReviewPage(slug: string) {
  return reviewPages.find((page) => page.slug === slug);
}
