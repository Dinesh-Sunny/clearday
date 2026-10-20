---
name: libfx-artifacts
description: Use when Clearday needs a durable agent that writes a single-file HTML artifact (close pack, board pack, a custom "panel"), following Vercel's open-source fx0 / libfx pattern.
---

# libfx HTML artifacts (fx0 pattern)

Source: https://github.com/vercel-labs/fx0 (Apache-2.0), npm `libfx`, demo https://fx0.vercel.dev. Read the live README before writing code; the notes below are a summary, not the API.

- **fx0** = a design agent: you describe a page, the agent writes it as ONE HTML file; every turn keeps its own version (copy / download).
- **libfx** = the agent inside: one `createFxAgent({ tools, fetch, apiKey })` gives the model loop, streaming, tool calls, retries and **durable sessions**. `createFxEngine()` runs subagents.
- Durability: each chat is a libfx session saved step by step (Vercel Workflow "World" + Vercel Queues on Vercel, **local files elsewhere**). If the function dies mid-turn, a new one resumes from the last saved step (`/api/libfx` route).
- Sessions: `agent.newSessionId()`, `agent.session(id, { model, instructions, context })`, `session.prompt(text, { messageId })`. A message sent while a turn runs is a *steer*.
- Guard rail in fx0: a turn stops after 64 model steps (subagents included).

## How Clearday uses it
- Artifacts, not chat: the close pack (Seapoint `close-package` skill templates), the board pack and Hark-style "Panels" are written as self-contained HTML in the SixthSense / Hark design tokens (`docs/design/tokens.json`).
- Every artifact is a draft. Numbers come only from tools (Seapoint snapshot / MCP), never from the model.
