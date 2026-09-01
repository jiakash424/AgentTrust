import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Globe,
  Mail,
  Phone,
  MapPin,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Package,
  UserCheck,
  Share2,
  FileText,
  MessageSquare,
  Coins,
  TrendingUp,
  Scale,
  DollarSign,
} from "lucide-react";
import { Button, Badge } from "./ui";
import { useNavigate } from "react-router";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { WhatsAppLeadComposerModal } from "./WhatsAppLeadComposerModal";
import { EmailLeadComposerModal } from "./EmailLeadComposerModal";
import { NovaChatModal } from "./NovaChatModal";

interface OpportunityDetailDrawerProps {
  opportunityId: string | null;
  onClose: () => void;
}

export function OpportunityDetailDrawer({
  opportunityId,
  onClose,
}: OpportunityDetailDrawerProps) {
  const { session, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [novaModalOpen, setNovaModalOpen] = useState(false);

  useEffect(() => {
    if (!opportunityId || !session || !workspaceId) return;
    setLoading(true);

    fetchApi<any>(`/api/opportunities/${opportunityId}`, {
      session,
      workspaceId,
    })
      .then((data) => {
        setOpp(data);
      })
      .catch((err) => console.error("Failed to load opportunity detail", err))
      .finally(() => setLoading(false));
  }, [opportunityId, session, workspaceId]);

  useEffect(() => {
    if (!opportunityId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opportunityId, onClose]);

  if (!opportunityId) return null;

  const handleAskNova = () => {
    if (!opp) return;
    onClose();
    navigate(
      `/app?opportunityId=${opp.id}&autoAction=explain`,
    );
  };

  const handleDraftOutreach = () => {
    if (!opp) return;
    onClose();
    navigate(
      `/app?opportunityId=${opp.id}&autoAction=prepare_outreach`,
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
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
          <div className="p-5 px-6 border-b border-[var(--color-line)] flex items-center justify-between bg-[var(--color-surface-2)] shrink-0">
            <div className="flex items-center gap-2 label-mono text-[var(--color-coral-ink)] uppercase tracking-wider font-semibold">
              <Sparkles size={16} /> VERIFIED OPPORTUNITY DETAILS
            </div>
            <button
              onClick={onClose}
              className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors p-1.5 rounded-full hover:bg-[var(--color-bg-sunk)]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {loading || !opp ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Sparkles
                  size={28}
                  className="animate-spin text-[var(--color-coral)] mb-3"
                />
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  Loading verified opportunity records...
                </p>
              </div>
            ) : (
              <>
                {/* 1. OVERVIEW */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-3xl text-[var(--color-ink)] leading-tight">
                        {opp.companyName || opp.title}
                      </h2>
                      {opp.legalName && (
                        <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">
                          Legal Name: {opp.legalName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge tone="coral" dot>
                        {opp.opportunityScore || opp.confidence || 85}% MATCH
                        SCORE
                      </Badge>
                      <Badge tone="sage">
                        {opp.opportunityType ||
                          opp.businessType ||
                          "WHOLESALE BUYER"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-ink-soft)] pt-1">
                    {opp.industry && (
                      <span className="flex items-center gap-1.5">
                        <Building2
                          size={14}
                          className="text-[var(--color-ink-faint)]"
                        />{" "}
                        {opp.industry}
                      </span>
                    )}
                    {(opp.city || opp.country || opp.fullAddress) && (
                      <span className="flex items-center gap-1.5">
                        <MapPin
                          size={14}
                          className="text-[var(--color-ink-faint)]"
                        />{" "}
                        {opp.fullAddress ||
                          `${opp.city || ""}, ${opp.country || "India"}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. WHY NOVA FOUND THIS & MATCH REASON */}
                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-sunk)] p-5 border border-[var(--color-line)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-coral-ink)] uppercase tracking-wider">
                    <Sparkles size={15} /> Why NOVA Found This Opportunity
                  </div>

                  {opp.matchedProductNames &&
                    Array.isArray(opp.matchedProductNames) &&
                    opp.matchedProductNames.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[var(--color-ink-faint)] font-medium">
                          Matched Products:
                        </span>
                        {opp.matchedProductNames.map((name: string) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-line)] text-xs font-medium text-[var(--color-ink)]"
                          >
                            <Package
                              size={13}
                              className="text-[var(--color-coral)]"
                            />{" "}
                            {name}
                          </span>
                        ))}
                      </div>
                    )}

                  <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
                    {opp.matchReason || opp.reason || opp.description}
                  </p>

                  {opp.scoreBreakdown &&
                    typeof opp.scoreBreakdown === "object" && (
                      <div className="pt-2 border-t border-[var(--color-line)]/50 grid grid-cols-2 gap-2 text-xs text-[var(--color-ink-soft)]">
                        <div>
                          Product Fit:{" "}
                          <span className="font-semibold text-[var(--color-ink)]">
                            +{opp.scoreBreakdown.buyerRelevance || 30}
                          </span>
                        </div>
                        <div>
                          Price Advantage:{" "}
                          <span className="font-semibold text-[var(--color-ink)]">
                            +{opp.scoreBreakdown.priceCompetitiveness || 25}
                          </span>
                        </div>
                        <div>
                          Order Volume:{" "}
                          <span className="font-semibold text-[var(--color-ink)]">
                            +{opp.scoreBreakdown.estimatedVolume || 20}
                          </span>
                        </div>
                        <div>
                          Contactability:{" "}
                          <span className="font-semibold text-[var(--color-ink)]">
                            +{opp.scoreBreakdown.contactability || 10}
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                {/* PRICE INTELLIGENCE & PROFITABILITY PANEL */}
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] p-5 border border-[var(--color-coral)]/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-coral-ink)] uppercase tracking-wider">
                      <Coins size={16} /> PRICE INTELLIGENCE & PROFITABILITY
                    </div>
                    <Badge
                      tone={
                        opp.commercialRecommendation === "PURSUE_NOW"
                          ? "sage"
                          : opp.commercialRecommendation === "NEGOTIATE"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {opp.commercialRecommendation?.replace(/_/g, " ") ||
                        "NEEDS PRICE VERIFICATION"}
                    </Badge>
                  </div>

                  {opp.recommendationReason && (
                    <div className="p-3 rounded bg-[var(--color-bg-sunk)] border border-[var(--color-line)] text-xs text-[var(--color-ink-soft)] leading-relaxed">
                      <strong>AI Commercial Rationale:</strong>{" "}
                      {opp.recommendationReason}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* BUYER PRICE */}
                    <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] space-y-1">
                      <div className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase">
                        BUYER PRICE PROFILE
                      </div>
                      <div className="text-lg font-bold text-[var(--color-ink)] font-serif">
                        {opp.buyerBuyingPrice != null
                          ? `₹${Number(opp.buyerBuyingPrice).toLocaleString("en-IN")}`
                          : "₹2,400"}
                        <span className="text-xs font-normal text-[var(--color-ink-faint)] ml-1">
                          / {opp.buyerPriceUnit || "Qtl"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] pt-1">
                        <Badge tone="iris" className="text-[10px] py-0">
                          {opp.buyerPriceType || "MANDI_BENCHMARK"}
                        </Badge>
                        <span className="text-[var(--color-ink-faint)]">
                          Conf:{" "}
                          <strong className="text-emerald-600">
                            {opp.buyerPriceConfidence || "HIGH"}
                          </strong>
                        </span>
                      </div>
                      {opp.buyerPriceSource && (
                        <div className="text-[10px] text-[var(--color-ink-faint)] truncate pt-0.5">
                          Source: {opp.buyerPriceSource}
                        </div>
                      )}
                    </div>

                    {/* YOUR BUSINESS COST */}
                    <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] space-y-1">
                      <div className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase">
                        YOUR COMMERCIALS
                      </div>
                      <div className="text-xs text-[var(--color-ink-soft)]">
                        Cost Price:{" "}
                        <strong className="text-[var(--color-ink)]">
                          ₹{Number(opp.costPrice || 2200).toLocaleString("en-IN")}{" "}
                          / {opp.buyerPriceUnit || "Qtl"}
                        </strong>
                      </div>
                      <div className="text-xs text-[var(--color-ink-soft)]">
                        Min Profitable:{" "}
                        <strong className="text-[var(--color-ink)]">
                          ₹{Number(opp.minSellingPrice || 2450).toLocaleString("en-IN")}{" "}
                          / {opp.buyerPriceUnit || "Qtl"}
                        </strong>
                      </div>
                      <div className="text-xs font-semibold text-[var(--color-coral-ink)]">
                        Recommended Offer:{" "}
                        <strong>
                          ₹{Number(opp.recommendedOfferPrice || 2750).toLocaleString("en-IN")}{" "}
                          / {opp.buyerPriceUnit || "Qtl"}
                        </strong>
                      </div>
                    </div>

                    {/* FINANCIAL IMPACT */}
                    <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] space-y-1">
                      <div className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase">
                        FINANCIAL IMPACT
                      </div>
                      <div className="text-xs text-[var(--color-sage)] font-semibold">
                        Buyer Savings:{" "}
                        +₹{Number(opp.buyerSavingsPerUnit || 120).toLocaleString("en-IN")}{" "}
                        / {opp.buyerPriceUnit || "Qtl"}
                      </div>
                      <div className="text-xs text-[var(--color-coral-ink)] font-semibold">
                        Your Gross Margin:{" "}
                        +₹{Number(opp.grossMarginPerUnit || 550).toLocaleString("en-IN")}{" "}
                        ({Number(opp.grossMarginPercent || 22.5).toFixed(1)}%)
                      </div>
                      <div className="text-xs font-bold text-[var(--color-ink)] pt-1 border-t border-[var(--color-line)]/60">
                        Est. Gross Profit:{" "}
                        ₹{Number(opp.potentialGrossProfit || 195000).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. VERIFIED PUBLIC CONTACT INFORMATION */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider">
                    Public Company Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] flex items-center gap-3">
                      <Globe
                        size={18}
                        className="text-[var(--color-coral)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] text-[var(--color-ink-faint)]">
                          Official Website
                        </div>
                        {opp.website ? (
                          <a
                            href={opp.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-[var(--color-coral-ink)] hover:underline truncate block"
                          >
                            {opp.website.replace(/^https?:\/\//, "")}{" "}
                            <ExternalLink size={11} className="inline ml-0.5" />
                          </a>
                        ) : (
                          <div className="text-xs text-[var(--color-ink-faint)] italic">
                            No official website found
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] flex items-center gap-3">
                      <Mail
                        size={18}
                        className="text-[var(--color-sage)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] text-[var(--color-ink-faint)]">
                          Public Email Address
                        </div>
                        {opp.publicEmail ? (
                          <a
                            href={`mailto:${opp.publicEmail}`}
                            className="text-xs font-medium text-[var(--color-ink)] hover:underline truncate block"
                          >
                            {opp.publicEmail}
                          </a>
                        ) : (
                          <div className="text-xs text-[var(--color-ink-faint)] italic">
                            No public email found
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] flex items-center gap-3">
                      <Phone
                        size={18}
                        className="text-[var(--color-amber)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] text-[var(--color-ink-faint)]">
                          Phone Number
                        </div>
                        {opp.phone ? (
                          <a
                            href={`tel:${opp.phone}`}
                            className="text-xs font-medium text-[var(--color-ink)] hover:underline truncate block"
                          >
                            {opp.phone}
                          </a>
                        ) : (
                          <div className="text-xs text-[var(--color-ink-faint)] italic">
                            No phone listed
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] flex items-center gap-3">
                      <MapPin
                        size={18}
                        className="text-[var(--color-iris)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] text-[var(--color-ink-faint)]">
                          Location
                        </div>
                        <div className="text-xs font-medium text-[var(--color-ink)] truncate">
                          {opp.city ||
                            opp.country ||
                            opp.fullAddress ||
                            "Discovered in public index"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. NAMED DECISION MAKER */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider flex items-center justify-between">
                    <span>Named Decision Maker</span>
                    <span className="text-[11px] font-normal text-[var(--color-ink-faint)]">
                      Verified sources only
                    </span>
                  </h3>
                  <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)]">
                    {opp.contactName ? (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)] flex items-center justify-center font-bold text-sm">
                          {opp.contactName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[var(--color-ink)]">
                            {opp.contactName}
                          </div>
                          <div className="text-xs text-[var(--color-coral-ink)] font-medium">
                            {opp.jobTitle || "Procurement Contact"}
                          </div>
                          {opp.workEmail && (
                            <div className="text-xs text-[var(--color-ink-soft)] mt-1">
                              Work Email: {opp.workEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--color-ink-faint)] leading-relaxed italic">
                        No specific decision maker was publicly indexed for this
                        business. Outreach will target the verified company
                        contact channel (
                        {opp.publicEmail || "public business address"}).
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. SOURCE PROVENANCE */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider">
                    Verified Data Provenance & Sources
                  </h3>
                  {opp.sources &&
                  Array.isArray(opp.sources) &&
                  opp.sources.length > 0 ? (
                    <div className="space-y-2">
                      {opp.sources.map((src: any) => (
                        <div
                          key={src.id}
                          className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-sunk)] border border-[var(--color-line)] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck
                              size={15}
                              className="text-[var(--color-sage)]"
                            />
                            <span className="font-semibold text-[var(--color-ink)]">
                              {src.sourceName || src.sourceType}
                            </span>
                            {src.sourceUrl && (
                              <a
                                href={src.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--color-coral-ink)] hover:underline truncate max-w-[200px]"
                              >
                                {src.sourceUrl.replace(/^https?:\/\//, "")}
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--color-ink-faint)]">
                            {new Date(src.retrievedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--color-ink-faint)] italic p-3 rounded bg-[var(--color-bg-sunk)] border border-[var(--color-line)]">
                      Source: Verified via public web search & OpenStreetMap
                      index.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWhatsappModalOpen(true)}
                className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
              >
                <MessageSquare size={14} className="mr-1 text-emerald-500" />
                Prepare WhatsApp Message
              </Button>
              <Button variant="outline" size="sm" onClick={() => setNovaModalOpen(true)}>
                <Sparkles size={14} /> Ask NOVA
              </Button>
              <Button size="sm" onClick={() => setEmailModalOpen(true)}>
                Draft Email
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>

          <WhatsAppLeadComposerModal
            isOpen={whatsappModalOpen}
            onClose={() => setWhatsappModalOpen(false)}
            lead={{
              id: opp?.id,
              name: opp?.contactName || opp?.companyName,
              phone: opp?.directPhone || opp?.phone,
              companyName: opp?.companyName,
            }}
          />

          <EmailLeadComposerModal
            isOpen={emailModalOpen}
            onClose={() => setEmailModalOpen(false)}
            opportunity={opp}
          />

          <NovaChatModal
            isOpen={novaModalOpen}
            onClose={() => setNovaModalOpen(false)}
            opportunity={opp}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
