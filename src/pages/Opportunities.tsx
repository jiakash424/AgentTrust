import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  Building2,
  Package,
  Search,
  PlusCircle,
  CheckSquare,
  Square,
  Eye,
  Globe,
  Mail,
  MapPin,
  Phone,
  MessageSquare,
} from "lucide-react";
import {
  PageFade,
  PageHeader,
  Card,
  Badge,
  Button,
  Segmented,
} from "../components/ui";
import { NovaMark } from "../components/brand";
import { type Opportunity, type Potential } from "../lib/data";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { cn } from "../lib/cn";
import { OpportunityDetailDrawer } from "../components/OpportunityDetailDrawer";
import { OpportunityMonitorPanel } from "../components/OpportunityMonitorPanel";
import { EmailLeadComposerModal } from "../components/EmailLeadComposerModal";
import { NovaChatModal } from "../components/NovaChatModal";

type Tone = "coral" | "iris" | "sage" | "amber" | "neutral" | "rose";

const potentialMeta: Record<Potential, { tone: Tone; label: string }> = {
  high: { tone: "coral", label: "HIGH POTENTIAL" },
  "medium-high": { tone: "amber", label: "MEDIUM-HIGH" },
  medium: { tone: "neutral", label: "MEDIUM" },
};

const statusMeta: Record<Opportunity["status"], { tone: Tone; label: string }> =
  {
    "ai-discovered": { tone: "iris", label: "AI Discovered" },
    researching: { tone: "amber", label: "Researching" },
    qualified: { tone: "sage", label: "Qualified" },
    "action-needed": { tone: "coral", label: "Action Needed" },
  };

