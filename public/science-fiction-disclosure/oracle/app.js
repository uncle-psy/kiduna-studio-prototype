(() => {
  "use strict";

  const ROUTES = new Set([
    "home", "tiles", "graph", "lineages", "divination", "spreads",
    "games", "story", "research", "visual", "downloads",
  ]);

  const CLASS_COLORS = [
    "#e4bf6f", "#6ed5d4", "#a896e8", "#e58757", "#86cfa7", "#d7a9d1",
    "#82b5e8", "#d99d73", "#9fc98a", "#c7b6ef", "#f0cf91", "#79c3af", "#bdada2",
  ];

  const GLYPHS = ["✦", "◈", "⌁", "⟡", "⊹", "◎", "⋈", "⌬", "◇", "∆", "⧉", "☍", "✧"];
  const GENERATOR_MODE_ORDER = ["story", "character", "world", "faction", "quest", "cosmology"];

  const EVIDENCE_HELP = {
    "well-established": "Supported by strong, convergent evidence and broad expert consensus.",
    "documented-historical": "Supported by credible historical records or reliable reporting.",
    "active-research": "A live research question with meaningful evidence still being gathered or evaluated.",
    "plausible-speculation": "A reasoned possibility that currently extends beyond available evidence.",
    "contested": "Documented claims or interpretations with meaningful expert disagreement.",
    "unverified": "A claim that has not yet been independently verified.",
    "contradicted-by-evidence": "A claim for which available evidence weighs substantially against it.",
    "experiential-only": "Grounded in reported personal experience rather than external verification.",
    "fictional": "A deliberate work of fiction or storyworld construct.",
    "symbolic": "Used as metaphor, archetype, ritual language, or interpretive symbol rather than factual claim.",
    "not-applicable": "The item is organizational or interpretive and does not make an evidence-bearing claim.",
  };

  const state = {
    route: "home",
    routeParams: new URLSearchParams(),
    filters: { class: new Set(), domain: new Set(), evidence: new Set() },
    search: "",
    searchIndex: -1,
    selectedId: null,
    graphCenter: null,
    graphDepth: 1,
    graphFamily: "all",
    draw: [],
    drawSeed: "",
    drawPositions: [],
    drawPoolInfo: null,
    selectedSpreadId: null,
    story: null,
    storyControls: { generator: "story", genre: "first-contact", tone: "luminous", scale: "planetary", seed: "" },
    drawerPreviousFocus: null,
  };
  const mobileRailMedia = window.matchMedia?.("(max-width: 820px)") || null;

  const dom = {};

  const raw = window.ORACLE_DATA || {};
  const data = normalizeData(raw);

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    Object.assign(dom, {
      viewRoot: document.getElementById("view-root"),
      stageStatus: document.getElementById("stage-status"),
      search: document.getElementById("global-search"),
      searchResults: document.getElementById("search-results"),
      classFilters: document.getElementById("class-filters"),
      domainFilters: document.getElementById("domain-filters"),
      evidenceFilters: document.getElementById("evidence-filters"),
      railCount: document.getElementById("rail-card-count"),
      filterRail: document.getElementById("filter-rail"),
      mobileFilterToggle: document.getElementById("mobile-filter-toggle"),
      railClose: document.getElementById("rail-close"),
      drawer: document.getElementById("context-drawer"),
      drawerKicker: document.getElementById("drawer-kicker"),
      drawerContent: document.getElementById("drawer-content"),
      drawerClose: document.getElementById("drawer-close"),
      randomButton: document.getElementById("random-card-button"),
      commandHint: document.getElementById("command-hint"),
    });

    renderFilterRail();
    bindGlobalEvents();
    syncFilterRailInert();
    handleRoute();
  }

  function normalizeData(source) {
    const sourceCards = firstArray(source.cards, source.tiles, source.core, source.oracle?.cards);
    const cards = sourceCards.map((card, index) => normalizeCard(card, index));
    const cardMap = new Map(cards.map((card) => [card.id, card]));
    const slugMap = new Map(cards.map((card) => [card.slug, card]));

    const sourceEdges = firstArray(source.edges, source.relationships?.edges, source.graph?.edges, source.graphData?.edges, Array.isArray(source.relationships) ? source.relationships : null);
    const edges = sourceEdges.map((edge, index) => normalizeEdge(edge, index, cardMap, slugMap)).filter(Boolean);
    const lineages = firstArray(source.lineages, source.relationships?.lineages, source.graph?.lineages, source.systems?.lineages).map((item, index) => normalizeLineage(item, index, cardMap, slugMap));
    const spreads = firstArray(source.spreads, source.systems?.spreads, source.divination?.spreads).map((item, index) => normalizeSpread(item, index));
    const games = firstArray(source.games, source.systems?.games, source.gameSystems).map((item, index) => normalizeGame(item, index));
    const sources = firstArray(source.sources, source.sourceRegistry, source.research?.sources).map((item, index) => normalizeSource(item, index));
    const references = firstArray(source.references, source.referenceTiles, source.reference_tiles, source.visuals?.referenceTiles);
    references.forEach((reference) => {
      const target = cardMap.get(String(reference.cardId || reference.card_id || reference.id || ""))
        || slugMap.get(String(reference.slug || slugify(reference.name || reference.title || "")));
      const image = reference.image || reference.path || reference.png || reference.formats?.png1024 || reference.formats?.svg || reference.files?.png || reference.sizes?.[1024];
      if (target && image && !target.image) target.image = String(image);
      if (target) target.referenceTile = true;
    });

    const generators = normalizeGenerators(source.generators || source.systems?.generators || source.generatorSystems || {});
    const classes = unique(cards.map((card) => card.primaryClass).filter(Boolean));
    const domains = unique(cards.flatMap((card) => card.domains).filter(Boolean));
    const evidenceStates = unique(cards.flatMap((card) => card.evidenceStates).filter(Boolean));

    const meta = {
      title: source.meta?.title || source.title || "Ultimate Science Fiction Oracle",
      version: source.meta?.version || source.version || "1.0",
      generatedAt: source.meta?.generatedAt || source.generatedAt || "",
      evaluatedCandidates: Number(source.meta?.evaluatedCandidates || source.evaluatedCandidates || source.longlist?.length || 0),
      summary: source.meta?.summary || "A provenance-aware atlas, oracle, and story laboratory for science fiction and speculative imagination.",
    };

    return { cards, cardMap, slugMap, edges, lineages, spreads, games, generators, sources, references, classes, domains, evidenceStates, meta };
  }

  function normalizeCard(card, index) {
    const name = String(card.name || card.title || card.label || `Oracle Card ${index + 1}`);
    const slug = String(card.slug || slugify(name));
    const id = String(card.id || card.cardId || slug);
    const claims = firstArray(card.claims, card.research?.claims, card.provenance?.claims);
    const evidenceStates = unique([
      ...asArray(card.evidenceStates || card.evidence_states || card.evidence),
      ...firstArray(card.epistemicLayers, card.epistemic_layers).map((claim) => claim.evidenceState || claim.evidence_state || claim.status),
      ...claims.map((claim) => claim.evidenceState || claim.evidence_state || claim.status),
    ].filter(Boolean).map(String));
    const relationships = firstArray(card.relationships, card.related, card.edges);
    const sources = firstArray(card.sources, card.citations, card.provenance?.sources).map((item) => typeof item === "string" ? item : item.id || item.sourceId || item.title).filter(Boolean);
    const safety = normalizeSafety(card);
    return {
      ...card,
      id,
      slug,
      name,
      classId: normalizeClassId(card.classId || card.class_id || card.class || card.primaryClass || card.primary_class || card.category || "unclassified"),
      primaryClass: String(card.className || card.primaryClass || card.primary_class || card.class || card.category || "Unclassified"),
      domains: unique(asArray(card.domainNames || card.domains || card.inquiryDomains || card.inquiry_domains || card.domain).filter(Boolean).map(String)),
      evidenceStates: evidenceStates.length ? evidenceStates : ["original-synthesis"],
      materialModes: unique(asArray(card.materialModes || card.material_modes || card.modes).filter(Boolean).map(String)),
      essence: textOf(card.essence || card.summary || card.definition || card.whatItIs || card.what_it_is, "A node in the oracle's field of inquiry."),
      archetype: textOf(card.archetype || card.archetypalRole || card.archetypal_role, "The Unknown Signal"),
      gift: textOf(card.gift || card.light || card.opportunity, "Reveals a new possibility."),
      shadow: textOf(card.shadow || card.risk || card.warning, "Can obscure as easily as it reveals."),
      question: textOf(card.question || card.oracleQuestion || card.divination?.question, `What changes when ${name} enters the field?`),
      origin: textOf(card.origin || card.culturalHistory || card.cultural_history, "See the research and provenance notes for this card."),
      divination: textOf(card.divination?.signal || card.divination?.upright || card.divination || card.guidance || card.oracleMeaning || card.oracle_meaning, "Attend to the tension between wonder and discernment."),
      integration: textOf(card.integration?.practice || card.integration || card.healing || card.healingIntegration || card.healing_integration, "Name what is known, unknown, and imagined before choosing a response."),
      visual: card.visual || card.visualDirection || card.visual_direction || {},
      image: card.image || card.imagePath || card.image_path || card.visual?.image || "",
      claims: claims.length ? claims : firstArray(card.epistemicLayers, card.epistemic_layers),
      relationships,
      sources,
      safety,
    };
  }

  function normalizeSafety(card) {
    const rawSafety = card.safety && typeof card.safety === "object" && !Array.isArray(card.safety) ? card.safety : {};
    const flags = unique([
      ...asArray(rawSafety.flags),
      ...asArray(card.safetyFlags || card.safety_flags),
    ].map((value) => textOf(value)).filter(Boolean));
    const boundaries = unique([
      ...asArray(rawSafety.boundaries || rawSafety.boundary),
      ...asArray(card.safetyBoundaries || card.safety_boundaries || card.safetyBoundary || card.safety_boundary),
    ].map((value) => textOf(value)).filter(Boolean));
    const use = textOf(rawSafety.use || rawSafety.note || card.safetyUse || card.safety_use || card.safetyNote || card.safety_note, "");
    return {
      level: textOf(rawSafety.level || card.safetyLevel || card.safety_level, flags.length ? "reviewed" : "standard"),
      flags,
      boundaries,
      use,
    };
  }

  function normalizeEdge(edge, index, cardMap, slugMap) {
    const rawFrom = edge.from || edge.source || edge.sourceId || edge.source_id;
    const rawTo = edge.to || edge.target || edge.targetId || edge.target_id;
    const from = resolveCardId(rawFrom, cardMap, slugMap);
    const to = resolveCardId(rawTo, cardMap, slugMap);
    if (!from || !to || from === to) return null;
    const type = String(edge.type || edge.typeId || edge.type_id || edge.edgeType || edge.edge_type || "conceptual-contrast");
    return {
      ...edge,
      id: String(edge.id || `edge-${index + 1}`),
      from,
      to,
      type,
      family: String(edge.family || edge.edgeFamily || edge.edge_family || inferEdgeFamily(type)),
      rationale: textOf(edge.rationale || edge.description || edge.note, "An explicit typed connection in the oracle graph."),
      provenance: provenanceText(edge.provenance || edge.sourceRef || edge.source_ref),
    };
  }

  function normalizeLineage(item, index, cardMap, slugMap) {
    const rawNodes = firstArray(item.nodes, item.cardIds, item.card_ids, item.cards, item.path, item.sequence);
    const nodes = rawNodes.map((node) => resolveCardId(typeof node === "object" ? node.cardId || node.card_id || node.id || node.slug || node.name : node, cardMap, slugMap)).filter(Boolean);
    return {
      ...item,
      id: String(item.id || `lineage-${index + 1}`),
      name: String(item.name || item.title || `Lineage ${index + 1}`),
      summary: textOf(item.summary || item.description || item.thesis, "A traceable path through the oracle's history of ideas."),
      nodes,
      status: String(item.status || "curated"),
    };
  }

  function normalizeSpread(item, index) {
    const positions = firstArray(item.positions, item.cards, item.slots).map((position, positionIndex) => ({
      id: String(position.id || `position-${positionIndex + 1}`),
      name: String(position.name || position.title || position.label || `Position ${positionIndex + 1}`),
      prompt: textOf(position.prompt || position.question || position.meaning, "What does this card reveal?"),
      allowedClasses: asArray(position.allowedClasses || position.allowed_classes || position.classes).map(normalizeClassId),
    }));
    return {
      ...item,
      id: String(item.id || `spread-${index + 1}`),
      name: String(item.name || item.title || `Spread ${index + 1}`),
      summary: textOf(item.summary || item.description || item.purpose, "A structured inquiry using the oracle."),
      positions: positions.length ? positions : [{ name: "Signal", prompt: "What is asking to be seen?" }],
    };
  }

  function normalizeGenerators(source) {
    if (!source || typeof source !== "object") return {};
    return Object.fromEntries(Object.entries(source).map(([key, generator]) => {
      const slots = firstArray(generator?.slots, generator?.positions).map((slot, index) => {
        if (Array.isArray(slot)) {
          return {
            id: String(slot[0] || `slot-${index + 1}`),
            name: String(slot[1] || `Slot ${index + 1}`),
            allowedClasses: asArray(slot[2]).map(normalizeClassId),
            prompt: textOf(slot[3], "What role does this card play?"),
          };
        }
        return {
          id: String(slot?.id || `slot-${index + 1}`),
          name: String(slot?.name || slot?.title || slot?.label || `Slot ${index + 1}`),
          allowedClasses: asArray(slot?.allowedClasses || slot?.allowed_classes || slot?.classes).map(normalizeClassId),
          prompt: textOf(slot?.prompt || slot?.question || slot?.meaning, "What role does this card play?"),
        };
      });
      return [key, {
        ...generator,
        id: String(generator?.id || `${key}-engine`),
        name: String(generator?.name || generator?.title || titleCase(`${key} engine`)),
        slots,
      }];
    }));
  }

  function normalizeGame(item, index) {
    return {
      ...item,
      id: String(item.id || `game-${index + 1}`),
      name: String(item.name || item.title || `Game ${index + 1}`),
      summary: textOf(item.summary || item.description || item.purpose, "A playable system built from the oracle graph."),
      players: rangeText(item.players || item.playerCount || item.player_count, "1–6"),
      duration: rangeText(item.duration || item.minutes || item.playTime || item.play_time, "30–60 minutes", " minutes"),
      setup: asArray(item.setup || item.components).map(operationText),
      turns: asArray(item.turns || item.turn || item.round || item.play).map(operationText),
      victory: textOf(item.victory || item.objective || item.resolution?.win || item.end || item.endCondition || item.end_condition, "Complete the shared inquiry."),
    };
  }

  function normalizeSource(item, index) {
    return {
      ...item,
      id: String(item.id || `source-${index + 1}`),
      title: String(item.title || item.name || `Source ${index + 1}`),
      publisher: String(item.publisher || item.author || item.organization || ""),
      kind: String(item.kind || item.type || "reference"),
      tier: String(item.tier || item.quality || "contextual"),
      url: String(item.url || item.href || ""),
      scope: textOf(item.scope || item.note || item.description, "Source context for the oracle."),
    };
  }

  function bindGlobalEvents() {
    window.addEventListener("hashchange", handleRoute);
    dom.search.addEventListener("input", handleSearchInput);
    dom.search.addEventListener("keydown", handleSearchKeys);
    dom.search.addEventListener("focus", () => { if (dom.search.value.trim()) updateSearchResults(); });
    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".search-box") && !event.target.closest("#search-results")) hideSearchResults();
    });
    document.addEventListener("keydown", handleGlobalKeys);
    document.addEventListener("click", handleDelegatedClick);
    dom.drawerClose.addEventListener("click", closeDrawer);
    dom.mobileFilterToggle.addEventListener("click", () => toggleFilterRail(true));
    dom.railClose.addEventListener("click", () => toggleFilterRail(false));
    dom.randomButton.addEventListener("click", () => {
      if (!data.cards.length) return;
      openCard(data.cards[Math.floor(Math.random() * data.cards.length)]);
    });
    document.getElementById("clear-all-filters").addEventListener("click", clearAllFilters);
    if (mobileRailMedia?.addEventListener) mobileRailMedia.addEventListener("change", syncFilterRailInert);
    else mobileRailMedia?.addListener?.(syncFilterRailInert);
  }

  function handleDelegatedClick(event) {
    const filter = event.target.closest("[data-filter-kind]");
    if (filter) {
      toggleFilter(filter.dataset.filterKind, filter.dataset.filterValue, filter.checked);
      return;
    }
    const clear = event.target.closest("[data-clear-filter]");
    if (clear) {
      state.filters[clear.dataset.clearFilter].clear();
      renderFilterRail();
      renderRoute();
      return;
    }
    const cardTrigger = event.target.closest("[data-card-id]");
    if (cardTrigger) {
      const card = data.cardMap.get(cardTrigger.dataset.cardId);
      if (card) openCard(card, cardTrigger);
      return;
    }
    const contextTrigger = event.target.closest("[data-context-type]");
    if (contextTrigger) {
      openContext(contextTrigger.dataset.contextType, contextTrigger.dataset.contextId, contextTrigger);
    }
  }

  function handleGlobalKeys(event) {
    if (dom.drawer?.classList.contains("is-open") && event.key === "Tab") {
      const focusable = [...dom.drawer.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    if (event.key === "/" && !isTypingTarget(event.target)) {
      event.preventDefault();
      dom.search.focus();
    }
    if (event.key === "Escape") {
      if (!dom.searchResults.hidden) hideSearchResults();
      else if (dom.drawer.classList.contains("is-open")) closeDrawer();
      else toggleFilterRail(false);
    }
    if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && event.target.closest(".tile-grid")) {
      const items = [...event.target.closest(".tile-grid").querySelectorAll("[data-card-id]")];
      const index = items.indexOf(event.target.closest("[data-card-id]"));
      if (index >= 0) {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        items[(index + delta + items.length) % items.length]?.focus();
      }
    }
    if ((event.key === "Enter" || event.key === " ") && !event.target.matches("button, a, input, select, textarea") && event.target.closest("[data-card-id], [data-context-type]")) {
      event.preventDefault();
      event.target.closest("[data-card-id], [data-context-type]").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  }

  function handleRoute() {
    const hash = location.hash.replace(/^#/, "") || "home";
    const [routePart, query = ""] = hash.split("?");
    state.route = ROUTES.has(routePart) ? routePart : "home";
    state.routeParams = new URLSearchParams(query);
    document.querySelectorAll("[data-route-link]").forEach((link) => {
      const active = link.dataset.routeLink === state.route;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    closeDrawer(false);
    toggleFilterRail(false);
    const requestedCard = state.routeParams.get("card");
    if (state.route === "graph" && requestedCard) {
      const graphCard = data.cardMap.get(requestedCard) || data.slugMap.get(requestedCard);
      if (graphCard) {
        state.graphCenter = graphCard.id;
        state.graphFamily = "all";
      }
    }
    if (state.route === "divination") {
      const requestedSpread = state.routeParams.get("spread");
      const spread = data.spreads.find((item) => item.id === requestedSpread);
      const nextSpreadId = spread?.id || null;
      if (nextSpreadId !== state.selectedSpreadId) {
        state.selectedSpreadId = nextSpreadId;
        state.draw = [];
        state.drawPositions = [];
        state.drawPoolInfo = null;
      }
    }
    renderRoute();
    if (requestedCard) {
      const card = data.cardMap.get(requestedCard) || data.slugMap.get(requestedCard);
      if (card) requestAnimationFrame(() => openCard(card));
    }
    document.getElementById("main-content")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function renderRoute() {
    const renderers = {
      home: renderHome,
      tiles: renderTiles,
      graph: renderGraph,
      lineages: renderLineages,
      divination: renderDivination,
      spreads: renderSpreads,
      games: renderGames,
      story: renderStory,
      research: renderResearch,
      visual: renderVisualSystem,
      downloads: renderDownloads,
    };
    renderers[state.route]();
    dom.stageStatus.textContent = `${titleCase(state.route)} view loaded`;
    updateRailCount();
  }

  function renderFilterRail() {
    dom.classFilters.innerHTML = filterMarkup("class", data.classes, (value) => data.cards.filter((card) => card.primaryClass === value).length);
    dom.domainFilters.innerHTML = filterMarkup("domain", data.domains, (value) => data.cards.filter((card) => card.domains.includes(value)).length);
    dom.evidenceFilters.innerHTML = filterMarkup("evidence", data.evidenceStates, (value) => data.cards.filter((card) => card.evidenceStates.includes(value)).length);
    updateRailCount();
  }

  function filterMarkup(kind, values, countFn) {
    if (!values.length) return `<p class="result-note">No ${escapeHtml(kind)} metadata loaded.</p>`;
    return values.map((value) => `
      <label class="filter-row">
        <input type="checkbox" data-filter-kind="${escapeAttr(kind)}" data-filter-value="${escapeAttr(value)}" ${state.filters[kind].has(value) ? "checked" : ""} />
        <span>${escapeHtml(value)}</span>
        <span class="count">${countFn(value)}</span>
      </label>`).join("");
  }

  function toggleFilter(kind, value, checked) {
    if (!state.filters[kind]) return;
    if (checked) state.filters[kind].add(value);
    else state.filters[kind].delete(value);
    updateRailCount();
    renderRoute();
  }

  function clearAllFilters() {
    Object.values(state.filters).forEach((set) => set.clear());
    state.search = "";
    dom.search.value = "";
    hideSearchResults();
    renderFilterRail();
    renderRoute();
  }

  function filteredCards() {
    const query = state.search.trim().toLowerCase();
    return data.cards.filter((card) => {
      if (state.filters.class.size && !state.filters.class.has(card.primaryClass)) return false;
      if (state.filters.domain.size && !card.domains.some((domain) => state.filters.domain.has(domain))) return false;
      if (state.filters.evidence.size && !card.evidenceStates.some((value) => state.filters.evidence.has(value))) return false;
      if (!query) return true;
      return cardSearchText(card).includes(query);
    });
  }

  function updateRailCount() {
    if (!dom.railCount) return;
    const count = filteredCards().length;
    dom.railCount.textContent = `${count.toLocaleString()} ${count === 1 ? "card" : "cards"}`;
  }

  function handleSearchInput() {
    state.search = dom.search.value;
    state.searchIndex = -1;
    updateSearchResults();
    if (state.route === "tiles") renderTiles();
    else if (state.route === "graph") renderGraph();
    else updateRailCount();
  }

  function updateSearchResults() {
    const query = dom.search.value.trim().toLowerCase();
    if (!query) return hideSearchResults();
    const matches = data.cards.filter((card) => cardSearchText(card).includes(query)).slice(0, 9);
    dom.searchResults.innerHTML = matches.length ? matches.map((card, index) => `
      <button class="search-result" id="search-result-${index}" type="button" role="option" aria-selected="${index === state.searchIndex}" data-card-id="${escapeAttr(card.id)}">
        <strong>${highlight(card.name, query)}</strong>
        <small>${escapeHtml(card.primaryClass)} · ${escapeHtml(card.evidenceStates[0] || "Unspecified")}</small>
      </button>`).join("") : `<div class="search-result" role="option" aria-disabled="true"><strong>No matching signal</strong><small>Try a broader term.</small></div>`;
    dom.searchResults.hidden = false;
    dom.search.setAttribute("aria-expanded", "true");
    dom.search.setAttribute("aria-activedescendant", state.searchIndex >= 0 ? `search-result-${state.searchIndex}` : "");
  }

  function handleSearchKeys(event) {
    const items = [...dom.searchResults.querySelectorAll("button")];
    if (!items.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      state.searchIndex = (state.searchIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((item, index) => item.setAttribute("aria-selected", String(index === state.searchIndex)));
      dom.search.setAttribute("aria-activedescendant", items[state.searchIndex].id);
      items[state.searchIndex].scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && state.searchIndex >= 0) {
      event.preventDefault();
      items[state.searchIndex].click();
    }
  }

  function hideSearchResults() {
    dom.searchResults.hidden = true;
    dom.search.setAttribute("aria-expanded", "false");
    dom.search.setAttribute("aria-activedescendant", "");
    state.searchIndex = -1;
  }

  function renderHome() {
    const daily = seededPick(data.cards, dateSeed()) || data.cards[0];
    const evaluated = data.meta.evaluatedCandidates || Math.max(data.cards.length, 0);
    dom.viewRoot.innerHTML = `
      ${viewHeader("The signal is larger than any single story.", "Explore a rigorously labeled field where established science, living traditions, reported experience, fiction, folklore, and speculation remain distinct—yet capable of meaningful conversation.", "Home", `
        <a class="quiet-button" href="#research">How evidence works</a>
        <a class="primary-button" href="#tiles">Enter the atlas</a>`)}

      <div class="signal-band">
        <article class="surface-card signal-card signal-card--cover">
          <div class="constellation-lines" aria-hidden="true"></div>
          <div class="signal-copy">
            <span class="eyebrow">A disciplined imagination engine</span>
            <h2>Wonder without surrendering discernment.</h2>
            <p>The oracle preserves uncertainty instead of flattening it. Follow histories of ideas, inspect typed relationships, draw cards for reflection, or use the graph to build a world that knows where its influences came from.</p>
            <div class="view-actions">
              <a class="primary-button" href="#divination">Ask the oracle</a>
              <a class="quiet-button" href="#story">Generate a story</a>
            </div>
          </div>
          <figure class="signal-cover"><img src="assets/chaos-meaning-cover.png" alt="Original enamel-style oracle artwork showing chaos resolving into a luminous field of meaning" /><figcaption>Chaos / Meaning</figcaption></figure>
        </article>
        ${daily ? `
          <button class="surface-card daily-card" type="button" data-card-id="${escapeAttr(daily.id)}">
            <span class="eyebrow">Signal of the day</span>
            <span class="mini-sigil" style="--sigil-color:${classColor(daily.primaryClass)}" data-glyph="${glyphFor(daily)}" aria-hidden="true"></span>
            <h2>${escapeHtml(daily.name)}</h2>
            <p>${escapeHtml(daily.essence)}</p>
            <span class="status-chip">Open card</span>
          </button>` : `<div class="surface-card daily-card"><h2>Awaiting data</h2><p>Load oracle-data.js to enter the field.</p></div>`}
      </div>

      <div class="section-heading"><div><h2>The field at a glance</h2><p>A living system with traceable structure.</p></div></div>
      <div class="metric-grid">
        ${metricCard("Core canon", data.cards.length, "full research cards")}
        ${metricCard("Candidate field", evaluated, "nodes evaluated")}
        ${metricCard("Typed graph", data.edges.length, "provenance-aware edges")}
        ${metricCard("Ways through", data.lineages.length + data.spreads.length + data.games.length, "lineages, spreads, and games")}
      </div>

      <div class="section-heading"><div><h2>Choose a mode of inquiry</h2><p>Each mode uses the same canon without collapsing its evidence boundaries.</p></div></div>
      <div class="portal-grid">
        ${portalCard("tiles", "Card atlas", "Search the complete canon by class, inquiry domain, and evidence state.")}
        ${portalCard("graph", "Relationship field", "Trace symbolic, historical, causal, and contrastive connections.")}
        ${portalCard("lineages", "Idea lineages", "See how motifs travel across science, myth, fiction, and culture.")}
        ${portalCard("divination", "Reflective oracle", "Draw cards with an explicit seed and a visible interpretive method.")}
        ${portalCard("games", "Playable systems", "Turn competing models, hidden information, and contact into games.")}
        ${portalCard("story", "Story laboratory", "Generate worlds and conflicts from graph-adjacent concepts.")}
      </div>`;
  }

  function renderTiles() {
    const cards = filteredCards();
    dom.viewRoot.innerHTML = `
      ${viewHeader("Card atlas", "Every card is a complete research and creative object. Filters change the visible field; opening a card preserves the surrounding context.", "Tiles")}
      <div class="toolbar">
        <span class="result-note">Showing ${cards.length.toLocaleString()} of ${data.cards.length.toLocaleString()} cards</span>
        <div class="toolbar-group">
          <label class="visually-hidden" for="tile-sort">Sort cards</label>
          <select class="control-select" id="tile-sort">
            <option value="name">Name</option>
            <option value="class">Class</option>
            <option value="evidence">Evidence state</option>
          </select>
          <button class="quiet-button" id="tile-random" type="button">Random card</button>
        </div>
      </div>
      <div class="tile-grid" id="tile-grid">${cards.length ? cards.map(tileMarkup).join("") : emptyState("No cards match this field", "Clear one or more filters, or try a broader search.")}</div>`;

    document.getElementById("tile-sort")?.addEventListener("change", (event) => sortTiles(event.target.value));
    document.getElementById("tile-random")?.addEventListener("click", () => {
      const pool = filteredCards();
      if (pool.length) openCard(pool[Math.floor(Math.random() * pool.length)]);
    });
  }

  function sortTiles(mode) {
    const cards = [...filteredCards()].sort((a, b) => {
      if (mode === "class") return a.primaryClass.localeCompare(b.primaryClass) || a.name.localeCompare(b.name);
      if (mode === "evidence") return (a.evidenceStates[0] || "").localeCompare(b.evidenceStates[0] || "") || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    document.getElementById("tile-grid").innerHTML = cards.map(tileMarkup).join("");
  }

  function tileMarkup(card) {
    const image = resolveImage(card.image);
    return `
      <button class="oracle-tile" type="button" data-card-id="${escapeAttr(card.id)}" style="--tile-accent:${classColor(card.primaryClass)}">
        <span class="tile-art" data-glyph="${glyphFor(card)}">${image ? `<img src="${escapeAttr(image)}" alt="" loading="lazy" onerror="this.remove()" />` : ""}</span>
        <span class="tile-copy">
          <span class="tile-meta"><span>${escapeHtml(card.primaryClass)}</span><span><i class="evidence-dot"></i>${escapeHtml(card.evidenceStates[0] || "unspecified")}</span></span>
          <h3>${escapeHtml(card.name)}</h3>
          <p>${escapeHtml(card.essence)}</p>
        </span>
      </button>`;
  }

  function renderGraph() {
    const filtered = filteredCards();
    if (!state.graphCenter || !data.cardMap.has(state.graphCenter)) {
      state.graphCenter = filtered[0]?.id || data.cards[0]?.id || null;
    }
    // Search and taxonomy filters narrow the center-card picker; they must not
    // erase the selected card or its cross-class relationship neighborhood.
    const centerCard = data.cardMap.get(state.graphCenter);
    const cards = centerCard && !filtered.some((card) => card.id === centerCard.id)
      ? [centerCard, ...filtered]
      : filtered;
    const families = unique(data.edges.map((edge) => edge.family));
    dom.viewRoot.innerHTML = `
      ${viewHeader("Relationship field", "Select a node to make it the center. Lines are typed, inspectable, and provenance-aware; dashed lines indicate symbolic or interpretive associations.", "Graph")}
      <div class="toolbar">
        <div class="toolbar-group">
          <label class="visually-hidden" for="graph-center">Center card</label>
          <select class="control-select" id="graph-center">${cards.slice().sort((a,b) => a.name.localeCompare(b.name)).map((card) => `<option value="${escapeAttr(card.id)}" ${card.id === state.graphCenter ? "selected" : ""}>${escapeHtml(card.name)}</option>`).join("")}</select>
          <label class="visually-hidden" for="graph-depth">Graph depth</label>
          <select class="control-select" id="graph-depth">
            <option value="1" ${state.graphDepth === 1 ? "selected" : ""}>1 hop</option>
            <option value="2" ${state.graphDepth === 2 ? "selected" : ""}>2 hops</option>
          </select>
          <label class="visually-hidden" for="graph-family">Edge family</label>
          <select class="control-select" id="graph-family"><option value="all">All edge families</option>${families.map((family) => `<option value="${escapeAttr(family)}" ${family === state.graphFamily ? "selected" : ""}>${escapeHtml(family)}</option>`).join("")}</select>
        </div>
        <span class="result-note">Click an edge to inspect its type and provenance.</span>
      </div>
      <div class="graph-shell" id="graph-shell"><svg class="graph-canvas" id="graph-canvas" role="img" aria-label="Interactive relationship graph"></svg><div class="graph-legend">${families.slice(0, 6).map((family) => `<span class="legend-item"><i class="legend-line"></i>${escapeHtml(family)}</span>`).join("")}</div></div>`;

    document.getElementById("graph-center")?.addEventListener("change", (event) => { state.graphCenter = event.target.value; drawGraph(); });
    document.getElementById("graph-depth")?.addEventListener("change", (event) => { state.graphDepth = Number(event.target.value); drawGraph(); });
    document.getElementById("graph-family")?.addEventListener("change", (event) => { state.graphFamily = event.target.value; drawGraph(); });
    drawGraph();
  }

  function drawGraph() {
    const svg = document.getElementById("graph-canvas");
    const shell = document.getElementById("graph-shell");
    if (!svg || !shell || !state.graphCenter) return;
    const width = Math.max(shell.clientWidth, 540);
    const height = Math.max(Math.min(window.innerHeight - 275, 720), 480);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    let activeEdges = data.edges;
    if (state.graphFamily !== "all") activeEdges = activeEdges.filter((edge) => edge.family === state.graphFamily);
    const nodeDepth = new Map([[state.graphCenter, 0]]);
    let frontier = [state.graphCenter];
    for (let depth = 1; depth <= state.graphDepth; depth += 1) {
      const next = [];
      activeEdges.forEach((edge) => {
        if (frontier.includes(edge.from) && !nodeDepth.has(edge.to)) { nodeDepth.set(edge.to, depth); next.push(edge.to); }
        if (frontier.includes(edge.to) && !nodeDepth.has(edge.from)) { nodeDepth.set(edge.from, depth); next.push(edge.from); }
      });
      frontier = unique(next);
    }
    const nodeIds = [...nodeDepth.keys()].slice(0, state.graphDepth === 1 ? 34 : 72);
    const nodeSet = new Set(nodeIds);
    activeEdges = activeEdges.filter((edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to));

    if (nodeIds.length <= 1) {
      svg.innerHTML = `<text x="${width/2}" y="${height/2}" fill="#bdb39f" text-anchor="middle">No relationships match this field.</text>`;
      return;
    }

    const positions = new Map([[state.graphCenter, { x: width / 2, y: height / 2 }]]);
    const rings = [nodeIds.filter((id) => nodeDepth.get(id) === 1), nodeIds.filter((id) => nodeDepth.get(id) === 2)];
    rings.forEach((ids, ringIndex) => {
      const radius = Math.min(width, height) * (ringIndex === 0 ? .26 : .43);
      ids.forEach((id, index) => {
        const angle = ((Math.PI * 2) / Math.max(ids.length, 1)) * index - Math.PI / 2 + ringIndex * .09;
        positions.set(id, { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius });
      });
    });

    const edgeMarkup = activeEdges.map((edge) => {
      const from = positions.get(edge.from); const to = positions.get(edge.to);
      if (!from || !to) return "";
      const geometry = `x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"`;
      return `<g><line class="graph-edge graph-edge--${escapeAttr(edge.family)}" ${geometry} aria-hidden="true"></line><line class="graph-edge-hit" ${geometry} tabindex="0" role="button" aria-label="${escapeAttr(edge.type)} relationship" data-context-type="edge" data-context-id="${escapeAttr(edge.id)}"></line></g>`;
    }).join("");
    const nodeMarkup = nodeIds.map((id) => {
      const card = data.cardMap.get(id); const pos = positions.get(id); const center = id === state.graphCenter;
      if (!card || !pos) return "";
      const radius = center ? 28 : nodeDepth.get(id) === 1 ? 18 : 13;
      return `<g class="graph-node ${center ? "is-center" : ""}" transform="translate(${pos.x} ${pos.y})" tabindex="0" role="button" aria-label="Open ${escapeAttr(card.name)}" data-card-id="${escapeAttr(card.id)}" style="--node-color:${classColor(card.primaryClass)}"><circle class="graph-node-hit" r="22"></circle><circle class="graph-node-mark" r="${radius}"></circle><text y="${radius + 15}">${escapeHtml(shorten(card.name, 21))}</text><text y="4" style="font-size:${center ? 14 : 10}px;fill:${classColor(card.primaryClass)}">${glyphFor(card)}</text></g>`;
    }).join("");
    svg.innerHTML = `<g>${edgeMarkup}</g><g>${nodeMarkup}</g>`;
    svg.querySelectorAll(".graph-node").forEach((node) => node.addEventListener("dblclick", () => { state.graphCenter = node.dataset.cardId; document.getElementById("graph-center").value = state.graphCenter; drawGraph(); }));
  }

  function renderLineages() {
    const lineages = data.lineages;
    dom.viewRoot.innerHTML = `
      ${viewHeader("Idea lineages", "Lineages are curated paths rather than claims of direct influence. They show how an image, anxiety, technology, or aspiration changes as it travels between contexts.", "Lineages")}
      <div class="lineage-list">${lineages.length ? lineages.map(lineageMarkup).join("") : emptyState("No lineages loaded", "The generated data will place curated idea paths here.")}</div>`;
  }

  function lineageMarkup(lineage) {
    return `<article class="surface-card lineage-card">
      <div class="lineage-card-header"><div><span class="eyebrow">${escapeHtml(lineage.status)}</span><h2>${escapeHtml(lineage.name)}</h2><p>${escapeHtml(lineage.summary)}</p></div><button class="quiet-button" type="button" data-context-type="lineage" data-context-id="${escapeAttr(lineage.id)}">Read lineage</button></div>
      <div class="lineage-path" aria-label="${escapeAttr(lineage.name)} sequence">${lineage.nodes.map((id) => { const card = data.cardMap.get(id); return card ? `<button class="lineage-node" type="button" data-card-id="${escapeAttr(card.id)}"><strong>${escapeHtml(card.name)}</strong><small>${escapeHtml(card.primaryClass)}</small></button>` : ""; }).join("")}</div>
    </article>`;
  }

  function renderDivination() {
    const spread = selectedSpread();
    dom.viewRoot.innerHTML = `
      ${viewHeader(spread ? spread.name : "Reflective oracle", spread ? spread.summary : "A draw is an interpretive instrument, not a prediction machine. Its seed is visible so the result can be repeated, discussed, and challenged.", spread ? `${spread.positions.length}-position spread` : "Divination")}
      <div class="divination-stage" id="divination-stage">${state.draw.length ? drawResultMarkup() : drawSetupMarkup()}</div>`;
    bindDivinationEvents();
  }

  function drawSetupMarkup() {
    const spread = selectedSpread();
    const pool = activeCardPool();
    const count = spread?.positions.length || 3;
    return `<div class="draw-setup">
      <span class="mini-sigil" data-glyph="✦" style="--sigil-color:var(--cyan)" aria-hidden="true"></span>
      <span class="eyebrow">Name the question, preserve the unknown</span>
      <h2>${escapeHtml(spread?.name || "What wants to become visible?")}</h2>
      <p>Use a phrase, date, or any memorable seed. The same seed, ${spread ? "spread" : "card count"}, and active card pool always produce the same draw in this edition.</p>
      ${spread ? `<div class="position-map" aria-label="Spread positions">${spread.positions.map((position) => `<span class="position-chip" title="${escapeAttr(position.prompt)}">${escapeHtml(position.name)}</span>`).join("")}</div>` : ""}
      ${poolStatusMarkup(pool, `This draw will use ${count} ${count === 1 ? "position" : "positions"}.`)}
      <div class="draw-controls">
        <input class="control-input" id="draw-seed" value="${escapeAttr(state.drawSeed)}" placeholder="Question or seed" aria-label="Oracle question or seed" />
        ${spread ? `<input id="draw-count" type="hidden" value="${count}" />` : `<select class="control-select" id="draw-count" aria-label="Number of cards"><option value="1">One card</option><option value="3" selected>Three cards</option><option value="5">Five cards</option></select>`}
        <button class="primary-button" id="draw-button" type="button">Draw</button>
      </div>
      ${spread ? `<p><a class="text-button" href="#spreads">Choose a different spread</a></p>` : ""}
    </div>`;
  }

  function drawResultMarkup() {
    const spread = selectedSpread();
    const info = state.drawPoolInfo || activeCardPool();
    return `<div class="draw-result">
      <div class="toolbar"><div><span class="eyebrow">${escapeHtml(spread?.name || "Seed")}</span><strong>${escapeHtml(state.drawSeed)}</strong></div><button class="quiet-button" id="new-draw-button" type="button">New draw</button></div>
      ${poolStatusMarkup(info, info.slotFallbackCount ? `${info.slotFallbackCount} position ${info.slotFallbackCount === 1 ? "used" : "used"} the complete canon because the filtered pool had no class match.` : "Every card came from the active pool.")}
      <div class="draw-grid" style="--draw-count:${state.draw.length}">${state.draw.map((card, index) => { const position = state.drawPositions[index]; return `<article class="surface-card draw-card"><span class="eyebrow">${escapeHtml(position?.name || drawPositionLabel(state.draw.length, index))}</span><span class="mini-sigil" style="--sigil-color:${classColor(card.primaryClass)}" data-glyph="${glyphFor(card)}" aria-hidden="true"></span><h3>${escapeHtml(card.name)}</h3>${position?.prompt ? `<p><strong>${escapeHtml(position.prompt)}</strong></p>` : ""}<p>${escapeHtml(card.divination)}</p><button class="text-button" type="button" data-card-id="${escapeAttr(card.id)}">Open full card</button></article>`; }).join("")}</div>
      <article class="draw-synthesis"><span class="eyebrow">Synthesis</span><h3>${escapeHtml(drawSynthesis(state.draw))}</h3><p>Hold the cards as a conversation: ${state.draw.map((card) => escapeHtml(card.question)).join(" · ")}</p></article>
    </div>`;
  }

  function bindDivinationEvents() {
    document.getElementById("draw-button")?.addEventListener("click", () => {
      if (!data.cards.length) return;
      const count = Number(document.getElementById("draw-count").value);
      state.drawSeed = document.getElementById("draw-seed").value.trim() || `${new Date().toISOString()} oracle`;
      const pool = activeCardPool();
      const spread = selectedSpread();
      if (spread) {
        const result = selectCardsForSlots(spread.positions, pool.cards, state.drawSeed);
        state.draw = result.cards;
        state.drawPositions = result.selections.map((selection) => selection.slot);
        state.drawPoolInfo = { ...pool, slotFallbackCount: result.fallbackCount };
      } else {
        state.draw = seededSample(pool.cards, count, state.drawSeed);
        state.drawPositions = state.draw.map((_, index) => ({ name: drawPositionLabel(count, index), prompt: "" }));
        state.drawPoolInfo = { ...pool, slotFallbackCount: 0 };
      }
      renderDivination();
    });
    document.getElementById("new-draw-button")?.addEventListener("click", () => { state.draw = []; state.drawPositions = []; state.drawPoolInfo = null; renderDivination(); });
  }

  function renderSpreads() {
    dom.viewRoot.innerHTML = `
      ${viewHeader("Spreads", "Each spread gives cards distinct jobs. Choose one to carry its named positions, prompts, and class guidance into a repeatable Divination draw.", "Spreads", `<a class="primary-button" href="#divination">Open free draw</a>`)}
      <div class="spread-grid">${data.spreads.length ? data.spreads.map((spread) => `<button class="surface-card spread-card" type="button" data-context-type="spread" data-context-id="${escapeAttr(spread.id)}"><span class="eyebrow">${spread.positions.length} positions</span><h2>${escapeHtml(spread.name)}</h2><p>${escapeHtml(spread.summary)}</p><div class="position-map">${spread.positions.map((position) => `<span class="position-chip">${escapeHtml(position.name)}</span>`).join("")}</div></button>`).join("") : emptyState("No spreads loaded", "Spread definitions will appear with the generated data.")}</div>`;
  }

  function renderGames() {
    dom.viewRoot.innerHTML = `
      ${viewHeader("Playable systems", "Games make epistemology tangible: players manage evidence, trust, secrecy, agency, and competing explanations rather than simply collecting lore.", "Games")}
      <div class="game-grid">${data.games.length ? data.games.map((game) => `<button class="surface-card game-card" type="button" data-context-type="game" data-context-id="${escapeAttr(game.id)}"><span class="eyebrow">${escapeHtml(game.players)} players · ${escapeHtml(game.duration)}</span><h2>${escapeHtml(game.name)}</h2><p>${escapeHtml(game.summary)}</p><div class="position-map"><span class="status-chip">Inspect rules</span></div></button>`).join("") : emptyState("No games loaded", "Playable systems will appear with the generated data.")}</div>`;
  }

  function renderStory() {
    const pool = activeCardPool();
    const controls = state.storyControls;
    const generatorModes = availableGeneratorModes();
    if (!generatorModes.some(([id]) => id === controls.generator)) controls.generator = generatorModes[0]?.[0] || "story";
    const poolSignature = cardPoolSignature(pool.cards);
    const generatorSignature = generatorSpecSignature(controls.generator);
    if ((!state.story || state.story.poolSignature !== poolSignature || state.story.mode !== controls.generator || state.story.generatorSignature !== generatorSignature) && data.cards.length) {
      state.story = generateStory(controls.generator, controls.genre, controls.tone, controls.scale, controls.seed, pool);
    }
    dom.viewRoot.innerHTML = `
      ${viewHeader("Story laboratory", "Build stories, characters, worlds, factions, quests, and cosmologies from graph-adjacent cards. Every canonical slot and influence remains visible for revision, worldbuilding, and collaborative play.", "Story Lab")}
      <div class="story-workspace">
        <form class="surface-card story-controls" id="story-form">
          <div><span class="eyebrow">Generation controls</span><h2>Shape the field</h2></div>
          ${generatorModeSelect(generatorModes, controls.generator)}
          ${storySelect("story-genre", "Genre", ["first-contact", "cosmic-mystery", "political-thriller", "space-opera", "posthuman-fable", "archival-horror"], controls.genre)}
          ${storySelect("story-tone", "Tone", ["luminous", "uncanny", "intimate", "austere", "satirical", "tragic"], controls.tone)}
          ${storySelect("story-scale", "Scale", ["personal", "community", "planetary", "interstellar", "cosmic"], controls.scale)}
          <div class="story-control-group"><label for="story-seed">Seed or constraint</label><input class="story-control" id="story-seed" type="text" value="${escapeAttr(controls.seed)}" placeholder="A phrase, place, or impossible condition" /></div>
          ${poolStatusMarkup(pool, "Each canonical generator slot honors its class constraint and prefers a graph connection to the card before it.")}
          <button class="primary-button" type="submit">Generate selected field</button>
        </form>
        <article class="surface-card story-output" id="story-output" aria-live="polite" aria-atomic="false">${storyOutputMarkup(state.story)}</article>
      </div>`;

    document.getElementById("story-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.storyControls = {
        generator: document.getElementById("story-generator").value,
        genre: document.getElementById("story-genre").value,
        tone: document.getElementById("story-tone").value,
        scale: document.getElementById("story-scale").value,
        seed: document.getElementById("story-seed").value.trim(),
      };
      state.story = generateStory(state.storyControls.generator, state.storyControls.genre, state.storyControls.tone, state.storyControls.scale, state.storyControls.seed, activeCardPool());
      document.getElementById("story-output").innerHTML = storyOutputMarkup(state.story);
    });
  }

  function generateStory(generatorMode, genre, tone, scale, seedText, poolInfo = activeCardPool()) {
    const mode = data.generators[generatorMode] ? generatorMode : availableGeneratorModes()[0]?.[0] || "story";
    const generator = data.generators[mode] || { id: `${mode}-engine`, name: titleCase(`${mode} engine`), slots: storyGeneratorSlots() };
    const seed = `${mode}|${genre}|${tone}|${scale}|${seedText || dateSeed()}`;
    const slots = generator.slots?.length ? generator.slots : storyGeneratorSlots();
    const result = selectCardsForSlots(slots, poolInfo.cards, seed);
    const selections = result.selections;
    const narrative = generatorNarrative(mode, selections, { genre, tone, scale });
    return {
      seed, mode, generatorName: generator.name, generatorSignature: generatorSpecSignature(mode), genre, tone, scale, cards: result.cards, selections,
      poolSignature: cardPoolSignature(poolInfo.cards),
      poolInfo: { ...poolInfo, slotFallbackCount: result.fallbackCount },
      ...narrative,
    };
  }

  function storyOutputMarkup(story) {
    if (!story) return emptyState("Awaiting the oracle", "Load the canon to generate a story field.");
    return `<span class="eyebrow">${escapeHtml(story.generatorName)} · ${escapeHtml(story.tone)} ${escapeHtml(story.scale)}</span><h2>${escapeHtml(story.title)}</h2><p>${escapeHtml(story.premise)}</p>${poolStatusMarkup(story.poolInfo, story.poolInfo.slotFallbackCount ? `${story.poolInfo.slotFallbackCount} canonical ${story.poolInfo.slotFallbackCount === 1 ? "slot used" : "slots used"} the complete canon because the filtered pool had no eligible class.` : "All canonical slots were filled from the active pool.")}<div class="story-slot-grid">${story.selections.map(({ slot, card }) => `<button class="story-slot" type="button" data-card-id="${escapeAttr(card.id)}"><span class="eyebrow">${escapeHtml(slot.name)}</span><strong>${escapeHtml(card.name)}</strong><small>${escapeHtml(slot.prompt)}</small></button>`).join("")}</div><div class="story-beats">${story.beats.map((beat, index) => `<div class="story-beat"><span class="story-beat-number">${index + 1}</span><div><h3>${escapeHtml(beat[0])}</h3><p>${escapeHtml(beat[1])}</p></div></div>`).join("")}</div><p class="result-note">Seed: ${escapeHtml(story.seed)}</p>`;
  }

  function renderResearch() {
    dom.viewRoot.innerHTML = `
      ${viewHeader("Research & provenance", "The oracle is useful because it refuses false equivalence. Every claim carries an evidence state; every edge carries a type and provenance; fiction remains fiction even when it illuminates reality.", "Research")}
      <div class="research-layout">
        <section class="surface-card research-panel">
          <span class="eyebrow">Source registry</span><h2>${data.sources.length.toLocaleString()} traceable sources</h2>
          ${data.sources.length ? `<table class="oracle-table"><thead><tr><th>Source</th><th>Kind</th><th>Tier</th></tr></thead><tbody>${data.sources.map((source) => `<tr tabindex="0" role="button" aria-label="Inspect source ${escapeAttr(source.title)}" data-context-type="source" data-context-id="${escapeAttr(source.id)}"><td><strong>${escapeHtml(source.title)}</strong><br><small>${escapeHtml(source.publisher)}</small></td><td>${escapeHtml(source.kind)}</td><td>${escapeHtml(source.tier)}</td></tr>`).join("")}</tbody></table>` : `<p>No source registry loaded.</p>`}
        </section>
        <aside class="surface-card research-panel">
          <span class="eyebrow">Evidence vocabulary</span><h2>What the labels mean</h2>
          <div class="evidence-list">${Object.entries(EVIDENCE_HELP).map(([key, help]) => `<div class="evidence-card"><strong>${escapeHtml(key)}</strong><p>${escapeHtml(help)}</p></div>`).join("")}</div>
        </aside>
      </div>
      <article class="surface-card research-panel source-boundary-note">
        <span class="eyebrow">Source boundary</span>
        <h2>Future Esoteric was not supplied with this build</h2>
        <p>The requested <em>Future Esoteric: The Unseen Realms</em> corpus was not present among the received files. It is therefore not cited, summarized, or treated as evidence anywhere in this release. A later verified copy can be registered without rewriting the canon.</p>
        <p><a class="text-link" href="downloads/research/FUTURE-ESOTERIC-SOURCE-NOTE.md">Read the complete source note →</a></p>
      </article>`;
  }

  function renderVisualSystem() {
    const referenceCards = data.cards.filter((card) => card.image || card.visual?.reference || card.referenceTile).slice(0, 60);
    const cards = referenceCards.length ? referenceCards : data.cards.slice(0, Math.min(24, data.cards.length));
    dom.viewRoot.innerHTML = `
      ${viewHeader("Visual system", "A unified enamel language gives the oracle a coherent body without borrowing franchise marks or presenting decoration as evidence. Type remains a separate, accessible layer.", "Visual System")}
      <div class="visual-grid">
        <article class="surface-card visual-card"><span class="eyebrow">Material constitution</span><h2>Deep, luminous, precise</h2><p>Dark vitreous grounds; restrained gold linework; inquiry-class accents; controlled bloom; generous negative space.</p><div class="visual-token"><i class="swatch" style="--swatch:#07100f"></i><span>Cosmic ground</span></div><div class="visual-token"><i class="swatch" style="--swatch:#e4bf6f"></i><span>Trace and frame</span></div><div class="visual-token"><i class="swatch" style="--swatch:#6ed5d4"></i><span>Active signal</span></div></article>
        <article class="surface-card visual-card"><span class="eyebrow">Semantic discipline</span><h2>No visual falsehoods</h2><p>Class, evidence, and interaction states use distinct channels. Brightness never implies truth. Fictional and contested material can be beautiful without masquerading as fact.</p><div class="position-map"><span class="tag">class → hue</span><span class="tag">evidence → text</span><span class="tag">selection → glow</span></div></article>
        <article class="surface-card visual-card"><span class="eyebrow">Production rules</span><h2>One system, many scales</h2><p>Reference tiles are square with rounded corners; motifs stay legible at thumbnail size; labels are never baked into the artwork.</p><div class="position-map"><span class="tag">2048 master</span><span class="tag">1024 archive</span><span class="tag">512 interface</span><span class="tag">256 index</span></div></article>
      </div>
      <div class="section-heading"><div><h2>Reference tile field</h2><p>${cards.length} representative visual directions.</p></div></div>
      <div class="tile-grid">${cards.length ? cards.map(tileMarkup).join("") : emptyState("No visual references loaded", "Reference artwork will appear when the generated canon is available.")}</div>`;
  }

  function renderDownloads() {
    const downloads = [
      ["Complete card canon", "All 480 cards with graph, game, visual, and provenance fields", "downloads/cards.json"],
      ["Candidate evaluation", "The full 1,500-node longlist and inclusion decisions", "downloads/longlist.json"],
      ["Relationship graph", "Typed edges, node identifiers, and provenance", "downloads/relationships.json"],
      ["Source registry", "Research sources and scope notes", "downloads/sources.json"],
      ["Lineages", "Curated historical, cultural, and symbolic paths", "downloads/lineages.json"],
      ["Design constitution", "Visual rules and production guidance", "downloads/design/VISUAL-CONSTITUTION.md"],
      ["Oracle introduction", "Scope, epistemic method, and ways to use the system", "downloads/manual/INTRODUCTION.md"],
      ["Data schemas", "Validation contracts for maintainers", "downloads/schemas.json"],
    ];
    dom.viewRoot.innerHTML = `
      ${viewHeader("Downloads", "The site is one doorway into a maintainable archive. These source artifacts keep the oracle portable, inspectable, and useful beyond this interface.", "Downloads")}
      <div class="download-list">${downloads.map(([name, note, href]) => `<a class="surface-card download-row" href="${escapeAttr(href)}" download><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(note)}</small></span><span>Download ↓</span></a>`).join("")}</div>
      <div class="section-heading"><div><h2>Offline by design</h2><p>No account, tracker, CDN, or network request is required.</p></div></div>
      <article class="surface-card research-panel"><p>This reference site reads its entire working dataset from <code>oracle-data.js</code>. Copy the complete release folder to preserve artwork, Markdown, schemas, and machine-readable exports together.</p></article>`;
  }

  function openCard(card, trigger = null) {
    if (!card) return;
    state.selectedId = card.id;
    state.drawerPreviousFocus = trigger || document.activeElement;
    dom.drawerKicker.textContent = `${card.primaryClass} · ${card.evidenceStates[0] || "unspecified"}`;
    const relatedEdges = data.edges.filter((edge) => edge.from === card.id || edge.to === card.id).slice(0, 12);
    const sourceObjects = card.sources.map((id) => data.sources.find((source) => source.id === id || source.title === id)).filter(Boolean);
    dom.drawerContent.innerHTML = `
      <div class="drawer-hero"><span class="mini-sigil" style="--sigil-color:${classColor(card.primaryClass)}" data-glyph="${glyphFor(card)}" aria-hidden="true"></span><h2>${escapeHtml(card.name)}</h2><p>${escapeHtml(card.essence)}</p><div class="position-map">${card.domains.map((domain) => `<span class="tag">${escapeHtml(domain)}</span>`).join("")}</div></div>
      ${drawerSection("Archetype", `<p>${escapeHtml(card.archetype)}</p>`)}
      ${drawerSection("Gift / Shadow", `<p><strong>Gift.</strong> ${escapeHtml(card.gift)}</p><p><strong>Shadow.</strong> ${escapeHtml(card.shadow)}</p>`)}
      ${drawerSection("Oracle", `<p>${escapeHtml(card.divination)}</p><p><strong>${escapeHtml(card.question)}</strong></p><p>${escapeHtml(card.integration)}</p>`)}
      ${drawerSection("Origin & context", `<p>${escapeHtml(card.origin)}</p>`)}
      ${drawerSection("Evidence states", `<div class="position-map">${card.evidenceStates.map((value) => `<span class="status-chip">${escapeHtml(value)}</span>`).join("")}</div>${card.claims.slice(0,6).map((claim) => `<div class="provenance-row"><i></i><div><strong>${escapeHtml(textOf(claim.text || claim.claim || claim.statement, "Claim"))}</strong><span>${escapeHtml(claim.evidenceState || claim.evidence_state || claim.status || "unspecified")}</span></div></div>`).join("")}`)}
      ${drawerSection("Safety & use boundaries", safetyMarkup(card.safety))}
      ${drawerSection("Typed relationships", relatedEdges.length ? `<ul class="drawer-list">${relatedEdges.map((edge) => { const other = data.cardMap.get(edge.from === card.id ? edge.to : edge.from); return other ? `<li><button type="button" data-card-id="${escapeAttr(other.id)}"><strong>${escapeHtml(edge.type)}</strong><br>${escapeHtml(other.name)}</button></li>` : ""; }).join("")}</ul>` : `<p>No relationships loaded.</p>`)}
      ${drawerSection("Sources", sourceObjects.length ? sourceObjects.map((source) => `<div class="provenance-row"><i></i><div><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.publisher)} · ${escapeHtml(source.tier)}</span></div></div>`).join("") : `<p>See the research registry and card notes for source scope.</p>`)}
      <div class="drawer-section"><a class="primary-button" href="#graph?card=${encodeURIComponent(card.id)}">Open in graph</a></div>`;
    openDrawer();
  }

  function openContext(type, id, trigger) {
    state.drawerPreviousFocus = trigger || document.activeElement;
    if (type === "edge") {
      const edge = data.edges.find((item) => item.id === id);
      if (!edge) return;
      const from = data.cardMap.get(edge.from); const to = data.cardMap.get(edge.to);
      dom.drawerKicker.textContent = `${edge.family} relationship`;
      dom.drawerContent.innerHTML = `<div class="drawer-hero"><span class="mini-sigil" data-glyph="⋈" aria-hidden="true"></span><h2>${escapeHtml(edge.type)}</h2><p>${escapeHtml(from?.name || edge.from)} → ${escapeHtml(to?.name || edge.to)}</p></div>${drawerSection("Rationale", `<p>${escapeHtml(edge.rationale)}</p>`)}${drawerSection("Provenance", `<div class="provenance-row"><i></i><div><strong>${escapeHtml(String(edge.provenance))}</strong><span>Connection provenance</span></div></div>`)}${drawerSection("Nodes", `<ul class="drawer-list">${[from,to].filter(Boolean).map((card) => `<li><button type="button" data-card-id="${escapeAttr(card.id)}">${escapeHtml(card.name)}</button></li>`).join("")}</ul>`)} `;
    } else if (type === "lineage") {
      const lineage = data.lineages.find((item) => item.id === id); if (!lineage) return;
      dom.drawerKicker.textContent = "Curated idea lineage";
      dom.drawerContent.innerHTML = `<div class="drawer-hero"><span class="mini-sigil" data-glyph="⌁" aria-hidden="true"></span><h2>${escapeHtml(lineage.name)}</h2><p>${escapeHtml(lineage.summary)}</p></div>${drawerSection("Path", `<ul class="drawer-list">${lineage.nodes.map((cardId) => { const card = data.cardMap.get(cardId); return card ? `<li><button type="button" data-card-id="${escapeAttr(card.id)}">${escapeHtml(card.name)}</button></li>` : ""; }).join("")}</ul>`)}`;
    } else if (type === "spread") {
      const spread = data.spreads.find((item) => item.id === id); if (!spread) return;
      dom.drawerKicker.textContent = `${spread.positions.length}-position spread`;
      dom.drawerContent.innerHTML = `<div class="drawer-hero"><span class="mini-sigil" data-glyph="◈" aria-hidden="true"></span><h2>${escapeHtml(spread.name)}</h2><p>${escapeHtml(spread.summary)}</p></div>${drawerSection("Positions", `<ol>${spread.positions.map((position) => `<li><strong>${escapeHtml(position.name)}</strong><p>${escapeHtml(position.prompt)}</p></li>`).join("")}</ol>`)}<div class="drawer-section"><a class="primary-button" href="#divination?spread=${encodeURIComponent(spread.id)}">Use this spread</a></div>`;
    } else if (type === "game") {
      const game = data.games.find((item) => item.id === id); if (!game) return;
      dom.drawerKicker.textContent = `${game.players} players · ${game.duration}`;
      dom.drawerContent.innerHTML = `<div class="drawer-hero"><span class="mini-sigil" data-glyph="⌬" aria-hidden="true"></span><h2>${escapeHtml(game.name)}</h2><p>${escapeHtml(game.summary)}</p></div>${drawerSection("Setup", game.setup.length ? `<ol>${game.setup.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : `<p>Use the complete game manual for setup.</p>`)}${drawerSection("Turn structure", game.turns.length ? `<ol>${game.turns.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : `<p>Draw, connect, contest, and resolve.</p>`)}${drawerSection("End condition", `<p>${escapeHtml(game.victory)}</p>`)}`;
    } else if (type === "source") {
      const source = data.sources.find((item) => item.id === id); if (!source) return;
      dom.drawerKicker.textContent = `${source.kind} · ${source.tier}`;
      const externalUrl = source.url && !/^local:/i.test(source.url) ? source.url : "";
      dom.drawerContent.innerHTML = `<div class="drawer-hero"><span class="mini-sigil" data-glyph="⧉" aria-hidden="true"></span><h2>${escapeHtml(source.title)}</h2><p>${escapeHtml(source.publisher)}</p></div>${drawerSection("Scope", `<p>${escapeHtml(source.scope)}</p>`)}${externalUrl ? `<div class="drawer-section"><a class="primary-button" href="${escapeAttr(externalUrl)}" target="_blank" rel="noreferrer">Open source ↗</a></div>` : source.url ? `<div class="drawer-section"><span class="status-chip">Internal editorial source</span></div>` : ""}`;
    }
    openDrawer();
  }

  function openDrawer() {
    dom.drawer.classList.add("is-open");
    dom.drawer.removeAttribute("inert");
    dom.drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    requestAnimationFrame(() => dom.drawerClose.focus());
  }

  function closeDrawer(restoreFocus = true) {
    if (!dom.drawer) return;
    dom.drawer.classList.remove("is-open");
    dom.drawer.setAttribute("aria-hidden", "true");
    dom.drawer.setAttribute("inert", "");
    document.body.classList.remove("drawer-open");
    if (restoreFocus && state.drawerPreviousFocus?.focus) state.drawerPreviousFocus.focus();
    state.drawerPreviousFocus = null;
  }

  function toggleFilterRail(open) {
    if (!dom.filterRail) return;
    dom.filterRail.classList.toggle("is-open", open);
    dom.mobileFilterToggle.setAttribute("aria-expanded", String(open));
    syncFilterRailInert();
    if (open) dom.search.focus();
  }

  function syncFilterRailInert() {
    if (!dom.filterRail) return;
    const hiddenOnMobile = Boolean(mobileRailMedia?.matches) && !dom.filterRail.classList.contains("is-open");
    if (hiddenOnMobile) dom.filterRail.setAttribute("inert", "");
    else dom.filterRail.removeAttribute("inert");
    if (mobileRailMedia?.matches) dom.filterRail.setAttribute("aria-hidden", String(hiddenOnMobile));
    else dom.filterRail.removeAttribute("aria-hidden");
  }

  function viewHeader(title, description, kicker, actions = "") {
    return `<header class="view-header"><div class="view-header-copy"><span class="eyebrow">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions ? `<div class="view-actions">${actions}</div>` : ""}</header>`;
  }

  function metricCard(label, value, note) {
    return `<article class="metric-card"><span class="eyebrow">${escapeHtml(label)}</span><strong>${Number(value || 0).toLocaleString()}</strong><span>${escapeHtml(note)}</span></article>`;
  }

  function portalCard(route, title, description) {
    return `<a class="surface-card portal-card" href="#${escapeAttr(route)}"><span class="orbital-mark" aria-hidden="true"></span><span><span class="eyebrow">${escapeHtml(route)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></span><span class="arrow" aria-hidden="true">↗</span></a>`;
  }

  function drawerSection(title, contents) {
    return `<section class="drawer-section"><h3>${escapeHtml(title)}</h3>${contents}</section>`;
  }

  function safetyMarkup(safety = {}) {
    const flags = asArray(safety.flags).map((value) => textOf(value)).filter(Boolean);
    const boundaries = asArray(safety.boundaries).map((value) => textOf(value)).filter(Boolean);
    const flagMarkup = flags.length
      ? `<div class="position-map" role="list" aria-label="Safety flags">${flags.map((flag) => `<span class="status-chip" role="listitem">${escapeHtml(titleCase(flag.replaceAll("-", " ")))}</span>`).join("")}</div>`
      : `<p><strong>No elevated safety flags.</strong></p>`;
    const boundaryMarkup = boundaries.length
      ? `<div role="list" aria-label="Safety boundaries">${boundaries.map((boundary) => `<div class="provenance-row" role="listitem"><i aria-hidden="true"></i><div><strong>${escapeHtml(boundary)}</strong></div></div>`).join("")}</div>`
      : `<p><strong>No card-specific boundary is recorded.</strong> Keep documented fact, testimony, belief, fiction, and symbolic interpretation visibly separated.</p>`;
    const use = textOf(safety.use) || "Use this card for reflection and source comparison; do not treat it as diagnosis, proof, or personal instruction.";
    const level = textOf(safety.level) || "standard";
    return `<p><strong>Review level.</strong> ${escapeHtml(titleCase(level.replaceAll("-", " ")))}</p>${flagMarkup}${boundaryMarkup}<p><strong>Safe use.</strong> ${escapeHtml(use)}</p>`;
  }

  function emptyState(title, description) {
    return `<div class="empty-state"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></div>`;
  }

  function storySelect(id, label, options, selected) {
    return `<div class="story-control-group"><label for="${id}">${escapeHtml(label)}</label><select class="story-control" id="${id}">${options.map((option) => `<option value="${escapeAttr(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(titleCase(option.replaceAll("-", " ")))}</option>`).join("")}</select></div>`;
  }

  function generatorModeSelect(modes, selected) {
    return `<div class="story-control-group"><label for="story-generator">Generator</label><select class="story-control" id="story-generator" aria-describedby="generator-mode-help">${modes.map(([id, generator]) => `<option value="${escapeAttr(id)}" ${id === selected ? "selected" : ""}>${escapeHtml(generator.name)}</option>`).join("")}</select><small id="generator-mode-help">Choose which canonical set of slots shapes this field.</small></div>`;
  }

  function availableGeneratorModes() {
    const canonical = GENERATOR_MODE_ORDER.filter((id) => data.generators[id]?.slots?.length).map((id) => [id, data.generators[id]]);
    const extras = Object.entries(data.generators).filter(([id, generator]) => !GENERATOR_MODE_ORDER.includes(id) && generator?.slots?.length);
    return canonical.length || extras.length ? [...canonical, ...extras] : [["story", { id: "story-engine", name: "Story Engine", slots: storyGeneratorSlots() }]];
  }

  function generatorSpecSignature(mode) {
    const generator = data.generators[mode];
    if (!generator?.slots?.length) return `fallback:${mode}`;
    return `${generator.id}:${hashString(generator.slots.map((slot) => `${slot.id}|${slot.name}|${slot.allowedClasses.join(",")}|${slot.prompt}`).join("||"))}`;
  }

  function generatorNarrative(mode, selections, { genre, tone, scale }) {
    const bySlot = Object.fromEntries(selections.map(({ slot, card }) => [slot.id, card]));
    const picked = (id, fallbackIndex, fallback) => bySlot[id]?.name || selections[fallbackIndex]?.card?.name || fallback;
    const register = `${tone} ${scale} ${genre.replaceAll("-", " ")}`;
    const beats = selections.slice(0, 5).map(({ slot, card }) => [slot.name, `${card.name} answers “${slot.prompt}” and establishes the next constraint in this ${mode} field.`]);
    if (mode === "character") return {
      title: `${picked("being", 1, "The Wanderer")} of ${picked("origin", 0, "the Unknown")}`,
      premise: `A ${register} character shaped by ${picked("lineage", 2, "an interrupted lineage")} belongs to ${picked("faction", 3, "a divided collective")} while carrying ${picked("secret", 5, "an unintegrated secret")}. ${picked("mission", 6, "A necessary mission")} demands ${picked("technology", 4, "a transformative capability")} and awakens ${picked("shadow", 7, "an old distortion")}.`,
      beats,
    };
    if (mode === "world") return {
      title: `${picked("environment", 0, "Unknown World")} under ${picked("existential-threat", 8, "a Dark Horizon")}`,
      premise: `This ${register} world is grounded in ${picked("environment", 0, "an unfamiliar environment")} and organized through ${picked("political-structure", 3, "a contested order")}. ${picked("dominant-technology", 4, "A dominant capability")} manages ${picked("scarcity", 2, "a vital scarcity")}, while ${picked("hidden-history", 7, "a buried history")} complicates ${picked("contact-status", 6, "contact with the other")}.`,
      beats,
    };
    if (mode === "faction") return {
      title: `${picked("identity", 0, "Unnamed Faction")}: ${picked("goal", 1, "The Long Aim")}`,
      premise: `In a ${register} field, ${picked("identity", 0, "a collective")} pursues ${picked("goal", 1, "a disputed future")} through ${picked("governance", 2, "fragile governance")} and ${picked("technology", 3, "a strategic capability")}. Its coherence depends on ${picked("secret", 4, "a founding compromise")}; its unresolved shadow is ${picked("shadow", 5, "the force it claims to oppose")}.`,
      beats,
    };
    if (mode === "quest") return {
      title: `${picked("seeker", 1, "The Seeker")} and ${picked("gift", 6, "the Impossible Gift")}`,
      premise: `A ${register} calling arrives as ${picked("calling", 0, "an impossible signal")}. ${picked("seeker", 1, "The seeker")} crosses ${picked("threshold", 3, "a guarded threshold")} in ${picked("world", 2, "an altered world")}, aided by ${picked("ally", 4, "an ambiguous guide")}; only ${picked("ordeal", 5, "the ordeal")} can reveal whether ${picked("gift", 6, "the gift")} can return without becoming another form of capture.`,
      beats,
    };
    if (mode === "cosmology") return {
      title: `${picked("origin", 0, "The First Condition")} / ${picked("horizon", 7, "The Last Horizon")}`,
      premise: `This ${register} cosmology begins with ${picked("origin", 0, "an unresolved origin")} and treats ${picked("substrate", 1, "an unknown substrate")} as reality's ground. ${picked("inhabitants", 2, "Its inhabitants")} live within ${picked("world-order", 3, "a durable order")} governed by ${picked("law", 4, "a cosmic law")}; ${picked("rupture", 6, "a rupture")} reveals what ${picked("memory", 5, "cosmic memory")} preserves on the way to ${picked("horizon", 7, "the ultimate horizon")}.`,
      beats,
    };
    return {
      title: `${picked("world", 0, "Unknown")} : ${picked("rupture", 6, "The Signal")}`,
      premise: `In a ${register}, ${picked("protagonist", 1, "a witness")} discovers that ${picked("world", 0, "the known world")} is being reshaped by ${picked("pressure", 7, "an unseen pressure")}. ${picked("institution", 3, "An institution")} offers ${picked("capability", 4, "a new capability")} through ${picked("operation", 5, "a hidden operation")}, but ${picked("lens", 8, "a competing explanation")} makes the cost impossible to read cleanly.`,
      beats,
    };
  }

  function selectedSpread() {
    return data.spreads.find((spread) => spread.id === state.selectedSpreadId) || null;
  }

  function activeCardPool() {
    const cards = filteredCards();
    const hasConstraints = Boolean(state.search.trim()) || Object.values(state.filters).some((set) => set.size);
    const usingFallback = hasConstraints && cards.length === 0;
    return {
      cards: usingFallback ? data.cards : cards,
      filteredCount: cards.length,
      totalCount: data.cards.length,
      hasConstraints,
      usingFallback,
    };
  }

  function poolStatusMarkup(info, detail = "") {
    const pool = info || activeCardPool();
    const headline = pool.usingFallback
      ? `No cards match the current search and filters; using the complete ${pool.totalCount.toLocaleString()}-card canon.`
      : pool.hasConstraints
        ? `${pool.filteredCount.toLocaleString()} ${pool.filteredCount === 1 ? "card matches" : "cards match"} the current search and filters.`
        : `Using the complete ${pool.totalCount.toLocaleString()}-card canon.`;
    return `<p class="result-note pool-status" role="status"><strong>${escapeHtml(headline)}</strong>${detail ? ` ${escapeHtml(detail)}` : ""}</p>`;
  }

  function storyGeneratorSlots() {
    const canonical = data.generators.story?.slots;
    if (canonical?.length) return canonical;
    return [
      ["world", "The World", ["worlds", "cosmologies"], "The environment whose current order can no longer hold."],
      ["protagonist", "The Protagonist", ["beings"], "The role forced to act before understanding the whole."],
      ["inheritance", "The Inheritance", ["artifacts", "myths", "states"], "The memory, object, or story already shaping the choice."],
      ["institution", "The Institution", ["factions", "systems"], "The collective actor that stabilizes or exploits the current order."],
      ["capability", "The Capability", ["technologies"], "The repeatable power that makes the threshold possible."],
      ["operation", "The Operation", ["programs"], "The deliberate project moving beneath the visible conflict."],
      ["rupture", "The Rupture", ["events"], "The before-and-after moment that makes neutrality impossible."],
      ["pressure", "The Pressure", ["forces"], "The recurring dynamic that turns complication into moral choice."],
      ["lens", "The Competing Explanation", ["hypotheses"], "The model that may explain the rupture—or conceal a more useful question."],
      ["becoming", "The Becoming", ["states"], "The transformation that costs the protagonist an old identity."],
    ].map((slot, index) => ({ id: slot[0], name: slot[1], allowedClasses: slot[2], prompt: slot[3], index }));
  }

  function selectCardsForSlots(slots, preferredPool, seed) {
    const random = mulberry32(hashString(seed));
    const preferred = preferredPool?.length ? preferredPool : data.cards;
    const used = new Set();
    const selections = [];
    let fallbackCount = 0;
    let previous = null;
    slots.forEach((rawSlot, index) => {
      const slot = {
        id: String(rawSlot.id || `slot-${index + 1}`),
        name: String(rawSlot.name || rawSlot.title || `Slot ${index + 1}`),
        allowedClasses: asArray(rawSlot.allowedClasses || rawSlot.allowed_classes || rawSlot.classes).map(normalizeClassId),
        prompt: textOf(rawSlot.prompt || rawSlot.question || rawSlot.meaning, "What role does this card play?"),
      };
      const isEligible = (card) => !used.has(card.id) && (!slot.allowedClasses.length || slot.allowedClasses.includes(card.classId));
      let candidates = preferred.filter(isEligible);
      let usedFallback = false;
      if (!candidates.length) {
        candidates = data.cards.filter(isEligible);
        usedFallback = true;
      }
      if (!candidates.length) {
        candidates = preferred.filter((card) => !used.has(card.id));
        if (!candidates.length) candidates = data.cards.filter((card) => !used.has(card.id));
        usedFallback = true;
      }
      if (!candidates.length) return;
      if (previous) {
        const adjacent = adjacentCardIds(previous.id);
        const graphCandidates = candidates.filter((card) => adjacent.has(card.id));
        if (graphCandidates.length) candidates = graphCandidates;
      }
      const card = candidates[Math.floor(random() * candidates.length)];
      used.add(card.id);
      if (usedFallback) fallbackCount += 1;
      selections.push({ slot, card, usedFallback });
      previous = card;
    });
    return { selections, cards: selections.map((selection) => selection.card), fallbackCount };
  }

  function adjacentCardIds(cardId) {
    return new Set(data.edges.flatMap((edge) => edge.from === cardId ? [edge.to] : edge.to === cardId ? [edge.from] : []));
  }

  function cardPoolSignature(cards) {
    return `${cards.length}:${hashString(cards.map((card) => card.id).sort().join("|"))}`;
  }

  function drawPositionLabel(count, index) {
    if (count === 1) return "The signal";
    if (count === 3) return ["What shaped this", "What is present", "What may emerge"][index];
    return ["Origin", "Force", "Threshold", "Choice", "Integration"][index] || `Position ${index + 1}`;
  }

  function drawSynthesis(cards) {
    if (!cards.length) return "No signal drawn.";
    if (cards.length === 1) return `${cards[0].name} asks you to hold its gift and shadow together.`;
    return `${cards[0].name} opens the question; ${cards[Math.floor(cards.length / 2)].name} complicates it; ${cards[cards.length - 1].name} indicates the next threshold.`;
  }

  function graphGuidedSample(seed, count) {
    if (!data.cards.length) return [];
    const random = mulberry32(hashString(seed));
    const first = data.cards[Math.floor(random() * data.cards.length)];
    const result = [first];
    while (result.length < count) {
      const current = result[result.length - 1];
      const adjacentIds = data.edges.filter((edge) => edge.from === current.id || edge.to === current.id).map((edge) => edge.from === current.id ? edge.to : edge.from).filter((id) => !result.some((card) => card.id === id));
      const pool = adjacentIds.length ? adjacentIds.map((id) => data.cardMap.get(id)).filter(Boolean) : data.cards.filter((card) => !result.includes(card));
      if (!pool.length) break;
      result.push(pool[Math.floor(random() * pool.length)]);
    }
    return result;
  }

  function padCards(cards, count) {
    const result = [...cards];
    let index = 0;
    while (result.length < count && data.cards.length) { result.push(data.cards[index % data.cards.length]); index += 1; }
    return result;
  }

  function seededSample(items, count, seed) {
    const random = mulberry32(hashString(seed));
    const pool = [...items];
    const picked = [];
    while (pool.length && picked.length < count) {
      picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    }
    return picked;
  }

  function seededPick(items, seed) { return seededSample(items, 1, seed)[0]; }

  function dateSeed() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function random() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function classColor(className) {
    const index = Math.abs(hashString(String(className))) % CLASS_COLORS.length;
    return CLASS_COLORS[index];
  }

  function glyphFor(card) {
    return GLYPHS[Math.abs(hashString(card.id || card.name || "oracle")) % GLYPHS.length];
  }

  function resolveImage(path) {
    if (!path) return "";
    if (/^(data:|https?:|file:|\/)/.test(path)) return path;
    return path.startsWith("reference-tiles/") ? `../${path}` : path;
  }

  function resolveCardId(value, cardMap, slugMap) {
    if (value == null) return null;
    const rawValue = typeof value === "object" ? value.id || value.slug || value.name : value;
    const stringValue = String(rawValue);
    if (cardMap.has(stringValue)) return stringValue;
    if (slugMap.has(stringValue)) return slugMap.get(stringValue).id;
    const slug = slugify(stringValue);
    return slugMap.get(slug)?.id || null;
  }

  function inferEdgeFamily(type) {
    const lower = String(type).toLowerCase();
    if (/(influence|origin|descend|adapt|histor)/.test(lower)) return "historical";
    if (/(cause|enable|constrain|suppress|amplif)/.test(lower)) return "causal";
    if (/(contrast|oppose|invert|challenge)/.test(lower)) return "contrastive";
    if (/(fiction|story|myth|symbol|archetype)/.test(lower)) return "symbolic";
    if (/(evidence|document|source|claim)/.test(lower)) return "evidentiary";
    return "conceptual";
  }

  function firstArray(...values) {
    for (const value of values) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object" && !Array.isArray(value)) return Object.values(value);
    }
    return [];
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    if (typeof value === "string" && value.includes(",")) return value.split(",").map((item) => item.trim()).filter(Boolean);
    return [value];
  }

  function unique(values) { return [...new Set(values)]; }

  function textOf(value, fallback = "") {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map((item) => textOf(item)).filter(Boolean).join(" ");
    if (value && typeof value === "object") return String(value.summary || value.text || value.description || value.meaning || fallback);
    return fallback;
  }

  function provenanceText(value) {
    if (!value) return "original-synthesis";
    if (typeof value === "string") return value;
    const kind = value.kind || value.type || value.label || "provenance";
    const sourceIds = asArray(value.sourceIds || value.source_ids || value.sources).map((item) => typeof item === "string" ? item : item?.id).filter(Boolean);
    const note = textOf(value.note || value.description || value.summary, "");
    return [kind, sourceIds.length ? sourceIds.join(", ") : "", note].filter(Boolean).join(" · ");
  }

  function rangeText(value, fallback, suffix = "") {
    if (Array.isArray(value) && value.length >= 2) return `${value[0]}–${value[1]}${suffix}`;
    return textOf(value, fallback);
  }

  function operationText(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return String(value ?? "");
    if (value.label) return String(value.label);
    if (value.op) {
      const operationValue = (item) => {
        if (Array.isArray(item)) return item.map(operationValue).filter(Boolean).join(", ");
        if (item && typeof item === "object") {
          return Object.entries(item)
            .map(([key, nested]) => {
              const rendered = operationValue(nested);
              return rendered ? `${key.replaceAll("-", " ")} ${rendered}` : "";
            })
            .filter(Boolean)
            .join("; ");
        }
        return item === null || item === undefined ? "" : String(item).trim();
      };
      const details = Object.entries(value)
        .filter(([key]) => key !== "op" && key !== "effects" && key !== "cost")
        .map(([key, item]) => {
          const rendered = operationValue(item);
          return rendered ? `${key.replaceAll("-", " ")} ${rendered}` : "";
        })
        .filter(Boolean)
        .join(", ");
      return `${titleCase(String(value.op).replaceAll("-", " "))}${details ? `: ${details}` : ""}`;
    }
    return textOf(value, "Game operation");
  }

  function cardSearchText(card) {
    return [card.name, card.primaryClass, ...card.domains, ...card.evidenceStates, ...card.materialModes, card.essence, card.archetype, card.gift, card.shadow, card.question].join(" ").toLowerCase();
  }

  function slugify(value) {
    return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function normalizeClassId(value) { return slugify(String(value || "unclassified")); }
  function titleCase(value) { return String(value).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
  function shorten(value, length) { return value.length <= length ? value : `${value.slice(0, Math.max(1, length - 1))}…`; }
  function isTypingTarget(target) { return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable; }
  function prefersReducedMotion() { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }

  function highlight(value, query) {
    const escaped = escapeHtml(value);
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped.replace(new RegExp(`(${safeQuery})`, "ig"), "<mark>$1</mark>");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  }

  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
})();
