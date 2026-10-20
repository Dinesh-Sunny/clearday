---
name: variance-commentary
description: Explain the period's P&L movements over materiality against the prior month, the same month last year and the 3-month average (and budget, if the ledger has one). Drivers come from Seapoint's supplier-level activity and, for invoices and journals, from the ledger. Use for the close package and the leadership summary.
---

# Variance commentary

## Figures

- **Ledger P&L** (accruals basis) for the period and each comparative, by account.
- If the ledger P&L is unavailable, use Seapoint `query_transactions` aggregate grouped by `accounting_account_code` and month, summing `reporting_amount`. Label the result **"cash basis, Seapoint"** and say it excludes accruals and bills.

**Comparatives**
- Use only the comparatives the accountant asked for.
- When the ledger's history doesn't reach a comparative (e.g. the ledger started recently), take that comparative from Seapoint on a cash basis, net of VAT. Label that column "cash basis, Seapoint". Never mix the two bases in one total.

A line needs commentary when |Δ| ≥ materiality against any comparative, or when it is revenue, payroll or the largest cost line. For a percentage threshold, take the percentage of the larger of the two figures being compared.

## Drivers

For each flagged line, query Seapoint for that account's activity by `participant_id` in both periods. Seapoint holds only bank and card activity: for movements from invoices or journals, use the ledger's invoices, balance sheet and monthly P&L. Give the driver in one sentence, naming the supplier and the reason:

| driver type | test |
|---|---|
| new supplier | Present this period, absent in the comparatives |
| lost or one-off | Present in the comparative only |
| duplicate | Same supplier and amount twice (see `spend-readiness`) |
| price or volume change | Same supplier, different amount |
| timing / cut-off | Cost belongs to another period (see `spend-readiness`) |
| accrual effect | Movement caused by this period's accruals or last period's reversals |
| billing gap | Revenue missing because fewer sales invoices were raised in the period. Check the invoiced total actually fell; if it didn't, look for a journal not posted |
| invoice for another period | Revenue up because an invoice dated this period bills a later period (a second invoice to a monthly customer, a description naming next month); see `sales-readiness` |
| journal not posted | A line that moves by a journal every month (deferred income release, depreciation, prepayment release, accrual) did not move this period; see `ledger-checks` |

When revenue rises, list the period's invoices for each customer whose total changed, and read their descriptions before naming the driver.

Write the reason, not the number. When the driver isn't clear from the data, write "driver unclear — ask client" rather than guessing.

## Output

| line | current | prior month | same month LY | 3m avg | Δ vs prior | driver |
|---|---|---|---|---|---|---|

Follow the table with a 3–5 sentence narrative of the biggest movers.
