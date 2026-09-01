import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Users,
  Sparkles,
  ShoppingBag,
  Bell,
  Shield,
  Check,
  Plus,
  Mail,
  Trash2,
  Palette,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Button,
  Badge,
  Card,
  Toggle,
  Avatar,
  Modal,
  PageHeader,
  PageFade,
} from "../components/ui";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, THEME_CONFIGS } from "../contexts/ThemeContext";
import { fetchApi } from "../lib/api";

const inputCls =
  "w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus:outline-none focus:border-[var(--color-line-strong)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-coral)]/20";

type SectionId =
  | "appearance"
  | "profile"
  | "team"
  | "nova"
  | "commerce"
  | "notifications"
  | "security";

const sections: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "appearance", label: "Appearance & Themes", icon: Palette },
  { id: "profile", label: "Business Profile", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "nova", label: "NOVA Preferences", icon: Sparkles },
  { id: "commerce", label: "Commerce Policies", icon: ShoppingBag },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
        {label}
      </label>
      {children}
      {helper && (
        <p className="mt-1.5 text-[13px] text-[var(--color-ink-faint)]">
          {helper}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-[var(--color-line)] last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--color-ink)]">
          {label}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          {desc}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">
        <Toggle checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <AnimatePresence>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[13px] text-[var(--color-sage)]"
          >
            <Check size={14} strokeWidth={3} />
            Saved
          </motion.span>
        )}
      </AnimatePresence>
      <Button
        onClick={() => {
          onSave();
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2200);
        }}
      >
        Save changes
      </Button>
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState<SectionId>("appearance");

  const [profile, setProfile] = useState(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("nova_merchant_business")
        : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      name: "My Business",
      category: "Commercial Manufacturing & Wholesale",
      primaryProducts: "Commercial Products & Commodities",
      region: "India",
      gst: "",
      about:
        "Commercial enterprise supplying B2B buyers, distributors, and commercial trade partners.",
    };
  });

  const saveProfile = () => {
    localStorage.setItem("nova_merchant_business", JSON.stringify(profile));
  };

  const [novaPrefs, setNovaPrefs] = useState({
    insights: true,
    brief: true,
    research: true,
    approval: true,
  });

  const [policies, setPolicies] = useState({
    minPrice: "250",
    maxDiscount: "15",
    minOrderQty: "100",
    approvalRule: "Above ₹5,00,000 deal value",
    discovery: true,
    negotiation: false,
  });

  const [notifs, setNotifs] = useState({
    email: true,
    inApp: true,
    digest: false,
  });

  const [security, setSecurity] = useState({
    current: "",
    next: "",
    confirm: "",
    twoFactor: false,
  });

  const { session, workspaceId } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", name: "", role: "Member" });
  const [team, setTeam] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchTeamMembers = async () => {
    if (!session || !workspaceId) return;
    setLoadingTeam(true);
    try {
      const members = await fetchApi<any[]>("/api/workspaces/members", {
        session,
        workspaceId,
      });
      if (Array.isArray(members)) setTeam(members);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [session, workspaceId]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.email.trim() || !session || !workspaceId) return;

    setInviteLoading(true);
    try {
      const res = await fetch("/api/workspaces/members/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          email: invite.email.trim(),
          name: invite.name.trim() || undefined,
          role: invite.role.toUpperCase(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeam((prev) => [
          ...prev.filter((m) => m.email !== data.member.email),
          data.member,
        ]);
        setInvite({ email: "", name: "", role: "Member" });
        setInviteOpen(false);
      }
    } catch (err) {
      console.error("Invite failed:", err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!session || !workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/members/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      if (res.ok) {
        setTeam((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  return (
    <PageFade>
      <PageHeader
        eyebrow="WORKSPACE"
        title="Settings"
        subtitle="Company profile and AI policies"
      />

      <div className="grid grid-cols-1 min-[1000px]:grid-cols-[240px_1fr] gap-8">
        {/* Section nav */}
        <nav className="min-[1000px]:sticky min-[1000px]:top-6 h-max">
          <ul className="flex min-[1000px]:flex-col gap-1 overflow-x-auto pb-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-left transition-colors label-mono whitespace-nowrap",
                      isActive
                        ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-card border border-[var(--color-line)]"
                        : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-sunk)] border border-transparent",
                    )}
                  >
                    <Icon
                      size={15}
                      className={isActive ? "text-[var(--color-coral)]" : ""}
                    />
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Panels */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {active === "appearance" && (
                <Card className="p-7 space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                      Appearance & Visual Themes
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                      Choose your preferred visual aesthetic. Changes apply instantly across the entire platform.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                    {THEME_CONFIGS.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between group",
                            isSelected
                              ? "border-[var(--color-coral)] ring-4 ring-[var(--color-coral)]/15 shadow-md scale-[1.01]"
                              : "border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:shadow-sm",
                          )}
                          style={{ backgroundColor: "var(--color-surface)" }}
                        >
                          {/* Visual Mini Mockup Preview */}
                          <div
                            className="w-full h-32 rounded-xl p-2.5 flex flex-col justify-between border overflow-hidden relative mb-4 transition-transform group-hover:scale-[1.01]"
                            style={{
                              backgroundColor: t.previewBg,
                              borderColor: t.previewBorder,
                              boxShadow: t.id === "retro" ? "2px 2px 0px #000" : undefined,
                            }}
                          >
                            {/* Mini App Header */}
                            <div
                              className="w-full h-4 rounded px-2 flex items-center justify-between border"
                              style={{
                                backgroundColor: t.previewCard,
                                borderColor: t.previewBorder,
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: t.previewAccent }}
                                />
                                <div
                                  className="w-8 h-1 rounded"
                                  style={{ backgroundColor: t.previewText, opacity: 0.7 }}
                                />
                              </div>
                              <div
                                className="w-3 h-1 rounded-full"
                                style={{ backgroundColor: t.previewBorder }}
                              />
                            </div>

                            {/* Mini Layout Mockup: Sidebar + Content */}
                            <div className="flex gap-2 flex-1 mt-1.5 min-h-0">
                              {/* Mini Sidebar */}
                              <div
                                className="w-1/4 h-full rounded border p-1 flex flex-col gap-1"
                                style={{
                                  backgroundColor: t.id === "retro" ? "#97ccaf" : t.previewCard,
                                  borderColor: t.previewBorder,
                                }}
                              >
                                <div
                                  className="w-full h-1.5 rounded"
                                  style={{ backgroundColor: t.id === "retro" ? "#000" : t.previewAccent }}
                                />
                                <div
                                  className="w-3/4 h-1 rounded"
                                  style={{ backgroundColor: t.previewText, opacity: 0.4 }}
                                />
                                <div
                                  className="w-1/2 h-1 rounded"
                                  style={{ backgroundColor: t.previewText, opacity: 0.3 }}
                                />
                              </div>

                              {/* Mini Content Area */}
                              <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                                <div
                                  className="w-full h-9 rounded border p-1.5 flex items-center justify-between"
                                  style={{
                                    backgroundColor: t.previewCard,
                                    borderColor: t.previewBorder,
                                    boxShadow: t.id === "retro" ? "1.5px 1.5px 0px #000" : undefined,
                                  }}
                                >
                                  <div className="space-y-0.5">
                                    <div
                                      className="w-10 h-1.5 rounded"
                                      style={{ backgroundColor: t.previewText }}
                                    />
                                    <div
                                      className="w-6 h-1 rounded"
                                      style={{ backgroundColor: t.previewText, opacity: 0.4 }}
                                    />
                                  </div>
                                  <div
                                    className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                    style={{
                                      backgroundColor: t.previewAccent,
                                      color: t.id === "retro" ? "#000" : "#fff",
                                    }}
                                  >
                                    AI
                                  </div>
                                </div>

                                <div
                                  className="w-full h-6 rounded border p-1 flex items-center gap-1"
                                  style={{
                                    backgroundColor: t.previewCard,
                                    borderColor: t.previewBorder,
                                  }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: t.previewAccent }}
                                  />
                                  <div
                                    className="w-12 h-1 rounded"
                                    style={{ backgroundColor: t.previewText, opacity: 0.5 }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Theme Info & Selection Indicator */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-[var(--color-ink)]">
                                {t.name}
                              </span>
                              {isSelected ? (
                                <Badge tone="coral" className="py-0.5 px-2 text-[10px] font-bold">
                                  <Check size={11} className="mr-0.5" /> Active
                                </Badge>
                              ) : (
                                <span className="text-xs text-[var(--color-ink-faint)] group-hover:text-[var(--color-coral)] transition-colors">
                                  Click to apply
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
                              {t.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {active === "profile" && (
                <Card className="p-7 space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                      Business Profile
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                      How NOVA represents your company to AI buyers.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Business name">
                      <input
                        className={inputCls}
                        value={profile.name}
                        onChange={(e) =>
                          setProfile({ ...profile, name: e.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="Merchant Business & Industry Category"
                      helper="Type or select your business category (NOVA automatically adapts to your exact business)"
                    >
                      <input
                        className={inputCls}
                        value={profile.category}
                        onChange={(e) =>
                          setProfile({ ...profile, category: e.target.value })
                        }
                        placeholder="e.g., Manufacturing, Wholesale Trading, FMCG, Electronics, Textiles"
                      />
                    </Field>
                  </div>

                  <Field
                    label="Primary Products Offered"
                    helper="List your main commodities, products, or commercial services"
                  >
                    <input
                      className={inputCls}
                      value={profile.primaryProducts}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          primaryProducts: e.target.value,
                        })
                      }
                      placeholder="e.g. Industrial Equipment, Organic Goods, Cotton Fabrics, Electronic Parts"
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Region / Location">
                      <input
                        className={inputCls}
                        value={profile.region}
                        onChange={(e) =>
                          setProfile({ ...profile, region: e.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="GST / Registration"
                      helper="Used on quotes and invoices"
                    >
                      <input
                        className={inputCls}
                        value={profile.gst}
                        onChange={(e) =>
                          setProfile({ ...profile, gst: e.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <Field
                    label="Company & Product Description"
                    helper="Describe what your company produces or sells"
                  >
                    <textarea
                      rows={3}
                      className={cn(inputCls, "h-auto py-3 resize-none")}
                      value={profile.about}
                      onChange={(e) =>
                        setProfile({ ...profile, about: e.target.value })
                      }
                    />
                  </Field>
                  <SaveBar onSave={saveProfile} />
                </Card>
              )}

              {active === "team" && (
                <Card className="p-7 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                        Team
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                        People with access to this workspace.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setInviteOpen(true)}>
                      <Plus size={15} />
                      Invite member
                    </Button>
                  </div>
                  <div className="divide-y divide-[var(--color-line)]">
                    {loadingTeam ? (
                      <div className="py-8 text-center text-sm text-[var(--color-ink-faint)]">
                        Loading workspace team members...
                      </div>
                    ) : team.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[var(--color-ink-faint)]">
                        No team members added yet. Click "Invite member" to add
                        teammates.
                      </div>
                    ) : (
                      team.map((m) => (
                        <div
                          key={m.id || m.email}
                          className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                        >
                          <Avatar initials={m.initials} className="h-10 w-10" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[var(--color-ink)] flex items-center gap-2">
                              {m.name}
                              {m.email === session?.user?.email && (
                                <Badge tone="sage">You</Badge>
                              )}
                            </div>
                            <div className="text-[13px] text-[var(--color-ink-faint)] truncate">
                              {m.email}
                            </div>
                          </div>
                          <Badge
                            tone={m.role === "Owner" ? "coral" : "neutral"}
                          >
                            {m.role}
                          </Badge>
                          {m.role !== "Owner" && (
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-[var(--color-ink-faint)] hover:text-[var(--color-rose)] transition-colors p-1"
                              title="Remove team member"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              )}

              {active === "nova" && (
                <Card className="p-7 space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                      NOVA Preferences
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                      Control how proactive your AI teammate is.
                    </p>
                  </div>
                  <div>
                    <ToggleRow
                      label="Proactive insights"
                      desc="NOVA surfaces opportunities and risks without being asked."
                      checked={novaPrefs.insights}
                      onChange={(v) =>
                        setNovaPrefs({ ...novaPrefs, insights: v })
                      }
                    />
                    <ToggleRow
                      label="Daily brief email"
                      desc="A morning summary of activity, deals, and things needing attention."
                      checked={novaPrefs.brief}
                      onChange={(v) => setNovaPrefs({ ...novaPrefs, brief: v })}
                    />
                    <ToggleRow
                      label="Auto-research opportunities"
                      desc="Let NOVA research buyers and segments in the background."
                      checked={novaPrefs.research}
                      onChange={(v) =>
                        setNovaPrefs({ ...novaPrefs, research: v })
                      }
                    />
                    <ToggleRow
                      label="Require approval before outreach"
                      desc="NOVA drafts outreach but waits for your sign-off before sending."
                      checked={novaPrefs.approval}
                      onChange={(v) =>
                        setNovaPrefs({ ...novaPrefs, approval: v })
                      }
                    />
                  </div>
                  <SaveBar onSave={() => {}} />
                </Card>
              )}

              {active === "commerce" && (
                <div className="space-y-5">
                  <Card className="p-7 space-y-6">
                    <div>
                      <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                        Commerce Policies
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                        The commercial guardrails NOVA operates within.
                      </p>
                    </div>

                    <div>
                      <div className="label-mono text-[var(--color-coral-ink)] mb-4">
                        Pricing Guardrails
                      </div>
                      <div className="grid sm:grid-cols-3 gap-5">
                        <Field label="Minimum price" helper="Per unit, in ₹.">
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-faint)]">
                              ₹
                            </span>
                            <input
                              inputMode="numeric"
                              className={cn(inputCls, "pl-7")}
                              value={policies.minPrice}
                              onChange={(e) =>
                                setPolicies({
                                  ...policies,
                                  minPrice: e.target.value,
                                })
                              }
                            />
                          </div>
                        </Field>
                        <Field
                          label="Maximum discount"
                          helper="Cap NOVA can offer."
                        >
                          <div className="relative">
                            <input
                              inputMode="numeric"
                              className={cn(inputCls, "pr-8")}
                              value={policies.maxDiscount}
                              onChange={(e) =>
                                setPolicies({
                                  ...policies,
                                  maxDiscount: e.target.value,
                                })
                              }
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-faint)]">
                              %
                            </span>
                          </div>
                        </Field>
                        <Field
                          label="Min order quantity"
                          helper="Smallest deal size."
                        >
                          <input
                            inputMode="numeric"
                            className={inputCls}
                            value={policies.minOrderQty}
                            onChange={(e) =>
                              setPolicies({
                                ...policies,
                                minOrderQty: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="border-t border-[var(--color-line)] pt-6">
                      <div className="label-mono text-[var(--color-coral-ink)] mb-4">
                        Approval Rules
                      </div>
                      <Field
                        label="Escalate to me"
                        helper="Deals matching this rule always need your approval before closing."
                      >
                        <input
                          className={inputCls}
                          value={policies.approvalRule}
                          onChange={(e) =>
                            setPolicies({
                              ...policies,
                              approvalRule: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>

                    <div className="border-t border-[var(--color-line)] pt-2">
                      <div className="label-mono text-[var(--color-coral-ink)] mb-1 mt-4">
                        AI Commerce Capabilities
                      </div>
                      <ToggleRow
                        label="AI Discovery"
                        desc="Allow AI buyer agents to discover your compatible offers."
                        checked={policies.discovery}
                        onChange={(v) =>
                          setPolicies({ ...policies, discovery: v })
                        }
                      />
                      <ToggleRow
                        label="AI Negotiation"
                        desc="Let NOVA negotiate autonomously within the guardrails above."
                        checked={policies.negotiation}
                        onChange={(v) =>
                          setPolicies({ ...policies, negotiation: v })
                        }
                      />
                    </div>

                    <SaveBar onSave={() => {}} />
                  </Card>
                </div>
              )}

              {active === "notifications" && (
                <Card className="p-7 space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                      Notifications
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                      Choose how you want to hear from NOVA.
                    </p>
                  </div>
                  <div>
                    <ToggleRow
                      label="Email"
                      desc="Deal updates and approvals delivered to your inbox."
                      checked={notifs.email}
                      onChange={(v) => setNotifs({ ...notifs, email: v })}
                    />
                    <ToggleRow
                      label="In-app"
                      desc="Real-time alerts inside the workspace."
                      checked={notifs.inApp}
                      onChange={(v) => setNotifs({ ...notifs, inApp: v })}
                    />
                    <ToggleRow
                      label="Weekly digest"
                      desc="A Monday roundup of performance and pipeline."
                      checked={notifs.digest}
                      onChange={(v) => setNotifs({ ...notifs, digest: v })}
                    />
                  </div>
                  <SaveBar onSave={() => {}} />
                </Card>
              )}

              {active === "security" && (
                <Card className="p-7 space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                      Security
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                      Keep your workspace protected.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <Field label="Current password">
                      <input
                        type="password"
                        placeholder="••••••••"
                        className={inputCls}
                        value={security.current}
                        onChange={(e) =>
                          setSecurity({ ...security, current: e.target.value })
                        }
                      />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="New password">
                        <input
                          type="password"
                          placeholder="••••••••"
                          className={inputCls}
                          value={security.next}
                          onChange={(e) =>
                            setSecurity({ ...security, next: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Confirm password">
                        <input
                          type="password"
                          placeholder="••••••••"
                          className={inputCls}
                          value={security.confirm}
                          onChange={(e) =>
                            setSecurity({
                              ...security,
                              confirm: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="border-t border-[var(--color-line)] pt-2">
                    <ToggleRow
                      label="Two-factor authentication"
                      desc="Require a verification code at sign-in for extra protection."
                      checked={security.twoFactor}
                      onChange={(v) =>
                        setSecurity({ ...security, twoFactor: v })
                      }
                    />
                  </div>
                  <div>
                    <div className="label-mono text-[var(--color-ink-faint)] mb-3">
                      Active sessions
                    </div>
                    <div className="space-y-2">
                      {[
                        { device: "MacBook Pro · Mumbai", current: true },
                        { device: "iPhone 15 · Mumbai", current: false },
                      ].map((s) => (
                        <div
                          key={s.device}
                          className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] px-4 py-3"
                        >
                          <span className="text-sm text-[var(--color-ink)]">
                            {s.device}
                          </span>
                          {s.current ? (
                            <Badge tone="sage" dot>
                              This device
                            </Badge>
                          ) : (
                            <button className="text-[13px] text-[var(--color-rose)] hover:underline">
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <SaveBar onSave={() => {}} />
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-5">
          <Field label="Full name (optional)">
            <input
              type="text"
              placeholder="e.g. Priya Nair"
              className={inputCls}
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
            />
          </Field>
          <Field label="Work email">
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
              />
              <input
                type="email"
                required
                placeholder="teammate@company.com"
                className={cn(inputCls, "pl-10")}
                value={invite.email}
                onChange={(e) =>
                  setInvite({ ...invite, email: e.target.value })
                }
              />
            </div>
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value })}
            >
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
            </select>
          </Field>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? "Adding..." : "Send invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageFade>
  );
}
