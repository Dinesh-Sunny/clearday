"""Clearday core: the books, eight finance sweeps, the policy guard, execution, the outbox and the audit log.

Data = a snapshot of the Seapoint sandbox (app/data/sandbox.json, pulled through the Seapoint MCP).
Rules that protect money live here in code, never in a prompt:
- the agent never moves money or changes Seapoint without a human Approve
- an approver can only approve up to their own limit; above it, the card routes to a second approver
- duplicate bills, bills whose VAT doesn't add up, and bills whose supplier details don't match are held out of every run
- a run can never take operating cash below the company's cash buffer
- approved Seapoint changes go to an outbox; the Seapoint MCP write tools apply them (`/seapoint-apply`), one batch per approval
"""
import copy, json, math, os, threading, time, uuid
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
SANDBOX = os.path.join(HERE, "..", "data", "sandbox.json")
OUTBOX = os.path.join(HERE, "..", "data", "outbox.json")
FX = {"GBP": 1.0, "EUR": 0.842524, "USD": 0.75}


class Books:
    def __init__(self, path=SANDBOX):
        self.original = json.load(open(path))
        self.lock = threading.Lock()
        self.reset()

    def reset(self):
        self.d = copy.deepcopy(self.original)
        self.audit, self.snoozed, self.done_cards, self.pending, self.outbox = [], {}, set(), {}, []
        self.today = date.fromisoformat(self.d["company"]["today"])
        self.log("agent", "Synced from Seapoint", f"{len(self.d['accounts'])} accounts, {len(self.d['bills'])} unpaid bills, "
                 f"{len(self.d['review'])} payments to review, 2 organisations (UK, IE)")

    def bill(self, bid):
        return next(x for x in self.d["bills"] if x["id"] == bid)

    def person(self, pid):
        return next(x for x in self.d["people"] if x["id"] == pid)

    def log(self, actor, what, detail, approver=None, card=None, money=0):
        e = {"id": "ev_" + uuid.uuid4().hex[:8], "at": time.strftime("%H:%M:%S"), "actor": actor, "approver": approver,
             "what": what, "detail": detail, "card": card, "money": round(money, 2)}
        self.audit.insert(0, e)
        return e


def gbp(amount, cur):
    return amount * FX.get(cur, 1.0)


def money(v):
    return f"£{v:,.0f}"


# ---------- metrics ----------

def cash(b):
    by = {"operating": 0.0, "treasury": 0.0, "uk": 0.0, "ie": 0.0}
    for a in b.d["accounts"]:
        v = gbp(a["balance"], a["currency"])
        by["treasury" if a["type"] == "INVESTMENT" else "operating"] += v
        by["uk" if a["entity"] == b.d["entities"][0]["id"] else "ie"] += v
    by["total"] = by["operating"] + by["treasury"]
    return {k: round(v) for k, v in by.items()}


def burn(b, months=("2026-07", "2026-08", "2026-09")):
    nets = []
    for m in months:
        net = 0.0
        for ent in b.d["entities"]:
            row = b.d["monthly"][ent["id"]][m]
            net += (row["out"] - row["in"]) * ent["fx_to_gbp"]
        nets.append(round(net))
    return {"months": list(months), "net": nets, "burn": round(sum(nets) / len(nets))}


def runway(b, extra_monthly=0.0, one_off=0.0):
    c, bu = cash(b)["total"] - one_off, burn(b)["burn"] + extra_monthly
    return {"cash": round(c), "burn": round(bu), "months": round(c / bu, 1) if bu > 0 else None,
            "zero_date": (b.today + timedelta(days=int(30.4 * c / bu))).strftime("%b %Y") if bu > 0 else None}