const filters = [
  { id: "all", label: "All" },
  { id: "ai-discovered", label: "AI Discovered" },
  { id: "researching", label: "Researching" },
  { id: "qualified", label: "Qualified" },
  { id: "action-needed", label: "Action Needed" },
];

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="label-mono text-[var(--color-ink-faint)]">
          NOVA Match Score
        </span>
        <span className="text-[13px] font-semibold text-[var(--color-ink)]">
          {value}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-bg-sunk)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--color-coral)]"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function OpportunityCard({
  op,
  feature,
  isSelected,
  onToggleSelect,
  onViewDetail,
  onPrepareOutreach,
  onAskNova,
  onResearch,
}: {
  op: any;
  feature: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onViewDetail?: (id: string) => void;
  onPrepareOutreach?: (op: any) => void;
  onAskNova?: (op: any) => void;
  onResearch?: (op: any) => void;
}) {
  const pot =
    potentialMeta[op.potential as Potential] || potentialMeta["medium-high"];
  const stat =
    statusMeta[op.status as Opportunity["status"]] ||
    statusMeta["ai-discovered"];

  const handleAskNova = () => {
    if (onAskNova) {
      onAskNova(op);
    } else if (onViewDetail) {
      onViewDetail(op.id);
    }
  };

  const handleResearch = () => {
    if (onResearch) {
      onResearch(op);
    } else if (onAskNova) {
      onAskNova(op);
    } else if (onViewDetail) {
      onViewDetail(op.id);
    }
  };

  const handleOutreach = () => {
    if (onPrepareOutreach) {
      onPrepareOutreach(op);
    } else if (onViewDetail) {
      onViewDetail(op.id);
    }
  };

  return (
    <Card
      hover
      className={cn(
        "flex flex-col p-6 lg:p-7 relative transition-all",
        feature && "op-feature bg-[var(--color-surface-2)]",
        isSelected &&
          "border-[var(--color-coral)] ring-1 ring-[var(--color-coral)]/40",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {onToggleSelect && (
            <button
              onClick={onToggleSelect}
              className="text-[var(--color-ink-soft)] hover:text-[var(--color-coral-ink)] transition-colors p-1"
            >
              {isSelected ? (
                <CheckSquare
                  size={22}
                  className="text-[var(--color-coral-ink)]"
                />
              ) : (
                <Square size={22} />
              )}
            </button>
          )}
          <span
            className={cn(
              "font-serif leading-none text-[var(--color-line-strong)]",
              feature ? "text-[5rem]" : "text-[3.25rem]",
            )}
          >
            {op.rank}
          </span>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge
            tone={
              op.commercialRecommendation === "PURSUE_NOW"
                ? "sage"
                : op.commercialRecommendation === "NEGOTIATE"
                  ? "amber"
                  : "neutral"
            }
          >
            {op.commercialRecommendation?.replace(/_/g, " ") ||
              "NEEDS VERIFICATION"}
          </Badge>
          <Badge tone={pot.tone}>{pot.label}</Badge>
        </div>
      </div>

      <h2
        className={cn(
          "font-serif text-[var(--color-ink)] mt-4",
          feature ? "text-3xl" : "text-2xl",
        )}
      >
        {op.companyName || op.title}
      </h2>

      {/* Enriched badges for Opportunity Type, Product Match, Price Advantage & Confidence */}
      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
        <Badge
          tone={
            op.opportunityType?.toUpperCase().includes("BUYER")
              ? "sage"
              : "coral"
          }
        >
          {op.opportunityType?.toUpperCase().includes("BUYER")
            ? "🛒 BUYER (Selling)"
            : op.opportunityType?.toUpperCase().includes("SUPPLIER")
              ? "📦 SUPPLIER (Buying)"
              : "🚚 DISTRIBUTOR"}
        </Badge>
        {op.productName && (
          <Badge tone="iris" className="font-mono">
            🌾 Product: {op.productName}
          </Badge>
        )}
        {(op.city || op.stateRegion || op.country) && (
          <Badge tone="neutral" className="font-mono">
            📍{" "}
            {[op.city, op.stateRegion, op.country].filter(Boolean).join(", ")}
          </Badge>
        )}
        <Badge tone="amber" className="font-mono">
          Price Advantage:{" "}
          {op.priceCompetitiveness === "HIGHLY_COMPETITIVE"
            ? "Strong"
            : op.priceCompetitiveness === "COMPETITIVE"
              ? "Competitive"
              : "Needs Verification"}
        </Badge>
        <span className="text-[11px] text-[var(--color-ink-faint)] font-mono">
          Pricing Confidence:{" "}
          <strong className="text-[var(--color-ink)]">
            {op.buyerPriceConfidence || "Medium"}
          </strong>
        </span>
      </div>

      {/* Dynamic Financial Impact Grid */}
      <div className="mt-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] grid grid-cols-3 gap-3">
        <div>
          <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
            Price Offer Rate
          </span>
          <span className="text-sm font-bold text-[var(--color-coral-ink)] font-serif">
            {op.unitPriceStr || "Price on Request"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
            Est. Deal Value
          </span>
          <span className="text-sm font-bold text-[var(--color-ink)] font-serif">
            {op.valueRange || op.totalEstValue}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
            Est. Gross Profit
          </span>
          <span className="text-sm font-bold text-[var(--color-sage)] font-serif">
            {op.potentialGrossProfit
              ? `₹${op.potentialGrossProfit.toLocaleString("en-IN")}`
              : "Needs Verification"}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <ConfidenceBar value={op.confidence} />
      </div>

      <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-bg-sunk)] p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <NovaMark size={14} />
          <span className="label-mono text-[var(--color-ink-faint)]">
            Why NOVA believes this is a match
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
          {op.reason}
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {onViewDetail && (
          <Button size="sm" onClick={() => onViewDetail(op.id)}>
            <Eye size={14} />
            View Full Opportunity
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleAskNova}>
          <NovaMark size={14} />
          Ask NOVA
        </Button>
        <Button variant="ghost" size="sm" onClick={handleResearch}>
          Research
        </Button>
        <Button variant="ghost" size="sm" onClick={handleOutreach}>
          Prepare outreach
        </Button>
      </div>
    </Card>
  );
}

export default function Opportunities() {
  const { session, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeWfFilterId = searchParams.get("workflowId");

  const [filter, setFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState<
    "ALL" | "BUYER" | "SUPPLIER" | "DISTRIBUTOR"
  >("ALL");
  const [selectedProductFilter, setSelectedProductFilter] =
    useState<string>("ALL");
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [activeOutreachOpp, setActiveOutreachOpp] = useState<any | null>(null);
  const [activeNovaOpp, setActiveNovaOpp] = useState<any | null>(null);
  const [novaInitialQuery, setNovaInitialQuery] = useState<string | undefined>(
    undefined,
  );

  const handleResearchOpportunity = (opp: any) => {
    const pName = opp.productName || opp.matchedProduct || "our inventory";
    setNovaInitialQuery(
      `Research and evaluate ${opp.companyName || "this account"} deeply: Analyze commercial viability, estimated procurement capacity for ${pName}, APMC market rate comparison, and provide a 3-step high-converting outreach approach.`,
    );
    setActiveNovaOpp(opp);
  };

  const handleAskNovaOpportunity = (opp: any) => {
    setNovaInitialQuery(undefined);
    setActiveNovaOpp(opp);
  };

  const fetchOpportunities = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<any>("/api/opportunities", {
        session,
        workspaceId: workspaceId || undefined,
      });

      const opps = Array.isArray(res) ? res : res.opportunities || [];
      const dbProducts = res.products || [];
      const activeCtx = res.activeCtx;

      const prodNames = Array.from(
        new Set([
          ...dbProducts.map((p: any) => p.name),
          ...(activeCtx?.products || []),
        ]),
      ).filter(Boolean);

      setAvailableProducts(prodNames);
      setInventoryCount(prodNames.length > 0 ? prodNames.length : 1);

      const transformedOpps = opps.map((o: any, i: number) => {
        const matchedProduct =
          o.productName || prodNames[0] || "Commercial Product";
        const intent = o.opportunityType || o.type || "WHOLESALE BUYER";

        const unitPriceStr =
          o.unitPriceStr ||
          (o.proposedPrice
            ? `₹${o.proposedPrice.toLocaleString("en-IN")} / Unit`
            : "Price on Request");
        const valueRange =
          o.totalEstValue ||
          (o.potentialImpact
            ? `₹${o.potentialImpact.toLocaleString("en-IN")}`
            : "Negotiable");

        return {
          id: o.id,
          rank: String(i + 1).padStart(2, "0"),
          companyName: o.companyName || o.title,
          title: o.title || o.companyName,
          opportunityType: intent,
          productName: matchedProduct,
          unitPriceStr,
          potential: (o.confidence > 85
            ? "high"
            : o.confidence > 70
              ? "medium-high"
              : "medium") as Potential,
          valueRange,
          confidence: o.opportunityScore || o.confidence || 0,
          location:
            o.fullAddress ||
            (o.city ? `${o.city}, ${o.country || "India"}` : null),
          publicEmail: o.publicEmail || null,
          phone: o.phone || o.directPhone || null,
          website: o.website || null,
          reason:
            o.matchReason ||
            o.reason ||
            o.description ||
            `Verified B2B match for ${matchedProduct}.`,
          action:
            o.recommendedNextAction || o.recommendedAction || "Review Details",
          status: (o.status === "ai_discovered"
            ? "ai-discovered"
            : o.status) as Opportunity["status"],
        };
      });

      setData(transformedOpps);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load opportunities");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities(true);

    const handleUpdate = () => fetchOpportunities(false);
    window.addEventListener("opportunitiesUpdated", handleUpdate);
    return () =>
      window.removeEventListener("opportunitiesUpdated", handleUpdate);
  }, [session, workspaceId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkResearch = () => {
    const prompt = `Research business context deeply for these selected opportunities and recommend the best sales approach.`;
    navigate(`/app?q=${encodeURIComponent(prompt)}`);
  };

  const handleBulkOutreach = () => {
    const prompt = `Prepare personalized sales outreach for selected opportunities.`;
    navigate(`/app?q=${encodeURIComponent(prompt)}`);
  };

  const visible = data.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;

    if (intentFilter !== "ALL") {
      const typeUpper = (o.opportunityType || "").toUpperCase();
      if (intentFilter === "BUYER" && !typeUpper.includes("BUYER"))
        return false;
      if (
        intentFilter === "SUPPLIER" &&
        !typeUpper.includes("SUPPLIER") &&
        !typeUpper.includes("VENDOR")
      )
        return false;
      if (
        intentFilter === "DISTRIBUTOR" &&
        !typeUpper.includes("DISTRIBUTOR") &&
        !typeUpper.includes("RESELLER")
      )
        return false;
    }

    if (selectedProductFilter !== "ALL") {
      if (
        !o.productName ||
        !o.productName
          .toLowerCase()
          .includes(selectedProductFilter.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  });

  return (
    <PageFade>
      <PageHeader
        eyebrow="AI DISCOVERED"
        title="Opportunities"
        subtitle="Enriched B2B buyer opportunities discovered strictly for your active product portfolio"
        actions={
          <Segmented options={filters} value={filter} onChange={setFilter} />
        }
      />

      {/* Autonomous Opportunity Monitor Panel */}
      <div className="mb-6">
        <OpportunityMonitorPanel />
      </div>

      {/* Product & Intent Filter Bar */}
      <Card className="p-4 mb-6 bg-[var(--color-surface-2)] border border-[var(--color-line)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[var(--color-ink-faint)]">
            Intent Filter:
          </span>
          {[
            { id: "ALL", label: "All Intent" },
            { id: "BUYER", label: "🛒 Buyers (Selling)" },
            { id: "SUPPLIER", label: "📦 Suppliers (Buying)" },
            { id: "DISTRIBUTOR", label: "🚚 Distributors" },
          ].map((intent) => (
            <button
              key={intent.id}
              onClick={() => setIntentFilter(intent.id as any)}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                intentFilter === intent.id
                  ? "bg-[var(--color-coral)] text-white shadow-sm"
                  : "bg-[var(--color-surface)] text-[var(--color-ink-soft)] border border-[var(--color-line)] hover:text-[var(--color-ink)]"
              }`}
            >
              {intent.label}
            </button>
          ))}
        </div>

        {availableProducts.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[var(--color-ink-faint)]">
              Filter by Product:
            </span>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-xs text-[var(--color-ink)] font-semibold cursor-pointer focus:outline-none focus:border-[var(--color-coral)]"
            >
              <option value="ALL">🌾 All Portfolio Products</option>
              {availableProducts.map((prod) => (
                <option key={prod} value={prod}>
                  🌾 {prod}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      {selectedIds.length > 0 && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-coral)]/30">
          <div className="text-sm font-medium text-[var(--color-ink)]">
            <span className="font-semibold text-[var(--color-coral-ink)]">
              {selectedIds.length}
            </span>{" "}
            buyer opportunity{selectedIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleBulkResearch}>
              Research selected buyers
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkOutreach}>
              Prepare outreach now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Deselect all
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid or Empty States */}
      {loading && data.length === 0 ? (
        <div className="py-20 text-center">
          <Sparkles
            size={24}
            className="animate-spin mx-auto text-[var(--color-coral)] mb-2"
          />
          <p className="text-sm text-[var(--color-ink-soft)]">
            Analyzing inventory and querying verified B2B opportunities...
          </p>
        </div>
      ) : inventoryCount === 0 ? (
        <Card className="p-10 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral-ink)]">
            <Package size={28} />
          </div>
          <h2 className="font-serif text-2xl text-[var(--color-ink)]">
            No inventory to analyze
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
            Add products or import your inventory so NOVA can identify the best
            sales opportunities.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={() => navigate("/app/products")}>
              Add inventory
            </Button>
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-iris-soft)] flex items-center justify-center text-[var(--color-iris)]">
            <Search size={28} />
          </div>
          <h2 className="font-serif text-2xl text-[var(--color-ink)]">
            {intentFilter === "SUPPLIER"
              ? "No raw material suppliers discovered yet"
              : "No opportunities discovered yet"}
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
            {intentFilter === "SUPPLIER"
              ? "NOVA hasn't indexed raw material suppliers & mandi aggregators for your manufacturing inventory yet. Run procurement discovery to find verified suppliers."
              : "NOVA hasn't discovered qualified opportunities for your inventory yet. Run opportunity discovery to find real buyers."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() =>
                navigate(
                  intentFilter === "SUPPLIER"
                    ? "/app?q=Discover%20raw%20material%20suppliers%20and%20mandi%20vendors%20for%20my%20products"
                    : "/app?q=Discover%20qualified%20B2B%20buyers%20for%20my%20products",
                )
              }
            >
              {intentFilter === "SUPPLIER"
                ? "Discover raw material suppliers"
                : "Discover opportunities"}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map((op, i) => (
            <OpportunityCard
              key={op.id}
              op={op}
              feature={i === 0}
              isSelected={selectedIds.includes(op.id)}
              onToggleSelect={() => toggleSelect(op.id)}
              onViewDetail={(id) => setActiveDetailId(id)}
              onPrepareOutreach={(opp) => setActiveOutreachOpp(opp)}
              onAskNova={(opp) => handleAskNovaOpportunity(opp)}
              onResearch={(opp) => handleResearchOpportunity(opp)}
            />
          ))}
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
        onClose={() => {
          setActiveNovaOpp(null);
          setNovaInitialQuery(undefined);
        }}
        opportunity={activeNovaOpp}
        initialQuery={novaInitialQuery}
      />
    </PageFade>
  );
}
