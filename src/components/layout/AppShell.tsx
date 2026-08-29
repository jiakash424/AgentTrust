import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Sparkles,
  Users,
  Handshake,
  CheckSquare,
  Plug,
  Settings,
  Search,
  Bell,
  ChevronsUpDown,
  Compass,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  History,
  Plus,
  LayoutDashboard,
} from "lucide-react";
import { Wordmark, NovaMark, Logo } from "../brand";
import { Avatar, StatusDot, Badge } from "../ui";
import { merchant } from "../../lib/data";
import { cn } from "../../lib/cn";
import { GlobalWorkflowProgress } from "../GlobalWorkflowProgress";
import { CommandPaletteModal } from "../CommandPaletteModal";
import { NotificationPopover } from "../NotificationPopover";
import { UserProfileDropdown } from "../UserProfileDropdown";
import { BusinessContextModal } from "../BusinessContextModal";
import { useAuth } from "../../contexts/AuthContext";

const primaryNav = [
  { to: "/app", label: "NOVA", icon: Sparkles, end: true, special: true },
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/growth", label: "Growth", icon: TrendingUp },
  { to: "/app/commerce", label: "Commerce", icon: ShoppingBag },
  { to: "/app/products", label: "Products", icon: Package },
  { to: "/app/opportunities", label: "Opportunities", icon: Compass },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/app/deals", label: "Deals", icon: Handshake },
];
const secondaryNav = [
  { to: "/app/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/app": { title: "NOVA", subtitle: "Your AI business workspace" },
  "/app/dashboard": {
    title: "Dashboard",
    subtitle: "Live commercial operations & executive analytics",
  },
  "/app/growth": {
    title: "Growth Intelligence",
    subtitle: "Where NOVA sees your next revenue",
  },
  "/app/commerce": {
    title: "Agentic Commerce",
    subtitle: "Make your business ready to sell to AI buyers",
  },
  "/app/products": {
    title: "Products",
    subtitle: "The products NOVA understands and represents",
  },
  "/app/opportunities": {
    title: "Opportunities",
    subtitle: "Revenue NOVA has discovered for you",
  },
  "/app/leads": {
    title: "Leads",
    subtitle: "Businesses worth reaching out to",
  },
  "/app/conversations": {
    title: "Conversations",
    subtitle: "Tracked email threads with buyers",
  },
  "/app/deals": {
    title: "Deals",
    subtitle: "Every conversation NOVA is moving forward",
  },
  "/app/approvals": {
    title: "Approvals",
    subtitle: "Review actions before NOVA proceeds",
  },
  "/app/integrations": {
    title: "Integrations",
    subtitle: "Connect the systems NOVA works with",
  },
  "/app/settings": {
    title: "Settings",
    subtitle: "Company profile and AI policies",
  },
};

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  special,
  badge,
  collapsed,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  special?: boolean;
  badge?: number;
  collapsed?: boolean;
}) {
  const location = useLocation();

  let isActive = false;
  if (to.includes("?history=true")) {
    isActive =
      location.pathname === "/app" && location.search.includes("history=true");
  } else if (to === "/app") {
    isActive =
      location.pathname === "/app" && !location.search.includes("history=true");
  } else {
    const basePath = to.split("?")[0];
    isActive = end
      ? location.pathname === basePath
      : location.pathname.startsWith(basePath);
  }

  return (
    <NavLink to={to} end={end}>
      {() => (
        <div
          className={cn(
            "relative flex items-center h-10 rounded-[var(--radius-sm)] text-[14px] transition-colors group",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
            isActive
              ? "text-[var(--color-ink)]"
              : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
          )}
        >
          {isActive && (
            <motion.span
              layoutId="nav-active"
              transition={{ type: "spring", stiffness: 450, damping: 38 }}
              className="absolute inset-0 bg-[var(--color-surface)] rounded-[var(--radius-sm)] shadow-card border border-[var(--color-line)]"
            />
          )}
          <span
            className={cn(
              "relative z-10 flex items-center w-full",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <span className="relative shrink-0">
              {special ? (
                <NovaMark size={17} active={isActive} />
              ) : (
                <Icon
                  size={17}
                  className={cn(
                    isActive ? "text-[var(--color-coral)]" : "opacity-80",
                  )}
                  strokeWidth={2}
                />
              )}
              {collapsed && (special || badge) && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-[var(--color-bg)]",
                    special
                      ? "bg-[var(--color-sage)]"
                      : "bg-[var(--color-coral)]",
                  )}
                />
              )}
            </span>

            {!collapsed && (
              <>
                <span className={cn(special && "font-medium")}>{label}</span>
                {special ? (
                  <div className="ml-auto flex items-center gap-2">
                    <StatusDot tone="sage" pulse />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        localStorage.removeItem("nova_active_prompt");
                        localStorage.removeItem("nova_active_wf_id");
                        localStorage.removeItem("nova_history_wf_id");
                        window.location.href = "/app?new=true";
                      }}
                      className="p-1 rounded text-[var(--color-ink-faint)] hover:text-[var(--color-coral)] hover:bg-[var(--color-coral-soft)] transition-colors cursor-pointer"
                      title="Start New Chat"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : null}
                {badge && (
                  <span className="ml-auto text-[10px] font-semibold h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)]">
                    {badge}
                  </span>
                )}
              </>
            )}
          </span>

          {/* Tooltip when collapsed */}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lift translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
              {label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ type: "spring", stiffness: 340, damping: 36 }}
      className="hidden lg:flex shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-bg)] h-screen sticky top-0 z-30"
    >
      <div
        className={cn(
          "h-16 flex items-center border-b border-[var(--color-line)] shrink-0",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <Link
          to="/app"
          onClick={() => {
            localStorage.removeItem("nova_active_prompt");
            localStorage.removeItem("nova_active_wf_id");
            localStorage.removeItem("nova_history_wf_id");
            window.location.href = "/app?new=true";
          }}
          className="overflow-hidden cursor-pointer"
          title="Go to AgentTrust Home"
        >
          {collapsed ? <Logo size={26} /> : <Wordmark size={24} />}
        </Link>
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-5 space-y-1",
          collapsed ? "px-3" : "px-3",
        )}
      >
        {primaryNav.map((n) => (
          <NavItem key={n.to} {...n} collapsed={collapsed} />
        ))}
        <div className="my-4 mx-3 border-t border-[var(--color-line)]" />
        {secondaryNav.map((n) => (
          <NavItem key={n.to} {...n} collapsed={collapsed} />
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-line)] space-y-1">
        <button
          className={cn(
            "w-full flex items-center rounded-[var(--radius-sm)] hover:bg-[var(--color-surface)] transition-colors group",
            collapsed ? "justify-center p-2" : "gap-3 p-2",
          )}
        >
          <Avatar
            initials={merchant.initials}
            className="h-9 w-9 rounded-[var(--radius-sm)] shrink-0"
          />
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-ink)] truncate">
                  {merchant.name}
                </div>
                <div className="text-[11px] text-[var(--color-ink-faint)]">
                  {merchant.plan} plan
                </div>
              </div>
              <ChevronsUpDown
                size={15}
                className="text-[var(--color-ink-faint)]"
              />
            </>
          )}
        </button>

        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full flex items-center h-9 rounded-[var(--radius-sm)] text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}

