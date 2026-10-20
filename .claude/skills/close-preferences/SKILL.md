---
name: close-preferences
description: Confirm the firm's preferences for one client's close before any other step. Covers materiality, the capitalisation threshold, accruing from post-period payments and bills, personal spend on company cards (with who holds each card), overdue receivables and provisions, and small policy costs. Asked at the start of every run; the close does not start until every preference has an answer. Use first in every month-end run.
---

# Close preferences

These are the judgement calls a firm makes for a client. The other skills apply them; they never choose them.

## Every run starts here

1. Read the saved preferences from the client's permanent file ("Close preferences"), if there is one.
2. Ask the accountant in one message, before any other step: the saved preferences, each with its value, asking "still right for <month>?"; every preference with no saved value, with its options.
3. Wait for the answer. Do not start `data-freshness` or any other step until all seven preferences have an answer. "Ask me each time" is a valid answer: the items it covers become decisions for the accountant.
4. If the accountant changes or adds one, record it as a new fact for the permanent file, with the date.

When the run has been given its preferences in its instructions (an unattended run), use those, and say so in the output. If any preference is missing from them, stop: output only the list of preferences needed for this client, and do no other work.

Never infer a preference from the ledger. The ledger's established treatment of a **specific item** still applies (agent rules); a preference covers items the ledger hasn't seen before.

## The preferences

| # | preference | options |
|---|---|---|
| P1 | **Materiality** | a % of the line and a £ floor (e.g. 5% / £1,000); optionally a lower £ for VAT |
| P2 | **Capitalisation threshold** | £ per item (e.g. £500, £1,000), and whether items bought together are grouped; or ask each time |
| P3 | **Accrue from a payment after month end** (usage billed in arrears, no bill yet) | accrue when the supplier bills in arrears / accrue only when a document shows the service period / ask each time; and the window after month end (e.g. 10 days) |
| P4 | **Accrue from a bill dated after month end** whose text doesn't state the service period | accrue when the supplier bills in arrears / ask each time |
| P5 | **Personal spend on a company card** | treatment: director's loan / recover from the employee / taxable benefit / ask each time. Plus the **card list**: each card's name or last four, its holder and their role |
| P6 | **Overdue receivables** | flag invoices overdue by more than N days; whether customers who always pay late are excluded; provision policy (specific only / general % over N days / ask each time) |
| P7 | **Small policy costs with no sign in the ledger** (audit fee, employer pension, etc.) | list all / list only when material |

## Clearday's saved preferences for Northstar Labs (demo, given in the run's instructions)

P1 5% / £1,000 · P2 £1,000 per item · P3 accrue when billed in arrears, 10 days · P4 accrue when billed in arrears · P5 recover from the employee; cards: Travel ·7302 Rhys Owen, Marketing ·4821 and Subscriptions ·9113 Priya Chandra, Engineering tools ·5540 Isla Fraser (all employees) · P6 flag over 30 days, specific provisions only · P7 list only when material.

## Output

A short table at the top of the close file: each preference, its value, and its source (confirmed by the accountant on <date>, or given in the run's instructions).
