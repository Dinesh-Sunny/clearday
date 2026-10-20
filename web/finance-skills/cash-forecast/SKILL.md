---
name: cash-forecast
description: Build a 13-week rolling cash forecast for one Seapoint customer, week by week, from Seapoint (bank and treasury balances, payment history, card spend, supplier bills) and the ledger (open sales invoices, unpaid bills, VAT and tax dates). Flags the weeks where cash falls below the client's minimum and names the moves that close each gap. Use when asked to forecast cash, whether the client can make payroll or a tax payment, or for the "coming up" part of the month summary; re-run weekly.
---

# 13-week cash forecast

A profitable company can still run out of cash in a single week. This forecast shows, week by week for the next 13 weeks, the cash the client will have, and which weeks fall below the minimum they need, early enough to act.

Read-only. Never call Seapoint write tools; never post to the ledger.

## Inputs (ask at the start of every run)

- Organisation (Seapoint org id) and the matching ledger organisation.
- **Minimum cash level**: the balance the client never wants to go below. Don't choose one.
- **Treasury**: whether treasury counts as available cash, and how many working days a withdrawal takes.
- **Future billing**: invoiced only (most cautious), or regular billing from customers the client names. Never include a customer the client didn't name.
- **Known one-offs** the data can't show. Only what the client gives.
- Week 1 starts on the Monday of the current week unless the client says otherwise.

## Sources

| What | Where | How |
|---|---|---|
| **Opening cash** | Seapoint `query_accounts` | BANKING rows: `cash_position`, per account, in its own currency. Treasury (INVESTMENT `total`) is a separate line, added only if the client said so. Card debt that shows as `0` may be missing: say so |
| **History** (last 12 weeks) | Seapoint `query_transactions` | `status: BOOKED`, not `internal_transfer`, grouped by week and `participant_id`: pay day, rent day, direct debits, card spend, when customers pay |
| **Card payments not yet settled** | `query_transactions` with `status: PENDING` | Outflows in week 1 |
| **Supplier bills unpaid** | `query_invoices` (`is_paid: false`, `due_date`) and the ledger's unpaid bills | The day the client usually pays that supplier; the due date when there is no history. A bill in both is counted once |
| **Customer invoices unpaid** | ledger sales invoices and aged receivables, checked against Seapoint incoming payments | Due date plus that customer's usual lateness |
| **Payroll** | Seapoint history | Net pay on the usual pay day at last month's actual net pay (ESTIMATE unless the payroll report is given). PAYE and NI by the 22nd of the next month; pension on the provider's usual day |
| **VAT** | ledger VAT periods | Due 1 month and 7 days after the quarter ends |
| **Corporation tax** | ledger | Due 9 months and 1 day after the year end; if no provision, list as unknown |
| **Recurring suppliers** | Seapoint history | Schedule on the usual day; varying amounts = 3-payment average, ESTIMATE |
| **Variable spend** | Seapoint history | Average weekly card and small-supplier spend over 8-12 weeks, ESTIMATE |
| **Treasury income** | `query_treasury_returns`, `query_accounts` treasury group | Monthly at the current net yield, ESTIMATE |

## Rules

- **Payment behaviour beats due dates**, early or late.
- **Never invent money coming in.**
- **Estimates are labelled and totalled separately.**
- **Weekly, not monthly.** A month that nets positive can contain a week that misses payroll.
- **Moves between the client's own accounts are not cash in or out.**
- **One currency per forecast line**; convert only for a combined total, at today's rate, and say so.
- **State the as-of date and every gap first.**

## Output

Headline (first week below the minimum, or "no week below the minimum"), then:

| week (Mon) | opening | customers (invoiced) | future billing (estimate) | other in | payroll | tax | suppliers | card spend | other out | closing | of which estimate | below minimum |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

For each SHORT week, the moves that close the gap (invoices to chase, bills that can wait without passing their due date, treasury to withdraw and when), and the risks.

---

Adapted from `cash-flow-forecaster` by OneWave AI (github.com/onewave-ai/claude-skills), MIT License, Copyright (c) 2025 OneWave AI.
