(() => {
  const params = new URLSearchParams(location.search);
  const persona = params.get("persona") === "matt" ? "matt" : "david";
  if (params.get("reduced") === "1") document.documentElement.classList.add("paused-motion");

  const data = {
    david: {
      name: "David", initial: "D", eyebrow: "Founding Member · Kinship Duna", prefix: "Welcome,", headline: "The factory is open.",
      cta: "↓ Download Kiduna Studio for Mac", note: "macOS 14+ · Apple Silicon · Away from your Mac? Open the web studio — for remote use only.",
      compute: "100", computeUsd: "$100 USDC in wallet", workTotal: "$0",
      team: "Your team starts with you. Share your link — everyone who joins through it is your first generation, and you earn from four generations, for life. Paid in USDC.",
      accounts: {},
      intro: "Hey David — I’m Ki, your Ally. I can explain the wallet, roles, team, and resources shown here. In this design prototype, I won’t execute purchases, connect accounts, move funds, or act outside this page. What would you like to understand?"
    },
    matt: {
      name: "Matt", initial: "M", eyebrow: "Organizer · 4 Organizations", prefix: "Welcome back,", headline: "Your team is growing.",
      cta: "→ Launch Kiduna Studio for Mac", note: "Away from your Mac? Open the web studio — for remote use only.",
      compute: "1.24M", computeUsd: "≈ $86,800 USD", workTotal: "$22,610",
      team: "214 people across 4 generations joined through your line. Every membership and every compute purchase in your team pays you — in USDC, for life.",
      accounts: { Bluesky: "@mattsimon.bsky.social", Google: "matt@kiduna.ai" },
      intro: "Welcome back, Matt. This prototype shows your team, roles, Compute, and USDC earnings in one place. I can explain the fixtures and suggest next steps, but I won’t execute or approve an action for you. What do you need?"
    }
  }[persona];

  const $ = (id) => document.getElementById(id);
  $("eyebrow").textContent = data.eyebrow; $("welcome-prefix").textContent = data.prefix; $("name").textContent = data.name;
  $("headline").textContent = data.headline; $("avatar").textContent = data.initial; $("compute").textContent = data.compute;
  $("compute-usd").textContent = data.computeUsd; $("work-total").textContent = data.workTotal; $("team-line").textContent = data.team;
  $("studio-cta").textContent = data.cta; $("studio-note").textContent = data.note; $("view-as").textContent = `View as ${persona === "david" ? "Matt" : "David"}`;

  $("side-summary").innerHTML = persona === "david" ? `
    <p class="overline gold">Founding Round <button class="info" title="Reference figure; requires product, treasury, governance, and legal validation.">ⓘ</button></p>
    <div class="summary-value"><strong>$3.2M</strong><span>raised</span></div>
    <div class="progress"><span></span></div><div class="progress-labels"><span>Min $2M — funded ✓</span><span>Max $10M</span></div>
    <p style="margin-top:auto;padding-top:16px">Launch price isn’t set yet — how much $KIDUNA your wallet buys is decided at launch.</p>` : `
    <p class="overline mint">Your Earnings · USDC <button class="info" title="Prototype earnings fixture; not an authoritative payout record.">ⓘ</button></p>
    <div class="summary-value"><strong>$22,610</strong><span>lifetime</span></div><p>+$1,284 this month · all earnings paid in USDC</p>
    <div class="stats"><div><span>Team</span><strong>214</strong></div><div><span>Generations</span><strong>4</strong></div></div>`;
  if (persona === "matt") $("side-summary").classList.add("earnings");

  const orgs = [
    ["Kinship Duna", [["Organizer", "$16,200"], ["Builder", "$1,650"]], "$17,850"],
    ["Service Alliance", [["Catalyst", "$2,900"]], "$2,900"],
    ["Black Love", [["Creator", "$840"]], "$840"],
    ["Soul Kitchen", [["Organizer", "$1,020"]], "$1,020"]
  ];
  const roles = [["Organizer", "$17,220", 100], ["Catalyst", "$2,900", 17], ["Builder", "$1,650", 10], ["Creator", "$840", 5]];
  $("earnings-body").innerHTML = persona === "david" ? `
    <div class="empty-earnings"><span class="role-pill">Founding Member · Kinship Duna</span><p>No paid roles yet. Take one on — organizer, builder, creator — and everything it pays you, in USDC, appears here by organization and by role.</p><button class="outline" id="ask-roles" type="button">Ask Ki about roles →</button></div>` : `
    <div class="earnings-grid"><div><div class="list-title">By organization</div><div class="org-list">${orgs.map(([org, orgRoles, total]) => `<div class="org-row"><span>${org}</span><div class="roles">${orgRoles.map(([role, amount]) => `<span class="role">${role}<b>${amount}</b></span>`).join("")}</div><strong>${total}</strong></div>`).join("")}</div></div>
    <div><div class="list-title">By role</div><div class="role-bars">${roles.map(([role, amount, pct]) => `<div class="role-bar"><header><span>${role}</span><b>${amount}</b></header><div class="bar"><span style="width:${pct}%"></span></div></div>`).join("")}</div></div></div>`;

  const accountNames = ["Bluesky", "Telegram", "Google"];
  $("accounts").innerHTML = accountNames.map((name) => {
    const status = data.accounts[name];
    return `<div class="account-row${status ? " connected" : ""}" data-account="${name}"><span class="account-icon">${name[0]}</span><div class="account-copy"><b>${name}</b><span>${status || "Not connected"}</span></div><button type="button">${status ? "Disconnect" : "Connect"}</button></div>`;
  }).join("");

  let toastTimer;
  const notice = (text) => { const toast = $("toast"); toast.textContent = text; toast.classList.add("visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200); };
  document.querySelectorAll("[data-notice]").forEach((el) => el.addEventListener("click", () => notice(el.dataset.notice)));
  document.querySelectorAll(".amount-chip").forEach((chip) => chip.addEventListener("click", () => {
    document.querySelectorAll(".amount-chip").forEach((item) => item.classList.remove("selected")); chip.classList.add("selected"); $("amount").value = chip.dataset.amount; $("buy-note").textContent = "Prototype amount selected. No purchase or balance change has occurred.";
  }));
  $("amount").addEventListener("input", () => { document.querySelectorAll(".amount-chip").forEach((item) => item.classList.toggle("selected", item.dataset.amount === $("amount").value)); $("buy-note").textContent = Number($("amount").value) >= 20 ? "Prototype amount entered. No purchase or balance change has occurred." : "The minimum is $20."; });
  $("studio-cta").addEventListener("click", () => notice("Studio launch or download is simulated in this design prototype."));
  $("view-as").addEventListener("click", () => notice("Use the Design Lab persona selector to review the other persona without changing identity inside this scene."));
  $("copy-link").addEventListener("click", async () => { try { await navigator.clipboard.writeText("https://kiduna.ai/join/KIN-74HR92BD"); $("copy-label").textContent = "Copied ✓"; } catch { $("copy-label").textContent = "Copy unavailable"; } setTimeout(() => $("copy-label").textContent = "Copy link", 1700); });
  document.querySelectorAll(".account-row button").forEach((button) => button.addEventListener("click", () => notice(`${button.closest(".account-row").dataset.account} connection changes are simulated and were not saved.`)));

  const chat = $("chat"), scrim = $("scrim"), messages = $("messages");
  const openChat = () => { chat.classList.add("open"); chat.setAttribute("aria-hidden", "false"); scrim.classList.add("visible"); setTimeout(() => $("chat-input").focus(), 50); };
  const closeChat = () => { chat.classList.remove("open"); chat.setAttribute("aria-hidden", "true"); scrim.classList.remove("visible"); };
  const addMessage = (text, who = "ally") => { const el = document.createElement("div"); el.className = `message${who === "me" ? " me" : ""}`; el.innerHTML = who === "ally" ? `<b>Ki</b>${text}` : text; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; };
  const reply = (prompt) => {
    const p = prompt.toLowerCase();
    if (/earn|role|work|pay/.test(p)) return persona === "matt" ? "This fixture shows $22,610 in lifetime USDC earnings across four organizations and four roles. Production must retrieve timestamped, auditable ledger data before presenting or acting on it." : "You don’t have a paid role in this fixture yet. Organizations may pay roles such as organizer, builder, creator, and catalyst in USDC. Taking a role would require a separate, explicit agreement.";
    if (/buy|compute|card|wallet/.test(p)) return "Compute is represented here in $KIDUNA, separately from USDC earnings. I can explain or preview a purchase, but this prototype cannot spend funds, connect a wallet, or change your balance.<span class=\"action-note\">Suggested next step · Preview purchase terms and authority before confirmation.</span>";
    if (/connect|account|bluesky|telegram|google/.test(p)) return "Connected accounts could let an authorized agent post or monitor on your behalf. Production requires provider consent, scoped permissions, visible status, revocation, and an audit trail. Nothing was connected here.";
    if (/night|govern/.test(p)) return "The Nightpapers are described as the place for Kidunaverse governance, economics, culture, and technology. The destination is represented here, but navigation is disabled in this prototype scene.";
    if (/team|generation|link|recruit/.test(p)) return "This reference shows a Kinship link and four-generation distribution model. The percentages and lifetime language require governance, treasury, product, and legal validation before production use.";
    return "I can explain the Compute, earnings, roles, team, connected accounts, or Nightpapers shown on this page. I’ll keep suggested actions separate from confirmed execution.";
  };
  addMessage(data.intro);
  const send = (prompt) => { const text = prompt.trim(); if (!text) return; openChat(); addMessage(text, "me"); setTimeout(() => addMessage(reply(text)), 350); };
  $("ask-ki").addEventListener("click", openChat); $("close-chat").addEventListener("click", closeChat); scrim.addEventListener("click", closeChat);
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => send(button.dataset.prompt)));
  $("chat-form").addEventListener("submit", (event) => { event.preventDefault(); const text = $("chat-input").value; $("chat-input").value = ""; send(text); });
  $("ask-roles")?.addEventListener("click", () => send("What roles can I take on?"));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeChat(); });
})();
