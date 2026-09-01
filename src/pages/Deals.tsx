import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Check,
  Sparkles,
  X,
  RefreshCw,
  Building2,
  Package,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  PageFade,
  PageHeader,
  StatusDot,
} from "../components/ui";
import { formatINR } from "../lib/data";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

type Tone = "coral" | "iris" | "sage" | "amber" | "neutral" | "rose";

interface StageMeta {
  id: string; // RESEARCHING, QUALIFIED, QUOTE_SENT, NEGOTIATING, WON, LOST
  label: string;
  tone: Tone;
  accent: string;
}

const STAGES: StageMeta[] = [
  {
    id: "RESEARCHING",
    label: "Researching",
    tone: "neutral",
    accent: "var(--color-ink-faint)",
  },
  {
    id: "QUALIFIED",
    label: "Qualified",
    tone: "iris",
    accent: "var(--color-iris)",
  },
  {
    id: "QUOTE_SENT",
    label: "Quote Sent",
    tone: "amber",
    accent: "var(--color-amber)",
  },
  {
    id: "NEGOTIATING",
    label: "Negotiating",
    tone: "coral",
    accent: "var(--color-coral)",
  },
  { id: "WON", label: "Won", tone: "sage", accent: "var(--color-sage)" },
  { id: "LOST", label: "Lost", tone: "rose", accent: "var(--color-rose)" },
];

function stageMeta(stageStr: string): StageMeta {
  const normalized = (stageStr || "").toUpperCase();
  if (normalized === "QUOTE-SENT" || normalized === "OUTREACH_SENT")
    return STAGES[2];
  if (normalized === "APPROVAL-NEEDED") return STAGES[3];
  return STAGES.find((s) => s.id === normalized) ?? STAGES[1];
}

function DealCard({ deal, onOpen }: { deal: any; onOpen: (d: any) => void }) {
  const meta = stageMeta(deal.stage);
  return (
    <Card
      hover
      onClick={() => onOpen(deal)}
      className="p-4 cursor-pointer hover:border-[var(--color-coral)] transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-serif text-lg text-[var(--color-ink)] leading-tight truncate font-semibold">
          {deal.companyName || deal.title}
        </h3>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <p className="text-[13px] text-[var(--color-ink-soft)] flex items-center justify-between">
        <span>{deal.productName || "B2B Goods"}</span>
        <span className="text-[var(--color-ink-faint)] font-mono text-xs">
          Match: {deal.matchScore || 85}%
        </span>
      </p>

      <div className="font-serif text-2xl text-[var(--color-ink)] mt-3">
        {formatINR(deal.estimatedValue || 12000)}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--color-line)] text-[12px] leading-relaxed text-[var(--color-ink-faint)] space-y-1">
        <div className="truncate">
          <span className="text-[var(--color-coral-ink)] font-semibold">
            Action:{" "}
          </span>
          {deal.recommendedNextAction || "Prepare sales outreach"}
        </div>
      </div>
    </Card>
  );
}

