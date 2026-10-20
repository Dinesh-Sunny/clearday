"use client";

// "Today" - the Hark-style Home. Loads instantly from the policy service (no model call), so the founder sees the
// ranked Action Cards the second the page opens. Every button hands the card to the Deep Agent, which carries it out
// through the guard and the human-in-the-loop approval.
import { useEffect, useState } from "react";
import { ActionCard } from "./tool-uis";

const gbp = (n: number) => "£" + Math.round(n).toLocaleString("en-GB");

export function Today() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    fetch("/policy/api/home").then((r) => r.json()).then(setD).catch(() => setErr(true));
  }, []);
  useEffect(() => {
    if (!d) return;
    const t = setInterval(() => setShown((s) => (s >= d.steps.length ? (clearInterval(t), s) : s + 1)), 160);
    return () => clearInterval(t);
  }, [d]);

  useEffect(() => {
    if (shown >= (d?.steps?.length ?? 99)) requestAnimationFrame(() => document.querySelector(".viewport")?.scrollTo({ top: 0 }));
  }, [shown, d]);

  if (err) return <p className="muted sm">Start the policy service: <code>python3 app/server.py</code></p>;
  if (!d) return <div className="working"><span className="spin" />Reading Northstar Labs&apos; Seapoint books…</div>;

  const cards: any[] = d.cards;
  const decide = cards.filter((c) => c.needs_approval);
  const held = cards.filter((c) => ["hold_bill", "void_bill"].includes(c.action.type)).reduce((s, c) => s + c.at_stake, 0);
  const ready = shown >= d.steps.length;

  return (
    <section className="today">
      <ol className="steps">
        {d.steps.map((s: any, i: number) => (
          <li key={s.label} className={i < shown ? "done" : ""}>{s.label} <b>{s.found}</b></li>
        ))}
      </ol>
      <div className="kpis strip">
        <div className="kpi glass"><small>Group cash · UK + IE</small><b>{gbp(d.runway.cash)}</b></div>
        <div className="kpi glass"><small>Runway</small><b>{d.runway.months} months</b></div>
        <div className="kpi glass"><small>Net burn</small><b>{gbp(d.runway.burn)}/mo</b></div>
        <div className="kpi glass"><small>Held before payment</small><b>{gbp(held)}</b></div>
      </div>
      {ready ? (
        <>
          <div className="row-head"><h2 className="title">{decide.length} decisions for you</h2><span className="muted sm">Ranked by money at stake, deadline and risk · synced {d.company.synced_at}</span></div>
          <div className="cards grid2">{cards.slice(0, 6).map((c) => <ActionCard key={c.id} c={c} />)}</div>
          {cards.length > 6 ? <p className="muted sm">+ {cards.length - 6} more. Ask “show me everything” to see them all.</p> : null}
        </>
      ) : null}
    </section>
  );
}
