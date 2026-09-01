import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Package,
  Compass,
  Users,
  MessageSquare,
  Handshake,
  CheckSquare,
  Plug,
  Settings,
  X,
  ArrowRight,
} from "lucide-react";

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPaletteModal({
  open,
  onClose,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const allItems = [
    {
      label: "NOVA Command Center",
      category: "Pages",
      icon: Sparkles,
      path: "/app",
    },
    {
      label: "Growth Intelligence",
      category: "Pages",
      icon: TrendingUp,
      path: "/app/growth",
    },
    {
      label: "Commerce & AI Buyers",
      category: "Pages",
      icon: ShoppingBag,
      path: "/app/commerce",
    },
    {
      label: "Products Catalog",
      category: "Pages",
      icon: Package,
      path: "/app/products",
    },
    {
      label: "Opportunities",
      category: "Pages",
      icon: Compass,
      path: "/app/opportunities",
    },
    {
      label: "Discovered Leads",
      category: "Pages",
      icon: Users,
      path: "/app/leads",
    },
    {
      label: "Conversations & Outreach",
      category: "Pages",
      icon: MessageSquare,
      path: "/app/conversations",
    },
    {
      label: "Sales Deals Pipeline",
      category: "Pages",
      icon: Handshake,
      path: "/app/deals",
    },
    {
      label: "Pending Approvals",
      category: "Pages",
      icon: CheckSquare,
      path: "/app/approvals",
    },
    {
      label: "Integrations & Gmail",
      category: "Pages",
      icon: Plug,
      path: "/app/integrations",
    },
    {
      label: "Company Settings",
      category: "Pages",
      icon: Settings,
      path: "/app/settings",
    },
    {
      label: "Discover New B2B Buyers",
      category: "Actions",
      icon: Sparkles,
      path: "/app?query=discover",
    },
    {
      label: "Connect Gmail Account",
      category: "Actions",
      icon: Plug,
      path: "/app/integrations",
    },
    {
      label: "Review Deal Pipeline",
      category: "Actions",
      icon: Handshake,
      path: "/app/deals",
    },
  ];

  const filtered = allItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Command Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-xl bg-[var(--color-bg)] border border-[var(--color-line)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden z-10"
        >
          {/* Header Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
            <Search size={18} className="text-[var(--color-coral)] shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type a command or search pages, leads, deals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-faint)] focus:outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] rounded-md hover:bg-[var(--color-bg-sunk)]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--color-ink-faint)]">
                No matching pages or actions found for "{query}"
              </div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] text-left hover:bg-[var(--color-surface-2)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-[var(--color-surface)] text-[var(--color-ink-soft)] group-hover:text-[var(--color-coral)] group-hover:bg-[var(--color-coral-soft)] transition-colors">
                      <item.icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[var(--color-ink)]">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-ink-faint)]">
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-[var(--color-ink-faint)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--color-line)] bg-[var(--color-bg-sunk)] flex items-center justify-between text-[11px] text-[var(--color-ink-faint)]">
            <div className="flex items-center gap-3">
              <span>
                Use{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] font-mono text-[9px]">
                  ⌘K
                </kbd>{" "}
                to open
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] font-mono text-[9px]">
                  ESC
                </kbd>{" "}
                to exit
              </span>
            </div>
            <span className="text-[var(--color-coral-ink)] font-medium">
              NOVA Command Search
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
