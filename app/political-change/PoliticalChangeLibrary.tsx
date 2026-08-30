"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./political-change.module.css";

type NodeRecord = {
  id: string;
  title: string;
  slug: string;
  family: string;
  kind: string;
  summary: string;
  mechanism: string;
  archetypal_function: string;
  gift: string;
  wound: string;
  strategic_meaning: string;
  divinatory_meaning: string;
  question: string;
  epistemic_status: { kind: string; confidence: string; uncertainty?: string };
  source_refs: string[];
};

type EdgeRecord = {
  id: string;
  source: string;
  predicate: string;
  target: string;
  confidence: string;
  claim_layer: string;
  evidence_refs: string[];
  consequence: string;
};

const PAGE_SIZE = 48;

export default function PoliticalChangeLibrary() {
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [edges, setEdges] = useState<EdgeRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All families");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<NodeRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/political-change/data/library.json")
      .then((response) => {
        if (!response.ok) throw new Error("The library could not be loaded.");
        return response.json();
      })
      .then((records: NodeRecord[]) => setNodes(records))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const families = useMemo(() => ["All families", ...Array.from(new Set(nodes.map((node) => node.family))).sort()], [nodes]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return nodes.filter((node) => {
      const inFamily = family === "All families" || node.family === family;
      const text = [node.title, node.family, node.kind, node.summary, node.mechanism, node.gift, node.wound, node.question].join(" ").toLowerCase();
      return inFamily && (!needle || text.includes(needle));
    });
  }, [family, nodes, query]);

  const selectedRelations = useMemo(() => {
    if (!selected || !edges) return [];
    return edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).slice(0, 18);
  }, [edges, selected]);

  function openNode(node: NodeRecord) {
    setSelected(node);
    if (!edges) {
      fetch("/political-change/data/edges.json")
        .then((response) => response.json())
        .then((records: EdgeRecord[]) => setEdges(records))
        .catch(() => setEdges([]));
    }
  }

  function relatedNode(edge: EdgeRecord) {
    if (!selected) return undefined;
    const id = edge.source === selected.id ? edge.target : edge.source;
    return nodes.find((node) => node.id === id);
  }

  if (error) return <div className={styles.libraryError}><b>Library unavailable</b><p>{error}</p></div>;

  return (
    <div className={styles.library}>
      <div className={styles.libraryTools}>
        <label><span>Search the political field</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} placeholder="legitimacy, strike, media, coalition…" /></label>
        <label><span>Family</span><select value={family} onChange={(event) => { setFamily(event.target.value); setLimit(PAGE_SIZE); }}>{families.map((name) => <option key={name}>{name}</option>)}</select></label>
        <p aria-live="polite"><b>{nodes.length ? visible.length.toLocaleString() : "—"}</b><span>nodes in view</span></p>
      </div>

      {!nodes.length ? <div className={styles.loading}><i/><i/><i/><span>Opening the political field…</span></div> : null}

      <div className={styles.nodeGrid}>
        {visible.slice(0, limit).map((node, index) => (
          <button type="button" className={styles.nodeCard} onClick={() => openNode(node)} key={node.id}>
            <small>{node.family} · {node.kind}</small>
            <span>{String(index + 1).padStart(3, "0")}</span>
            <h3>{node.title}</h3>
            <p>{node.summary}</p>
            <b>Open node ＋</b>
          </button>
        ))}
      </div>

      {visible.length > limit ? <button className={styles.loadMore} type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)}>Reveal {Math.min(PAGE_SIZE, visible.length - limit)} more nodes ↓</button> : null}
      {nodes.length && !visible.length ? <div className={styles.libraryError}><b>No node meets that map.</b><p>Try a broader word or return to all families.</p></div> : null}

      {selected ? <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <article className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="node-title">
          <button className={styles.close} type="button" onClick={() => setSelected(null)} aria-label="Close node">×</button>
          <header><small>{selected.family} · {selected.kind} · {selected.archetypal_function}</small><h2 id="node-title">{selected.title}</h2><p>{selected.summary}</p></header>
          <section className={styles.mechanism}><small>MECHANISM</small><p>{selected.mechanism}</p></section>
          <section className={styles.polarities} aria-label="Polarity"><div><small>FORCES</small><p>{selected.gift}</p></div><div><small>FRICTIONS</small><p>{selected.wound}</p></div></section>
          <section><small>STRATEGIC MEANING</small><p>{selected.strategic_meaning}</p></section>
          <section><small>DIVINATORY MEANING</small><p>{selected.divinatory_meaning}</p></section>
          <blockquote>{selected.question}</blockquote>
          <section className={styles.evidence}><div><small>EPISTEMIC STATUS</small><b>{selected.epistemic_status.kind} · {selected.epistemic_status.confidence}</b></div><div><small>PROVENANCE</small><b>{selected.source_refs.length} source reference{selected.source_refs.length === 1 ? "" : "s"}</b></div></section>
          <section className={styles.relations}><small>TYPED RELATIONSHIPS</small>{!edges ? <p>Tracing relations…</p> : selectedRelations.length ? <div>{selectedRelations.map((edge) => { const target = relatedNode(edge); return <button type="button" onClick={() => target && openNode(target)} key={edge.id}><span>{edge.source === selected.id ? edge.predicate : `← ${edge.predicate}`}</span><b>{target?.title || "Related node"}</b><small>{edge.claim_layer} · {edge.confidence}</small></button>; })}</div> : <p>No compact relationships are displayed for this node.</p>}</section>
        </article>
      </div> : null}
    </div>
  );
}