def variance(b):
    a, s = b.d["spend_by_category"]["2026-08"], b.d["spend_by_category"]["2026-09"]
    rows = []
    for k in sorted(set(a) | set(s), key=lambda k: -abs(s.get(k, 0) - a.get(k, 0))):
        d = s.get(k, 0) - a.get(k, 0)
        if abs(d) >= 1500:
            rows.append({"category": k, "aug": round(a.get(k, 0)), "sep": round(s.get(k, 0)), "change": round(d),
                         "pct": round(100 * d / a[k]) if a.get(k) else None,
                         "count": (b.d["spend_counts"]["2026-08"].get(k), b.d["spend_counts"]["2026-09"].get(k))})
    return rows


def why(r):
    n0, n1 = r["count"]
    if r["category"] == "Payroll & Benefits":
        return "October payroll was paid early, on 18 Sep"
    if n0 and n1 and n1 > n0:
        return f"{n1} payments vs {n0} in August"
    return "new this month" if not r["aug"] else ""


# ---------- Action Cards ----------

def card(area, verb, title, reason, at_stake, deadline_days, risk, evidence, plan, action, needs_approval=True, seapoint=None):
    return {"id": f"{area}:{action['type']}:{action.get('key', '')}", "area": area, "verb": verb, "title": title, "reason": reason,
            "at_stake": round(at_stake), "deadline_days": deadline_days, "risk": risk, "evidence": evidence, "plan": plan,
            "action": action, "needs_approval": needs_approval, "seapoint": seapoint}


def bill_checks(b):
    """Classify every unpaid bill once: duplicate, VAT problem, supplier mismatch, already paid, reimbursement, ok."""
    seen, out = {}, {}
    for x in sorted(b.d["bills"], key=lambda x: (x["source"] != "EMAIL_SCAN", x["id"])):
        if x["status"] != "approved":
            continue
        key = (x["vendor"], x["ref"], x["amount"])
        if key in seen:
            out[x["id"]] = ("duplicate", seen[key])
            continue
        seen[key] = x["id"]
        maybe = [t for t in b.d["review"] if abs(t["amount"] - x["amount"]) < 0.01 and t["vendor"].split()[0].lower() in x["vendor"].lower()
                 and not x.get("paid_by_txn")]
        if x.get("paid_by_txn"):
            out[x["id"]] = ("paid", x["paid_by_txn"])
        elif maybe:
            out[x["id"]] = ("maybe_paid", maybe[0]["id"])
        elif x["vat_rate"] and abs(x["net"] * x["vat_rate"] / 100 - x["vat"]) > 1:
            out[x["id"]] = ("vat", round(x["net"] * x["vat_rate"] / 100, 2))
        elif x.get("vat_number") and x["vendor_country"] == "GB" and not x["vat_number"].startswith("GB"):
            out[x["id"]] = ("supplier", x["vat_number"][:2])
        elif x.get("reimburse_to"):
            out[x["id"]] = ("reimburse", x["reimburse_to"])
        else:
            out[x["id"]] = ("ok", None)
    return out


def days_to(d, b):
    return (date.fromisoformat(d) - b.today).days


