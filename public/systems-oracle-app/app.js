const names = ['artifacts', 'domains', 'relationships', 'lineages', 'spreads', 'games', 'sources', 'longlist', 'references'];
const loaded = await Promise.all(names.map((name) => fetch(`data/${name}.json`).then((response) => response.json())));
const [artifacts, domains, relationships, lineages, spreads, games, sources, longlist, references] = loaded;

const app = document.querySelector('#app');
const nav = document.querySelector('#nav');
const dialog = document.querySelector('#artifactDialog');
const dialogBody = document.querySelector('#dialogBody');
const referenceIds = references.map((reference) => reference.artifactId);
const pages = [
  ['home', 'Home'], ['explorer', 'Artifacts'], ['domains', 'Domains'], ['lineages', 'Lineages'],
  ['relationships', 'Graph'], ['divination', 'Divination'], ['spreads', 'Spreads'], ['games', 'Games'],
  ['visual', 'Visual System'], ['research', 'Research'], ['downloads', 'Downloads'],
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const section = (eyebrow, title, content) => `<section><p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${content}</section>`;

nav.innerHTML = pages.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('');
document.querySelector('#menu').addEventListener('click', () => nav.classList.toggle('open'));
document.querySelector('.close').addEventListener('click', () => dialog.close());

function openArtifact(id) {
  const artifact = artifacts.find((item) => item.id === id);
  if (!artifact) return;
  dialogBody.innerHTML = `<article class="dialog-content">
    <span class="tag">${esc(artifact.domainName)} · ${esc(artifact.type)}</span>
    <h2>${esc(artifact.name)}</h2>
    <p class="lede">${esc(artifact.archetype)} · ${esc(artifact.essence)}</p>
    <h3>Reality</h3><p>${esc(artifact.whatItIs)}. ${esc(artifact.whyItEmerged)}</p>
    <div class="grid"><div class="panel"><b>Gift</b><p>${esc(artifact.gift)}</p></div><div class="panel"><b>Shadow</b><p>${esc(artifact.shadow)}</p></div></div>
    <h3>Oracle</h3><p>${esc(artifact.divination.message)}</p><p><b>Guidance:</b> ${esc(artifact.divination.guidance)}</p>
    <h3>Seven lenses</h3><div class="lenses">${Object.entries(artifact.meanings).map(([lens, meaning]) => `<div><b>${esc(lens)}</b><p>${esc(meaning)}</p></div>`).join('')}</div>
    <h3>Provenance</h3><div class="provenance">
      <p><b>Documented:</b> ${artifact.provenance.documentedHistory.map((source) => `<a href="${esc(source.url)}">${esc(source.title)}</a>`).join('; ') || 'source required'}</p>
      <p><b>Mythology:</b> ${esc(artifact.provenance.industryMythology)}</p>
      <p><b>Oracle synthesis:</b> ${esc(artifact.provenance.oracleSynthesis)}</p>
    </div></article>`;
  dialog.showModal();
}

function artifactExplorer() {
  return section('Canon', 'Artifact Explorer', `<p class="lede">Search the complete canon by reality, structure, gift, shadow, or provenance.</p>
    <div class="toolbar"><input id="q" aria-label="Search artifacts" placeholder="Search 360 artifacts">
    <select id="domain" aria-label="Filter by domain"><option value="">All domains</option>${domains.map((domain) => `<option value="${domain.id}">${esc(domain.name)}</option>`).join('')}</select>
    <select id="type" aria-label="Filter by type"><option value="">All types</option>${[...new Set(artifacts.map((artifact) => artifact.type))].sort().map((type) => `<option>${type}</option>`).join('')}</select></div>
    <p id="resultCount" class="eyebrow"></p><div id="results" class="artifact-grid"></div>`);
}

function drawResults() {
  const query = (document.querySelector('#q')?.value || '').toLowerCase();
  const domain = document.querySelector('#domain')?.value || '';
  const type = document.querySelector('#type')?.value || '';
  const found = artifacts.filter((artifact) => (!domain || artifact.domain === domain) && (!type || artifact.type === type) && (!query || JSON.stringify(artifact).toLowerCase().includes(query)));
  document.querySelector('#resultCount').textContent = `${found.length} artifacts`;
  document.querySelector('#results').innerHTML = found.map((artifact) => `<button class="card artifact" data-artifact-id="${artifact.id}">
    <span class="tag">${esc(artifact.type)}</span><h3>${esc(artifact.name)}</h3><p>${esc(artifact.whatItIs)}</p>
    <p class="gift"><b>Gift:</b> ${esc(artifact.gift)}</p><p class="shadow"><b>Shadow:</b> ${esc(artifact.shadow)}</p></button>`).join('') || '<p>No matching artifacts.</p>';
  document.querySelectorAll('[data-artifact-id]').forEach((card) => card.addEventListener('click', () => openArtifact(card.dataset.artifactId)));
}

function relationshipExplorer() {
  const types = [...new Set(relationships.map((relationship) => relationship.type))];
  return section('Graph', 'Typed relationships', `<p class="lede">Every artifact participates. Search all ${relationships.length.toLocaleString()} edges by artifact, mechanism, or rationale.</p>
    <div class="stats">${types.map((type) => `<div class="stat"><strong>${relationships.filter((relationship) => relationship.type === type).length}</strong>${esc(type)}</div>`).join('')}</div>
    <div class="toolbar"><input id="relationshipQ" aria-label="Search relationships" placeholder="Search the complete graph"><select id="relationshipType" aria-label="Filter relationship type"><option value="">All edge types</option>${types.map((type) => `<option>${esc(type)}</option>`).join('')}</select></div>
    <p id="relationshipCount" class="eyebrow"></p><div id="relationshipResults" class="grid"></div>`);
}

function drawRelationships() {
  document.querySelectorAll('[data-relationship-note]').forEach((note) => note.remove());
  const query = (document.querySelector('#relationshipQ')?.value || '').toLowerCase();
  const type = document.querySelector('#relationshipType')?.value || '';
  const found = relationships.filter((relationship) => {
    if (type && relationship.type !== type) return false;
    const from = artifacts.find((artifact) => artifact.id === relationship.from)?.name || relationship.from;
    const to = artifacts.find((artifact) => artifact.id === relationship.to)?.name || relationship.to;
    return !query || `${from} ${to} ${relationship.type} ${relationship.rationale}`.toLowerCase().includes(query);
  });
  document.querySelector('#relationshipCount').textContent = `${found.length.toLocaleString()} relationships`;
  document.querySelector('#relationshipResults').innerHTML = found.slice(0, 160).map((relationship) => {
    const from = artifacts.find((artifact) => artifact.id === relationship.from)?.name || relationship.from;
    const to = artifacts.find((artifact) => artifact.id === relationship.to)?.name || relationship.to;
    return `<article class="card"><span class="tag">${esc(relationship.type)}</span><p><b>${esc(from)}</b> → <b>${esc(to)}</b></p><small>${esc(relationship.rationale)}</small></article>`;
  }).join('');
  if (found.length > 160) document.querySelector('#relationshipResults').insertAdjacentHTML('afterend', `<p class="eyebrow" data-relationship-note>Showing the first 160 matching edges. Narrow the search to inspect the remainder.</p>`);
}

function render() {
  const page = location.hash.slice(1) || 'home';
  nav.querySelectorAll('a').forEach((link) => link.classList.toggle('active', link.hash === `#${page}`));
  nav.classList.remove('open');
  if (page === 'home') {
    app.innerHTML = `<section class="hero"><p class="eyebrow">A symbolic operating manual for the systems humans build</p><h1>Structure becomes meaning.</h1>
      <p class="lede">From COBOL to Burning Man, liquidation preference to Xerox PARC: a rigorous oracle of technology, organizations, markets, failures, and unrealized futures.</p>
      <div class="stats"><div class="stat"><strong>${artifacts.length}</strong>canon artifacts</div><div class="stat"><strong>${longlist.length.toLocaleString()}</strong>evaluated candidates</div><div class="stat"><strong>${relationships.length.toLocaleString()}</strong>typed edges</div><div class="stat"><strong>${lineages.length}</strong>lineages</div></div></section>
      ${section('Method', 'Not buzzwords in costume', '<p class="lede">Every reading begins with the artifact’s actual mechanism. Gift and shadow emerge from where it places state, authority, memory, risk, and repair.</p>')}`;
  } else if (page === 'explorer') {
    app.innerHTML = artifactExplorer();
    drawResults();
    ['q', 'domain', 'type'].forEach((id) => document.querySelector(`#${id}`).addEventListener('input', drawResults));
  } else if (page === 'domains') {
    app.innerHTML = section('Taxonomy', 'Twenty domains', `<div class="grid">${domains.map((domain) => `<article class="card"><span class="tag">18 artifacts</span><h3>${esc(domain.name)}</h3><p>${esc(domain.description)}</p><p><b>${esc(domain.question)}</b></p></article>`).join('')}</div>`);
  } else if (page === 'lineages') {
    app.innerHTML = section('History', 'Major lineages', lineages.map((lineage) => `<article class="lineage"><h3>${esc(lineage.name)}</h3><p>${esc(lineage.thesis)}</p><div class="chain">${lineage.artifactIds.map((id) => `<span>${esc(artifacts.find((artifact) => artifact.id === id)?.name || id)}</span>`).join(' → ')}</div></article>`).join(''));
  } else if (page === 'relationships') {
    app.innerHTML = relationshipExplorer();
    drawRelationships();
    ['relationshipQ', 'relationshipType'].forEach((id) => document.querySelector(`#${id}`).addEventListener('input', drawRelationships));
  } else if (page === 'divination') {
    const steps = ['Ask a decision-bearing question','State what each artifact actually does','Translate mechanism, not vocabulary','Hold gift and shadow together','Name a counterforce','Commit to one practical move'];
    app.innerHTML = section('Practice', 'Divination without prediction', `<p class="lede">Defamiliarize a real decision through another system’s structure. End every reading with an observable move and a review date.</p><div class="grid">${steps.map((step, index) => `<div class="stat"><strong>0${index + 1}</strong>${step}</div>`).join('')}</div>`);
  } else if (page === 'spreads') {
    app.innerHTML = section('Practice', 'Twelve spreads', `<div class="grid">${spreads.map((spread) => `<article class="card spread"><h3>${esc(spread.name)}</h3><p>${esc(spread.purpose)}</p><ol>${spread.positions.map((position) => `<li>${esc(position)}</li>`).join('')}</ol><small>${esc(spread.synthesis)}</small><p><b>Tested reading:</b> ${esc(spread.testedExample)}</p></article>`).join('')}</div>`);
  } else if (page === 'games') {
    app.innerHTML = section('Play', 'Four tested systems', `<div class="grid">${games.map((game) => `<article class="card"><span class="tag">${esc(game.players)} · ${esc(game.duration)}</span><h3>${esc(game.name)}</h3><p>${esc(game.premise)}</p><p><b>Test:</b> ${esc(game.testedExample)}</p></article>`).join('')}</div>`);
  } else if (page === 'visual') {
    app.innerHTML = section('Design', 'Forty reference artifacts', `<p class="lede">Eight visual categories across the physical hierarchy. Text remains live. Every proof remains legible at 96 pixels.</p><div class="reference-grid">${references.map((reference, index) => { const artifact = artifacts.find((item) => item.id === referenceIds[index]); const webPath = reference.sitePath.replace(/\.png$/, '.webp'); return `<figure><img src="${webPath}" alt="${esc(artifact.name)}" loading="lazy"><figcaption><b>${esc(artifact.name)}</b><small>${esc(artifact.visualDirection.family)} · ${esc(reference.category)}</small></figcaption></figure>`; }).join('')}</div>`);
  } else if (page === 'research') {
    app.innerHTML = section('Evidence', 'Research registry', `<p class="lede">Documented history, industry mythology, popular interpretation, and oracle synthesis are kept distinct.</p><div class="grid">${sources.map((source) => `<article class="card source"><span class="tag">${esc(source.kind)}</span><h3>${esc(source.title)}</h3><p>${esc(source.publisher)}</p><a href="${esc(source.url)}">Open source ↗</a></article>`).join('')}</div>`);
  } else if (page === 'downloads') {
    app.innerHTML = section('Source', 'Downloads', `<div class="grid"><a class="card" href="data/artifacts.json"><h3>Artifacts JSON</h3><p>Complete 360-artifact canon.</p></a><a class="card" href="data/longlist.json"><h3>Longlist JSON</h3><p>All 1,080 evaluated candidates.</p></a><a class="card" href="data/relationships.json"><h3>Relationship graph</h3><p>Typed edges for every artifact.</p></a><a class="card" href="downloads/README.md"><h3>README</h3><p>Method, structure, and validation.</p></a></div>`);
  } else {
    app.innerHTML = section('404', 'Unknown chamber', '<p>Return to <a href="#home">the observatory</a>.</p>');
  }
}

addEventListener('hashchange', render);
render();
