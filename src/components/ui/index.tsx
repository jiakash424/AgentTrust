import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "outline";
type BtnSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
}) {
  const variants: Record<BtnVariant, string> = {
    primary:
      "bg-[var(--color-coral)] text-white hover:bg-[var(--color-coral-ink)] shadow-[0_1px_2px_rgba(184,72,42,0.25)]",
    secondary: "bg-[var(--color-ink)] text-white hover:bg-[#000]",
    outline:
      "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)]",
    ghost:
      "bg-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-sunk)] hover:text-[var(--color-ink)]",
  };
  const sizes: Record<BtnSize, string> = {
    sm: "h-8 px-3 text-[13px] rounded-[var(--radius-sm)] gap-1.5",
    md: "h-10 px-4 text-sm rounded-[var(--radius-sm)] gap-2",
    lg: "h-12 px-6 text-[15px] rounded-[var(--radius-md)] gap-2",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]/40 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  hover = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[var(--radius-lg)] shadow-card",
        hover &&
          "transition-all duration-300 ease-[var(--ease-expo)] hover:shadow-lift hover:-translate-y-1 hover:border-[var(--color-line-strong)] transform-gpu will-change-transform",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */
type Tone = "coral" | "iris" | "sage" | "amber" | "neutral" | "rose";
const toneMap: Record<Tone, string> = {
  coral: "bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)]",
  iris: "bg-[var(--color-iris-soft)] text-[var(--color-iris)]",
  sage: "bg-[var(--color-sage-soft)] text-[var(--color-sage)]",
  amber: "bg-[var(--color-amber-soft)] text-[var(--color-amber)]",
  rose: "bg-[#f7e4e1] text-[var(--color-rose)]",
  neutral: "bg-[var(--color-bg-sunk)] text-[var(--color-ink-soft)]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot = false,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        toneMap[tone],
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------------- Toggle ---------------- */
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]/40",
        checked ? "bg-[var(--color-coral)]" : "bg-[var(--color-line-strong)]",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/* ---------------- Segmented / Tabs ---------------- */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar max-w-full overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible">
      <div className="inline-flex items-center gap-1 p-1 bg-[var(--color-bg-sunk)] rounded-[var(--radius-sm)]">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="relative px-3.5 py-1.5 text-[13px] font-medium rounded-[7px] transition-colors shrink-0 whitespace-nowrap"
          >
            {value === o.id && (
              <motion.span
                layoutId="segmented-active"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-[var(--color-surface)] rounded-[7px] shadow-card"
              />
            )}
            <span
              className={cn(
                "relative z-10 transition-colors",
                value === o.id
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-ink-faint)]",
              )}
            >
              {o.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold select-none",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/* ---------------- ScoreRing ---------------- */
export function ScoreRing({
  value,
  size = 200,
  stroke = 12,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-serif text-4xl text-[var(--color-ink)]">
          {value}%
        </span>
        {label && (
          <span className="text-sm text-[var(--color-ink-soft)] mt-1">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="label-mono text-[var(--color-ink-faint)] mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/15 cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl border border-[var(--color-line)] p-7 max-h-[85vh] overflow-y-auto z-10"
          >
            {title && (
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-2xl text-[var(--color-ink)]">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-[var(--color-bg-sunk)] text-[var(--color-ink-faint)] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------------- Drawer ---------------- */
export function Drawer({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 cursor-pointer pointer-events-auto"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-[var(--color-surface)] border-l border-[var(--color-line)] shadow-2xl flex flex-col z-10 pointer-events-auto"
          >
            <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--color-line)] shrink-0 bg-[var(--color-surface)]">
              <h3 className="font-serif text-xl text-[var(--color-ink)]">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[var(--color-bg-sunk)] text-[var(--color-ink-faint)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------------- PageHeader ---------------- */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <div className="label-mono text-[var(--color-coral-ink)] mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-[clamp(1.9rem,6vw,2.5rem)] leading-[1.05] text-[var(--color-ink)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[var(--color-ink-soft)] mt-2 text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}

/* ---------------- StatusDot ---------------- */
export function StatusDot({
  tone = "sage",
  pulse = false,
}: {
  tone?: Tone;
  pulse?: boolean;
}) {
  const colors: Record<Tone, string> = {
    coral: "var(--color-coral)",
    iris: "var(--color-iris)",
    sage: "var(--color-sage)",
    amber: "var(--color-amber)",
    rose: "var(--color-rose)",
    neutral: "var(--color-ink-faint)",
  };
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 nova-dot"
          style={{ background: colors[tone] }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: colors[tone] }}
      />
    </span>
  );
}

/* ---------------- Page transition wrapper ---------------- */
export function PageFade({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
