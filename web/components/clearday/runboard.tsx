"use client";

// Run board: the live multi-agent tree for the task you handed over, shown in the middle panel.
// Orchestrator on top; each subagent hand-off and tool step is a node with its own state (Running, Needs you, Done).
import { useLangChainInterruptState, useLangChainToolCalls } from "@assistant-ui/react-langchain";
import { useEffect, useRef, useState } from "react";
import { STEP_LABEL, parseResult, useActiveCard, useLatestTurn } from "./live";

type St = "running" | "needs" | "done";
type N = { key: string; name: string; role: string; task: string; st: St; secs: number; tools: string[] };

const SUB: Record<string, { name: string; role: string; tools: string[] }> = {
  "month-end": { name: "Month-end", role: "Close playbook", tools: ["close", "coding", "accruals"] },
  payables: { name: "Payables", role: "Bills and payment runs", tools: ["spend-readiness", "coding"] },
  cash: { name: "Cash", role: "Runway and treasury", tools: ["cash-forecast"] },
};
const TOOL_ROLE: Record<string, string> = {
  sweep_books: "Seapoint · 8 checks", query_books: "Seapoint · read", close_checklist: "Close", cash_view: "UK + IE cash",
  board_pack: "Reporting", execute_action: "Policy guard", show_artifact: "Generative UI", write_todos: "Plan",
};

function Pill({ st }: { st: St }) {
  return <span className={`rpill ${st}`}>{st === "running" ? <><i className="rspin" />Running</> : st === "needs" ? <>◷ Needs you</> : <>✓ Done</>}</span>;
}

export function RunBoard() {
  const a = useActiveCard();
  const turn = useLatestTurn();
  let interrupt: any = null;
  try { interrupt = useLangChainInterruptState(); } catch { interrupt = null; }
  const seen = useRef<Record<string, { start: number; end?: number }>>({});
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const startRef = useRef<Record<string, number>>({});
  if (!turn) return null;
  const started = (startRef.current[turn.key] ??= Date.now());
  const title = turn.text.replace(/\s*\(card [^)]*\)\s*$/, "").replace(/^(Approve as Doruk|[A-Z][a-z]+(?: [a-z]+)?): /, "").split(" - ")[0].slice(0, 110);

  const now = Date.now();
  const mine = turn.calls.filter((c) => c.name !== "write_todos");
  const nodes: N[] = mine.map((c, i) => {
    const key = c.id ?? `${c.name}-${i}`;
    const rec = (seen.current[key] ??= { start: now });
    const finished = c.result !== undefined;
    if (finished && !rec.end) rec.end = now;
    const needs = !finished && c.name === "execute_action" && !!interrupt;
    const st: St = finished ? "done" : needs ? "needs" : "running";
    const secs = Math.max(1, Math.round(((rec.end ?? now) - rec.start) / 1000));
    if (c.name === "task") {
      const s = SUB[String(c.args?.subagent_type)] ?? { name: String(c.args?.subagent_type ?? "Subagent"), role: "Subagent", tools: [] };
      return { key, name: s.name, role: s.role, task: String(c.args?.description ?? "").slice(0, 90), st, secs, tools: s.tools };
    }
    const r = finished ? parseResult(c.result) : null;
    const task = c.name === "execute_action" ? (r?.message ?? (needs ? "Waiting for your Approve" : "Re-checking limits, VAT, buffer"))
      : c.name === "show_artifact" ? String(c.args?.title ?? "Building the artifact")
      : c.name === "query_books" ? String(c.args?.name ?? "").replaceAll("_", " ")
      : STEP_LABEL[c.name] ?? c.name;
    return { key, name: STEP_LABEL[c.name]?.replace(/^(Checking|Reading|Running|Building|Drafting) /, (m) => m) ?? c.name, role: TOOL_ROLE[c.name] ?? "Tool", task, st, secs, tools: [c.name] };
  });

  const running = nodes.filter((n) => n.st === "running").length;
  const needs = nodes.filter((n) => n.st === "needs").length;
  const allDone = nodes.length > 0 && running === 0 && needs === 0;
  const rootSt: St = needs ? "needs" : allDone ? "done" : "running";
  const total = Math.round(((allDone ? Math.max(...Object.values(seen.current).map((x) => x.end ?? now)) : now) - started) / 1000);

  return (
    <section className="runboard">
      <header className="rb-head">
        <span className="rb-title">✦ Agents</span>
        <span className="rb-stats">
          <span>{nodes.length + 1} steps</span>
          {running ? <span className="blue">{running} running</span> : null}
          {needs ? <button className="rb-needs" onClick={() => window.dispatchEvent(new CustomEvent("clearday:open-agent"))}>{needs} needs you</button> : null}
          <span className="mono">{total}s</span>
        </span>
      </header>
      <div className="rb-tree">
        <div className="rb-node root">
          <div className="rb-top"><span className="rb-ico">✳</span><div><b>Orchestrator</b><small>Deep Agent · Sonnet</small></div><Pill st={rootSt} /></div>
          <p>{title}</p>
          <div className="rb-foot"><span className="mono">{total}s</span><span className="muted">{nodes.length} steps</span></div>
        </div>
        {nodes.length ? (
          <div className="rb-kids">
            {nodes.map((n) => (
              <div key={n.key} className={`rb-node ${n.st}`}>
                <div className="rb-top"><span className="rb-ico">{n.tools[0] === "execute_action" ? "⛨" : n.tools[0] === "show_artifact" ? "▦" : SUB[n.name.toLowerCase()] ? "✳" : "◆"}</span><div><b>{n.name}</b><small>{n.role}</small></div><Pill st={n.st} /></div>
                <p>{n.task}</p>
                <div className="rb-foot"><span className="mono">{n.secs}s</span></div>
              </div>
            ))}
          </div>
        ) : <div className="rb-kids"><div className="rb-node running ghost"><div className="rb-top"><span className="rb-ico">◆</span><div><b>Reading the card</b><small>Planning</small></div><Pill st="running" /></div></div></div>}
      </div>
    </section>
  );
}
