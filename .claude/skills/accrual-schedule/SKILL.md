---
name: accrual-schedule
description: Build the period-end accrual schedule and the recurring month-end journals from Seapoint and ledger data. Covers costs incurred in the period with no bill yet, found from payments soon after period end, recurring suppliers missing this month, accrued-but-uncharged fees, contract figures from the accountant, and the releases of deferred income, prepayments and depreciation. Drafts journals with the ledger's account codes. Drafts only.
---

# Accrual schedule

An accrual is a cost that belongs to the period but has **no bill in the ledger yet**. A bill already in the ledger (paid or unpaid) needs no accrual.

## Sources and rules, applied in this order

| # | Source | Rule |
|---|---|---|
| 1 | **Bill in the ledger for the period's service** | No accrual. It's already in payables. Judge by the service period, not the bill date: a bill dated this month for last month's usage does not cover this month |
| 2 | **Bill dated after period end for period work**, in the ledger or only in Seapoint | When the bill states a service period in this period, accrue that period's share and cite the bill. When it doesn't, follow preference P4 (`close-preferences`) |
| 3 | **Payments after period end with no bill**, within the P3 window, from Seapoint `query_transactions` | Follow preference P3. A document attached to the payment that states the service period settles it either way. Never accrue when the payment settles a liability already in the ledger (pension, PAYE, VAT payable) |
| 4 | **Recurring suppliers missing this period**: a bill (or, with no bills, a payment) for each of the previous 3 months' service, and none for this period's service. Judge by the bill's date or service period, not the payment date: last month's bill paid this month does not cover this month | If the amount is the same every month, accrue it. If it varies, it is an estimate: make it a decision for the accountant (options: 3-month average, last month, nil if no work), and ask the client whether the work happened |
| 5 | **Treasury or bank fees accrued but charged next month**, from Seapoint `query_treasury_returns` fee accrued for the period | Accrue the exact accrued amount |
| 6 | **Policy items with no data** (audit fee, employer NI and pension, utilities with no supplier) | Use the accountant's contract figure if given. If the ledger charges a regular amount for it each month, it's covered by rule 4. If the ledger shows no sign of the cost at all, follow preference P7: list it under decisions as "needs accountant input". Never invent a figure |

**Accrue each supplier's period cost once.**
- A payment **dated in the period** that is in Seapoint but not yet in the ledger (awaiting approval, sync pending or failed) is not an accrual: fixing the push brings the cost into the period. Don't accrue it as well. A payment dated after period end for period work still needs the accrual (rules 2 and 3).
- When a supplier has both a bill and payments that could cover the period, use the bill, and treat the payments as settling it.
- Accrue a payment-based amount only for a separate service that the bill does not cover. Cite the evidence, and flag it.
- Accrue **net of VAT**. The VAT is reclaimed when the bill arrives.

## Schedule

| item | supplier | basis (rule #) | period share £ | already in ledger £ | accrue £ | support (tool + ids) | confidence |
|---|---|---|---|---|---|---|---|

## Draft journals

Use the ledger's chart: the expense account from the supplier's usual coding, and the accruals liability account. Look the accruals account up by name or type in the chart; never assume a code. Use no VAT on the accrual line.

```
Dr <expense account> £X
 Cr <accruals account> £X
Memo: <item> — <period> accrual (<rule #>); reverses 1st of next month
```

## Recurring month-end journals

Some journals post every month and are not accruals: the release of deferred income on annual contracts, the release of prepayments, depreciation, and foreign-currency revaluation where the ledger needs a run. Deferring an invoice raised early for next period (`sales-readiness`) goes here too, as a reversing journal. When `ledger-checks` finds a routine journal not posted, draft it here.

- Size it from the ledger: the prior months' journals (or, when journals are not visible, their effect on the monthly P&L, e.g. sales less invoiced), or the balance it releases on the schedule already used (e.g. income in advance ÷ months left). Where it needs a policy the ledger shows no precedent for (e.g. the first-month rule for the first new asset; a release basis when no prepayment has been released before), make it a decision for the accountant with the options and their £ effect; don't draft it.
- A cost paid this period that covers future periods (an annual policy or licence) is a new prepayment: keep only this period's share in the P&L.
- Give the basis and confidence for each, as for accruals. Say for each whether it reverses: accruals and accrued income (e.g. interest earned, paid next month) reverse on the 1st of next month; depreciation and prepayment releases don't. Contracts, policy schedules and the fixed asset register are usually not visible: say so.

| id | journal | basis | £ | confidence |
|---|---|---|---|---|

These do not reverse, except the deferral of an invoice raised early.

Never post. These go in the close package for the accountant to review.
