import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Compass,
  LayoutDashboard,
  Package,
  Handshake,
  Zap,
  Globe,
} from "lucide-react";
import { useTour, TOUR_STEPS } from "../contexts/TourContext";
import { NovaMark } from "./brand";
import { Badge, Button } from "./ui";
import { cn } from "../lib/cn";

export function InteractivePageTourGuide() {
  const {
    isTourActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    language,
    setLanguage,
    nextStep,
    prevStep,
    endTour,
    goToStep,
  } = useTour();

  if (!isTourActive) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  const StepIcon =
    currentStep.id === "dashboard"
      ? LayoutDashboard
      : currentStep.id === "products"
        ? Package
        : currentStep.id === "opportunities"
          ? Compass
          : currentStep.id === "command_center"
            ? Zap
            : Handshake;

  const badgeText = currentStep.badge[language];
  const titleText = currentStep.title[language];
  const summaryText = currentStep.summary[language];
  const hintText = currentStep.actionHint[language];

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="pointer-events-auto w-full max-w-2xl bg-[var(--color-surface)]/95 backdrop-blur-xl border-2 border-[var(--color-coral)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden p-5 space-y-3.5"
          style={{
            boxShadow:
              "0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 25px 2px rgba(224, 90, 71, 0.2)",
          }}
        >
          {/* Header row with step info, language toggle & close */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-coral)] text-white flex items-center justify-center shadow-xs shrink-0">
                <StepIcon size={16} />
              </div>
              <div>
                <span className="label-mono text-[11px] font-bold text-[var(--color-coral-ink)] uppercase tracking-wider">
                  {badgeText} · {currentStepIndex + 1} of {totalSteps}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Language Switcher Pill */}
              <div className="flex items-center rounded-lg bg-[var(--color-bg-sunk)] p-0.5 border border-[var(--color-line)] text-xs">
                <button
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer",
                    language === "en"
                      ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xs font-bold"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
                  )}
                  title="Switch to English"
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer",
                    language === "hi"
                      ? "bg-[var(--color-surface)] text-[var(--color-coral-ink)] shadow-2xs font-bold"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
                  )}
                  title="हिंदी में देखें"
                >
                  हिन्दी
                </button>
              </div>

              {/* Step navigation dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {TOUR_STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => goToStep(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all cursor-pointer",
                      idx === currentStepIndex
                        ? "w-6 bg-[var(--color-coral)]"
                        : "w-2 bg-[var(--color-line-strong)] hover:bg-[var(--color-ink-faint)]",
                    )}
                    title={`Step ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={endTour}
                className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] p-1 rounded-full hover:bg-[var(--color-bg-sunk)] transition-colors cursor-pointer"
                title="Close Tour"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--color-ink)] leading-snug">
              {titleText}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {summaryText}
            </p>
            <div className="text-[11px] font-mono text-[var(--color-coral-ink)] pt-0.5 flex items-center gap-1">
              <NovaMark size={12} active />
              <span>
                <strong>{language === "en" ? "Action Hint:" : "सुझाव:"}</strong>{" "}
                {hintText}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={endTour}
              className="text-xs font-semibold text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              {language === "en" ? "Skip Tour" : "टूर छोड़ें"}
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  className="gap-1 text-xs h-8"
                >
                  <ArrowLeft size={13} /> {language === "en" ? "Previous" : "पीछे"}
                </Button>
              )}

              <Button
                size="sm"
                onClick={nextStep}
                className="gap-1.5 text-xs h-8 bg-[var(--color-coral)] hover:bg-[var(--color-coral-dark)] text-white shadow-sm font-semibold cursor-pointer"
              >
                {isLast ? (
                  <>
                    <CheckCircle2 size={14} />{" "}
                    {language === "en" ? "Finish Tour" : "समाप्त करें"}
                  </>
                ) : (
                  <>
                    {language === "en" ? "Next Section" : "अगला सेक्शन"}{" "}
                    <ArrowRight size={13} />
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
