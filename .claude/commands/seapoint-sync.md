---
description: Re-pull the Seapoint sandbox (both orgs) through the Seapoint MCP and rebuild app/data/sandbox.json
---
Use the `seapoint-staging` MCP server (read-only tools only):
1. `get_current_user` -> both organisation ids.
2. `query_accounts` (limit 100) -> accounts + balances.
3. `query_transactions` aggregate by organisation, month, direction (sum reporting_amount, count) for the last 4 months.
4. `query_transactions` aggregate by month + category_id for the UK org (last 2 full months), labelled with `query_categories`.
5. `query_invoices` where is_paid=false; `query_payments` status created/scheduled/failed; `query_cards`; `query_payroll` (limit 3).
6. Bookkeeping review: `query_transactions` with the "Needs review" filter since the first of last month.
Update the literals in `app/data/seed.py` with the new values (keep the shape), run `python3 app/data/seed.py`, then restart the policy service. Report what changed in 3 lines.
