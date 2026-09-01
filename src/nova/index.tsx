import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Check, Loader2, Circle } from "lucide-react";
import { NovaMark } from "../components/brand";
import { cn } from "../lib/cn";

/* ---------------- NOVA Command Input ---------------- */
export function NovaCommandInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask NOVA anything about your business…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      animate={{
        boxShadow: focused
          ? "0 24px 60px -24px rgba(28,26,23,0.28), 0 0 0 1px var(--color-coral)"
          : "0 8px 30px -18px rgba(28,26,23,0.2), 0 0 0 1px var(--color-line)",
      }}
      className="w-full bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-2 pl-4 flex items-center gap-3"
    >
      <NovaMark size={20} active={focused} />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] py-2.5"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-white flex items-center justify-center transition-all hover:bg-[var(--color-coral-ink)] active:scale-95 disabled:opacity-40"
      >
        <ArrowUp size={17} />
      </button>
    </motion.form>
  );
}

/* ---------------- NOVA Working Timeline ---------------- */
export interface WorkStep {
  label: string;
  state: "done" | "active" | "pending";
}

export function NovaWorkingTimeline({
  steps,
  title = "NOVA Working",
}: {
  steps: WorkStep[];
  title?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-5">
      <div className="label-mono text-[var(--color-ink-faint)] mb-4">
        {title}
      </div>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-center gap-3 text-sm"
          >
            <span className="shrink-0">
              {s.state === "done" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              {s.state === "active" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-coral-soft)] text-[var(--color-coral)]">
                  <Loader2 size={12} className="animate-spin" />
                </span>
              )}
              {s.state === "pending" && (
                <span className="flex h-5 w-5 items-center justify-center text-[var(--color-line-strong)]">
                  <Circle size={12} />
                </span>
              )}
            </span>
            <span
              className={cn(
                s.state === "pending"
                  ? "text-[var(--color-ink-faint)]"
                  : "text-[var(--color-ink)]",
                s.state === "active" && "font-medium",
              )}
            >
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* Hook that animates a set of steps from pending -> active -> done over time */
export function useProgressiveSteps(
  labels: string[],
  running: boolean,
  stepMs = 900,
) {
  const [steps, setSteps] = useState<WorkStep[]>(
    labels.map((label, i) => ({
      label,
      state: i === 0 ? "active" : "pending",
    })),
  );

  useEffect(() => {
    if (!running) return;
    setSteps(
      labels.map((label, i) => ({
        label,
        state: i === 0 ? "active" : "pending",
      })),
    );
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setSteps((prev) =>
        prev.map((s, i) => {
          if (i < current) return { ...s, state: "done" };
          if (i === current) return { ...s, state: "active" };
          return s;
        }),
      );
      if (current >= labels.length) {
        clearInterval(timer);
        setSteps((prev) => prev.map((s) => ({ ...s, state: "done" })));
      }
    }, stepMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return steps;
}

/* ---------------- NOVA message bubble ---------------- */
export function NovaMessage({
  role,
  children,
}: {
  role: "user" | "nova";
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-[var(--radius-md)] rounded-br-sm bg-[var(--color-coral)] text-white px-4.5 py-3 text-[14.5px] font-medium leading-relaxed shadow-sm">
          {children}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <span className="mt-0.5 shrink-0">
        <NovaMark size={20} />
      </span>
      <div className="max-w-[85%] space-y-4 text-[15px] leading-relaxed text-[var(--color-ink)]">
        {children}
      </div>
    </motion.div>
  );
}

/* Live AI Activity Indicator */
export function NovaLiveActivity({
  title,
  subtitle,
  steps,
  error,
  completed,
}: {
  title: string;
  subtitle?: string;
  steps: WorkStep[];
  error?: string;
  completed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <span className="mt-1 shrink-0 text-[var(--color-coral)]">
          {error ? (
            <div className="h-5 w-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
              !
            </div>
          ) : completed ? (
            <div className="h-5 w-5 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)] flex items-center justify-center">
              <Check size={14} strokeWidth={3} />
            </div>
          ) : (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1, 0.9] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <NovaMark size={24} active />
            </motion.div>
          )}
        </span>
        <div className="flex-1">
          <div
            className={cn(
              "text-[16px] font-medium",
              error ? "text-red-500" : "text-[var(--color-ink)]",
            )}
          >
            {error || title}
          </div>
          {subtitle && !error && (
            <div className="text-[14px] text-[var(--color-ink-soft)] mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <div className="pl-[2.75rem]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)] transition-colors mb-3"
          >
            <span
              className={cn("transition-transform", expanded && "rotate-90")}
            >
              ▶
            </span>
            {expanded ? "Hide details" : "View activity details"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <NovaWorkingTimeline steps={steps} title="Workflow Steps" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export { AnimatePresence };