def sweep_payables(b):
    chk, cards = bill_checks(b), []
    horizon = b.today + timedelta(days=7)
    run = [x for x in b.d["bills"] if chk.get(x["id"], ("",))[0] == "ok" and date.fromisoformat(x["due"]) <= horizon]
    if run:
        total = sum(gbp(x["amount"], x["currency"]) for x in run)
        overdue = [x for x in run if date.fromisoformat(x["due"]) < b.today]
        ev = [f"{x['vendor']} · {x['ref']} · {x['currency']} {x['amount']:,.2f} · due {x['due']}{' · overdue' if x in overdue else ''}"
              for x in sorted(run, key=lambda x: x["due"])]
        held = [(b.bill(i), r) for i, r in chk.items() if r[0] in ("duplicate", "vat", "supplier", "maybe_paid")]
        names = {"duplicate": "duplicate", "vat": "VAT does not add up", "supplier": "supplier details mismatch", "maybe_paid": "may already be paid"}
        ev += [f"Held: {x['vendor']} {x['ref']} - {names[r[0]]}" for x, r in held]
        cards.append(card("ap", "Approve run", f"Pay {len(run)} bills - {money(total)} ({len(overdue)} already overdue)",
                          f"Everything due by {horizon:%d %b}. I held {len(held)} bills that aren't safe to pay.", total,
                          -1 if overdue else 3, "high" if overdue else "medium", ev,
                          ["Create one payment per bill from HSBC Business Current", "Overdue ones go today, the rest on their due date",
                           "Match each payment to its bill so the books stay clean"],
                          {"type": "pay_run", "key": "week", "bills": [x["id"] for x in run]}))
    for bid, (kind, ref) in chk.items():
        x = b.bill(bid)
        if kind == "duplicate":
            other = b.bill(ref)
            drafted = [p for p in b.d["payments"] if p["invoice_id"] in (bid, ref)]
            src = lambda s: s.lower().replace("_", " ")
            cards.append(card("ap", "Remove duplicate", f"{x['vendor']} sent {x['ref']} twice - don't pay {money(gbp(x['amount'], x['currency']))} again",
                              f"Same supplier, reference and amount, arrived by {src(other['source'])} and {src(x['source'])}."
                              + (" A payment is already drafted for one copy." if drafted else ""),
                              gbp(x["amount"], x["currency"]), days_to(x["due"], b), "high",
                              [f"Copy 1: …{other['id'][-6:]} · {other['source']} · kept", f"Copy 2: …{x['id'][-6:]} · {x['source']} · duplicate"]
                              + [f"Drafted payment …{p['id'][-6:]} · £{p['amount']:,.0f} · account ending {p.get('account_last_four', '-')}" for p in drafted],
                              ["Keep copy 1" + (" (it has the drafted payment)" if drafted else ""), "Mark copy 2 as a duplicate so it never enters a run"],
                              {"type": "void_bill", "key": bid, "bill": bid}))
        elif kind == "vat":
            cards.append(card("ap", "Query supplier", f"{x['vendor']}'s VAT doesn't add up - hold {money(x['amount'])}",
                              f"Net £{x['net']:,.2f} at {x['vat_rate']}% should carry £{ref:,.2f} VAT. The bill shows £{x['vat']:,.2f}.",
                              x["amount"], days_to(x["due"], b), "high",
                              [f"{x['ref']} · total £{x['amount']:,.2f} = net £{x['net']:,.2f} + VAT £{x['vat']:,.2f}", f"Expected VAT £{ref:,.2f}",
                               "A wrong VAT invoice means a wrong VAT return"],
                              ["Hold it out of the payment run", "Draft an email asking for a corrected invoice"], {"type": "hold_bill", "key": bid, "bill": bid}))
        elif kind == "supplier":
            cards.append(card("ap", "Check supplier", f"{x['vendor']}: a {ref} VAT number on a 'GB' supplier",
                              f"Supplier country says GB but the VAT number starts {ref}. Reverse charge may apply - confirm details before paying.",
                              gbp(x["amount"], x["currency"]), days_to(x["due"], b), "medium",
                              [f"{x['ref']} · {x['currency']} {x['amount']:,.2f} · VAT {x['vat_number']} · country {x['vendor_country']}"],
                              ["Confirm the supplier's details on a number you already have", "Code it as EU reverse charge if it is a Dutch company"],
                              {"type": "hold_bill", "key": bid, "bill": bid}))
        elif kind == "paid":
            cards.append(card("recon", "Match", f"{x['vendor']} {x['ref']} is already paid - match it",
                              f"A £{x['amount']:,.0f} payment with the same reference left HSBC on 23 Sep. The bill still shows unpaid.",
                              x["amount"], 0, "low", [f"Bill {x['ref']} · £{x['amount']:,.0f} · due {x['due']}", f"Bank: …{ref[-6:]} · MERIDIAN INSURANCE BROKERS · 23 Sep"],
                              ["Attach the bill to the bank payment as its receipt", "Take it off the unpaid list"],
                              {"type": "match", "key": bid, "bill": bid, "txn": ref}, needs_approval=False))
        elif kind == "maybe_paid":
            t = next(t for t in b.d["review"] if t["id"] == ref)
            cards.append(card("ap", "Check first", f"{x['vendor']} may already be paid - hold £{x['amount']:,.0f}",
                              f"£{t['amount']:,.0f} already went to {t['vendor']} on {t['date']} (ref {t.get('ref', '-')}). Paying {x['ref']} too could pay twice.",
                              x["amount"], days_to(x["due"], b), "high",
                              [f"Bill {x['ref']} · £{x['amount']:,.2f} · due {x['due']}", f"Bank {t['date']} · {t['desc']} · ref {t.get('ref', '-')} · £{t['amount']:,.2f}"],
                              ["Hold the bill out of the run", "Ask Connolly which month the payment covered"], {"type": "hold_bill", "key": bid, "bill": bid}))
        elif kind == "reimburse":
            cards.append(card("ap", "Reimburse", f"Pay back {ref} £{x['amount']:,.0f} for {x['vendor']}",
                              x.get("note", "Out-of-pocket expense."), x["amount"], days_to(x["due"], b), "low",
                              [f"{x['ref']} · receipt on file · submitted by {ref}"], [f"Add £{x['amount']:,.0f} to {ref.split()[0]}'s next payout"],
                              {"type": "reimburse", "key": bid, "bill": bid}))
    for p in b.d["payments"]:
        if p["status"] == "created" and p.get("scheduled_date") and date.fromisoformat(p["scheduled_date"]) < b.today:
            late = (b.today - date.fromisoformat(p["scheduled_date"])).days
            cards.append(card("ap", "Send now", f"{p['payee']} rent of £{p['amount']:,.0f} was due {late} days ago and never sent",
                              f"The payment was drafted for {p['scheduled_date']} but is still waiting for approval.", p["amount"], -late, "high",
                              [f"Payment …{p['id'][-6:]} · {p['reference']} · from {p['paying_account']} · waiting for approval"],
                              ["Approve the drafted payment for today"], {"type": "send_payment", "key": p["id"], "payment": p["id"]}))
    return cards


