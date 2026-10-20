"use client";

// Approval card for the Deep Agents human-in-the-loop interrupt on `execute_action`.
import { useLangChainInterruptState, useLangChainRespond } from "@assistant-ui/react-langchain";
import { useEffect, useState } from "react";

const gbp = (n: number) => "£" + Math.round(n).toLocaleString("en-GB");

export function ApprovalBar() {
  const interrupt: any = useLangChainInterruptState();
  const respond = useLangChainRespond();
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<any>(null);
  const v = interrupt?.value ?? interrupt;
  const reqs: any[] = v?.actionRequests ?? v?.action_requests ?? [];
  const args = reqs[0]?.args ?? reqs[0]?.arguments ?? {};
  useEffect(() => {
    if (!args.card_id) return setCard(null);
    fetch("/policy/api/card", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ card: args.card_id }) })
      .then((r) => r.json()).then(setCard).catch(() => setCard(null));
  }, [args.card_id]);
  if (!interrupt) return null;
  const decide = async (type: "approve" | "reject") => {
    setBusy(true);
    try { await respond({ decisions: reqs.map(() => (type === "approve" ? { type } : { type, message: "Founder said not now." })) } as any); }
    finally { setBusy(false); }
  };
  const who = args.approver === "p_cfo" ? "Doruk · limit £150k" : "Dinesh · limit £25k";
  return (
    <div className="approval-card">
      <div className="ac-top"><span className="ac-badge">Needs you</span><span className="muted xs">as {who}</span></div>
      <div className="ac-title">{(card?.title ?? `Carry out ${args.card_id ?? "action"}`).split(" - ")[0]}</div>
      {card?.reason || card?.plan?.length ? (
        <details className="ac-more"><summary>{card?.reason ?? "What happens"}</summary>
          {card?.plan?.length ? <ol className="plan sm">{card.plan.map((p: string) => <li key={p}>{p}</li>)}</ol> : null}
          <p className="muted xs">The guard re-checks limits, duplicates, VAT and the cash buffer before anything runs.</p>
        </details>
      ) : null}
      <div className="ac-foot">
        {card?.at_stake ? <span className="amt">{gbp(card.at_stake)}</span> : <span />}
        <div className="arow">
          <button className="btn sm" disabled={busy} onClick={() => decide("reject")}>Not now</button>
          <button className="btn primary sm" disabled={busy} onClick={() => decide("approve")}>{busy ? "Checking…" : "Approve"}</button>
        </div>
      </div>
    </div>
  );
}
