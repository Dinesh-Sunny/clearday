"use client";

import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { useStreamRuntime } from "@assistant-ui/react-langchain";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useEffect, useState } from "react";

import { ApprovalBar } from "@/components/clearday/approval";
import { TOOL_UIS, ToolFallback } from "@/components/clearday/tool-uis";
import { Canvas, NAV, type View } from "@/components/clearday/views";
import { AgentPlan, AgentTree } from "@/components/clearday/agents";
import { ArtifactPane } from "@/components/clearday/artifact";
import { RunBoard } from "@/components/clearday/runboard";

const SUGGESTIONS = ["What needs me today?", "What did we spend last month, by category?", "Run the September close", "What if we hire 2 engineers?"];

function Text() {
  return <MarkdownTextPrimitive className="md" />;
}
function UserMessage() {
  return <MessagePrimitive.Root className="msg user"><MessagePrimitive.Parts components={{ Text }} /></MessagePrimitive.Root>;
}
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="msg bot">
      <MessagePrimitive.Parts components={{ Text, tools: { by_name: TOOL_UIS, Fallback: ToolFallback } }} />
    </MessagePrimitive.Root>
  );
}

function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [max, setMax] = useState(false);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setMax(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <aside className={`agent ${open ? "on" : ""} ${max ? "max" : ""}`} aria-hidden={!open}>
      <div className="agent-head">
        <div><div className="agent-title">Clearday agent</div><div className="muted sm">You approve every money move</div></div>
        <div className="head-btns"><button className="icon-btn" onClick={() => setMax((m) => !m)} aria-label={max ? "Restore panel" : "Maximise panel"} title={max ? "Restore (Esc)" : "Maximise"}>{max ? "⤡" : "⤢"}</button><button className="icon-btn" onClick={() => { setMax(false); onClose(); }} aria-label="Close agent">×</button></div>
      </div>
      <AgentTree compact strip />
      <ThreadPrimitive.Root className="agent-thread">
        <ThreadPrimitive.Viewport className="agent-viewport">
          <ThreadPrimitive.Empty>
            <div className="agent-empty">
              <p className="muted">Ask me anything, or hand me a card.</p>
              <div className="suggest">
                {SUGGESTIONS.map((s) => <ThreadPrimitive.Suggestion key={s} prompt={s} send className="chip">{s}</ThreadPrimitive.Suggestion>)}
              </div>
            </div>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </ThreadPrimitive.Viewport>
        <div className="agent-footer">
          <AgentPlan />
          <ApprovalBar />
          <ComposerPrimitive.Root className="composer">
            <ComposerPrimitive.Input className="input" placeholder="Ask about cash, bills, the close…" rows={1} />
            <ComposerPrimitive.Send className="btn primary sm">Send</ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </div>
      </ThreadPrimitive.Root>
    </aside>
  );
}

export function Assistant() {
  // Talk to LangGraph directly in local dev: the Next /api proxy buffers the SSE stream, so assistant replies never arrived.
  const apiUrl = process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || (typeof window !== "undefined" ? (["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://localhost:2124" : new URL("/api", window.location.href).href) : undefined);
  const runtime = useStreamRuntime({ assistantId: process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || "agent", apiUrl });
  const [view, setView] = useState<View>("today");
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);
  const [part, setPart] = useState("day");

  useEffect(() => {
    const h = new Date().getHours();
    setPart(h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");
    const onOpen = () => setOpen(true);
    window.addEventListener("clearday:open-agent", onOpen);
    const t = setInterval(() => setTick((x) => x + 1), 8000); // canvas follows what the agent changes
    return () => { window.removeEventListener("clearday:open-agent", onOpen); clearInterval(t); };
  }, []);

  const current = NAV.find((n) => n.id === view)!;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="sky" />
      <div className={`shell ${open ? "with-agent" : ""}`}>
        <nav className="side glass">
          <div className="wm">Clear<i>day</i></div>
          <div className="org">
            <div className="label">Northstar Labs</div>
            <div className="chips"><span className="ent">UK Ltd · GBP</span><span className="ent">IE · EUR</span></div>
          </div>
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.id}><button className={view === n.id ? "on" : ""} onClick={() => setView(n.id)}><span>{n.label}</span></button></li>
            ))}
          </ul>
          <div className="side-foot">
            <div className="pill"><span className="dot" />Seapoint sandbox · live MCP</div>
            
          </div>
        </nav>

        <main className="canvas">
          <header className="canvas-head">
            <div>
              <h1 className="display">{view === "today" ? <>Good {part}, <em>Dinesh.</em></> : <>{current.label}<em>.</em></>}</h1>
              <p className="sub">{view === "today" ? "Here's what needs you today." : current.hint}</p>
            </div>
          </header>
          <RunBoard />
          <ArtifactPane />
          <Canvas view={view} tick={tick} />
        </main>

        <AgentPanel open={open} onClose={() => setOpen(false)} />
        {!open && (
          <button className="launcher" onClick={() => setOpen(true)} aria-label="Open the Clearday agent">
            <span className="spark" />Ask Clearday
          </button>
        )}
      </div>
    </AssistantRuntimeProvider>
  );
}
