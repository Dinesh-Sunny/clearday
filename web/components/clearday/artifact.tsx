"use client";

// Artifacts: the agent returns a json-render style spec (show_artifact) and we render it as a live document,
// inline in the chat and pinned in the middle canvas. "Open" exports a standalone HTML page (libfx-style artifact).
import { useEffect, useState } from "react";

export type Block =
  | { type: "kpis"; items: { label: string; value: string }[] }
  | { type: "bars"; title?: string; rows: { label: string; value: number }[] }
  | { type: "table"; columns: string[]; rows: (string | number)[][] }
  | { type: "text"; text: string }
  | { type: "callout"; tone?: "ok" | "warn" | "risk"; text: string }
  | { type: "steps"; items: { label: string; done?: boolean }[] };
export type Spec = { title: string; subtitle?: string; blocks: Block[] };

const fmt = (v: number) => (Math.abs(v) >= 1000 ? "£" + Math.round(v).toLocaleString("en-GB") : String(v));

function B({ b }: { b: Block }) {
  switch (b.type) {
    case "kpis": return <div className="kpis">{b.items.map((k) => <div className="kpi" key={k.label}><small>{k.label}</small><b>{k.value}</b></div>)}</div>;
    case "bars": { const max = Math.max(1, ...b.rows.map((r) => Math.abs(r.value)));
      return <div>{b.title ? <div className="label">{b.title}</div> : null}<ul className="hbars">{b.rows.map((r) => <li key={r.label}><span>{r.label}</span><i style={{ width: `${(100 * Math.abs(r.value)) / max}%` }} /><b>{fmt(r.value)}</b></li>)}</ul></div>; }
    case "table": return <table className="atable"><thead><tr>{b.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === "number" ? "n" : ""}>{typeof c === "number" ? fmt(c) : c}</td>)}</tr>)}</tbody></table>;
    case "text": return <p className="atext">{b.text}</p>;
    case "callout": return <div className={`callout ${b.tone ?? "ok"}`}>{b.text}</div>;
    case "steps": return <ol className="asteps">{b.items.map((s) => <li key={s.label} className={s.done ? "done" : ""}>{s.label}</li>)}</ol>;
    default: return null;
  }
}

export function ArtifactDoc({ spec }: { spec: Spec }) {
  return (
    <article className="artifact">
      <header><div className="label">Artifact</div><h3>{spec.title}</h3>{spec.subtitle ? <p className="muted sm">{spec.subtitle}</p> : null}</header>
      {(spec.blocks ?? []).map((b, i) => <B key={i} b={b} />)}
    </article>
  );
}

export function openStandalone(spec: Spec) {
  const esc = (s: unknown) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const body = (spec.blocks ?? []).map((b: any) => {
    if (b.type === "kpis") return `<div class=k>${b.items.map((k: any) => `<div><small>${esc(k.label)}</small><b>${esc(k.value)}</b></div>`).join("")}</div>`;
    if (b.type === "bars") { const m = Math.max(1, ...b.rows.map((r: any) => Math.abs(r.value))); return `${b.title ? `<h4>${esc(b.title)}</h4>` : ""}${b.rows.map((r: any) => `<div class=bar><span>${esc(r.label)}</span><i style="width:${(100 * Math.abs(r.value)) / m}%"></i><b>${esc(fmt(r.value))}</b></div>`).join("")}`; }
    if (b.type === "table") return `<table><tr>${b.columns.map((c: any) => `<th>${esc(c)}</th>`).join("")}</tr>${b.rows.map((r: any) => `<tr>${r.map((c: any) => `<td>${esc(typeof c === "number" ? fmt(c) : c)}</td>`).join("")}</tr>`).join("")}</table>`;
    if (b.type === "callout") return `<p class="c ${b.tone ?? "ok"}">${esc(b.text)}</p>`;
    if (b.type === "steps") return `<ol>${b.items.map((s: any) => `<li>${s.done ? "✓ " : ""}${esc(s.label)}</li>`).join("")}</ol>`;
    return `<p>${esc(b.text ?? "")}</p>`;
  }).join("");
  const html = `<!doctype html><meta charset=utf-8><title>${esc(spec.title)}</title><link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@400;500&display=swap" rel=stylesheet><style>body{margin:0;font:15px/1.5 Geist,system-ui;color:#1d2433;background:linear-gradient(#cfe3f5,#f6f1ea 60%);min-height:100vh}main{max-width:820px;margin:48px auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 20px 60px #2a4a7022}h1{font:400 40px "Instrument Serif",serif;margin:0 0 4px}.k{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:20px 0}.k div{background:#f4f7fb;border-radius:14px;padding:12px 14px}.k small{display:block;color:#6b7385}.k b{font-size:22px;font-weight:500}.bar{display:grid;grid-template-columns:200px 1fr 100px;gap:10px;align-items:center;font-size:13px;padding:3px 0}.bar i{height:10px;border-radius:6px;background:#7fa9d6}.bar b{text-align:right;font-weight:500}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e7eaf0}.c{padding:12px 14px;border-radius:12px;background:#eef6ee}.c.warn{background:#fff5e6}.c.risk{background:#fdecec}footer{color:#8a90a0;font-size:12px;margin-top:28px}</style><main><h1>${esc(spec.title)}</h1>${spec.subtitle ? `<p>${esc(spec.subtitle)}</p>` : ""}${body}<footer>Clearday · from Seapoint books (UK + IE) · ${new Date().toLocaleString("en-GB")}</footer></main>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank");
}

// Pinned artifact in the middle canvas: listens for clearday:artifact events from the chat.
export function ArtifactPane() {
  const [spec, setSpec] = useState<Spec | null>(null);
  useEffect(() => {
    const h = (e: Event) => setSpec((e as CustomEvent).detail as Spec);
    window.addEventListener("clearday:artifact", h);
    return () => window.removeEventListener("clearday:artifact", h);
  }, []);
  if (!spec) return null;
  return (
    <section className="artifact-pane">
      <div className="artifact-bar"><span className="label">From the agent</span>
        <span><button className="link" onClick={() => openStandalone(spec)}>Open as page</button> <button className="link" onClick={() => setSpec(null)}>Close</button></span></div>
      <ArtifactDoc spec={spec} />
    </section>
  );
}