def sweep_bookkeeping(b):
    done = set(b.d.get("approved_txns", []))
    ready = [t for t in b.d["review"] if t["id"] not in done and t.get("code") and (t["evidence"] or t.get("no_receipt_needed"))]
    receipts = [t for t in b.d["review"] if not t["evidence"] and t.get("holder")]
    fee = [t for t in b.d["review"] if t["vendor"].startswith("Unknown")]
    cards = []
    if ready:
        cards.append(card("recon", "Approve", f"Approve {len(ready)} payments that are coded and evidenced",
                          "Account code, VAT rate and receipt all line up with Seapoint's suggestion.", sum(t["amount"] for t in ready), 6, "low",
                          [f"{t['date']} · {t['vendor']} · £{t['amount']:,.2f} · {t['code']} · {t['tax']}" for t in ready],
                          ["Approve them in Seapoint bookkeeping", "They sync to Xero once it is connected"],
                          {"type": "approve_recon", "key": "batch", "txns": [t["id"] for t in ready]},
                          seapoint={"tool": "approve_reconciliation", "args": {"transaction_ids": [t["id"] for t in ready]}}))
    if receipts:
        cards.append(card("recon", "Ask for receipts", f"Ask {len({t['holder'] for t in receipts})} people for {len(receipts)} missing card receipts",
                          "Card payments can't close without a receipt.", sum(t["amount"] for t in receipts), 6, "low",
                          [f"{t['holder']} · {t['card']} · {t['vendor']} · £{t['amount']:,.2f} · {t['date']}" for t in receipts],
                          ["Draft one short message per person with their list", "Re-check in 2 days"],
                          {"type": "nudge", "key": "receipts", "people": sorted({t["holder"] for t in receipts})}, needs_approval=False))
    if fee:
        cards.append(card("recon", "Rename vendor", "Name the 'Unknown Management Fee Vendor' as Seapoint Treasury fees",
                          "These are Seapoint's monthly treasury fees. Naming the vendor files every future fee correctly.",
                          sum(t["amount"] for t in fee), 6, "low", [f"{t['date']} · {t['desc']} · £{t['amount']:,.2f}" for t in fee],
                          ["Rename the vendor in Seapoint", "Keep category Bank Fees"],
                          {"type": "rename_vendor", "key": fee[0]["vendor_id"], "vendor": fee[0]["vendor_id"]},
                          seapoint={"tool": "update_vendor", "args": {"vendor_id": fee[0]["vendor_id"], "name": "Seapoint Treasury fees",
                                                                     "description": "Seapoint treasury management fee, charged monthly"}}))
    return cards


