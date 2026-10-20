# 2-minute demo script (record by 20:05)

**0:00 - Hook (sky home, empty thread)**
"Finance tools send alerts. Clearday hands you the fix. It's a LangChain Deep Agent on the Seapoint MCP, using Seapoint's own Finance Skill Library - and nothing moves without my tap."

**0:15 - "What needs me today?"** (click the suggestion)
Show the eight check chips and the ranked Action Cards. Point at two:
- "Snowflake sent the same £21,800 invoice twice - it's held out of every run."
- "Remote People's VAT doesn't add up - £200 on £33,400. Held."

**0:40 - Approve the payment run**
Click *Approve run*. The approval bar appears (LangGraph interrupt). Approve as Dinesh.
Guard receipt: "Over Dinesh's £25k limit - sent to Doruk". Then *Approve as Doruk* -> done, 13 bills, duplicates excluded.
"The guard is code, not a prompt: limits, second approver, duplicates, VAT maths, cash buffer."

**1:05 - "Run the September close"**
The agent plans (todos), delegates to the month-end subagent (Seapoint's playbook), returns the checklist: October payroll paid on 18 Sep -> prepayment, Halberd September work -> accrual. "Drafts only - the accountant posts."

**1:30 - "What did we spend last month, by category?" / "What if we hire 2 engineers?"**
Generative UI bars and the what-if panel. Runway 19.8 months -> about 17.

**1:45 - Close**
"Two Seapoint orgs, UK and Ireland, 16 finance skills, three subagents, human approval on every money move, an audit log, and approved bookkeeping changes queued for the Seapoint MCP. Clearday."

Fallback if the LLM is slow: `python3 app/server.py` -> http://localhost:8787 shows the same cards, guard and close with no model calls.