export default function Deals() {
  const { session, workspaceId } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [stageCounts, setStageCounts] = useState<
    Record<string, { count: number; totalValue: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<any | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);

  const fetchDeals = async (isInitial = false) => {
    if (!session || !workspaceId) return;
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any>("/api/deals", {
        session,
        workspaceId,
      });
      const dealsList = Array.isArray(data)
        ? data
        : Array.isArray(data?.deals)
          ? data.deals
          : [];
      setDeals(dealsList);
      setStageCounts(data?.stageCounts || {});
    } catch (err: any) {
      setError(err.message || "Failed to load deals pipeline");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals(true);

    const handleUpdate = () => fetchDeals(false);
    window.addEventListener("dealsUpdated", handleUpdate);
    window.addEventListener("opportunitiesUpdated", handleUpdate);
    return () => {
      window.removeEventListener("dealsUpdated", handleUpdate);
      window.removeEventListener("opportunitiesUpdated", handleUpdate);
    };
  }, [session, workspaceId]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    if (!session || !workspaceId) return;
    setUpdatingStage(true);
    try {
      await fetchApi(`/api/deals/${dealId}/stage`, {
        method: "PATCH",
        session,
        workspaceId,
        body: { stage: newStage },
      });
      await fetchDeals();
      if (active && active.id === dealId) {
        setActive({ ...active, stage: newStage });
      }
    } catch (err: any) {
      setError(err.message || "Failed to update deal stage");
    } finally {
      setUpdatingStage(false);
    }
  };

  const totalPipelineValue = Object.values(stageCounts).reduce(
    (sum, sc) => sum + (sc.totalValue || 0),
    0,
  );

  return (
    <PageFade>
      <PageHeader
        eyebrow="PIPELINE"
        title="Deals Pipeline"
        subtitle="Connected pipeline automatically synced with discovered opportunities & active buyer conversations."
        actions={
          <Card className="px-4 py-2 flex items-center gap-3">
            <div>
              <div className="label-mono text-[var(--color-ink-faint)] text-xs">
                Total Pipeline Value
              </div>
              <div className="font-serif text-xl text-[var(--color-ink)] font-bold leading-tight">
                {formatINR(totalPipelineValue)}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchDeals}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </Card>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-[var(--radius-md)] border border-red-100 text-sm">
          {error}
        </div>
      )}

      {loading && deals.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-serif text-xl text-[var(--color-ink)]">
            Loading deals pipeline...
          </p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 max-[1000px]:snap-x max-[1000px]:snap-mandatory">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => {
              const norm = (d.stage || "").toUpperCase();
              if (stage.id === "QUOTE_SENT")
                return (
                  norm === "QUOTE_SENT" ||
                  norm === "QUOTE-SENT" ||
                  norm === "OUTREACH_SENT"
                );
              if (stage.id === "NEGOTIATING")
                return norm === "NEGOTIATING" || norm === "APPROVAL-NEEDED";
              return norm === stage.id;
            });
            const stats = stageCounts[stage.id] || {
              count: stageDeals.length,
              totalValue: stageDeals.reduce(
                (acc, x) => acc + (x.estimatedValue || 0),
                0,
              ),
            };

            return (
              <div
                key={stage.id}
                className="shrink-0 w-[310px] max-[560px]:w-[85vw] max-[1000px]:snap-start"
              >
                <div className="rounded-[var(--radius-md)] overflow-hidden mb-3 border border-[var(--color-line)] bg-[var(--color-surface-2)]">
                  <div className="h-1" style={{ background: stage.accent }} />
                  <div className="flex items-center justify-between px-3.5 py-3">
                    <div>
                      <span className="label-mono text-[var(--color-ink)] font-bold">
                        {stage.label}
                      </span>
                      <div className="text-[11px] text-[var(--color-ink-faint)]">
                        {formatINR(stats.totalValue)}
                      </div>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-[var(--color-bg-sunk)] text-[11px] font-bold text-[var(--color-ink)]">
                      {stageDeals.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {stageDeals.map((d) => (
                    <DealCard key={d.id} deal={d} onOpen={setActive} />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] py-8 text-center text-[12px] text-[var(--color-ink-faint)]">
                      No active deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Centered Modal Dialog for Deal Details */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[var(--radius-lg)] shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={stageMeta(active.stage).tone}>
                      {stageMeta(active.stage).label}
                    </Badge>
                    <span className="text-xs text-[var(--color-ink-faint)] font-mono">
                      ID: {active.id.slice(-6)}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl text-[var(--color-ink)] font-bold">
                    {active.companyName || active.title}
                  </h2>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="p-1.5 rounded-full hover:bg-[var(--color-surface-2)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Commercial Terms */}
                <div className="space-y-4">
                  <div className="label-mono text-xs text-[var(--color-ink-faint)] uppercase tracking-wider">
                    Commercial Terms & Opportunity
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4 bg-[var(--color-surface-2)]/50 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-[var(--color-line)]/50">
                      <span className="text-[var(--color-ink-soft)]">
                        Product Fit:
                      </span>
                      <span className="font-medium text-[var(--color-ink)]">
                        {active.productName || "B2B Goods"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--color-line)]/50">
                      <span className="text-[var(--color-ink-soft)]">
                        Estimated Volume:
                      </span>
                      <span className="font-medium text-[var(--color-ink)]">
                        {active.estimatedQuantity || 100} units
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--color-line)]/50">
                      <span className="text-[var(--color-ink-soft)]">
                        Estimated Deal Value:
                      </span>
                      <span className="font-serif text-base text-[var(--color-ink)]">
                        {formatINR(active.estimatedValue || 12000)}
                      </span>
                    </div>
                    {active.proposedPrice && (
                      <div className="flex justify-between py-1 border-b border-[var(--color-line)]/50 text-[var(--color-coral-ink)] font-semibold">
                        <span>Buyer Proposed Unit Price:</span>
                        <span>₹{active.proposedPrice.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-[var(--color-ink-soft)]">
                        Opportunity Match Score:
                      </span>
                      <span className="font-bold text-[var(--color-sage)]">
                        {active.matchScore || 85}% Match
                      </span>
                    </div>
                  </div>

                  {/* Stage Switcher */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider block">
                      Move Deal Pipeline Stage:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.map((s) => (
                        <button
                          key={s.id}
                          disabled={updatingStage}
                          onClick={() => handleStageChange(active.id, s.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            (active.stage || "").toUpperCase() === s.id
                              ? "bg-[var(--color-ink)] text-[var(--color-surface)] border-[var(--color-ink)]"
                              : "bg-[var(--color-surface)] text-[var(--color-ink-soft)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2: NOVA Recommendation & Conversation */}
                <div className="space-y-4">
                  <div className="label-mono text-xs text-[var(--color-ink-faint)] uppercase tracking-wider">
                    NOVA Strategy & Next Steps
                  </div>
                  <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-4 border border-[var(--color-coral)]/30 space-y-3">
                    <div className="flex items-center gap-2 text-[var(--color-coral-ink)] font-semibold text-xs">
                      <Sparkles size={16} />
                      <span>RECOMMENDED ACTION</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--color-ink)]">
                      {active.recommendedNextAction ||
                        "Prepare sales outreach and share bulk pricing tiers with decision maker."}
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setActive(null)}>
                      Close
                    </Button>
                    <Button
                      onClick={() =>
                        (window.location.href = "/app/conversations")
                      }
                    >
                      Open Conversations Thread <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageFade>
  );
}
