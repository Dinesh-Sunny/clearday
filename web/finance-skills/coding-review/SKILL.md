---
name: coding-review
description: Review the account code and tax rate on the period's payments, both pending and already pushed. Covers UK VAT rules (blocked entertainment VAT, reverse charge, capital items, exempt supplies, personal spend), low-confidence suggestions, and mismatches between Seapoint's chart and the ledger's. Proposes the fix before push, or a correcting journal after.
---

# Coding and VAT review

Use the period's payments from Seapoint `query_transactions`, with `accounting_account` / `accounting_tax_rate` (or `accounting_account_code` / `accounting_tax_rate_code`) and `source` (selected or suggested). Resolve names and types against the **ledger's** chart and tax rates. Take the supplier's country and VAT from the invoice (address, VAT number, VAT charged), not from the supplier's name.

## Rules to apply (UK)

| Rule | Flag when | Usual fix |
|---|---|---|
| **Business entertainment VAT is blocked** | Restaurants, bars, food delivery, hospitality coded to an entertainment account **with reclaimable VAT** (e.g. `INPUT2`). Staff-only entertainment can reclaim; client entertainment cannot | Ask the client who attended: names, and staff or clients. For client entertainment, use a no-VAT entertainment account (e.g. 424 / `NONE`). When the ledger has always treated this person's or this kind of meal as client entertainment, draft that coding from the precedent, and still ask for the attendees |
| **Reverse charge only for overseas services** | `REVERSECHARGES` (or similar) on a UK supplier: a UK address or a GB VAT number on the invoice. "Ltd" or "Limited" alone does not show this; Irish and other companies use it too | Use the UK VAT rate on the invoice |
| **Overseas services without reverse charge** | A non-UK supplier (EU or US SaaS, ads, contractors) coded with UK input VAT, **and the invoice shows no UK VAT**. Some overseas suppliers are UK VAT-registered and charge UK VAT; then input VAT is right | Reverse charge, or no VAT if outside scope |
| **Capital vs expense** | Equipment over the capitalisation threshold (preference P2) coded to expenses, or under it coded to fixed assets; **investments or transfers coded to fixed assets** whatever the amount. With P2 "ask each time", a decision: capitalise or expense, with the £ of each | Fixed asset account or expense per P2; a balance-sheet / transfer account for investments and transfers |
| **Exempt supplies** | Insurance, bank fees, interest coded with reclaimable VAT | Exempt / no VAT |
| **Unconfirmed suggestions** | `source: suggested` on lines over materiality | Approver confirms |
| **VAT on sales** | A sales invoice in the period with UK VAT on services to a business outside the UK, or a rate different from the customer's earlier invoices | Credit note and reissue (or amend if unpaid) at the right rate, with reverse-charge wording |
| **Personal spend on a company card** | Consumer services or goods with no business use on a company card. Raise it whatever the amount, and name the card and its holder (from the P5 card list). The VAT isn't reclaimable | Follow preference P5; with P5 "ask each time", a decision. Ask the card holder to confirm |
| **Chart mismatch** | A code that doesn't exist in the ledger's chart, or whose name or type differs between Seapoint and the ledger | Fix the mapping in Seapoint |

Also flag a **payment amount that doesn't match its bill**, and payments coded to an account that differs from the bill's account.

Review the period's sales invoices for the VAT on sales rule, from the ledger. Skip the codes on incoming payments already reconciled to a sales invoice in the ledger. Don't recode incoming customer payments that pay a sales invoice.

## Output

One row per finding:

| supplier | date | £ | current code / tax | proposed code / tax | rule | fix where | VAT effect £ |
|---|---|---|---|---|---|---|---|

"Fix where" is either "Seapoint (not yet pushed)" or "ledger journal (already pushed)". For pushed items, the fix is usually a ledger edit. Where a journal is used, draft Dr the right account and Cr the wrong one. Never journal to the VAT control account. Also fix the code or supplier rule in Seapoint.

Total the VAT effect, because it changes the next VAT return.
