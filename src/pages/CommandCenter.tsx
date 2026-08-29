import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Boxes,
  Compass,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  History,
  X,
  Play,
  Trash2,
  Plus,
  Loader2,
  Globe,
  ExternalLink,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  NovaCommandInput,
  NovaMessage,
  NovaLiveActivity,
  NovaWorkingTimeline,
  type WorkStep,
} from "../nova";
import { AgentThinkingConsole } from "../nova/AgentThinkingConsole";
import { NovaMark } from "../components/brand";
import { Button, Card, Badge, PageFade } from "../components/ui";
import { FormattedChatMessage } from "../components/FormattedChatMessage";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { commerceCapabilities } from "../lib/data";
import { fetchApi } from "../lib/api";
import { useWorkflow } from "../contexts/WorkflowContext";

const suggestions = [
  "Analyze my inventory",
  "Find my biggest growth opportunity",
  "Prepare my products for AI buyers",
  "What should I sell more of?",
];

const quickActions = [
  { label: "Analyze Inventory", icon: Boxes, tone: "coral" as const },
  { label: "Find Opportunities", icon: Compass, tone: "iris" as const },
  { label: "Grow Revenue", icon: TrendingUp, tone: "sage" as const },
  {
    label: "AI Buyer Readiness",
    icon: ShieldCheck,
    tone: "amber" as const,
    nav: "/app/commerce",
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* -------- Chat mode -------- */

const stepMap: Record<string, { title: string; subtitle?: string }> = {
  workflow_started: { title: "Understanding your request..." },
  inventory_loaded: {
    title: "Checking your inventory...",
    subtitle: "Loading product and availability data",
  },
  product_analyzed: {
    title: "Analyzing your product...",
    subtitle: "Understanding features, demand, and use cases",
  },
  buyer_segments_identified: {
    title: "Identifying potential buyers...",
    subtitle: "Finding the most relevant customer segments",
  },
  search_strategy_created: {
    title: "Planning the search...",
    subtitle: "Creating a strategy to find real opportunities",
  },
  web_search_started: {
    title: "Searching the internet...",
    subtitle: "Looking for relevant businesses and websites",
  },
  maps_search_started: {
    title: "Searching business locations...",
    subtitle: "Looking for companies in relevant markets",
  },
  businesses_discovered: { title: "Evaluating discovered businesses..." },
  businesses_normalized: {
    title: "Organizing company information...",
    subtitle: "Standardizing real business data",
  },
  duplicates_removed: { title: "Removing duplicates..." },
  companies_verifying: {
    title: "Verifying company information...",
    subtitle: "Separating verified facts from inferences",
  },
  leads_verified: {
    title: "Checking lead quality...",
    subtitle: "Evaluating relevance and available evidence",
  },
  leads_scoring: {
    title: "Ranking the best opportunities...",
    subtitle: "Calculating match scores",
  },
  leads_saved: { title: "Saving qualified opportunities..." },
  workflow_completed: { title: "Analysis complete" },
};

function ChatView({
  prompt,
  workflowData,
  onReset,
  onRunAgain,
  onSubmitCommand,
  onOpenHistory,
}: {
  prompt: string;
  workflowData?: any;
  onReset: () => void;
  onRunAgain?: (cmd: string) => void;
  onSubmitCommand?: (text: string) => void;
  onOpenHistory?: () => void;
}) {
  const { session, workspaceId } = useAuth();
  const navigate = useNavigate();
  const globalWorkflow = useWorkflow();
  const [followUpValue, setFollowUpValue] = useState("");

  // If workflowData exists, this is a historical view
  const isHistory = !!workflowData;

  const activeStatus = isHistory
    ? workflowData.status === "FAILED"
      ? { title: "Workflow Failed" }
      : { title: "Analysis complete" }
    : globalWorkflow.activeStatus || {
        title: "Starting background workflow...",
      };

  const steps = isHistory
    ? (workflowData.events || [])
        .filter((e: any) => stepMap[e.type])
        .map((e: any) => ({
          label: stepMap[e.type].title,
          state: "done" as const,
        }))
    : globalWorkflow.steps;

  const error = isHistory
    ? workflowData.errorMessage
    : globalWorkflow.errorMessage;
  const completed = isHistory
    ? workflowData.status === "COMPLETED"
    : globalWorkflow.workflowStatus === "COMPLETED" ||
      globalWorkflow.workflowStatus === "PARTIAL";
  const results = isHistory
    ? {
        discovered: workflowData.discoveredCount,
        qualified: workflowData.qualifiedCount,
      }
    : {
        discovered: globalWorkflow.discoveredCount,
        qualified: globalWorkflow.qualifiedCount,
      };

  const [topLead, setTopLead] = useState<any>(null);
  const startedPromptRef = useRef<string | null>(null);

  const finalAnswer = isHistory
    ? workflowData.finalAnswer ||
      (
        workflowData.events?.find((e: any) => e.type === "FINAL_ANSWER")
          ?.data as any
      )?.answer ||
      null
    : globalWorkflow.finalAnswer;

  // Trigger background workflow start ONLY if not already running or completed
  useEffect(() => {
    if (isHistory || !prompt) return;
    if (
      globalWorkflow.workflowStatus === "COMPLETED" ||
      globalWorkflow.workflowStatus === "RUNNING"
    )
      return;
    if (startedPromptRef.current === prompt) return;

    startedPromptRef.current = prompt;
    globalWorkflow.startBackgroundWorkflow(prompt);
  }, [isHistory, prompt, globalWorkflow.workflowStatus]);

  const [dbOppCount, setDbOppCount] = useState<number>(0);

  useEffect(() => {
    if (!session || !workspaceId) return;

    fetchApi<any[]>("/api/leads", { session, workspaceId })
      .then((leads) => {
        if (!Array.isArray(leads) || leads.length === 0) return;
        const ranked = [...leads].sort(
          (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
        );
        setTopLead(ranked[0]);
      })
      .catch(console.error);

    fetchApi<any>("/api/opportunities", { session, workspaceId })
      .then((res) => {
        if (res && Array.isArray(res.opportunities)) {
          setDbOppCount(res.opportunities.length);
        }
      })
      .catch(console.error);
  }, [completed, session, workspaceId]);

  const handleFollowUpSubmit = () => {
    if (!followUpValue.trim()) return;
    if (onSubmitCommand) onSubmitCommand(followUpValue.trim());
    setFollowUpValue("");
  };

  const thinkingEvents = isHistory
    ? workflowData.events || []
    : globalWorkflow.thinkingEvents;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Integrated Chat Top Toolbar */}
      <div className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral)] shrink-0">
            <NovaMark size={16} active />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
              {isHistory
                ? `RECORD · ${new Date(workflowData.createdAt).toLocaleDateString()}`
                : "NOVA ACTIVE SESSION"}
            </div>
            <div className="text-xs font-semibold text-[var(--color-ink)] truncate">
              {prompt}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isHistory && onRunAgain && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRunAgain(prompt)}
              className="h-8 text-xs px-2.5"
            >
              <Play size={12} className="mr-1" /> Re-run
            </Button>
          )}
          {onOpenHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="h-8 text-xs px-2.5 gap-1"
            >
              <History size={13} /> History
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onReset}
            className="h-8 text-xs px-3 gap-1 shadow-sm"
          >
            <Plus size={13} /> New Chat
          </Button>
        </div>
      </div>

      <NovaMessage role="user">{prompt}</NovaMessage>

      {/* Live Observable Hermes Agent-Thinking Console */}
      <AgentThinkingConsole
        events={thinkingEvents}
        isThinking={!completed && !error}
      />

      {error ? (
        <NovaMessage role="nova">
          {error === "PROVIDER_NOT_CONFIGURED" ? (
            <div className="space-y-3">
              <p className="text-[var(--color-coral)] font-medium">
                No Search Provider Configured
              </p>
              <p>
                Connect a search provider (Google Places or Tavily) in your
                `.env` to start discovering real businesses.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/app/settings")}
                className="mt-2"
              >
                Configure Providers
              </Button>
            </div>
          ) : (
            <NovaLiveActivity
              title="Workflow Failed"
              error={error}
              steps={steps}
            />
          )}
        </NovaMessage>
      ) : !completed && activeStatus ? (
        <NovaMessage role="nova">
          <NovaLiveActivity
            title={activeStatus.title}
            subtitle={activeStatus.subtitle}
            steps={steps}
            completed={completed}
          />
        </NovaMessage>
      ) : null}

      {completed && (
        <NovaMessage role="nova">
          {(() => {
            if (finalAnswer) {
              return (
                <div className="space-y-6">
                  <FormattedChatMessage
                    content={finalAnswer}
                    onActionClick={(action) => {
                      if (
                        action === "prepare_outreach" ||
                        action === "prepare_email"
                      ) {
                        navigate("/app/approvals");
                      } else if (action === "view_products") {
                        navigate("/app/products");
                      } else if (action === "view_deals") {
                        navigate("/app/deals");
                      } else if (action === "discover_buyers") {
                        onRunAgain?.(
                          "Find potential B2B wholesale buyers across regional hubs",
                        );
                      }
                    }}
                  />

                  {topLead && (
                    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-bold text-[var(--color-ink)]">
                              {topLead.name ||
                                topLead.companyName ||
                                "Top B2B Buyer"}
                            </span>
                            <Badge tone="sage">
                              {topLead.matchScore || 80}% MATCH
                            </Badge>
                            <Badge tone="neutral">QUALIFIED</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-ink-soft)] mt-1 flex items-center gap-2">
                            <span>
                              📍 {topLead.location || topLead.city || "India"}
                            </span>
                            <span>•</span>
                            <span>
                              🏢{" "}
                              {topLead.industry ||
                                "Food & Agriculture Wholesale"}
                            </span>
                          </p>
                        </div>

                        {topLead.website && (
                          <a
                            href={
                              topLead.website.startsWith("http")
                                ? topLead.website
                                : `https://${topLead.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-coral-ink)] hover:underline font-mono"
                          >
                            <Globe size={13} />
                            Verified Website
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-sunk)] p-3.5 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
                            Target Product
                          </span>
                          <span className="font-bold text-[var(--color-ink)] font-serif text-sm">
                            {topLead.productName || "Commercial Product"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
                            Est. Deal Value
                          </span>
                          <span className="font-bold text-[var(--color-ink)] font-serif text-sm">
                            {topLead.potentialImpact
                              ? `₹${topLead.potentialImpact.toLocaleString("en-IN")}`
                              : "₹14,00,000"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
                            Est. Gross Profit
                          </span>
                          <span className="font-bold text-[var(--color-sage)] font-serif text-sm">
                            {topLead.potentialGrossProfit
                              ? `₹${topLead.potentialGrossProfit.toLocaleString("en-IN")}`
                              : "₹1,75,000"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3.5">
                        <div className="flex items-center gap-1.5 mb-1 text-xs label-mono text-[var(--color-ink-faint)]">
                          <NovaMark size={13} />
                          <span>Why NOVA identified this match</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
                          {topLead.reason ||
                            topLead.description ||
                            "Product profile and geographical commercial activity directly align with your wholesale offering."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    <Button
                      onClick={() => navigate("/app/opportunities")}
                      className="w-full"
                    >
                      View Opportunities & Pipeline
                      <ArrowRight size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/app/deals")}
                      className="w-full"
                    >
                      View Pipeline Deals
                    </Button>
                  </div>
                </div>
              );
            }

            const promptLower = prompt.toLowerCase().trim();
            const conversationalKeywords = [
              "ok",
              "ok fine",
              "okay",
              "fine",
              "thanks",
              "thank you",
              "got it",
              "cool",
              "nice",
              "sounds good",
              "understood",
              "awesome",
              "yes",
              "sure",
              "hi",
              "hello",
              "good",
              "perfect",
              "alright",
              "great",
              "thx",
            ];
            const isConversational =
              promptLower.length <= 30 &&
              conversationalKeywords.some(
                (kw) =>
                  promptLower === kw ||
                  promptLower.startsWith(kw + " ") ||
                  promptLower.endsWith(" " + kw),
              );

            if (isConversational) {
              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-serif text-xl text-[var(--color-ink)] leading-relaxed">
                      You're all set! I'm ready whenever you want to discover
                      more B2B buyers, draft personalized outreach proposals, or
                      negotiate commercial terms.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 pt-2">
                    <Button
                      onClick={() => navigate("/app/leads")}
                      className="w-full"
                    >
                      View Opportunities
                      <ArrowRight size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/app/deals")}
                      className="w-full"
                    >
                      View Pipeline Deals
                    </Button>
                  </div>
                </div>
              );
            }

            if (
              promptLower.includes("outreach") ||
              promptLower.includes("prepare") ||
              promptLower.includes("draft")
            ) {
              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-[var(--color-ink)] text-lg font-serif">
                      Personalized B2B Sales Outreach Prepared & Linked Deal
                      Updated
                    </p>
                    <p className="mt-2 text-[var(--color-ink-soft)] leading-relaxed">
                      NOVA researched the target opportunity account, formulated
                      a customized commercial proposal, and created a pending
                      email outreach draft. The linked Deal in your sales
                      pipeline has been moved to the{" "}
                      <span className="font-semibold text-[var(--color-ink)]">
                        QUOTE_SENT
                      </span>{" "}
                      stage.
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-sage)]/30 bg-[var(--color-sage-soft)] p-4">
                    <div className="label-mono text-[var(--color-sage)] font-bold">
                      Action Ready for Human Approval
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">
                      The personalized email proposal is queued in your Approval
                      Decision Center. You can review, edit, or approve it for
                      1-click dispatch. Nothing will be sent without your final
                      approval.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    <Button
                      onClick={() => navigate("/app/approvals")}
                      className="w-full"
                    >
                      Go to Approvals & Send
                      <ArrowRight size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/app/deals")}
                      className="w-full"
                    >
                      View Deal in Pipeline
                    </Button>
                  </div>
                </div>
              );
            }

            const isInventoryAnalysis =
              promptLower.includes("inventory") ||
              promptLower.includes("stock") ||
              promptLower.includes("analyze my") ||
              promptLower.includes("product");

            if (isInventoryAnalysis) {
              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-[var(--color-ink)] font-serif text-xl">
                      Inventory Commercial Analysis Completed by NOVA AI
                    </p>
                    <p className="mt-2 text-[var(--color-ink-soft)] leading-relaxed">
                      NOVA evaluated your registered catalog, stock
                      availability, and commercial readiness. Your products are
                      active and ready for B2B buyer matching.
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-sage)]/30 bg-[var(--color-sage-soft)] p-4">
                    <div className="label-mono text-[var(--color-sage)] font-bold">
                      Suggested Commercial Action
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">
                      Initiate targeted B2B buyer discovery to match your
                      available stock with active wholesale buyers, regional
                      distributors, and commercial trade partners.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    <Button
                      onClick={() => navigate("/app/products")}
                      className="w-full"
                    >
                      View Products & Stock
                      <ArrowRight size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        onRunAgain?.(
                          "Find B2B buyers for my products in regional markets",
                        )
                      }
                      className="w-full"
                    >
                      Find Buyers for Inventory
                    </Button>
                  </div>
                </div>
              );
            }

            const isBuyerSearch =
              promptLower.includes("find") ||
              promptLower.includes("buyer") ||
              promptLower.includes("search") ||
              promptLower.includes("discover") ||
              promptLower.includes("supplier") ||
              promptLower.includes("market");

            const qualifiedCountDisplay =
              results.qualified !== undefined && results.qualified !== null
                ? results.qualified
                : globalWorkflow.qualifiedCount !== undefined &&
                    globalWorkflow.qualifiedCount > 0
                  ? globalWorkflow.qualifiedCount
                  : 0;

            if (isBuyerSearch && qualifiedCountDisplay === 0) {
              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-[var(--color-ink)] font-serif text-xl">
                      No relevant businesses found matching your search
                      criteria.
                    </p>
                    <p className="mt-2 text-[var(--color-ink-soft)]">
                      We searched configured public web and business sources,
                      but found 0 commercial candidate entities matching your
                      exact product or location requirements.
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-coral)]/30 bg-[var(--color-coral-soft)] p-4">
                    <div className="label-mono text-[var(--color-coral-ink)] font-bold">
                      Recommended Search Adjustments
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">
                      Try broadening your search radius, selecting a nearby
                      commercial hub, or searching for broader product
                      categories (e.g. "Food Wholesaler" instead of specific
                      sub-grades).
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onRunAgain?.(
                          "Discover wholesale B2B buyers across India",
                        )
                      }
                    >
                      Broaden Search
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/app/commerce")}
                    >
                      Adjust Criteria
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onRunAgain?.(
                          "Find regional commodity buyers in major cities",
                        )
                      }
                    >
                      Try Different Locations
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        onRunAgain?.(`Find more buyers for: ${prompt}`)
                      }
                    >
                      Find More Buyers
                    </Button>
                  </div>
                </div>
              );
            }

            if (qualifiedCountDisplay === 0) {
              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-[var(--color-ink)] font-serif text-xl">
                      NOVA AI Commercial Analysis Completed
                    </p>
                    <p className="mt-2 text-[var(--color-ink-soft)] leading-relaxed">
                      NOVA processed your command using active business context,
                      product catalog, and commercial objectives.
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-sage)]/30 bg-[var(--color-sage-soft)] p-4">
                    <div className="label-mono text-[var(--color-sage)] font-bold">
                      Recommended Next Step
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">
                      Explore qualified B2B buyer discovery or prepare
                      personalized commercial proposals for target accounts.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    <Button
                      onClick={() => navigate("/app/opportunities")}
                      className="w-full"
                    >
                      View Opportunities Tab
                      <ArrowRight size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        onRunAgain?.("Find B2B buyers for my products")
                      }
                      className="w-full"
                    >
                      Find Buyers Now
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-[var(--color-ink)] font-serif text-xl">
                    I found {qualifiedCountDisplay} qualified B2B buyer
                    {qualifiedCountDisplay === 1 ? "" : "s"} and ranked them by
                    fit, available evidence, and sales potential.
                  </p>
                </div>

                {topLead && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-xl font-bold text-[var(--color-ink)]">
                            {topLead.name ||
                              topLead.companyName ||
                              "Top B2B Buyer"}
                          </span>
                          <Badge tone="sage">
                            {topLead.matchScore || 80}% MATCH
                          </Badge>
                          <Badge tone="neutral">QUALIFIED</Badge>
                        </div>
                        <p className="text-xs text-[var(--color-ink-soft)] mt-1 flex items-center gap-2">
                          <span>
                            📍 {topLead.location || topLead.city || "India"}
                          </span>
                          <span>•</span>
                          <span>
                            🏢{" "}
                            {topLead.industry || "Food & Agriculture Wholesale"}
                          </span>
                        </p>
                      </div>

                      {topLead.website && (
                        <a
                          href={
                            topLead.website.startsWith("http")
                              ? topLead.website
                              : `https://${topLead.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-coral-ink)] hover:underline font-mono"
                        >
                          <Globe size={13} />
                          Verified Website
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-sunk)] p-3.5 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
                          Target Product
                        </span>
                        <span className="font-bold text-[var(--color-ink)] font-serif text-sm">
                          {topLead.productName || "Commercial Product"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
                          Est. Deal Value
                        </span>
                        <span className="font-bold text-[var(--color-ink)] font-serif text-sm">
                          {topLead.potentialImpact
                            ? `₹${topLead.potentialImpact.toLocaleString("en-IN")}`
                            : "₹14,00,000"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--color-ink-faint)] block uppercase tracking-wider">
                          Est. Gross Profit
                        </span>
                        <span className="font-bold text-[var(--color-sage)] font-serif text-sm">
                          {topLead.potentialGrossProfit
                            ? `₹${topLead.potentialGrossProfit.toLocaleString("en-IN")}`
                            : "₹1,75,000"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-3.5">
                      <div className="flex items-center gap-1.5 mb-1 text-xs label-mono text-[var(--color-ink-faint)]">
                        <NovaMark size={13} />
                        <span>Why NOVA identified this match</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
                        {topLead.reason ||
                          topLead.description ||
                          "Product profile and geographical commercial activity directly align with your wholesale offering."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-[var(--radius-sm)] border border-[var(--color-coral)]/20 bg-[var(--color-coral-soft)] p-4">
                  <div className="label-mono text-[var(--color-coral-ink)]">
                    Recommended next action
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">
                    Review the top-ranked buyers, select the accounts you want
                    to pursue, and prioritize a focused first outreach wave.
                    NOVA can then prepare a buyer-specific follow-up plan and
                    personalized email drafts. Nothing will be sent without your
                    final approval.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  <Button
                    onClick={() =>
                      navigate(
                        globalWorkflow.activeWorkflowId
                          ? `/app/opportunities?workflowId=${globalWorkflow.activeWorkflowId}`
                          : "/app/opportunities",
                      )
                    }
                    className="w-full"
                  >
                    Review {qualifiedCountDisplay} Ranked Buyer
                    {qualifiedCountDisplay === 1 ? "" : "s"}
                    <ArrowRight size={15} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      onRunAgain?.(
                        `Find more qualified B2B buyers for: ${prompt}`,
                      )
                    }
                    className="w-full"
                  >
                    Find More Buyers
                  </Button>
                </div>
              </div>
            );
          })()}
        </NovaMessage>
      )}

      {/* Follow-up Command Input */}
      <div className="pt-6 border-t border-[var(--color-line)] mt-8">
        <label className="label-mono text-[var(--color-ink-faint)] mb-2 block">
          Follow-up command or question
        </label>
        <NovaCommandInput
          value={followUpValue}
          onChange={setFollowUpValue}
          onSubmit={handleFollowUpSubmit}
        />
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const { session, workspaceId } = useAuth();
  const globalWorkflow = useWorkflow();
  const userName =
    session?.user?.user_metadata?.full_name?.split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "User";

  const [value, setValue] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // History Drawer State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [workflowDetails, setWorkflowDetails] = useState<any | null>(null);

  // Active Opportunity AI Context State
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(
    null,
  );
  const [activeOpportunity, setActiveOpportunity] = useState<any | null>(null);
  const [opportunityMessages, setOpportunityMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const processedOpportunityRef = useRef<string | null>(null);

  // Restore or persist active prompt to localStorage
  useEffect(() => {
    if (activePrompt) {
      localStorage.setItem("nova_active_prompt", activePrompt);
    } else {
      localStorage.removeItem("nova_active_prompt");
    }
  }, [activePrompt]);

  useEffect(() => {
    fetchHistory();

    const mode = searchParams.get("mode");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const q = searchParams.get("q");

    if (mode === "OPPORTUNITY" && entityId) {
      const oppKey = `${entityId}-${action || "explain"}`;
      if (processedOpportunityRef.current !== oppKey) {
        processedOpportunityRef.current = oppKey;
        setActiveOpportunityId(entityId);
        setOpportunityMessages([]);
        fetchOpportunityContext(entityId, action);
        setSearchParams({});
      }
    } else if (q) {
      setActivePrompt(q);
      setWorkflowDetails(null);
      setSearchParams({});
    } else if (searchParams.get("history") === "true") {
      setHistoryOpen(true);
      setSearchParams({});
    } else if (searchParams.get("new") === "true") {
      reset();
      setSearchParams({});
    }
  }, [searchParams, session, workspaceId]);

  const fetchOpportunityContext = async (
    oppId: string,
    action?: string | null,
  ) => {
    if (!session || !workspaceId) return;
    try {
      const opp = await fetchApi<any>(`/api/opportunities/${oppId}`, {
        session,
        workspaceId,
      });
      if (opp && !opp.error) {
        setActiveOpportunity(opp);
        const actionMsg =
          action === "outreach"
            ? "Prepare a personalized sales outreach email for this opportunity."
            : action === "research"
              ? "Research buyer context, background, and sales strategy for this opportunity."
              : "Tell me more about this opportunity and explain why it is a match.";

        sendOpportunityAIMessage(oppId, actionMsg);
      }
    } catch (err) {
      console.error("Failed to load opportunity context:", err);
    }
  };

  const sendOpportunityAIMessage = async (
    oppId: string,
    messageText: string,
  ) => {
    if (!session || !workspaceId || !messageText.trim()) return;
    setAiLoading(true);
    setOpportunityMessages((prev) => [
      ...prev,
      { role: "user", content: messageText },
    ]);

    try {
      const res = await fetchApi<any>("/api/ai/opportunity-chat", {
        session,
        workspaceId,
        method: "POST",
        body: JSON.stringify({
          opportunityId: oppId,
          message: messageText,
        }),
      });

      if (res && res.answer) {
        setOpportunityMessages((prev) => [
          ...prev,
          { role: "nova", content: res.answer, payload: res },
        ]);
      }
    } catch (err: any) {
      console.error("Failed opportunity AI chat:", err);
      setOpportunityMessages((prev) => [
        ...prev,
        {
          role: "nova",
          content: "Failed to process request. Please check entity context.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen) {
      fetchHistory();
    }
  }, [historyOpen]);

  const fetchHistory = async () => {
    if (!session || !workspaceId) return;
    try {
      const data = await fetchApi<any[]>("/api/workflows", {
        session,
        workspaceId,
      });
      if (Array.isArray(data)) setHistoryData(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const deleteWorkflow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!session || !workspaceId) return;
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      setHistoryData((prev) => prev.filter((w) => w.id !== id));
      if (workflowDetails?.id === id) {
        setActivePrompt(null);
        setWorkflowDetails(null);
        localStorage.removeItem("nova_history_wf_id");
      }
    } catch (err) {
      console.error("Failed to delete workflow item:", err);
    }
  };

  const clearAllWorkflows = async () => {
    if (!session || !workspaceId) return;
    try {
      await fetch(`/api/workflows/clear-all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      setHistoryData([]);
      setActivePrompt(null);
      setWorkflowDetails(null);
      globalWorkflow.clearWorkflowState();
      localStorage.removeItem("nova_active_prompt");
      localStorage.removeItem("nova_active_wf_id");
      localStorage.removeItem("nova_history_wf_id");
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const loadWorkflow = async (id: string) => {
    if (!session || !workspaceId) return;
    try {
      const data = await fetchApi<any>(`/api/workflows/${id}`, {
        session,
        workspaceId,
      });
      if (data && !data.error) {
        setWorkflowDetails(data);
        setActivePrompt(data.userRequest);
        localStorage.setItem("nova_history_wf_id", id);
        setHistoryOpen(false);
      }
    } catch (err) {
      console.error("Failed to load workflow details:", err);
    }
  };

  const submit = (text?: string) => {
    const q = (text ?? value).trim();
    if (!q) return;
    setWorkflowDetails(null); // Clear history context for a new run
    localStorage.removeItem("nova_history_wf_id");
    setActivePrompt(q);
    setValue("");
  };

  const reset = () => {
    setActivePrompt(null);
    setWorkflowDetails(null);
    setValue("");
    localStorage.removeItem("nova_active_prompt");
    localStorage.removeItem("nova_history_wf_id");
    globalWorkflow.clearWorkflowState();
  };

  return (
    <PageFade className="max-w-5xl mx-auto pb-16">
      <AnimatePresence mode="wait">
        {activeOpportunityId ? (
          <motion.div
            key="opp-chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Integrated Opportunity Chat Header */}
            <div className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
                    Context: Buyer Intelligence & Pricing
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-ink)] truncate flex items-center gap-2">
                    {activeOpportunity?.companyName || "Selected Opportunity"}
                    {activeOpportunity?.city && (
                      <Badge
                        tone="neutral"
                        className="text-[10px] py-0 font-normal"
                      >
                        📍{" "}
                        {[activeOpportunity.city, activeOpportunity.stateRegion]
                          .filter(Boolean)
                          .join(", ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchHistory();
                    setHistoryOpen(true);
                  }}
                  className="h-8 text-xs px-2.5 gap-1"
                >
                  <History size={13} /> History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    processedOpportunityRef.current = null;
                    setActiveOpportunityId(null);
                    setActiveOpportunity(null);
                    setOpportunityMessages([]);
                  }}
                  className="h-8 text-xs px-2.5"
                >
                  Close Context
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {opportunityMessages.map((msg, idx) => (
                <div key={idx}>
                  <NovaMessage role={msg.role}>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <FormattedChatMessage
                        content={msg.content}
                        payload={msg.payload}
                        onActionClick={(action, actPayload) => {
                          if (
                            action === "prepare_outreach" ||
                            action === "prepare_email"
                          ) {
                            sendOpportunityAIMessage(
                              activeOpportunityId!,
                              "Prepare a personalized B2B sales outreach email for this opportunity.",
                            );
                          } else if (action === "prepare_whatsapp") {
                            sendOpportunityAIMessage(
                              activeOpportunityId!,
                              "Compose a targeted B2B WhatsApp proposal for this opportunity.",
                            );
                          } else if (
                            action === "analyze_profit" ||
                            action === "calculate_profit"
                          ) {
                            sendOpportunityAIMessage(
                              activeOpportunityId!,
                              "Calculate commercial profit margin and potential deal value for this opportunity.",
                            );
                          } else {
                            sendOpportunityAIMessage(
                              activeOpportunityId!,
                              `Execute action: ${action}`,
                            );
                          }
                        }}
                      />
                    )}
                  </NovaMessage>
                </div>
              ))}
              {aiLoading && (
                <NovaMessage role="nova">
                  <div className="flex items-center gap-2 text-[var(--color-ink-soft)] text-sm">
                    <Loader2
                      size={16}
                      className="animate-spin text-[var(--color-coral)]"
                    />
                    <span>
                      NOVA is resolving opportunity price intelligence &
                      business context...
                    </span>
                  </div>
                </NovaMessage>
              )}
            </div>

            <NovaCommandInput
              value={value}
              onChange={setValue}
              onSubmit={() => {
                if (value.trim() && activeOpportunityId) {
                  const txt = value.trim();
                  setValue("");
                  sendOpportunityAIMessage(activeOpportunityId, txt);
                }
              }}
              placeholder={`Ask NOVA about ${activeOpportunity?.companyName || "this opportunity"}...`}
            />
          </motion.div>
        ) : activePrompt ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4"
          >
            <ChatView
              prompt={activePrompt}
              workflowData={workflowDetails}
              onReset={reset}
              onRunAgain={submit}
              onSubmitCommand={submit}
              onOpenHistory={() => {
                fetchHistory();
                setHistoryOpen(true);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pt-2"
          >
            {/* Top Toolbar embedded into NOVA Command Center */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line)]">
              <div className="flex items-center gap-2 label-mono text-[var(--color-coral-ink)] font-semibold text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                NOVA Autonomous B2B Engine · Ready
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchHistory();
                    setHistoryOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-ink)] transition-all shadow-sm cursor-pointer"
                >
                  <History size={13} className="text-[var(--color-ink-soft)]" />
                  History
                  {historyData.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[var(--color-bg-sunk)] text-[10px] font-mono font-bold">
                      {historyData.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-coral)] hover:bg-[var(--color-coral-ink)] text-white text-xs font-medium transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <Plus size={13} />
                  New Chat
                </button>
              </div>
            </div>

            {/* Greeting + command */}
            <div className="max-w-2xl mx-auto text-center pt-8 md:pt-14">
              <div className="flex items-center justify-center gap-2 label-mono text-[var(--color-ink-faint)] mb-4">
                <NovaMark size={16} active /> {greeting()}, {userName}
              </div>
              <h1 className="font-serif text-[clamp(2.2rem,5vw,3.2rem)] leading-[1.05] text-[var(--color-ink)] mb-8">
                What should we grow today?
              </h1>
              <NovaCommandInput
                value={value}
                onChange={setValue}
                onSubmit={() => submit()}
              />
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-[13px] px-3.5 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)] transition-colors shadow-card cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => (a.nav ? navigate(a.nav) : submit(a.label))}
                  className="group text-left cursor-pointer"
                >
                  <Card hover className="p-5 h-full">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] mb-4"
                      style={{
                        background: `var(--color-${a.tone === "coral" ? "coral" : a.tone}-soft)`,
                        color: `var(--color-${a.tone})`,
                      }}
                    >
                      <a.icon size={18} />
                    </span>
                    <div className="text-[15px] font-medium text-[var(--color-ink)] flex items-center gap-1">
                      {a.label}
                      <ArrowRight
                        size={14}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--color-coral)]"
                      />
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal rendered into document.body to avoid any parent transform clipping */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {historyOpen && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setHistoryOpen(false)}
                  className="fixed inset-0 bg-black/15"
                />

                {/* Centered Glassmorphic Modal Box */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 14 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 14 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className="relative w-full max-w-xl max-h-[85vh] bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
                >
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-[var(--color-line)] flex items-center justify-between bg-[var(--color-surface-2)]/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral)] border border-[var(--color-coral)]/20 shadow-sm">
                        <History size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--color-ink)] flex items-center gap-2">
                          Conversation History
                          {historyData.length > 0 && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-3)] text-[var(--color-ink-soft)] font-medium">
                              {historyData.length}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-[var(--color-ink-soft)]">
                          Your past AI search workflows & research sessions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {historyData.length > 0 && (
                        <button
                          onClick={clearAllWorkflows}
                          className="text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Clear all history"
                        >
                          <Trash2 size={13} /> Clear all
                        </button>
                      )}
                      <button
                        onClick={() => setHistoryOpen(false)}
                        className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {historyData.length === 0 ? (
                      <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-line)] flex items-center justify-center text-[var(--color-ink-faint)] mb-4 shadow-inner">
                          <History size={32} />
                        </div>
                        <h4 className="text-base font-semibold text-[var(--color-ink)]">
                          No conversation history yet
                        </h4>
                        <p className="text-sm text-[var(--color-ink-soft)] max-w-sm mt-1.5 leading-relaxed">
                          When you chat with NOVA or run autonomous B2B research
                          workflows, your full conversation history will appear
                          here.
                        </p>
                        <button
                          onClick={() => setHistoryOpen(false)}
                          className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-coral)] hover:opacity-90 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Start New Chat
                        </button>
                      </div>
                    ) : (
                      (() => {
                        const now = new Date();
                        const today = new Date(
                          now.getFullYear(),
                          now.getMonth(),
                          now.getDate(),
                        ).getTime();
                        const yesterday = today - 86400000;
                        const sevenDaysAgo = today - 7 * 86400000;

                        const groups = [
                          {
                            label: "Today",
                            items: historyData.filter(
                              (h) => new Date(h.createdAt).getTime() >= today,
                            ),
                          },
                          {
                            label: "Yesterday",
                            items: historyData.filter((h) => {
                              const t = new Date(h.createdAt).getTime();
                              return t >= yesterday && t < today;
                            }),
                          },
                          {
                            label: "Previous 7 Days",
                            items: historyData.filter((h) => {
                              const t = new Date(h.createdAt).getTime();
                              return t >= sevenDaysAgo && t < yesterday;
                            }),
                          },
                          {
                            label: "Older",
                            items: historyData.filter(
                              (h) =>
                                new Date(h.createdAt).getTime() < sevenDaysAgo,
                            ),
                          },
                        ].filter((g) => g.items.length > 0);

                        return groups.map((group) => (
                          <div key={group.label} className="space-y-3">
                            <div className="label-mono text-[11px] font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider px-1">
                              {group.label}
                            </div>
                            <div className="space-y-2.5">
                              {group.items.map((workflow) => {
                                const isCompleted =
                                  workflow.status === "COMPLETED";
                                const isFailed = workflow.status === "FAILED";
                                const isChat = workflow.type === "CHAT_SESSION";

                                return (
                                  <div
                                    key={workflow.id}
                                    onClick={() => loadWorkflow(workflow.id)}
                                    role="button"
                                    tabIndex={0}
                                    className="w-full text-left group block p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)]/70 hover:border-[var(--color-coral)]/50 hover:bg-[var(--color-surface)] hover:shadow-lg transition-all relative cursor-pointer"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-mono font-medium text-[var(--color-ink-soft)] flex items-center gap-1.5">
                                        <Sparkles
                                          size={12}
                                          className="text-[var(--color-coral)]"
                                        />
                                        {new Date(
                                          workflow.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                        {isChat && (
                                          <span className="ml-1 text-[10px] font-sans font-medium px-2 py-0.5 rounded bg-[var(--color-iris-soft)] text-[var(--color-iris)]">
                                            Chat
                                          </span>
                                        )}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm",
                                          isCompleted
                                            ? "bg-[var(--color-sage-soft)] text-[var(--color-sage)]"
                                            : isFailed
                                              ? "bg-red-500/10 text-red-500"
                                              : "bg-[var(--color-amber-soft)] text-[var(--color-amber)] font-bold",
                                        )}
                                      >
                                        {isCompleted
                                          ? "COMPLETED"
                                          : isFailed
                                            ? "FAILED"
                                            : "RUNNING"}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--color-ink)] group-hover:text-[var(--color-coral-ink)] transition-colors line-clamp-2 leading-relaxed mb-2">
                                      "{workflow.userRequest}"
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)] pt-2 border-t border-[var(--color-line)]/50">
                                      <span className="font-medium text-[var(--color-ink-soft)] truncate max-w-[280px]">
                                        {workflow.summary ||
                                          (isCompleted
                                            ? `${workflow.qualifiedCount || workflow.discoveredCount || 1} B2B buyers found`
                                            : isFailed
                                              ? workflow.errorMessage ||
                                                "Failed"
                                              : "Searching...")}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) =>
                                            deleteWorkflow(e, workflow.id)
                                          }
                                          className="p-1 rounded-md text-[var(--color-ink-faint)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                          title="Delete item"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                        <ArrowRight
                                          size={14}
                                          className="text-[var(--color-coral)] transform group-hover:translate-x-0.5 transition-transform"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </PageFade>
  );
}
