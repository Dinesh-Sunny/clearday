---
name: spend-readiness
description: Check the period's money out before close. Covers payments not yet in the ledger, missing receipts, duplicate supplier payments, payments that double count a bill, spend cut-off and overdue payables. Each finding has its effect, owner and where the fix happens. Use as part of close-readiness, or on its own to clean up spend.
---

# Spend readiness

Work through each check for the period's debits (card, bank and supplier payments) and the ledger's bills. Write findings in the row format defined in `close-readiness`.

## Not yet in the ledger

Seapoint `query_transactions` with `where.reconciliation` in `needs_review`, `awaiting_approval`, `sync_pending` or `sync_failed`, dated in the period.
- Group the results by status. Use the meanings in the agent rules.
- A correctly coded payment waiting for approval is a **routine approval**, not a finding: count it separately.
- A payment with a wrong code or tax rate goes to `coding-review`.

## Missing receipts

Debits with `has_evidence: false`.
- Exclude payments that normally have no receipt: bank fees, salaries, tax (including business rates), pension contributions, loan repayments, dividends and transfers between the client's own accounts. A dividend or loan repayment over materiality with no supporting paper (dividend voucher and minute, lender statement) is a question for the client, not a missing receipt.
- Exclude payments where the client declared "no receipt", if that is exposed.
- Exclude payments allocated to a bill already in the ledger: the bill is the document. A payment for an open ledger bill but coded to expense is a **payment that double counts a bill** (below); a repeated payment is a **duplicate** (below).
- Owner: client. Group by card holder (from the P5 card list in `close-preferences`, since the MCP shows only the card's name and last four) or the person who made the payment; largest first.

## Duplicates

Look for:
- **Same-day or next-day pairs:** the same supplier and the same amount, with neither payment part of a regular pattern (weekly or monthly).
- **Extra charges:** the same amount from the same supplier, charged more times this period than in each of the previous 3 months. Varying amounts (travel, food) are not extra charges.
- **Payroll paid twice:** the same employee paid more than once in the period, outside the usual pay date.

Don't flag repeat card purchases that follow a regular pattern (e.g. weekly coffee or lunch) unless the amount is over materiality. Two equal payments to the same supplier with different invoices, or a direct debit collected twice because a bank holiday moved last month's collection, are not duplicates: check the documents and dates before raising one.

For each finding, state whether every payment involved is already in the ledger. A duplicate on both sides is a fix-before-close item: confirm against the bank statement, then record the extra payment in the ledger as an overpayment on that supplier's contact, so it shows in aged payables and can be refunded or offset. Not a general prepayments account, and not a deletion: the money really left the bank.

## Payments that double count a bill

A supplier bill still open in the ledger, with a bank payment of the same amount coded straight to expense. The cost is counted twice. Fix: allocate the payment to the bill (a ledger edit), and fix the supplier's rule in Seapoint.

## Spend cut-off

- Payments in the period that belong to a later period: next month's payroll paid early, an annual renewal or a course or event next month (that's a prepayment, if over materiality; under it, expensing is normal practice and is not raised, not even as a minor item).
- Bills dated in the next period for this period's work (accrue them: `accrual-schedule`).
- Record the evidence for each.

## Overdue payables

Ledger aged payables past their due date, and Seapoint unpaid bills. One already paid in the bank is a **payment that double counts a bill**.
