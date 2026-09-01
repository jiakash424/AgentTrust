import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Settings,
  Plug,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Palette,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/cn";
import { merchant } from "../lib/data";

interface UserProfileDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileDropdown({
  open,
  onClose,
}: UserProfileDropdownProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const userEmail = user?.email || "admin@company.com";

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/login");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="relative">
        {/* Backdrop */}
        <div className="fixed inset-0 z-40" onClick={onClose} />

        {/* Dropdown Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="absolute right-0 top-3 z-50 w-72 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
        >
          {/* User Info Header */}
          <div className="p-4 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center font-bold text-sm">
                {merchant.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[var(--color-ink)] truncate">
                  {merchant.name}
                </div>
                <div className="text-[11px] text-[var(--color-ink-soft)] truncate">
                  {userEmail}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono px-2.5 py-1 rounded bg-[var(--color-bg-sunk)] border border-[var(--color-line)] text-[var(--color-ink-faint)]">
              <span>
                PLAN:{" "}
                <span className="font-bold text-[var(--color-coral-ink)]">
                  {merchant.plan.toUpperCase()}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[var(--color-sage)] font-semibold">
                <CheckCircle2 size={10} /> ACTIVE
              </span>
            </div>
          </div>

          {/* Email Integration Badge */}
          <div className="px-4 py-2.5 border-b border-[var(--color-line)] bg-[var(--color-sage-soft)]/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[var(--color-sage)] font-medium">
              <ShieldCheck size={14} />
              <span className="text-[11px] font-semibold text-[var(--color-ink)]">
                Gmail Connected
              </span>
            </div>
            <span className="text-[10px] text-[var(--color-ink-faint)] font-mono">
              SMTP Verified
            </span>
          </div>

          {/* Menu Items */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => handleNavigate("/app/settings")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <Settings size={15} />
              <span>Workspace Settings</span>
            </button>
            <button
              onClick={() => handleNavigate("/app/integrations")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <Plug size={15} />
              <span>Integrations & API Keys</span>
            </button>
            <button
              onClick={() => handleNavigate("/app/growth")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <Sparkles size={15} />
              <span>Growth Intelligence</span>
            </button>
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent("openOnboardingTour"));
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-xs text-[var(--color-coral-ink)] font-semibold hover:bg-[var(--color-coral-soft)] transition-colors cursor-pointer"
            >
              <Sparkles size={15} className="text-[var(--color-coral)]" />
              <span>App Guide & Tour (कैसे use karein)</span>
            </button>

            {/* Quick Theme Switcher */}
            <div className="px-3 py-2.5 my-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-sunk)] border border-[var(--color-line)]">
              <div className="text-[10px] font-mono text-[var(--color-ink-faint)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Palette size={11} className="text-[var(--color-coral)]" />
                Theme
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["agenttrust", "dark", "retro"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "py-1 px-1.5 rounded text-[10px] font-medium transition-all text-center capitalize cursor-pointer",
                      theme === t
                        ? "bg-[var(--color-surface)] text-[var(--color-ink)] font-bold shadow-xs border border-[var(--color-line-strong)]"
                        : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]/50",
                    )}
                  >
                    {t === "agenttrust" ? "Light" : t}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-1 border-t border-[var(--color-line)]" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-xs text-[var(--color-rose)] hover:bg-[var(--color-rose-soft)] transition-colors"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
