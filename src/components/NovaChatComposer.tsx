import React, { useRef, useEffect } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "../lib/cn";

export interface NovaChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function NovaChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask NOVA anything about your business...",
  autoFocus = false,
  className,
}: NovaChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea height smoothly based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180,
      )}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div
      className={cn(
        "w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-2 pl-3.5 pr-2.5 shadow-md flex items-end gap-2.5 transition-all focus-within:border-[var(--color-coral)]/60 focus-within:ring-2 focus-within:ring-[var(--color-coral)]/15",
        className,
      )}
    >
      <div className="pb-1.5 text-[var(--color-coral)] shrink-0 flex items-center justify-center">
        <Sparkles size={18} />
      </div>

      <textarea
        ref={textareaRef}
        rows={1}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent resize-none outline-none text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] py-1.5 min-h-[24px] max-h-[180px] leading-relaxed"
      />

      <button
        type="button"
        onClick={() => {
          if (value.trim() && !disabled) onSubmit();
        }}
        disabled={!value.trim() || disabled}
        aria-label="Send message"
        className="h-8 w-8 rounded-xl bg-[var(--color-coral)] hover:bg-[var(--color-coral-ink)] text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mb-0.5 cursor-pointer shadow-xs"
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}