function TopBar() {
  const { pathname } = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [resolvedCtx, setResolvedCtx] = useState<any>(null);

  useEffect(() => {
    // Load resolved business context indicator
    fetch("/api/business-context")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.resolvedContext) setResolvedCtx(data.resolvedContext);
      })
      .catch(() => {});
  }, []);

  const meta =
    pageMeta[pathname] ||
    (pathname.startsWith("/app/products/")
      ? { title: "Product Intelligence", subtitle: "AI commerce profile" }
      : pageMeta["/app"]);
  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--color-line)] bg-[var(--color-bg)]/80 backdrop-blur-md flex items-center gap-4 px-5 lg:px-8">
        <div className="lg:hidden">
          <Link
            to="/app"
            onClick={() => {
              localStorage.removeItem("nova_active_prompt");
              localStorage.removeItem("nova_active_wf_id");
              localStorage.removeItem("nova_history_wf_id");
              window.location.href = "/app?new=true";
            }}
            title="Go to AgentTrust Home"
          >
            <NovaMark size={22} />
          </Link>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg text-[var(--color-ink)] truncate">
              {meta.title}
            </h2>
          </div>
          <p className="text-xs text-[var(--color-ink-faint)] truncate hidden sm:block">
            {meta.subtitle}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2.5 relative">
          {/* Persistent Business Context Switcher Indicator */}
          <button
            onClick={() => setBusinessModalOpen(true)}
            title="Click to view or edit active Business Intelligence Context"
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/10 text-[var(--color-ink)] text-xs font-medium hover:bg-[var(--color-coral)]/20 transition-all cursor-pointer shrink-0"
          >
            <span className="text-sm">🌾</span>
            <div className="text-left min-w-0 flex items-center gap-1.5">
              <span className="truncate max-w-[140px] font-semibold text-[var(--color-ink)]">
                {resolvedCtx?.companyName || "My Business"}
              </span>
              <span className="text-[11px] text-[var(--color-ink-soft)] font-mono">
                • {resolvedCtx?.businessSize || "SMALL"} •{" "}
                {resolvedCtx?.operatingScope || "LOCAL"}
                {resolvedCtx?.primaryLocation?.city
                  ? ` • ${resolvedCtx.primaryLocation.city}`
                  : ""}
              </span>
            </div>
            <Badge
              tone="coral"
              className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider font-mono"
            >
              Business Context
            </Badge>
          </button>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 pl-3 pr-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-faint)] text-[13px] hover:border-[var(--color-line-strong)] transition-colors w-48 cursor-pointer"
          >
            <Search size={15} />
            <span>Search…</span>
            <kbd className="ml-auto label-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunk)]">
              ⌘K
            </kbd>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileDropdownOpen(false);
              }}
              aria-label="Notifications"
              className="h-9 w-9 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:border-[var(--color-line-strong)] transition-colors relative cursor-pointer"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--color-coral)]" />
            </button>
            <NotificationPopover
              open={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              aria-label="User Profile"
              className="cursor-pointer focus:outline-none"
            >
              <Avatar
                initials={merchant.initials}
                className="h-9 w-9 hover:ring-2 hover:ring-[var(--color-coral)]/40 transition-all"
              />
            </button>
            <UserProfileDropdown
              open={profileDropdownOpen}
              onClose={() => setProfileDropdownOpen(false)}
            />
          </div>
        </div>
      </header>

      <CommandPaletteModal
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Business Intelligence Context Modal */}
      {businessModalOpen && (
        <BusinessContextModal
          isOpen={businessModalOpen}
          onClose={() => setBusinessModalOpen(false)}
          onProfileUpdated={(updated) => setResolvedCtx(updated)}
        />
      )}
    </>
  );
}

