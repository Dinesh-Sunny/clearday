"use client";

// Generative UI: each Deep Agents tool result renders as a Clearday component instead of raw JSON.
import { useLangChainState } from "@assistant-ui/react-langchain";
import { useAui } from "@assistant-ui/react";
import { useEffect, type FC } from "react";
import { ArtifactDoc, openStandalone, type Spec } from "./artifact";
import { setActive, useCardActivity, useToolCallCount } from "./live";

const AREA: Record<string, string> = { ap: "Bills and spend", recon: "Bookkeeping", cash: "Cash and runway", close: "Month-end close", board: "Reporting", entity: "Multi-entity" };
const gbp = (n: number) => "£" + Math.round(n).toLocaleString("en-GB");
const parse = (r: unknown): any => {
  if (r == null) return null;
  if (typeof r === "string") { try { return JSON.parse(r); } catch { return { text: r }; } }
  if (Array.isArray(r) && (r as any)[0]?.text) { try { return JSON.parse((r as any)[0].text); } catch { return null; } }
  return r;
};

type P = { toolName: string; args: any; result?: unknown; status?: { type: string } };

function Working({ label }: { label: string }) {
  return <div className="working"><span className="spin" />{label}</div>;
}

export function ActionCard({ c, minimal = false }: { c: any; minimal?: boolean }) {
  const aui = useAui();
  const count = useToolCallCount();
  const live = useCardActivity(c.id);
  const ask = (text: string) => {
    setActive(c.id, count, c.title.split(" - ")[0]);
    window.dispatchEvent(new CustomEvent("clearday:open-agent"));
    (aui as any).thread.append(text); // goes through assistant-ui, so the message shows in the agent panel and runs the Deep Agent
  };
  if (minimal) {
    return (
      <article className={`mcard ${live ? "live " + live.phase : ""}`}>
        <span className={`mdot ${c.risk}`} aria-label={c.risk} />
        <div className="mbody">
          <div className="mtitle">{c.title.split(" - ")[0]}</div>
          {live ? (
            <button className={`mlive ${live.phase}`} onClick={() => window.dispatchEvent(new CustomEvent("clearday:open-agent"))}>
              <span className="ldot" />{live.label}{live.phase === "approval" ? " →" : ""}
            </button>
          ) : <div className="msub">{AREA[c.area] ?? c.area}{c.deadline_days < 0 ? " · overdue" : c.deadline_days === 0 ? " · today" : ""}</div>}
        </div>
        {c.at_stake ? <span className="mamt">{gbp(c.at_stake)}</span> : null}
        <button className={`btn sm ${c.needs_approval ? "primary" : ""}`} onClick={() => ask(c.waiting_for ? `Approve as Doruk: ${c.title} (card ${c.id}, approver p_cfo)` : `${c.verb}: ${c.title} (card ${c.id})`)}>
          {c.waiting_for ? "Approve" : c.verb}
        </button>
      </article>
    );
  }
  return (
    <article className="card">
      <div className="meta"><span className="area">{AREA[c.area] ?? c.area}</span>
        <span className={`risk ${c.risk}`}>{c.risk === "high" ? "Needs care" : c.risk === "medium" ? "Worth a look" : "Routine"}</span>
        {c.deadline_days <= 0 ? <span>{c.deadline_days < 0 ? "Overdue" : "Due today"}</span> : c.deadline_days <= 7 ? <span>Due in {c.deadline_days} days</span> : null}
      </div>
      <h3>{c.title}</h3>
      <p>{c.reason}</p>
      <details><summary>Evidence and plan</summary>
        <ul className="ev">{(c.evidence ?? []).map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
        <ol className="plan">{(c.plan ?? []).map((e: string, i: number) => <li key={i}>{e}</li>)}</ol>
      </details>
      <div className="act">
        {c.at_stake ? <span className="amt">{gbp(c.at_stake)}</span> : null}
        {c.waiting_for ? <span className="wait">Waiting for {String(c.waiting_for).split(" ")[0]}</span> : null}
        <button className={`btn sm ${c.needs_approval ? "primary" : ""}`}
          onClick={() => ask(c.waiting_for ? `Approve as Doruk: ${c.title} (card ${c.id}, approver p_cfo)` : `${c.verb}: ${c.title} (card ${c.id})`)}>
          {c.waiting_for ? "Approve as Doruk" : c.verb}
        </button>
        <button className="btn sm" onClick={() => ask(`Explain card ${c.id} in plain English and tell me the risk if I do nothing.`)}>Why?</button>
      </div>
    </article>
  );
}

export const SweepUI: FC<P> = ({ result }) => {
  const d = parse(result);
  if (!d) return <Working label="Reading the Seapoint books - bills, payments, cards, accounts, UK + IE" />;
  const cards = (d.cards ?? []) as any[];
  return (
    <div className="gen">
      <ol className="steps">{(d.steps ?? []).map((s: any) => <li key={s.label} className="done">{s.label} <b>{s.found}</b></li>)}</ol>
      <div className="cards">{cards.slice(0, 8).map((c) => <ActionCard key={c.id} c={c} />)}</div>
      {cards.length > 8 ? <p className="muted sm">{cards.length - 8} more lower-priority items.</p> : null}
    </div>
  );
};

export const ExecuteUI: FC<P> = ({ args, result }) => {
  const d = parse(result);
  if (!d) return <Working label={`Guard checking ${args?.card_id ?? "the action"}`} />;
  const label = d.status === "done" ? d.message : d.status === "routed" ? `Over the limit - sent to ${d.to} for approval` : d.status === "blocked" ? "Blocked by the guard" : d.text ?? "Not run";
  return (
    <div className={`receipt ${d.status}`}>
      <div className="label">Guard result</div>
      <div className="atitle">{label}</div>
      <ul className="checks">{(d.checks ?? []).map((k: any, i: number) => (
        <li key={i}><span className={k.ok ? "ok" : "no"}>{k.ok ? "✓" : "✕"}</span><span>{k.rule} <span className="muted">· {k.detail}</span></span></li>))}</ul>
    </div>
  );
};

export const CloseUI: FC<P> = ({ result }) => {
  const d = parse(result);
  if (!d) return <Working label="Checking the September close" />;
  const done = (d.items ?? []).filter((i: any) => i.done).length;
  return (
    <div className="panel">
      <div className="label">{d.month} close · {done} of {d.items?.length} ready</div>
      <ul className="cl">{(d.items ?? []).map((i: any) => (
        <li key={i.label}><span className={`tick ${i.done ? "y" : ""}`}>{i.done ? "✓" : ""}</span><span>{i.label}{!i.done && i.note ? <span className="muted"> · {i.note}</span> : null}</span></li>))}</ul>
    </div>
  );
};

export const CashUI: FC<P> = ({ result }) => {
  const d = parse(result);
  if (!d) return <Working label="Working out cash and runway" />;
  const max = Math.max(...(d.burn?.net ?? [1]));
  return (
    <div className="panel">
      <div className="kpis">
        <div className="kpi"><small>Group cash</small><b>{gbp(d.cash.total)}</b></div>
        <div className="kpi"><small>Treasury</small><b>{gbp(d.cash.treasury)}</b></div>
        <div className="kpi"><small>Net burn</small><b>{gbp(d.runway.burn)}/mo</b></div>
        <div className="kpi"><small>Runway</small><b>{d.runway.months} mo</b></div>
      </div>
      <div className="bars">{d.burn.net.map((n: number, i: number) => (
        <div key={i} className="bar" style={{ height: `${Math.round((100 * n) / max)}%` }}><em>{gbp(n / 1000)}k</em><span>{d.burn.months[i].slice(5)}</span></div>))}</div>
    </div>
  );
};

export const QueryUI: FC<P> = ({ args, result }) => {
  const d = parse(result);
  if (!d) return <Working label={`Reading ${args?.name?.replaceAll("_", " ") ?? "the books"}`} />;
  if (args?.name === "runway_what_if" && d.after) {
    return <div className="panel whatif"><div className="label">What if</div>
      <div className="kpis"><div className="kpi"><small>Runway now</small><b>{d.before.months} mo</b></div><div className="kpi"><small>After</small><b>{d.after.months} mo</b></div>
        <div className="kpi"><small>Burn after</small><b>{gbp(d.after.burn)}/mo</b></div><div className="kpi"><small>Cash lasts to</small><b>{d.after.zero_date}</b></div></div></div>;
  }
  if (args?.name === "spend_by_category" && d.spend) {
    const rows = Object.entries(d.spend as Record<string, number>);
    const max = Math.max(...rows.map(([, v]) => v));
    return <div className="panel"><div className="label">Spend by category · {args.args?.month ?? ""}</div>
      <ul className="hbars">{rows.map(([k, v]) => <li key={k}><span>{k}</span><i style={{ width: `${(100 * v) / max}%` }} /><b>{gbp(v)}</b></li>)}</ul></div>;
  }
  return <div className="chipline">Read {args?.name?.replaceAll("_", " ")}</div>;
};

export const BoardUI: FC<P> = ({ result }) => {
  const d = parse(result);
  if (!d) return <Working label="Drafting the board pack" />;
  return (
    <div className="panel">
      <div className="label">{d.period} board pack · draft</div>
      <div className="kpis">{(d.kpis ?? []).map(([k, v]: [string, string]) => <div className="kpi" key={k}><small>{k}</small><b>{v}</b></div>)}</div>
      <p>{d.narrative}</p>
      <table><tbody>{(d.variance ?? []).map((v: any) => <tr key={v.category}><td>{v.category}</td><td className="n">{gbp(v.aug)}</td><td className="n">{gbp(v.sep)}</td><td className="n">{v.change > 0 ? "+" : ""}{gbp(v.change)}</td></tr>)}</tbody></table>
    </div>
  );
};

const TaskUI: FC<P> = ({ args, result }) => (
  <div className="chipline">{result ? "Subagent finished" : "Delegated to"} <b>{args?.subagent_type ?? args?.name ?? "subagent"}</b>{args?.description ? ` · ${String(args.description).slice(0, 90)}` : ""}</div>
);

const TodosUI: FC<P> = ({ args }) => (
  <div className="panel todos"><div className="label">Plan</div>
    <ul className="cl">{(args?.todos ?? []).map((t: any, i: number) => <li key={i}><span className={`tick ${t.status === "completed" ? "y" : ""}`}>{t.status === "completed" ? "✓" : t.status === "in_progress" ? "·" : ""}</span><span>{t.content}</span></li>)}</ul></div>
);

export const ToolFallback: FC<P> = ({ toolName, result }) => (
  <div className="chipline">{result ? "Used" : "Using"} <b>{toolName.replaceAll("_", " ")}</b></div>
);

export const ArtifactUI: FC<P> = ({ args }) => {
  const spec = args as Spec;
  const ok = !!spec?.title && Array.isArray(spec?.blocks);
  const key = JSON.stringify(spec ?? {});
  useEffect(() => { if (ok) window.dispatchEvent(new CustomEvent("clearday:artifact", { detail: spec })); }, [ok, key]); // eslint-disable-line
  if (!ok) return <Working label="Building the artifact" />;
  return <div className="artifact-inline"><ArtifactDoc spec={spec} /><button className="link" onClick={() => openStandalone(spec)}>Open as page</button></div>;
};

export const TOOL_UIS: Record<string, FC<any>> = {
  show_artifact: ArtifactUI,
  sweep_books: SweepUI,
  execute_action: ExecuteUI,
  close_checklist: CloseUI,
  cash_view: CashUI,
  query_books: QueryUI,
  board_pack: BoardUI,
  task: TaskUI,
  write_todos: TodosUI,
};

export function useTodos() {
  return useLangChainState<any[]>("todos");
}
