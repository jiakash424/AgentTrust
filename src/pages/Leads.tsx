import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Building2,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Mail,
  X,
  ExternalLink,
} from "lucide-react";
import {
  PageFade,
  PageHeader,
  Card,
  Badge,
  Button,
  Segmented,
  Drawer,
} from "../components/ui";
import { GmailConnectModal } from "../components/GmailConnectModal";
import { type Lead } from "../lib/data";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

type Tone = "coral" | "iris" | "sage" | "amber" | "neutral" | "rose";

const statusMeta: Record<Lead["status"], { tone: Tone; label: string }> = {
  new: { tone: "iris", label: "New" },
  researching: { tone: "amber", label: "Researching" },
  qualified: { tone: "sage", label: "Qualified" },
  contacted: { tone: "neutral", label: "Contacted" },
};

const filters = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "researching", label: "Researching" },
  { id: "qualified", label: "Qualified" },
  { id: "contacted", label: "Contacted" },
];

function scoreTone(score: number): { color: string; label: string } {
  if (score >= 85) return { color: "var(--color-sage)", label: "Strong match" };
  if (score >= 70) return { color: "var(--color-amber)", label: "Good match" };
  return { color: "var(--color-ink-faint)", label: "Fair match" };
}

function ScoreDial({ score, size = 52 }: { score: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone = scoreTone(score);
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
          stroke={tone.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span
        className="absolute font-semibold text-[13px]"
        style={{ color: tone.color }}
      >
        {score}
      </span>
    </div>
  );
}

function FactRow({ fact }: { fact: Lead["facts"][number] }) {
  if (fact.type === "fact") {
    return (
      <li className="flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-line)]">
        <CheckCircle2
          size={16}
          className="mt-0.5 shrink-0 text-[var(--color-ink-soft)]"
        />
        <div>
          <span className="label-mono text-[var(--color-ink-faint)]">Fact</span>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed">
            {fact.text}
          </p>
        </div>
      </li>
    );
  }
  if (fact.type === "insight") {
    return (
      <li className="flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-[var(--color-coral-soft)] border border-[var(--color-coral)]/20">
        <Sparkles
          size={16}
          className="mt-0.5 shrink-0 text-[var(--color-coral)]"
        />
        <div>
          <span className="label-mono text-[var(--color-coral-ink)]">
            Insight
          </span>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed">
            {fact.text}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 border border-dashed border-[var(--color-line-strong)]">
      <HelpCircle
        size={16}
        className="mt-0.5 shrink-0 text-[var(--color-ink-faint)]"
      />
      <div>
        <span className="label-mono text-[var(--color-ink-faint)]">
          Unknown
        </span>
        <p className="text-sm text-[var(--color-ink-faint)] leading-relaxed">
          {fact.text}
        </p>
      </div>
    </li>
  );
}

function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const stat = statusMeta[lead.status];
  return (
    <Card
      hover
      onClick={onOpen}
      className="group cursor-pointer p-5 flex items-center gap-5 lead-row"
    >
      <ScoreDial score={lead.matchScore} />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg text-[var(--color-ink)] truncate">
          {lead.company}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--color-ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} className="text-[var(--color-ink-faint)]" />
            {lead.industry}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} className="text-[var(--color-ink-faint)]" />
            {lead.location}
          </span>
          {lead.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail size={13} className="text-[var(--color-ink-faint)]" />
              {lead.email}
            </span>
          )}
        </div>
      </div>
      <div className="hidden sm:block text-right">
        <div className="label-mono text-[var(--color-ink-faint)]">
          Potential
        </div>
        <div className="font-serif text-lg text-[var(--color-coral-ink)]">
          {lead.potential}
        </div>
      </div>
      <Badge tone={stat.tone} dot>
        {stat.label}
      </Badge>
      <ArrowRight
        size={18}
        className="shrink-0 text-[var(--color-ink-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-coral)]"
      />
    </Card>
  );
}

