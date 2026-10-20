---
name: close-readiness
description: List everything that stops the month from closing cleanly, in one table with a verdict. Runs spend-readiness (money out), sales-readiness (money in and receivables) and ledger-checks (the ledger itself), adds findings from coding-review, bank-reconciliation, data-freshness and balance-sheet-review, and gives each item its effect, owner and where the fix happens. Use at the start of a close and again before sign-off.
---

# Close readiness

Run `spend-readiness`, `sales-readiness` and `ledger-checks` for the period. Add the findings that other steps send here: ledger settings (`data-freshness`), amount differences (`bank-reconciliation`), balances that don't agree (`balance-sheet-review`). Merge them into one table, one row per finding:

| source | item | date | P&L £ | VAT £ | balance sheet | evidence (ids) | owner | fix where | fix |
|---|---|---|---|---|---|---|---|---|---|

- **Source** names the skill and section, e.g. "sales-readiness: incoming customer payments".
- **P&L £** is the change to profit when fixed (+ raises profit); **VAT £** is the change to VAT payable; **balance sheet** names the account and £. Fill each that applies; never add them together. For a missing receipt or a question, give the £ at stake in the item.
- **Owners:** **client** (supplies a receipt or an answer), **approver** (approves in Seapoint), **bookkeeper** (codes in Seapoint), **accountant** (ledger adjustment or decision).
- **Fix where:** Seapoint (before push), ledger edit, ledger journal, client answer, or decision for the accountant.
- The same item found by two skills is one row; keep the more specific source.

## Output

- The table, sorted by P&L effect (absolute), then VAT effect.
- Three things kept out of the findings count, each listed on its own:
  - **routine approvals** of correctly coded payments;
  - the **routine close** (journals the firm posts every month, from `ledger-checks`);
  - **decisions for the accountant**.
- Totals by owner.
- Minor observations kept to the limit in `close-package`.
- The verdict, as defined in `close-package`. If ledger reports are unavailable, say so first.
