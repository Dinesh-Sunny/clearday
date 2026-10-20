"use client";

// Live link between the middle panel and the agent: which card the agent is working on, and what it is doing now.
import { useLangChainInterruptState, useLangChainToolCalls } from "@assistant-ui/react-langchain";
import { useAuiState } from "@assistant-ui/react";
import { useMemo, useSyncExternalStore } from "react";

let active: { id: string; base: string[]; title?: string; at?: number } | null = null;
const subs = new Set<() => void>();
export function setActive(id: string, base: string[], title?: string) { active = { id, base, title, at: Date.now() }; subs.forEach((f) => f()); }
export const useActiveCard = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => active, () => null);

const LABEL: Record<string, string> = {
  sweep_books: "Checking the books", query_books: "Reading figures", close_checklist: "Reading the close checklist", cash_view: "Reading cash",
  board_pack: "Drafting the board pack", execute_action: "Running the guard", write_todos: "Planning", task: "Handing to a subagent", show_artifact: "Building the artifact",
};
const parse = (r: any) => { try { return typeof r === "string" ? JSON.parse(r) : Array.isArray(r) && r[0]?.text ? JSON.parse(r[0].text) : r; } catch { return null; } };

export function useToolCallCount() {
  const calls = useThreadToolCalls();
  return calls.map((c) => String(c.id));
}

export type Phase = { phase: "working" | "approval" | "done" | "replied"; label: string } | null;

export function useCardActivity(cardId: string): Phase {
  const a = useActiveCard();
  const calls = useThreadToolCalls();
  let interrupt: any = null;
  try { interrupt = useLangChainInterruptState(); } catch { interrupt = null; }
  if (!a || a.id !== cardId) return null;
  const mine = calls.filter((c) => !a.base.includes(String(c.id)));
  if (interrupt) return { phase: "approval", label: "Waiting for your approval" };
  const running = mine.find((c) => c.result === undefined);
  if (running) {
    const who = running.name === "task" ? ` · ${running.args?.subagent_type ?? "subagent"}` : "";
    return { phase: "working", label: (LABEL[running.name] ?? running.name) + who };
  }
  const ex = [...mine].reverse().find((c) => c.name === "execute_action" && c.result !== undefined);
  if (ex) { const r = parse(ex.result); return { phase: "done", label: r?.message ?? (r?.status === "routed" ? "Sent for second approval" : "Done") }; }
  if (mine.length) return { phase: "replied", label: "Agent replied" };
  return { phase: "working", label: "Agent is reading the card" };
}

export { LABEL as STEP_LABEL, parse as parseResult };

// Every tool call in the thread, read from assistant-ui's own message list (the same data the chat renders).
export function useThreadToolCalls(): { id: string; name: string; args: any; result: any }[] {
  let msgs: any = [];
  try { msgs = useAuiState((s: any) => s.thread.messages); } catch { msgs = []; }
  return useMemo(() => {
    const out: any[] = [];
    for (const m of (msgs ?? []) as any[]) for (const p of (m.content ?? []) as any[])
      if (p?.type === "tool-call") out.push({ id: String(p.toolCallId), name: p.toolName, args: p.args ?? {}, result: p.result });
    return out;
  }, [msgs]);
}

// The latest user turn and the tool calls made since it - drives the run board for cards AND typed questions.
export function useLatestTurn(): { text: string; calls: { id: string; name: string; args: any; result: any }[]; key: string } | null {
  let msgs: any = [];
  try { msgs = useAuiState((s: any) => s.thread.messages); } catch { msgs = []; }
  return useMemo(() => {
    const list = (msgs ?? []) as any[];
    let u = -1;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].role === "user") { u = i; break; }
    if (u < 0) return null;
    const text = ((list[u].content ?? []) as any[]).filter((p) => p.type === "text").map((p) => p.text).join(" ");
    const calls: any[] = [];
    for (const m of list.slice(u + 1)) for (const p of (m.content ?? []) as any[])
      if (p?.type === "tool-call") calls.push({ id: String(p.toolCallId), name: p.toolName, args: p.args ?? {}, result: p.result });
    return { text, calls, key: String(list[u].id ?? u) };
  }, [msgs]);
}