export default function Leads() {
  const { session, workspaceId } = useAuth();
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<Lead | null>(null);

  // Real data state (using static leads as a base, but outreach uses actual API)
  const [outreach, setOutreach] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [emailConnectionId, setEmailConnectionId] = useState<string | null>(
    null,
  );
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [realLeads, setRealLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!session || !workspaceId) {
      setLoadingLeads(false);
      return;
    }

    setLoadingLeads(true);
    setLeadsError(null);
    try {
      const rawData = await fetchApi<any[]>("/api/leads", {
        session,
        workspaceId,
      });
      const mapped = rawData.map((l) => ({
        id: l.id,
        company: l.name,
        website: l.website || "",
        industry: l.industry || "Unknown",
        location: l.location || "Unknown",
        matchScore: l.matchScore || 0,
        email: l.publicEmail || "",
        potential:
          l.matchScore > 85 ? "High" : l.matchScore > 70 ? "Medium" : "Low",
        status:
          l.status === "QUALIFIED"
            ? "qualified"
            : l.status === "RESEARCHING"
              ? "researching"
              : "new",
        facts: [
          {
            type: "fact",
            text: `Discovered via ${l.sources?.[0]?.sourceType || "AI Search"}`,
          },
          ...(l.description ? [{ type: "insight", text: l.description }] : []),
        ],
      }));
      setRealLeads(mapped as Lead[]);
    } catch (err: any) {
      setLeadsError(err.message || "Failed to load leads");
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const handleUpdate = () => fetchLeads();
    window.addEventListener("opportunitiesUpdated", handleUpdate);
    return () =>
      window.removeEventListener("opportunitiesUpdated", handleUpdate);
  }, [session, workspaceId]);

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  const visible =
    filter === "all" ? realLeads : realLeads.filter((l) => l.status === filter);

  useEffect(() => {
    if (session && workspaceId) {
      fetch("/api/integrations/gmail/status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.connection?.status === "CONNECTED") {
            setEmailConnectionId(d.connection.id);
          }
        })
        .catch(console.error);
    }
  }, [session, workspaceId]);

  function close() {
    setActive(null);
    setOutreach(null);
    setEditing(false);
    setError(null);
  }

  async function generateOutreach() {
    if (!active || !session || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      // In a real app we'd map our active.id to a real database lead ID. For now assume it works if we have one.
      // E.g. we might have to fetch the lead list from backend. Let's just assume active.id is valid or fallback to mock if API fails.
      const res = await fetch(`/api/leads/${active.id}/outreach/draft`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate outreach");

      setOutreach(data.outreach);
      setEditSubject(data.outreach.subject);
      setEditBody(data.outreach.body);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!outreach || !session || !workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach/${outreach.id}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save edit");

      setOutreach(data.outreach);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!outreach || !session || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/outreach/${outreach.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          emailConnectionId: emailConnectionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");

      setOutreach(data.outreach);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getMailtoUrl = () => {
    if (!outreach || !active) return "#";
    const recipient = active.email || "";
    const subject = encodeURIComponent(outreach.subject || "");
    const body = encodeURIComponent(outreach.body || "");
    return `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  async function handleSend() {
    if (!outreach || !session || !workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach/${outreach.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setOutreach(data.outreach);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stat = active ? statusMeta[active.status] : null;
  const tone = active ? scoreTone(active.matchScore) : null;

  return (
    <PageFade>
      <PageHeader
        eyebrow="OUTREACH"
        title="Leads"
        subtitle="Businesses worth reaching out to"
        actions={
          <Segmented options={filters} value={filter} onChange={setFilter} />
        }
      />

      {loadingLeads ? (
        <Card className="p-12 text-center">
          <p className="font-serif text-xl text-[var(--color-ink)]">
            Loading leads...
          </p>
        </Card>
      ) : leadsError ? (
        <Card className="p-12 text-center">
          <p className="font-serif text-xl text-[var(--color-ink)] text-red-600 mb-2">
            Failed to load leads
          </p>
          <p className="text-sm text-[var(--color-ink-soft)] mb-4">
            {leadsError}
          </p>
          <Button onClick={fetchLeads}>Retry</Button>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto flex flex-col items-center">
          <h2 className="font-serif text-2xl text-[var(--color-ink)] mb-2">
            No opportunities yet
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
            NOVA hasn't discovered any opportunities for your workspace yet.
            Analyze your inventory to find and qualify real potential buyers.
          </p>
          <Button
            onClick={() =>
              (window.location.href =
                "/app?q=Discover B2B buyers for my inventory")
            }
          >
            Discover opportunities
          </Button>
          <p className="text-xs text-[var(--color-ink-faint)] mt-4">
            You can connect your email later when you're ready to send outreach
            and manage follow-ups.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((lead) => (
            <LeadRow key={lead.id} lead={lead} onOpen={() => setActive(lead)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && stat && tone && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-black/15 transition-opacity"
            />

            {/* Centered Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-2xl z-50 flex flex-col max-h-[88vh] rounded-[var(--radius-xl)] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 px-6 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-start justify-between gap-4 shrink-0">
                <div className="min-w-0 pr-4">
                  <h2 className="font-serif text-2xl text-[var(--color-ink)] leading-snug">
                    {active.company}
                  </h2>
                  <div className="text-xs text-[var(--color-ink-soft)] mt-1 flex flex-wrap items-center gap-2">
                    <span>{active.industry}</span>
                    <span>·</span>
                    <span>{active.location}</span>
                    {active.email && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-[var(--color-coral-ink)]">
                          {active.email}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="coral">{active.matchScore}% MATCH</Badge>
                    <Badge tone={stat.tone} dot>
                      {stat.label}
                    </Badge>
                  </div>
                  <button
                    onClick={close}
                    className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors p-1.5 rounded-full hover:bg-[var(--color-bg-sunk)]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* 2-Column Body Grid */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Business Intelligence */}
                <div className="space-y-5 lg:border-r lg:border-[var(--color-line)] lg:pr-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3 text-center">
                      <div
                        className="font-serif text-2xl"
                        style={{ color: tone.color }}
                      >
                        {active.matchScore}%
                      </div>
                      <div className="label-mono text-[var(--color-ink-faint)] mt-1">
                        Match
                      </div>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3 text-center">
                      <div className="font-serif text-lg text-[var(--color-coral-ink)] leading-tight mt-1">
                        {active.potential}
                      </div>
                      <div className="label-mono text-[var(--color-ink-faint)] mt-1">
                        Potential
                      </div>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3 flex flex-col items-center justify-center gap-2">
                      <Badge tone={stat.tone} dot>
                        {stat.label}
                      </Badge>
                      <div className="label-mono text-[var(--color-ink-faint)]">
                        Status
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="label-mono text-[var(--color-ink)] mb-3 font-semibold uppercase tracking-wider text-xs">
                      Why this lead?
                    </div>
                    <ul className="space-y-2.5">
                      {active.facts.map((f, i) => (
                        <FactRow key={i} fact={f} />
                      ))}
                    </ul>
                  </div>

                  {active.website && (
                    <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] flex items-center justify-between">
                      <span className="text-xs text-[var(--color-ink-faint)] font-medium">
                        Official Website
                      </span>
                      <a
                        href={active.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--color-coral-ink)] font-semibold hover:underline flex items-center gap-1"
                      >
                        {active.website.replace(/^https?:\/\//, "")}{" "}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column: Outreach & Actions */}
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded text-sm border border-red-100">
                      {error}
                    </div>
                  )}

                  {!outreach ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)] flex items-center justify-center">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-[var(--color-ink)]">
                          Personalized Sales Outreach
                        </h3>
                        <p className="text-xs text-[var(--color-ink-soft)] max-w-xs mt-1">
                          Let NOVA analyze this verified buyer profile and draft
                          a custom B2B sales email pitch.
                        </p>
                      </div>
                      <Button
                        onClick={generateOutreach}
                        disabled={loading}
                        className="w-full max-w-xs h-11"
                      >
                        <Sparkles size={16} />
                        {loading ? "Generating..." : "Generate Outreach Draft"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="label-mono text-[var(--color-ink)] font-semibold uppercase tracking-wider text-xs">
                        Personalized Draft ({outreach.status})
                      </div>

                      <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-4 border border-[var(--color-line)] space-y-3">
                        {editing ? (
                          <>
                            <div>
                              <label className="text-xs text-[var(--color-ink-soft)] block mb-1">
                                Subject
                              </label>
                              <input
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                className="w-full text-sm border rounded p-2"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--color-ink-soft)] block mb-1">
                                Body
                              </label>
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                className="w-full text-sm border rounded p-2 h-44"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditing(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={loading}
                              >
                                Save
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="text-xs text-[var(--color-ink-faint)]">
                                Subject
                              </div>
                              <div className="font-medium text-sm text-[var(--color-ink)] mt-0.5">
                                {outreach.subject}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-[var(--color-ink-faint)]">
                                Body
                              </div>
                              <div className="text-sm text-[var(--color-ink-soft)] whitespace-pre-wrap mt-1 max-h-48 overflow-y-auto">
                                {outreach.body}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {outreach.personalizationReason && (
                        <div className="text-xs text-[var(--color-ink-soft)] italic">
                          AI Note: {outreach.personalizationReason}
                        </div>
                      )}

                      {!editing && outreach.status === "SENT" && (
                        <div className="bg-[var(--color-sage-soft)] text-[var(--color-sage)] p-3 rounded font-medium text-sm text-center">
                          Email successfully sent!
                        </div>
                      )}

                      {!editing && outreach.status !== "SENT" && (
                        <div className="space-y-3 pt-2">
                          {outreach.status === "APPROVED" ? (
                            <div className="space-y-2.5">
                              <div className="p-3 rounded bg-[var(--color-sage-soft)] text-[var(--color-sage)] text-xs font-medium">
                                ✓ Draft Approved & Listed in Outreach Queue
                              </div>
                              {emailConnectionId ? (
                                <Button
                                  className="w-full"
                                  onClick={handleSend}
                                  disabled={loading}
                                >
                                  Send via Connected Gmail
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setConnectModalOpen(true)}
                                >
                                  Connect Gmail for Auto-Sending
                                </Button>
                              )}
                              <a
                                href={getMailtoUrl()}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-bg-sunk)] transition-colors"
                              >
                                <Mail
                                  size={15}
                                  className="text-[var(--color-coral)]"
                                />{" "}
                                Open Direct in Mail App / Gmail
                              </a>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setEditing(true)}
                                >
                                  Edit draft
                                </Button>
                                <Button
                                  className="flex-1 bg-[var(--color-sage)] text-white hover:bg-[var(--color-sage)]/90 border-transparent"
                                  onClick={handleApprove}
                                  disabled={loading}
                                >
                                  Approve draft
                                </Button>
                              </div>
                              <a
                                href={getMailtoUrl()}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                              >
                                <Mail size={14} /> Open in Direct Mail App
                                (mailto:)
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GmailConnectModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onConnected={(email) => {
          setEmailConnectionId("connected");
          setConnectModalOpen(false);
        }}
      />
    </PageFade>
  );
}