const mobileNav = [
  { to: "/app", label: "NOVA", icon: Sparkles, end: true },
  { to: "/app/growth", label: "Growth", icon: TrendingUp },
  { to: "/app/commerce", label: "Commerce", icon: ShoppingBag },
  { to: "/app/products", label: "Products", icon: Package },
];

function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-[var(--color-line)] bg-[var(--color-bg)]/90 backdrop-blur-md flex items-stretch px-1">
        {mobileNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="flex-1">
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center gap-1 h-full text-[10px] font-medium">
                <n.icon
                  size={19}
                  className={
                    isActive
                      ? "text-[var(--color-coral)]"
                      : "text-[var(--color-ink-faint)]"
                  }
                />
                <span
                  className={
                    isActive
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-ink-faint)]"
                  }
                >
                  {n.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-[var(--color-ink-faint)]"
        >
          <MoreHorizontal size={19} />
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="absolute inset-0 bg-[var(--color-ink)]/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute bottom-0 inset-x-0 bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] p-4 pb-8 space-y-1"
            >
              <div className="mx-auto w-10 h-1 rounded-full bg-[var(--color-line-strong)] mb-4" />
              {[...primaryNav.slice(4), ...secondaryNav].map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMoreOpen(false)}
                >
                  {({ isActive }) => (
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 h-12 rounded-[var(--radius-sm)]",
                        isActive
                          ? "bg-[var(--color-bg-sunk)] text-[var(--color-ink)]"
                          : "text-[var(--color-ink-soft)]",
                      )}
                    >
                      <n.icon size={18} />
                      <span>{n.label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const { workspaceId } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("at-sidebar-collapsed") === "1",
  );
  useEffect(() => {
    localStorage.setItem("at-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (workspaceId && typeof window !== "undefined") {
      const activeWs = workspaceId.replace(/[^a-zA-Z0-9-]/g, "");
      if (pathname === "/app") {
        window.history.replaceState(
          null,
          "",
          `/app/w/${activeWs}${window.location.search}`,
        );
      } else if (
        pathname.startsWith("/app/") &&
        !pathname.startsWith("/app/w/") &&
        !pathname.startsWith("/app/workspace/")
      ) {
        const subPath = pathname.substring(5);
        window.history.replaceState(
          null,
          "",
          `/app/w/${activeWs}/${subPath}${window.location.search}`,
        );
      }
    }
  }, [workspaceId, pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <TopBar />
        <main
          className="flex-1 overflow-y-auto px-5 lg:px-8 py-7 pb-24 lg:pb-10"
          key={pathname}
        >
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <GlobalWorkflowProgress />
    </div>
  );
}
