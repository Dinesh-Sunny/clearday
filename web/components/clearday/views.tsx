"use client";

// The generative-UI canvas: each sidebar view renders live policy-service data with the same components the agent uses.
import { useEffect, useState } from "react";
import { ActionCard, BoardUI, CashUI, CloseUI } from "./tool-uis";
import { AgentTree, AutonomyDial } from "./agents";

const gbp = (n: number) => "£" + Math.round(n).toLocaleString("en-GB");
const get = (p: string) => fetch("/policy" + p).then((r) => r.json());
const post = (p: string, b: unknown = {}) => fetch("/policy" + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());

export type View = "agents" | "today" | "payables" | "bookkeeping" | "close" | "cash" | "board" | "activity";

export const NAV: { id: View; label: string; hint: string }[] = [
  { id: "today", label: "Today", hint: "Decisions for you" },
  { id: "payables", label: "Bills and spend", hint: "AP, duplicates, VAT" },
  { id: "bookkeeping", label: "Bookkeeping", hint: "Reconcile and code" },
  { id: "close", label: "Month-end close", hint: "September" },
  { id: "cash", label: "Cash and runway", hint: "UK + IE" },
  { id: "board", label: "Board pack", hint: "Draft" },
  { id: "agents", label: "Agents", hint: "Orchestrator + 3 subagents" },
  { id: "activity", label: "Activity", hint: "Audit log" },
];

function useHome(tick: number) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { get("/api/home").then(setD).catch(() => setD({ error: true })); }, [tick]);
  return d;
}

function Header({ d }: { d: any }) {
  const held = d.cards.filter((c: any) => ["hold_bill", "void_bill"].includes(c.action.type)).reduce((s: number, c: any) => s + c.at_stake, 0);
  return (
    <div className="stats">
      <div><b>£{(d.runway.cash / 1e6).toFixed(2)}M</b><small>cash</small></div>
      <div><b>{d.runway.months} mo</b><small>runway</small></div>
      <div><b>{gbp(held)}</b><small>held, not paid</small></div>
    </div>
  );
}

function Cards({ cards, title }: { cards: any[]; title: string }) {
  const [all, setAll] = useState(false);
  const list = all ? cards : cards.slice(0, 5);
  return (
    <section className="mlist">
      <h2 className="mhead">{title}</h2>
      {list.map((c) => <ActionCard key={c.id} c={c} minimal />)}
      {cards.length > 5 && !all ? <button className="link" onClick={() => setAll(true)}>Show {cards.length - 5} more</button> : null}
    </section>
  );
}

export function Canvas({ view, tick }: { view: View; tick: number }) {
  const d = useHome(tick);
  const [ex, setEx] = useState<{ v: View; d: any } | null>(null);
  useEffect(() => {
    const p = view === "close" ? "/api/close" : view === "cash" ? "/api/cash" : view === "activity" ? "/api/audit" : null;
    if (p) get(p).then((d) => setEx({ v: view, d })).catch(() => setEx(null));
  }, [view, tick]);
  const extra = ex && ex.v === view ? ex.d : null; // never render one view's data in another view

  if (!d) return <div className="working"><span className="spin" />Reading Northstar Labs&apos; Seapoint books…</div>;
  if (d.error) return <p className="muted">Start the policy service: <code>python3 app/server.py</code></p>;
  const cards: any[] = d.cards;

  return (
    <div className="canvas-inner">
      <Header d={d} />
      {view === "today" && (
        <>
          <Cards title={`${cards.filter((c) => c.needs_approval).length} things need you`} cards={cards} />
        </>
      )}
      {view === "payables" && <Cards title="Bills and spend" cards={cards.filter((c) => c.area === "ap")} />}
      {view === "bookkeeping" && <Cards title="Bookkeeping" cards={cards.filter((c) => c.area === "recon")} />}
      {view === "close" && (
        <>
          {extra ? <CloseUI toolName="close_checklist" args={{}} result={extra} /> : null}
          <Cards title="Close items" cards={cards.filter((c) => c.area === "close")} />
        </>
      )}
      {view === "cash" && (
        <>
          {extra ? <CashUI toolName="cash_view" args={{}} result={extra} /> : null}
          <Cards title="Cash and group" cards={cards.filter((c) => ["cash", "entity"].includes(c.area))} />
        </>
      )}
      {view === "board" && <BoardView />}
      {view === "agents" && (
        <div className="agents-view">
          <div className="panel"><div className="label">Multi-agent tree · live</div><AgentTree /></div>
          <AutonomyDial />
        </div>
      )}
      {view === "activity" && (
        <div className="panel"><div className="label">Activity · who did what</div>
          <ul className="log">{(extra ?? []).map((e: any) => <li key={e.id}>{e.what}<small>{e.at} · {e.actor}{e.approver ? ` · approved by ${e.approver}` : ""}{e.money ? ` · ${gbp(e.money)}` : ""} · {e.detail}</small></li>)}</ul></div>
      )}
    </div>
  );
}

function BoardView() {
  const [p, setP] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      {!p ? (
        <div className="panel"><div className="label">September board pack</div>
          <p className="muted">Cash, runway, burn, the variance a board will ask about, and a short narrative from both Seapoint organisations.</p>
          <button className="btn primary" disabled={busy} onClick={async () => { setBusy(true); setP(await post("/api/board")); setBusy(false); }}>{busy ? "Drafting…" : "Draft the pack"}</button></div>
      ) : <BoardUI toolName="board_pack" args={{}} result={p} />}
    </div>
  );
}
