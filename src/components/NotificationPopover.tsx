import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Check,
  Sparkles,
  Mail,
  Handshake,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "lead" | "gmail" | "deal" | "system";
  link?: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Gmail connected successfully",
    description:
      "Your connected email account is ready to send approved NOVA sales outreach.",
    time: "2m ago",
    read: false,
    type: "gmail",
    link: "/app/integrations",
  },
  {
    id: "n2",
    title: "5 Qualified B2B Leads Discovered",
    description:
      "NOVA discovered qualified stainless steel water bottle buyers with 93% match score.",
    time: "10m ago",
    read: false,
    type: "lead",
    link: "/app/opportunities",
  },
  {
    id: "n3",
    title: "Linked Deals Created",
    description:
      "5 new deals automatically generated in the QUALIFIED pipeline stage.",
    time: "15m ago",
    read: false,
    type: "deal",
    link: "/app/deals",
  },
  {
    id: "n4",
    title: "Multi-Source Intelligence Ready",
    description:
      "Apollo, Foursquare, Tavily, Hunter, and OpenStreetMap APIs configured.",
    time: "1h ago",
    read: true,
    type: "system",
    link: "/app/integrations",
  },
];

interface NotificationPopoverProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPopover({
  open,
  onClose,
}: NotificationPopoverProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (n: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
    );
    if (n.link) {
      onClose();
      navigate(n.link);
    }
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "gmail":
        return <Mail size={15} className="text-emerald-500" />;
      case "lead":
        return <Sparkles size={15} className="text-[var(--color-coral)]" />;
      case "deal":
        return <Handshake size={15} className="text-[var(--color-iris)]" />;
      default:
        return <ShieldCheck size={15} className="text-blue-500" />;
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="relative">
        {/* Backdrop for closing popover */}
        <div className="fixed inset-0 z-40" onClick={onClose} />

        {/* Popover Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="absolute right-0 top-3 z-50 w-80 sm:w-96 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[var(--color-ink)]" />
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-[var(--color-coral-ink)] hover:underline flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-line)]">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors hover:bg-[var(--color-surface-2)] ${
                  !n.read ? "bg-[var(--color-surface)]/60" : ""
                }`}
              >
                <div className="p-2 rounded-full bg-[var(--color-bg-sunk)] shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold truncate ${!n.read ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]"}`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-[var(--color-ink-faint)] shrink-0">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-ink-soft)] leading-snug mt-0.5 line-clamp-2">
                    {n.description}
                  </p>
                </div>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-[var(--color-coral)] shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--color-line)] bg-[var(--color-bg-sunk)] text-center text-[11px] text-[var(--color-ink-faint)]">
            NOVA Real-Time Activity Feed
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
