import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  LayoutDashboard,
  Package,
  Compass,
  Handshake,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  TrendingUp,
  ShieldCheck,
  Building2,
  Zap,
  HelpCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Badge, Button } from "./ui";
import { NovaMark } from "./brand";
import { cn } from "../lib/cn";

export interface OnboardingStep {
  stepNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  hindiTitle: string;
  hindiSummary: string;
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  route: string;
  actionText: string;
  keyFeatures: Array<{
    title: string;
    description: string;
    icon: React.ElementType;
  }>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    stepNumber: 1,
    badge: "WELCOME TO AGENTTRUST",
    title: "Your Autonomous AI Sales Workforce",
    subtitle: "Discover how NOVA transforms wholesale commerce and finds high-margin B2B buyers for you.",
    hindiTitle: "AgentTrust & NOVA AI me aapka swagat hai!",
    hindiSummary: "Yeh platform aapke business ke liye 24/7 autonomous sales team ki tarah kaam karta hai. Aaiye dekhte hain ki app ka kaunsa section kya kaam karta hai.",
    icon: Sparkles,
    accentColor: "var(--color-coral)",
    accentBg: "var(--color-coral-soft)",
    route: "/app",
    actionText: "Open NOVA Assistant",
    keyFeatures: [
      {
        title: "Autonomous Lead Discovery",
        description: "Internet aur wholesale mandi networks se verified corporate buyers dhundta hai.",
        icon: Compass,
      },
      {
        title: "Margin & Price Guardrails",
        description: "Aapke factory cost aur profit rules ke according minimum profitable pricing calculate karta hai.",
        icon: ShieldCheck,
      },
      {
        title: "Multi-Channel Outreach",
        description: "Direct email quotations aur customized WhatsApp outreach drafts generate karta hai.",
        icon: MessageSquare,
      },
    ],
  },
  {
    stepNumber: 2,
    badge: "EXECUTIVE DASHBOARD",
    title: "Live Operations & Price Signals",
    subtitle: "Real-time pipeline valuation, commodity prices, calendar schedule, and AI readiness.",
    hindiTitle: "Dashboard: Live Market & Pipeline Analytics",
    hindiSummary: "Yahan aapka total commercial pipeline value, regional APMC mandi price benchmarks, aur live factory operations track hote hain.",
    icon: LayoutDashboard,
    accentColor: "#10b981",
    accentBg: "rgba(16, 185, 129, 0.12)",
    route: "/app/dashboard",
    actionText: "Explore Dashboard",
    keyFeatures: [
      {
        title: "Total Pipeline Valuation",
        description: "Aapke verified buyers aur active deals ki total gross value live sum hoti hai.",
        icon: TrendingUp,
      },
      {
        title: "APMC Mandi Price Signals",
        description: "Daily wholesale mandi rate observations aur market price trends graph me dekhein.",
        icon: Building2,
      },
      {
        title: "Commercial AI Readiness",
        description: "Aapka product catalog aur AI buyer protocol active status monitor karta hai.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    stepNumber: 3,
    badge: "PRODUCTS CATALOG",
    title: "Inventory & Margin Definition",
    subtitle: "Define the products NOVA understands, sells, and optimizes for factory profitability.",
    hindiTitle: "Products: Apna Commercial Catalog Set Karein",
    hindiSummary: "Yahan apne wholesale products add karein — Cost Price, Target Selling Price aur Stock Units ke sath.",
    icon: Package,
    accentColor: "var(--color-iris)",
    accentBg: "var(--color-iris-soft)",
    route: "/app/products",
    actionText: "Manage Products",
    keyFeatures: [
      {
        title: "SKU Cost & Selling Target",
        description: "Har product ki base cost aur target selling rate set karein taaki NOVA margin protect kare.",
        icon: Package,
      },
      {
        title: "Logistics & Unit Slabs",
        description: "Quintal ya Kg units aur delivery freight cost slabs automatically integrate hote hain.",
        icon: TrendingUp,
      },
      {
        title: "Autonomous Matching",
        description: "Catalog index hote hi NOVA automatically matched buyers find karna shuru kar deta hai.",
        icon: Zap,
      },
    ],
  },
  {
    stepNumber: 4,
    badge: "OPPORTUNITIES & RESEARCH",
    title: "Verified B2B Buyers & Deep Intelligence",
    subtitle: "High-probability procurement accounts matched to your catalog with verified contact details.",
    hindiTitle: "Opportunities: Verified Buyers & AI Research",
    hindiSummary: "Yahan real institutional buyers list hote hain. 'Research' button click karke unki legitimacy aur deal potential verify karein.",
    icon: Compass,
    accentColor: "#f59e0b",
    accentBg: "rgba(245, 158, 11, 0.12)",
    route: "/app/opportunities",
    actionText: "View Opportunities",
    keyFeatures: [
      {
        title: "Deep AI Research",
        description: "'Research' par click karte hi NOVA buyer profile, APMC rate compare aur pitch strategy banata hai.",
        icon: Sparkles,
      },
      {
        title: "Price & Margin Intelligence",
        description: "Buyer price profile, aapka cost aur estimated gross profit margin live dikhata hai.",
        icon: TrendingUp,
      },
      {
        title: "Direct WhatsApp / Email",
        description: "Verified phone aur email par customized commercial quotation ek click me bhejein.",
        icon: MessageSquare,
      },
    ],
  },
  {
    stepNumber: 5,
    badge: "NOVA COMMAND CENTER",
    title: "Autonomous Intelligence Assistant",
    subtitle: "Your central AI brain for pricing calculations, proposal drafting, and strategic advisory.",
    hindiTitle: "NOVA AI: 24/7 Commercial Assistant",
    hindiSummary: "Aapka interactive AI brain! Yahan pricing slabs, cold emails, Hindi/English negotiation pitches pooch sakte hain.",
    icon: Zap,
    accentColor: "var(--color-coral)",
    accentBg: "var(--color-coral-soft)",
    route: "/app",
    actionText: "Open Command Center",
    keyFeatures: [
      {
        title: "Instant Conversational AI",
        description: "Sub-second AI reasoning — wholesale pricing strategy aur discount slabs turant calculate karein.",
        icon: Zap,
      },
      {
        title: "Deal Pitch Generation",
        description: "FMCG mills aur institutional procurement ke liye high-converting sales letters likhwayein.",
        icon: Sparkles,
      },
      {
        title: "Hindi & Hinglish Support",
        description: "Apni aam bhasha me sawaal poochein, NOVA complete professional commercial answer dega.",
        icon: MessageSquare,
      },
    ],
  },
  {
    stepNumber: 6,
    badge: "DEALS PIPELINE",
    title: "End-to-End Sales Funnel & CRM",
    subtitle: "Track every buyer from initial research to quotation, negotiation, and closed won revenue.",
    hindiTitle: "Deals Pipeline: Deal Closure Kanban Board",
    hindiSummary: "Yahan har conversation aur quote ko stage-by-stage (Researching ➔ Qualified ➔ Quote Sent ➔ Won) manage karein.",
    icon: Handshake,
    accentColor: "#10b981",
    accentBg: "rgba(16, 185, 129, 0.12)",
    route: "/app/deals",
    actionText: "Open Deals Pipeline",
    keyFeatures: [
      {
        title: "Kanban Stage Tracking",
        description: "Deals ko easily drag ya status change karke sales progression monitor karein.",
        icon: Handshake,
      },
      {
        title: "Zero Revenue Drop",
        description: "Automated next action recommendations ensure karti hain ki koi follow-up miss na ho.",
        icon: CheckCircle2,
      },
      {
        title: "Closed Won Valuation",
        description: "Successfully finalized orders ko total revenue pipeline me add karein.",
        icon: TrendingUp,
      },
    ],
  },
];

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function OnboardingTourModal({
  isOpen,
  onClose,
  userId = "default-user",
}: OnboardingTourModalProps) {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const step = ONBOARDING_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const storageKey = `agenttrust_onboarding_completed_${userId}`;

  const handleFinish = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
    onClose();
  };

  const handleNavigateToSection = (route: string) => {
    handleFinish();
    navigate(route);
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative w-full max-w-3xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-2xl z-50 flex flex-col max-h-[90vh] rounded-[var(--radius-xl)] overflow-hidden"
        >
          {/* Top Header Bar */}
          <div className="p-4 px-6 border-b border-[var(--color-line)] flex items-center justify-between bg-[var(--color-surface-2)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: step.accentColor }}
              >
                <StepIcon size={16} />
              </div>
              <div>
                <span className="label-mono text-[11px] font-bold tracking-wider uppercase text-[var(--color-ink-faint)]">
                  App Guide & Onboarding Tour · Step {step.stepNumber} of {ONBOARDING_STEPS.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Step indicator dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {ONBOARDING_STEPS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all cursor-pointer",
                      idx === currentStepIndex
                        ? "w-6 bg-[var(--color-coral)]"
                        : "w-2 bg-[var(--color-line-strong)] hover:bg-[var(--color-ink-faint)]"
                    )}
                    title={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={onClose}
                className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] p-1.5 rounded-full hover:bg-[var(--color-bg-sunk)] transition-colors cursor-pointer"
                title="Close Guide"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--color-line)] h-1 shrink-0">
            <motion.div
              className="h-1 bg-gradient-to-r from-[var(--color-coral)] via-amber-500 to-emerald-500"
              initial={false}
              animate={{
                width: `${((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Slide Content Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Step Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider mb-2.5"
                style={{ backgroundColor: step.accentBg, color: step.accentColor }}
              >
                <Sparkles size={12} /> {step.badge}
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-[var(--color-ink)] font-bold leading-tight">
                {step.title}
              </h2>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1.5 leading-relaxed">
                {step.subtitle}
              </p>
            </div>

            {/* Hinglish Explanation Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--color-surface-2)] to-[var(--color-bg-sunk)] border border-[var(--color-line)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-coral-ink)] uppercase tracking-wider">
                <NovaMark size={14} active /> Isse Kya Hota Hai (How it helps you):
              </div>
              <div className="font-semibold text-sm text-[var(--color-ink)]">
                {step.hindiTitle}
              </div>
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                {step.hindiSummary}
              </p>
            </div>

            {/* 3 Key Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {step.keyFeatures.map((feat, fIdx) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={fIdx}
                    className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/40 transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[var(--color-bg-sunk)] flex items-center justify-center text-[var(--color-coral-ink)]">
                        <FeatIcon size={14} />
                      </div>
                      <span className="font-semibold text-xs text-[var(--color-ink)] leading-snug">
                        {feat.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-ink-soft)] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Footer Controls */}
          <div className="p-4 px-6 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--color-ink-faint)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-[var(--color-line-strong)] text-[var(--color-coral)] focus:ring-0"
                />
                <span>Don't show automatically on new logins</span>
              </label>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </Button>
              )}

              {/* Direct Jump to Section */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigateToSection(step.route)}
                className="gap-1.5 hidden sm:inline-flex text-xs"
              >
                {step.actionText}
                <ArrowRight size={13} />
              </Button>

              {/* Next / Finish Button */}
              <Button
                size="sm"
                onClick={handleNext}
                className="gap-1.5 bg-[var(--color-coral)] hover:bg-[var(--color-coral-dark)] text-white shadow-sm"
              >
                {isLast ? (
                  <>
                    <CheckCircle2 size={15} /> Get Started with NOVA
                  </>
                ) : (
                  <>
                    Next Step <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
