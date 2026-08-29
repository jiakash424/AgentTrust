import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Wrench,
  Database,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Terminal,
  Layers,
} from "lucide-react";
import { cn } from "../lib/cn";

export type HermesEventType =
  | "THINKING"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "OBSERVATION"
  | "FINAL"
  | "HERMES_STARTED"
  | "HERMES_THINKING"
  | "HERMES_RESEARCHING"
  | "HERMES_BROWSING"
  | "HERMES_VERIFYING"
  | "HERMES_ANALYZING"
  | "HERMES_COMPLETED"
  | "HERMES_FAILED";

export interface HermesEventItem {
  id?: string;
  type: HermesEventType;
  step: number;
  thought?: string;
  observableAction?: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  summary?: string;
  observation?: string;
  finalAnswer?: string;
  timestamp: string;
}

export function AgentThinkingConsole({
  events = [],
  isThinking = true,
}: {
  events: HermesEventItem[];
  isThinking?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (events.length === 0 && !isThinking) return null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-card overflow-hidden my-4 text-left">
      {/* Header Bar */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-2)]/80 border-b border-[var(--color-line)] cursor-pointer select-none hover:bg-[var(--color-surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-coral-soft)] text-[var(--color-coral)] border border-[var(--color-coral)]/30">
              <Sparkles
                size={14}
                className={isThinking ? "animate-pulse" : ""}
              />
            </span>
            {isThinking && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">
                NOVA Autonomous Engine
              </span>
              {isThinking ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> REASONING LIVE
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)] font-semibold">
                  COMPLETED
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--color-ink-faint)] truncate font-mono mt-0.5">
              {events.length > 0
                ? `${events.length} dynamic iteration step${events.length === 1 ? "" : "s"} processed`
                : "Starting NOVA agent..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-3)] transition-colors"
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable Live Event Timeline */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 space-y-3 font-sans text-xs bg-[var(--color-bg)]/40"
          >
            {events.length === 0 ? (
              <div className="flex items-center gap-2.5 text-[var(--color-ink-faint)] font-mono py-2 italic">
                <Loader2
                  size={14}
                  className="animate-spin text-[var(--color-coral)]"
                />
                <span>NOVA is working on research objective...</span>
              </div>
            ) : (
              events.map((evt, idx) => {
                return (
                  <motion.div
                    key={evt.id || `${evt.type}-${idx}-${evt.timestamp}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "relative pl-6 pb-2.5 group border-l-2",
                      evt.type === "THINKING" && "border-indigo-500/50",
                      evt.type === "TOOL_CALL" && "border-amber-500/50",
                      evt.type === "TOOL_RESULT" && "border-blue-500/50",
                      evt.type === "OBSERVATION" && "border-purple-500/50",
                      evt.type === "FINAL" && "border-emerald-500/50",
                    )}
                  >
                    {/* Node Dot Icon */}
                    <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
                      {evt.type === "THINKING" && (
                        <Brain size={10} className="text-indigo-500" />
                      )}
                      {evt.type === "TOOL_CALL" && (
                        <Terminal size={10} className="text-amber-500" />
                      )}
                      {evt.type === "TOOL_RESULT" && (
                        <Database size={10} className="text-blue-500" />
                      )}
                      {evt.type === "OBSERVATION" && (
                        <Eye size={10} className="text-purple-500" />
                      )}
                      {evt.type === "FINAL" && (
                        <CheckCircle2 size={10} className="text-emerald-500" />
                      )}
                    </span>

                    {/* Event Content Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                            evt.type === "THINKING" &&
                              "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
                            evt.type === "TOOL_CALL" &&
                              "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                            evt.type === "TOOL_RESULT" &&
                              "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                            evt.type === "OBSERVATION" &&
                              "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
                            evt.type === "FINAL" &&
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                          )}
                        >
                          Step {evt.step} · {evt.type}
                        </span>

                        {evt.toolName && (
                          <span className="font-mono text-xs text-[var(--color-coral-ink)] font-semibold">
                            {evt.toolName}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-[var(--color-ink-faint)]">
                        {evt.timestamp
                          ? new Date(evt.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    {/* Event Body Details - Real Time Thinking Card */}
                    <div className="mt-1.5 space-y-1.5 text-[13px] text-[var(--color-ink)]">
                      {(evt.thought || evt.observableAction) && (
                        <div className="bg-[var(--color-surface-2)]/80 p-2.5 rounded-lg border border-[var(--color-line)] shadow-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            <Brain size={12} />
                            <span>NOVA Reasoning Thought:</span>
                          </div>
                          <p className="text-[var(--color-ink)] leading-relaxed text-[13px]">
                            {evt.thought || evt.observableAction}
                          </p>
                        </div>
                      )}

                      {evt.toolArgs && Object.keys(evt.toolArgs).length > 0 && (
                        <div className="bg-slate-900 text-slate-200 p-2 rounded-md font-mono text-[11px] overflow-x-auto">
                          <span className="text-amber-400">args:</span>{" "}
                          {JSON.stringify(evt.toolArgs)}
                        </div>
                      )}

                      {evt.summary && (
                        <div className="bg-[var(--color-surface-2)] p-2 rounded-md text-[var(--color-ink)] font-mono text-[12px] border border-[var(--color-line)]">
                          <span className="text-[var(--color-ink-faint)] block uppercase text-[10px] mb-0.5">
                            Execution Summary
                          </span>
                          {evt.summary}
                        </div>
                      )}

                      {evt.observation && (
                        <p className="text-[var(--color-ink-soft)] text-xs font-mono bg-purple-500/5 p-2 rounded-md border border-purple-500/20">
                          📍 {evt.observation}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
