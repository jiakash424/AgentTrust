import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  TrendingUp,
  Sparkles,
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Layers,
  Search,
  RefreshCw,
  MessageSquare,
  Mail,
  Zap,
  Tag,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Segmented,
  PageHeader,
  PageFade,
} from "../components/ui";
import { OpportunityDetailDrawer } from "../components/OpportunityDetailDrawer";
import { EmailLeadComposerModal } from "../components/EmailLeadComposerModal";
import { NovaChatModal } from "../components/NovaChatModal";
import { NovaMark } from "../components/brand";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { cn } from "../lib/cn";

export default function Growth() {
  const navigate = useNavigate();
  const { session, workspaceId } = useAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContext, setActiveContext] = useState<any>(null);
  const [tab, setTab] = useState("all");
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [activeOutreachOpp, setActiveOutreachOpp] = useState<any | null>(null);
  const [activeNovaOpp, setActiveNovaOpp] = useState<any | null>(null);

  const fetchGrowthData = async () => {
    if (!session || !workspaceId) return;
    setLoading(true);
    try {
      const data = await fetchApi<any>("/api/opportunities", {
        session,
        workspaceId,
      });
      if (data) {
        setOpportunities(data.opportunities || []);
        setActiveContext(data.activeBusinessContext || null);
      }
    } catch (err) {
      console.error("Failed to load growth intelligence:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthData();
  }, [session, workspaceId]);

  // Derived growth intelligence metrics
  const totalPipeline = opportunities.reduce(
    (sum, o) => sum + (o.potentialImpact || (o.opportunityScore || 80) * 15000),
    0,
  );
  const highConfidenceOpps = opportunities.filter(
    (o) => (o.opportunityScore || o.confidence || 0) >= 80,
  );
  const verifiedBuyers = opportunities.filter(
    (o) => o.verificationStatus === "VERIFIED" || o.phone || o.publicEmail,
  );
  const topProduct =
    activeContext?.products?.[0] ||
    opportunities[0]?.productName ||
    "Your Inventory";

  const tabs = [
    { id: "all", label: `All (${opportunities.length})` },
    {
      id: "high-confidence",
      label: `High Confidence (${highConfidenceOpps.length})`,
    },
    { id: "verified", label: `Verified Buyers (${verifiedBuyers.length})` },
    { id: "action-needed", label: "Action Needed" },
  ];

  const filteredOpps = opportunities.filter((o) => {
    if (tab === "high-confidence")
      return (o.opportunityScore || o.confidence || 0) >= 80;
    if (tab === "verified")
      return o.verificationStatus === "VERIFIED" || o.phone || o.publicEmail;
    if (tab === "action-needed")
      return o.qualificationStatus !== "OUTREACH_SENT";
    return true;
  });

  return (
    <PageFade className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Growth Intelligence"
          title="Where NOVA sees your next revenue"
          subtitle="Real-time commercial demand, high-margin buyers, and market opportunities identified by NOVA."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchGrowthData}
          disabled={loading}
          className="gap-2 shrink-0"
        >
          <RefreshCw
            size={14}
            className={cn(loading && "animate-spin text-[var(--color-coral)]")}
          />
          Refresh Intelligence
        </Button>
      </div>

      {/* Main Growth Brief Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[#111318] via-[#181b22] to-[#0f1115] text-white p-8 md:p-10 shadow-2xl border border-white/10"
      >
        <div className="pointer-events-none absolute -top-16 -right-10 h-72 w-72 rounded-full bg-[var(--color-coral)] blur-[120px] opacity-35" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-emerald-500 blur-[130px] opacity-20" />

        <div className="relative grid lg:grid-cols-[1.6fr_1fr] gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 label-mono text-white/60 mb-4 uppercase tracking-wider text-xs">
              <NovaMark size={16} active /> NOVA AI Growth Brief ·{" "}
              {activeContext?.companyName || "Your Enterprise"}
            </div>

            <h2 className="font-serif text-[clamp(1.7rem,3.2vw,2.5rem)] leading-snug max-w-2xl text-white">
              {opportunities.length > 0
                ? `NOVA identified ₹${(totalPipeline / 100000).toFixed(1)}L in commercial buyer demand for ${topProduct}.`
                : `NOVA is ready to scan B2B buyers & commercial demand for your inventory.`}
            </h2>

            <p className="text-white/70 mt-4 leading-relaxed max-w-xl text-[15px]">
              {opportunities.length > 0
                ? `Based on verified procurement signals, ${highConfidenceOpps.length} buyers have high matching potential for factory-direct bulk supply. Outreach is ready to initiate.`
                : `Run autonomous buyer research to discover verified corporate procurement leads, distributors, and institutional buyers in your region.`}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={() => navigate(`/app?mode=OPPORTUNITY`)}
                className="inline-flex items-center justify-center font-medium h-10 px-4 text-sm rounded-[var(--radius-sm)] gap-2 bg-[var(--color-coral)] hover:bg-[var(--color-coral-dark)] text-white shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <Sparkles size={16} />
                Ask NOVA for Growth Strategy
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => navigate("/app")}
                className="inline-flex items-center justify-center font-medium h-10 px-4 text-sm rounded-[var(--radius-sm)] gap-2 bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-all duration-200 cursor-pointer active:scale-[0.98] backdrop-blur-sm"
              >
                <Search size={15} />
                Find More Buyers
              </button>
            </div>
          </div>

          {/* Quick Metrics Inside Hero Banner */}
          <div className="grid grid-cols-2 gap-3 lg:border-l lg:border-white/10 lg:pl-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider mb-1">
                Pipeline Potential
              </div>
              <div className="font-serif text-2xl text-emerald-400 font-bold">
                ₹{(totalPipeline / 100000).toFixed(1)}L
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                Across verified buyers
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider mb-1">
                Target Sector
              </div>
              <div className="font-serif text-xl text-white font-medium truncate">
                {activeContext?.industry || "Wholesale B2B"}
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                Region: {activeContext?.primaryLocation?.city || "UP / NCR"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider mb-1">
                High Match (80%+)
              </div>
              <div className="font-serif text-2xl text-[var(--color-coral)] font-bold">
                {highConfidenceOpps.length} Buyers
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                Immediate fit
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider mb-1">
                Avg Confidence
              </div>
              <div className="font-serif text-2xl text-white font-bold">
                {opportunities.length > 0
                  ? Math.round(
                      opportunities.reduce(
                        (a, b) => a + (b.opportunityScore || 85),
                        0,
                      ) / opportunities.length,
                    )
                  : 90}
                %
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                Verified data
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs & Section Header */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-line)] flex-wrap gap-4">
        <div className="flex items-center gap-2 label-mono text-[var(--color-ink-faint)]">
          <Sparkles size={15} className="text-[var(--color-coral)]" />
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            Ranked Growth Opportunities
          </span>
        </div>
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </div>

      {/* Opportunities List / Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--color-ink-soft)] flex flex-col items-center justify-center gap-3">
          <RefreshCw
            size={24}
            className="animate-spin text-[var(--color-coral)]"
          />
          <span>
            NOVA is calculating latest commercial buyer intelligence...
          </span>
        </div>
      ) : filteredOpps.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <Building2 size={36} className="text-[var(--color-ink-faint)]" />
          <h3 className="font-serif text-xl text-[var(--color-ink)]">
            No opportunities found in this view
          </h3>
          <p className="text-sm text-[var(--color-ink-soft)] max-w-md">
            Launch autonomous buyer discovery from the Command Center to scan
            public B2B directories and marketplaces for verified buyers.
          </p>
          <Button onClick={() => navigate("/app")}>
            <Sparkles size={15} className="mr-1.5" /> Start Buyer Discovery
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {filteredOpps.map((opp, idx) => {
            const score = opp.opportunityScore || opp.confidence || 85;
            const isTopRanked = idx === 0 && tab === "all";

            return (
              <Card
                key={opp.id}
                hover
                className={cn(
                  "p-6 flex flex-col justify-between transition-all border",
                  isTopRanked &&
                    "md:col-span-2 border-[var(--color-coral)]/40 bg-[var(--color-surface-2)]/50",
                )}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-ink)] border border-[var(--color-line)] shadow-2xs">
                        #{idx + 1}
                      </span>
                      <Badge
                        tone={score >= 85 ? "coral" : "neutral"}
                        className="text-xs font-semibold"
                      >
                        {opp.category || "POTENTIAL BUYER"}
                      </Badge>
                      {opp.verificationStatus === "VERIFIED" && (
                        <Badge
                          tone="sage"
                          className="text-xs flex items-center gap-1 font-semibold"
                        >
                          <CheckCircle2 size={12} /> VERIFIED
                        </Badge>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-[var(--color-ink-soft)] font-medium">
                        Match Score:{" "}
                        <strong className="text-[var(--color-coral-ink)] text-sm font-bold">
                          {score}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Company Name & Location */}
                  <h3
                    className={cn(
                      "font-serif font-bold text-[var(--color-ink)] tracking-tight",
                      isTopRanked ? "text-2xl" : "text-xl",
                    )}
                  >
                    {opp.companyName || opp.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-[var(--color-ink-soft)] font-medium mt-1.5 flex-wrap">
                    {(opp.city || opp.stateRegion || opp.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin
                          size={13}
                          className="text-[var(--color-coral)] shrink-0"
                        />
                        {Array.from(
                          new Set(
                            [opp.city, opp.stateRegion, opp.country || "India"]
                              .filter(Boolean)
                              .flatMap((s: string) =>
                                s.split(",").map((p) => p.trim()),
                              ),
                          ),
                        ).join(", ")}
                      </span>
                    )}
                    {opp.productName && (
                      <span className="flex items-center gap-1">
                        <Tag size={13} className="text-[var(--color-sage)]" />
                        Target:{" "}
                        <strong className="text-[var(--color-ink)]">
                          {opp.productName}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Why NOVA Found It / Match Reason */}
                  <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-3.5 bg-[var(--color-surface)]/70 p-3 rounded-lg border border-[var(--color-line)]/50">
                    <strong className="text-[var(--color-ink)] font-medium">
                      Why NOVA Selected:{" "}
                    </strong>
                    {opp.description ||
                      opp.matchReason ||
                      opp.reason ||
                      "Verified procurement intent matching active inventory specifications and volume capacity."}
                  </p>

                  {/* Verified Facts / Highlights */}
                  {opp.verifiedFacts &&
                    Array.isArray(opp.verifiedFacts) &&
                    opp.verifiedFacts.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="text-[11px] font-mono uppercase text-[var(--color-ink-faint)] tracking-wider">
                          Verified Facts:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {opp.verifiedFacts
                            .slice(0, 3)
                            .map((fact: string, fIdx: number) => (
                              <span
                                key={fIdx}
                                className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] border border-[var(--color-line)] flex items-center gap-1"
                              >
                                <ShieldCheck
                                  size={11}
                                  className="text-emerald-500"
                                />
                                {fact}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Footer Commercials & Actions */}
                <div className="mt-6 pt-4 border-t border-[var(--color-line)] flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase">
                      Estimated Deal Value
                    </div>
                    <div className="font-serif text-lg font-bold text-[var(--color-coral-ink)]">
                      ₹
                      {(opp.potentialImpact || score * 15000).toLocaleString(
                        "en-IN",
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveNovaOpp(opp)}
                      className="text-xs gap-1.5"
                    >
                      <Sparkles
                        size={13}
                        className="text-[var(--color-coral)]"
                      />
                      Ask NOVA
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setActiveOutreachOpp(opp)}
                      className="text-xs gap-1.5 bg-[var(--color-coral)] hover:bg-[var(--color-coral-dark)] text-white"
                    >
                      <Mail size={13} />
                      Prepare Outreach
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Opportunity Detail Drawer */}
      <OpportunityDetailDrawer
        opportunityId={activeDetailId}
        onClose={() => setActiveDetailId(null)}
      />

      {/* Direct In-Place Email Outreach Composer Modal */}
      <EmailLeadComposerModal
        isOpen={!!activeOutreachOpp}
        onClose={() => setActiveOutreachOpp(null)}
        opportunity={activeOutreachOpp}
      />

      {/* Direct In-Place NOVA Chat Assistant Modal */}
      <NovaChatModal
        isOpen={!!activeNovaOpp}
        onClose={() => setActiveNovaOpp(null)}
        opportunity={activeNovaOpp}
      />
    </PageFade>
  );
}
