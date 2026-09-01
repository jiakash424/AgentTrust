import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  Compass,
} from "lucide-react";
import { useWorkflow } from "../contexts/WorkflowContext";
import { useNavigate, useLocation } from "react-router";
import { Button } from "./ui";

export function GlobalWorkflowProgress() {
  const { workflowStatus, activeStatus, qualifiedCount } = useWorkflow();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state whenever a new workflow starts running
  useEffect(() => {
    if (workflowStatus === "RUNNING") {
      setDismissed(false);
    } else if (workflowStatus === "COMPLETED") {
      setDismissed(false);
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [workflowStatus]);

  // Hide floating toast when IDLE, or if dismissed
  if (
    workflowStatus === "IDLE" ||
    dismissed
  ) {
    return null;
  }

  const isAnalysis = qualifiedCount === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[var(--color-surface)]/95 backdrop-blur-md border border-[var(--color-line)] shadow-2xl rounded-[var(--radius-lg)] p-4 space-y-3 transform-gpu"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {workflowStatus === "RUNNING" ? (
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)]">
                <Sparkles size={16} className="animate-spin" />
              </div>
            ) : workflowStatus === "COMPLETED" ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                <CheckCircle2 size={18} />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <AlertTriangle size={18} />
              </div>
            )}

            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-ink)] truncate">
                {workflowStatus === "RUNNING"
                  ? "NOVA AI Agent is processing in background..."
                  : workflowStatus === "COMPLETED"
                    ? isAnalysis
                      ? "Commercial Analysis Ready"
                      : "Discovery Completed Successfully!"
                    : "Discovery Completed (Partial)"}
              </div>
              <div className="text-[11px] text-[var(--color-ink-soft)] truncate mt-0.5">
                {workflowStatus === "RUNNING"
                  ? activeStatus?.title || "Searching verified B2B buyers..."
                  : isAnalysis
                    ? "NOVA has prepared your growth strategy & action plan."
                    : `${qualifiedCount} qualified B2B ${qualifiedCount === 1 ? "opportunity" : "opportunities"} saved.`}
              </div>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors p-1 cursor-pointer"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--color-line)]/60">
          {workflowStatus === "RUNNING" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/app")}
            >
              View Live Progress <ArrowRight size={13} />
            </Button>
          ) : isAnalysis ? (
            <Button
              size="sm"
              onClick={() => {
                setDismissed(true);
                navigate("/app");
              }}
            >
              <Sparkles size={14} /> View Analysis
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setDismissed(true);
                navigate("/app/opportunities");
              }}
            >
              <Compass size={14} /> View Opportunities
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
