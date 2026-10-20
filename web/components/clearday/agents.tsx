"use client";

// Clearday's own agent components (original, built for our tools):
// AgentTree - the orchestrator and its Deep Agents subagents, each with the skills and tools it owns, lit up live
//             from the LangGraph stream (root tool calls + `task` delegations).
// AgentPlan - the orchestrator's todo list (Deep Agents `write_todos`), as a progress tracker.
// AutonomyDial - what the agent may do alone vs. what needs a human, per approver.
import { useLangChainState, useLangChainToolCalls } from "@assistant-ui/react-langchain";
import { useMemo, useState } from "react";
import { useThreadToolCalls } from "./live";

type Status = "idle" | "running" | "done";
type Node = { id: string; name: string; role: string; tools: string[]; skills: string[] };

const SUBAGENTS: Node[] = [
  { id: "month-end", name: "Month-end", role: "Seapoint close playbook · drafts only", tools: ["close_checklist", "sweep_books", "query_books", "board_pack"],
    skills: ["close-preferences", "close-readiness", "coding-review", "accrual-schedule", "variance-commentary"] },
  { id: "payables", name: "Payables", role: "Bills, duplicates, VAT, payment runs", tools: ["sweep_books", "query_books"], skills: ["spend-readiness", "coding-review"] },
  { id: "cash", name: "Cash", role: "Runway, what-ifs, treasury, UK + IE", tools: ["cash_view", "query_books"], skills: ["cash-forecast"] },
];
const ROOT_TOOLS = ["sweep_books", "query_books", "close_checklist", "cash_view", "board_pack", "execute_action"];
const LABEL: Record<string, string> = {
  sweep_books: "Sweep books", query_books: "Query books", close_checklist: "Close checklist", cash_view: "Cash view",
  board_pack: "Board pack", execute_action: "Execute (needs you)", write_todos: "Plan", task: "Delegate",
};

function useLiveStatus() {
  const calls = useThreadToolCalls();
  return useMemo(() => {
    const tool: Record<string, Status> = {};
    const sub: Record<string, { status: Status; note?: string }> = {};
    for (const c of calls) {
      const done = c.result !== undefined;
      const st: Status = done ? "done" : "running";
      if (c.name === "task") {
        const who = String(c.args?.subagent_type ?? c.args?.name ?? "");
        if (who) sub[who] = { status: st, note: c.args?.description };
      } else if (c.name) {
        tool[c.name] = tool[c.name] === "running" ? "running" : st;
      }
    }
    return { tool, sub, any: calls.length > 0 };
  }, [calls]);
}

function Dot({ s }: { s: Status }) {
  return <span className={`tdot ${s}`} aria-label={s} />;
}

export function AgentTree({ compact = false, strip = false }: { compact?: boolean; strip?: boolean }) {
  const live = useLiveStatus();
  if (strip) {
    // Only visible while agents are working - one calm line, nothing when idle.
    const subs = SUBAGENTS.filter((n) => live.sub[n.id]?.status === "running");
    const tool = Object.entries(live.tool).find(([, v]) => v === "running")?.[0];
    if (!subs.length && !tool) return null;
    return (
      <div className="astrip-wrap">
        <span className="tdot running" />
        <span>{subs.length ? subs.map((n) => n.name).join(" + ") + " working" : "Working"}{tool ? ` · ${LABEL[tool] ?? tool}` : ""}</span>
      </div>
    );
  }
  const [openId, setOpenId] = useState<string | null>(compact ? null : "month-end");
  const rootStatus: Status = Object.values(live.tool).includes("running") || Object.values(live.sub).some((x) => x.status === "running") ? "running" : live.any ? "done" : "idle";
  return (
    <div className={`atree ${compact ? "compact" : ""}`}>
      <div className="tnode root">
        <Dot s={rootStatus} />
        <div className="tbody">
          <div className="tname">Clearday orchestrator</div>
          <div className="trole">Deep Agent · plans, delegates, asks before money moves</div>
          <div className="tchips">
            {ROOT_TOOLS.map((t) => <span key={t} className={`tchip ${live.tool[t] ?? "idle"}`}>{LABEL[t]}</span>)}
          </div>
        </div>
      </div>
      <ul className="tkids">
        {SUBAGENTS.map((n) => {
          const s = live.sub[n.id]?.status ?? "idle";
          const isOpen = openId === n.id || s === "running";
          return (
            <li key={n.id} className="tbranch">
              <button className={`tnode ${s}`} onClick={() => setOpenId(isOpen ? null : n.id)} aria-expanded={isOpen}>
                <Dot s={s} />
                <div className="tbody">
                  <div className="tname">{n.name} <span className="tstate">{s === "running" ? "working" : s === "done" ? "done" : "ready"}</span></div>
                  <div className="trole">{live.sub[n.id]?.note ? String(live.sub[n.id]!.note).slice(0, 80) : n.role}</div>
                </div>
              </button>
              {isOpen && (
                <ul className="tleaves">
                  {n.skills.map((k) => <li key={k} className="tleaf skill"><span className="tk">skill</span>{k}</li>)}
                  {n.tools.map((t) => <li key={t} className={`tleaf ${live.tool[t] ?? "idle"}`}><span className="tk">tool</span>{LABEL[t] ?? t}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AgentPlan() {
  let todos: any[] | undefined;
  try { todos = useLangChainState<any[]>("todos"); } catch { todos = undefined; }
  if (!todos?.length) return null;
  const done = todos.filter((t) => t.status === "completed").length;
  return (
    <div className="aplan">
      <div className="aplan-head"><span className="label">Plan</span><span className="muted sm">{done} of {todos.length}</span></div>
      <div className="abar"><i style={{ width: `${(100 * done) / todos.length}%` }} /></div>
      <ol>{todos.map((t, i) => <li key={i} className={t.status}><span className="pdot" />{t.content}</li>)}</ol>
    </div>
  );
}

export function AutonomyDial() {
  const rows = [
    { what: "Read the books, explain, draft journals", who: "Agent alone", lvl: 3 },
    { what: "Bookkeeping fixes in Seapoint (approve, rename, code)", who: "You approve, then MCP applies", lvl: 2 },
    { what: "Pay bills up to £25k", who: "Dinesh approves", lvl: 1 },
    { what: "Anything over £25k (up to £150k)", who: "Doruk approves", lvl: 0 },
  ];
  return (
    <div className="panel dial">
      <div className="label">Autonomy</div>
      <ul>{rows.map((r) => (
        <li key={r.what}><span className="lvl">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= r.lvl ? "on" : ""} />)}</span>
          <span className="dwhat">{r.what}</span><span className="dwho">{r.who}</span></li>))}</ul>
      <p className="muted sm">Limits, duplicates, VAT checks and the £250,000 cash buffer are enforced in code, not in the prompt.</p>
    </div>
  );
}