def sweep_cash(b):
    r, c, bu = runway(b), cash(b), burn(b)
    keep = b.d["company"]["cash_buffer"] + 3 * bu["burn"]
    move = int(max(c["operating"] - keep, 0) // 50000 * 50000)
    cards = [card("cash", "See forecast", f"Runway is {r['months']} months - cash lasts to {r['zero_date']}",
                  f"Net burn {money(r['burn'])} a month (Jul-Sep average, UK + IE).", r["burn"], 30, "low" if r["months"] > 15 else "medium",
                  [f"Cash {money(c['total'])} = operating {money(c['operating'])} + treasury {money(c['treasury'])}",
                   f"Net burn {', '.join(bu['months'])}: {', '.join(money(n) for n in bu['net'])}"],
                  ["Open the runway view", "Try a what-if (hire, raise, cut)"], {"type": "open", "key": "cash", "view": "cash"}, needs_approval=False)]
    if move:
        y = next(a for a in b.d["accounts"] if a["type"] == "INVESTMENT")["net_yield_pct"]
        cards.append(card("cash", "Move to treasury", f"{money(move)} is sitting idle - earn about {money(move * y / 100)} a year",
                          f"Operating cash is {money(c['operating'])}. Keeping the buffer plus 3 months of burn still leaves this spare.", move, 14, "low",
                          [f"Treasury net yield {y}% (fund's 7-day estimate after Seapoint's fee, not a promise)", f"Kept back: {money(keep)}"],
                          [f"Transfer {money(move)} from Northstar Modulr GBP to Treasury"], {"type": "treasury", "key": "move", "amount": move}))
    return cards


def sweep_variance(b):
    top = [r for r in variance(b) if r["change"] > 0][:4]
    if not top:
        return []
    return [card("board", "Explain", f"September spend up {money(sum(r['change'] for r in top))} - {top[0]['category']} leads",
                 "The movements a board will ask about, with the reason from supplier-level activity.", sum(r["change"] for r in top), 14, "medium",
                 [f"{r['category']}: {money(r['aug'])} -> {money(r['sep'])} ({'+' + str(r['pct']) + '%' if r['pct'] is not None else 'new'}) · {why(r)}" for r in top],
                 ["Add this commentary to the board pack"], {"type": "open", "key": "variance", "view": "board"}, needs_approval=False)]


def sweep_payroll(b):
    cards = []
    for p in b.d["payroll"]:
        start, paid = date.fromisoformat(p["period"][:10]), date.fromisoformat(p["pay_date"])
        if paid < start and not any(j.get("key") == p["id"] for j in b.d.get("journals", [])):
            cards.append(card("close", "Draft prepayment", f"{p['name']} was paid on {paid:%d %b}, before its period started",
                              f"£{p['net']:,.0f} left in September for October work, so September looks £{p['net']:,.0f} heavier than it is.",
                              p["net"], 6, "medium", [f"{p['name']} · period {p['period']} · paid {p['pay_date']} · approved by {p.get('approved_by', '-')}",
                                                      "Explains most of September's payroll jump"],
                              ["Draft a prepayment journal at 30 Sep", "Release it on 31 Oct"],
                              {"type": "journal", "key": p["id"], "kind": "prepayment", "amount": p["net"]}, needs_approval=False))
    return cards


def sweep_entities(b):
    c, ie = cash(b), b.d["entities"][1]
    ie_net = [round(b.d["monthly"][ie["id"]][m]["out"] - b.d["monthly"][ie["id"]][m]["in"]) for m in ("2026-07", "2026-08", "2026-09")]
    eur = [x for x in b.d["bills"] if x["currency"] == "EUR"]
    return [card("entity", "View group", f"Group cash {money(c['total'])}: UK {money(c['uk'])} + IE {money(c['ie'])}",
                 f"Two Seapoint organisations consolidated at today's rate (EUR 1 = £{ie['fx_to_gbp']:.4f}).", c["ie"], 30, "low",
                 [f"IE net burn Jul-Sep: " + ", ".join(f"€{n:,}" for n in ie_net),
                  f"{len(eur)} EUR bills in the UK org: " + ", ".join(f"{x['vendor']} €{x['amount']:,.0f}" for x in eur),
                  "Pay EUR bills from Northstar Modulr EUR to avoid FX fees"],
                 ["Open the group view"], {"type": "open", "key": "group", "view": "cash"}, needs_approval=False)]


def close_checklist(b):
    chk = bill_checks(b)
    left = [t for t in b.d["review"] if t["id"] not in b.d.get("approved_txns", [])]
    probs = [i for i, r in chk.items() if r[0] in ("duplicate", "vat", "supplier", "maybe_paid")]
    kinds = {j["kind"] for j in b.d.get("journals", [])}
    pack = any(e["what"] == "Board pack drafted" for e in b.audit)
    items = [
        ("Bank and treasury feeds fresh (6 accounts, 2 orgs)", True, f"synced {b.d['company']['synced_at']}"),
        ("Bookkeeping review cleared", not left, f"{len(left)} payments left"),
        ("Bills checked: duplicates, VAT, suppliers", not probs, f"{len(probs)} problems"),
        ("Cut-off: September work invoiced in October", "accrual" in kinds, "Halberd Security accrual"),
        ("Payroll timing", "prepayment" in kinds, "October payroll paid 18 Sep"),
        ("Employee reimbursements", all(x["status"] != "approved" for x in b.d["bills"] if x.get("reimburse_to")), "Isla £135"),
        ("Variance commentary written", pack, "September vs August"),
        ("Close pack ready for the accountant", pack, ""),
    ]
    return {"month": "September 2026", "items": [{"label": l, "done": d, "note": n} for l, d, n in items]}


def sweep_close(b):
    cl = close_checklist(b)
    done = sum(i["done"] for i in cl["items"])
    cards = [card("close", "Open close", f"September close: {done} of {len(cl['items'])} ready",
                  "Following Seapoint's month-end playbook: drafts only, your accountant posts.", 0, 6, "low",
                  [f"{'Done' if i['done'] else 'To do'} · {i['label']}{' · ' + i['note'] if not i['done'] and i['note'] else ''}" for i in cl["items"]],
                  ["Open the close checklist"], {"type": "open", "key": "close", "view": "close"}, needs_approval=False)]
    for x in b.d["bills"]:
        if "September" in x.get("note", "") and not any(j.get("bill") == x["id"] for j in b.d.get("journals", [])):
            cards.append(card("close", "Draft accrual", f"Accrue {x['vendor']} £{x['net']:,.0f} into September",
                              "The work was done in September but invoiced on 6 Oct, so September's costs are understated.", x["net"], 6, "low",
                              [f"{x['ref']} · net £{x['net']:,.2f} · {x['note']}"], ["Draft a reversing accrual dated 30 Sep (net of VAT)"],
                              {"type": "journal", "key": x["id"], "kind": "accrual", "amount": x["net"], "bill": x["id"]}, needs_approval=False))
    return cards


def sweep_board(b):
    return [card("board", "Draft pack", "Draft the September board pack",
                 "Cash, runway, burn, variance and a plain-English narrative, ready to edit.", 0, 14, "low",
                 ["Pulls figures from both Seapoint organisations", "Writes the narrative from the numbers only"],
                 ["Build the pack", "You edit and export"], {"type": "board_pack", "key": "sep"}, needs_approval=False)]


SWEEPS = [("Checking unpaid bills and drafted payments", sweep_payables), ("Reviewing bookkeeping and receipts", sweep_bookkeeping),
          ("Working out cash, runway and idle cash", sweep_cash), ("Explaining September's spend", sweep_variance),
          ("Checking payroll timing", sweep_payroll), ("Consolidating UK and IE", sweep_entities),
          ("Preparing the September close", sweep_close), ("Preparing the board pack", sweep_board)]
RISK_W = {"high": 3, "medium": 1.5, "low": 0}


def rank(c):
    urgency = 3 if c["deadline_days"] <= 0 else (2 if c["deadline_days"] <= 3 else (1 if c["deadline_days"] <= 7 else 0))
    info = -2.5 if c["action"]["type"] in ("open", "board_pack") else 0
    return math.log10(max(c["at_stake"], 1)) + urgency + RISK_W[c["risk"]] + info


def sweep(b):
    with b.lock:
        steps, cards = [], []
        for label, fn in SWEEPS:
            got = [c for c in fn(b) if c["id"] not in b.done_cards and c["id"] not in b.snoozed]
            cards += got
            steps.append({"label": label, "found": len(got)})
        for c in cards:
            c["score"] = round(rank(c), 2)
            c["waiting_for"] = b.pending.get(c["id"])
        cards.sort(key=lambda c: -c["score"])
        return {"steps": steps, "cards": cards, "outbox": b.outbox}


# ---------- guard + execute ----------

MONEY_MOVES = ("pay_run", "send_payment", "treasury", "reimburse")


def guard(b, c, approver_id):
    p, a, checks = b.person(approver_id), c["action"], []
    if a["type"] in MONEY_MOVES:
        if a["type"] == "pay_run":
            bills = [b.bill(i) for i in a["bills"]]
            total = sum(gbp(x["amount"], x["currency"]) for x in bills)
            chk = bill_checks(b)
            bad = [x["ref"] for x in bills if chk.get(x["id"], ("ok",))[0] not in ("ok",)]
            checks.append({"rule": "No duplicate, VAT or supplier problems in the run", "ok": not bad, "detail": ", ".join(bad) or "all clear"})
            checks.append({"rule": "Every bill still unpaid (no double payment)", "ok": all(x["status"] == "approved" for x in bills), "detail": f"{len(bills)} bills"})
        elif a["type"] == "send_payment":
            total = next(x for x in b.d["payments"] if x["id"] == a["payment"])["amount"]
        elif a["type"] == "reimburse":
            total = b.bill(a["bill"])["amount"]
        else:
            total = a["amount"]
        checks.insert(0, {"rule": f"Within {p['name'].split()[0]}'s approval limit ({money(p['approval_limit'])})",
                          "ok": total <= p["approval_limit"], "detail": money(total)})
        if a["type"] != "treasury":
            after = cash(b)["operating"] - total
            checks.append({"rule": f"Operating cash stays above the buffer ({money(b.d['company']['cash_buffer'])})",
                           "ok": after >= b.d["company"]["cash_buffer"], "detail": f"{money(after)} after"})
        if not checks[0]["ok"] and all(ch["ok"] for ch in checks[1:]):
            other = max((x for x in b.d["people"] if x["id"] != approver_id), key=lambda x: x["approval_limit"])
            if other["approval_limit"] >= total:
                return False, checks, other["id"]
    elif c.get("seapoint"):
        checks.append({"rule": "You see the exact Seapoint change before it is applied", "ok": True, "detail": c["seapoint"]["tool"]})
        checks.append({"rule": "Built from structured fields, not text inside transactions", "ok": True, "detail": "prompt-injection safe"})
    else:
        checks.append({"rule": "Draft or bookkeeping only - nothing leaves the company", "ok": True, "detail": "undo available"})
    return all(ch["ok"] for ch in checks), checks, None


def execute(b, c, approver_id, payload=None):
    with b.lock:
        ok, checks, route = guard(b, c, approver_id)
        who = b.person(approver_id)["name"]
        if route:
            b.pending[c["id"]] = b.person(route)["name"]
            ev = b.log("agent", "Sent for second approval", f"{c['title']} -> {b.person(route)['name']}", approver=who, card=c["id"], money=c["at_stake"])
            return {"status": "routed", "checks": checks, "to": b.person(route)["name"], "event": ev}
        if not ok:
            ev = b.log("guard", "Blocked", "; ".join(ch["rule"] for ch in checks if not ch["ok"]), approver=who, card=c["id"])
            return {"status": "blocked", "checks": checks, "event": ev}
        a, t = c["action"], c["action"]["type"]
        if t == "pay_run":
            for i in a["bills"]:
                b.bill(i)["status"] = "scheduled"
            msg = f"Scheduled {len(a['bills'])} payments, {money(c['at_stake'])}, from HSBC Business Current"
        elif t == "send_payment":
            next(x for x in b.d["payments"] if x["id"] == a["payment"])["status"] = "scheduled"
            msg = "Rent payment approved for today"
        elif t == "void_bill":
            b.bill(a["bill"])["status"] = "duplicate"
            msg = "Marked the second copy as a duplicate - it can't enter a run"
        elif t == "hold_bill":
            b.bill(a["bill"])["status"] = "on_hold"
            msg = "Held the bill and drafted a query to the supplier"
        elif t == "match":
            b.bill(a["bill"])["status"] = "paid"
            msg = "Matched the bill to its bank payment"
        elif t == "reimburse":
            b.bill(a["bill"])["status"] = "scheduled"
            msg = "Reimbursement added to the next payout"
        elif t == "approve_recon":
            b.d.setdefault("approved_txns", []).extend(a["txns"])
            msg = f"Approved {len(a['txns'])} payments"
        elif t == "journal":
            b.d.setdefault("journals", []).append({"kind": a["kind"], "amount": a["amount"], "bill": a.get("bill"), "key": a["key"]})
            msg = f"Drafted a {a['kind']} journal of £{a['amount']:,.0f} for the accountant"
        elif t == "treasury":
            msg = f"Transfer of {money(a['amount'])} to Treasury approved"
        elif t == "nudge":
            msg = f"Receipt requests drafted for {', '.join(a['people'])}"
        elif t == "rename_vendor":
            msg = "Vendor rename approved"
        else:
            msg = "Done"
        if c.get("seapoint"):
            b.outbox.append({"card": c["id"], "title": c["title"], "approved_by": who, "at": time.strftime("%H:%M"), **c["seapoint"], "status": "ready"})
            try:
                json.dump(b.outbox, open(OUTBOX, "w"), indent=1)
            except OSError:
                pass
            msg += " - queued for Seapoint"
        b.done_cards.add(c["id"])
        b.pending.pop(c["id"], None)
        ev = b.log("agent", msg, c["title"], approver=who if c["needs_approval"] else None, card=c["id"],
                   money=c["at_stake"] if t in MONEY_MOVES else 0)
        return {"status": "done", "checks": checks, "message": msg, "event": ev}


def snooze(b, cid, reason="Not now"):
    b.snoozed[cid] = reason
    b.log("founder", "Snoozed", f"{cid} · {reason}")
