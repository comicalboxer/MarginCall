"use client";

import { useState } from "react";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";

type Citation = { framework: string; clause: string; status: string };

type Props = {
  open: boolean;
  onClose: () => void;
  copilotResponse: { reply: string; citations: Citation[]; llm_powered?: boolean } | null;
  onPresetClick?: (text: string) => void;
};

export function CopilotDrawer({ open, onClose, copilotResponse, onPresetClick }: Props) {
  const [customInput, setCustomInput] = useState("");

  if (!open) return null;

  const quickPrompts = [
    "Summarize our cyber risk exposure for the upcoming Board Meeting.",
    "Which unpatched CVEs violate SEBI CSCRF circular requirements?",
    "Explain how allocating ₹20 Lakhs improves our RBI regulatory compliance.",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onPresetClick?.(customInput.trim());
      setCustomInput("");
    }
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex h-[calc(100vh-2rem)] max-h-[850px] w-[420px] flex-col rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-slate-950/60 backdrop-blur">
      {/* Pinned Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-cyan-500/10 p-1.5 text-cyan-400 ring-1 ring-cyan-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">Board Copilot</span>
              {copilotResponse?.llm_powered && (
                <span className="flex items-center gap-0.5 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  <Sparkles className="h-2.5 w-2.5" /> Groq LLM
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Executive Advisor & Vector RAG</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Board Quick Questions
          </div>
          <div className="space-y-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onPresetClick?.(prompt)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-left text-xs text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-slate-800/80 hover:text-white"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span>{prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Executive Guidance & Regulatory Vector Citations */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs text-slate-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-cyan-300">Executive Board Guidance</span>
            <span className="text-[10px] text-slate-400">FAIR & Regulatory Aligned</span>
          </div>
          <p className="leading-relaxed text-slate-100">
            {copilotResponse?.reply ?? "Analyzing active portfolio metrics and regulatory frameworks..."}
          </p>

          <div className="mt-4 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">
              Retrieved Semantic Citations (Vector RAG)
            </div>
            {(copilotResponse?.citations ?? []).map((item, index) => (
              <div
                key={`${item.framework}-${index}`}
                className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-[11px]"
              >
                <div className="flex items-center justify-between font-semibold text-cyan-300">
                  <span>{item.framework}</span>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                    {item.status}
                  </span>
                </div>
                <div className="mt-1 text-slate-300">{item.clause}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pinned Footer Chat Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-800 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Ask Board Copilot a question..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customInput.trim()}
            className="rounded-xl bg-cyan-500 p-2 text-slate-950 transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
