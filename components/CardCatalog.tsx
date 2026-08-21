"use client";

import { useMemo, useState } from "react";
import type { AssetRecord } from "../lib/catalog";

const label = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function CardCatalog({ records }: { records: AssetRecord[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [family, setFamily] = useState("all");
  const categories = [...new Set(records.map((record) => record.category))].sort();
  const families = [...new Set(records.map((record) => record.family))].sort();
  const filtered = useMemo(() => records.filter((record) => {
    const matchQuery = `${record.name} ${record.originalName} ${record.id} ${record.type} ${record.abilities.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (category === "all" || record.category === category) && (family === "all" || record.family === family);
  }), [records, query, category, family]);

  return <>
    <div className="catalog-tools">
      <label><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ability, timing, or ID" /></label>
      <label><span>Component</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All components</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Family</span><select value={family} onChange={(event) => setFamily(event.target.value)}><option value="all">All families</option>{families.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <p className="result-count">{filtered.length} of {records.length}</p>
    </div>
    <div className="catalog-grid">
      {filtered.map((record) => <a className="catalog-card" href={`/cards/${record.id}`} key={record.id}>
        <div className="catalog-image"><img src={record.thumbnail} alt="" /></div>
        <div className="catalog-card-copy"><p>{label(record.category)} · {label(record.family)}</p><h2>{record.name}</h2><span>{record.mappingStatus === "confirmed-pair" ? "Original + final linked" : label(record.mappingStatus)}</span></div>
      </a>)}
    </div>
    {!filtered.length && <div className="empty-state"><h2>No matching components</h2><p>Try a broader name, family, or component type.</p></div>}
  </>;
}
