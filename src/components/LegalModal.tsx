import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck, FileText, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Badge } from "./ui";

export type LegalTab = "privacy" | "terms";

interface LegalModalProps {
  open: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export default function LegalModal({
  open,
  initialTab = "privacy",
  onClose,
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="relative w-full max-w-2xl bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl border border-[var(--color-line)] p-6 sm:p-8 max-h-[88vh] flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--color-line)] shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone="coral" dot>
                  LEGAL &amp; COMPLIANCE
                </Badge>
                <span className="text-[12px] text-[var(--color-ink-faint)]">
                  Effective: 2026
                </span>
              </div>
              <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                AgentTrust Legal Agreements
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--color-bg-sunk)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 mt-4 mb-5 p-1 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-line)] shrink-0">
            <button
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "privacy"
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
              }`}
            >
              <ShieldCheck size={16} />
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab("terms")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "terms"
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
              }`}
            >
              <FileText size={16} />
              Terms of Service
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
            {activeTab === "privacy" ? (
              <>
                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <Lock size={16} className="text-[var(--color-coral)]" />
                    1. Privacy Overview &amp; Scope
                  </h3>
                  <p>
                    AgentTrust (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy and is committed to protecting your personal and enterprise business data. This Privacy Policy governs how AgentTrust collects, processes, and secures information when you use our autonomous AI commerce platform and related services.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <Sparkles size={16} className="text-[var(--color-coral)]" />
                    2. AI Agent Processing &amp; NOVA Data Boundaries
                  </h3>
                  <p>
                    Our autonomous sales agent (NOVA) processes enterprise product catalogs, inventory pricing, and prospective buyer communications exclusively within your isolated tenant perimeter.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[13px] text-[var(--color-ink-soft)] pl-2">
                    <li>
                      <strong>Zero Model Training:</strong> Your confidential company data, wholesale pricing, and customer inquiries are never used to train public foundation models.
                    </li>
                    <li>
                      <strong>Deterministic Safeguards:</strong> Autonomous actions (such as email outreach or order negotiation) are bounded by explicit company approval guardrails.
                    </li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[var(--color-coral)]" />
                    3. Data Collection &amp; Integration Partners
                  </h3>
                  <p>
                    We collect account registration data (name, work email, verified phone number) and telemetry required to execute requested B2B sales workflows. Third-party integrations (Supabase Authentication, Google OAuth, WhatsApp Business API) adhere to strict end-to-end encryption standards.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[var(--color-coral)]" />
                    4. Data Security, Retention &amp; Rights
                  </h3>
                  <p>
                    All database records are hosted in encrypted storage with strict row-level security. You retain full ownership and the right to export or permanently delete your business context, leads, and transaction logs at any time by contacting our security team at{" "}
                    <a
                      href="mailto:support@agenttrust.ai"
                      className="text-[var(--color-coral-ink)] font-medium underline"
                    >
                      support@agenttrust.ai
                    </a>
                    .
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <FileText size={16} className="text-[var(--color-coral)]" />
                    1. Acceptance of Terms
                  </h3>
                  <p>
                    By creating an AgentTrust workspace, signing in with verified credentials, or utilizing the NOVA autonomous agent, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company, you represent that you have the authority to bind such entity.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <Sparkles size={16} className="text-[var(--color-coral)]" />
                    2. Use of Autonomous AI &amp; Commercial Guardrails
                  </h3>
                  <p>
                    AgentTrust provides autonomous sales pipelines, inventory discovery, and buyer research. You acknowledge that AI recommendations, automated emails, and pricing analyses are operational tools designed to assist human commercial decisions. You are responsible for configuring your pricing thresholds, margin boundaries, and approval requirements.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <Lock size={16} className="text-[var(--color-coral)]" />
                    3. Intellectual Property &amp; Workspace Data Ownership
                  </h3>
                  <p>
                    You retain 100% ownership of your proprietary product catalog, customer lists, CRM contacts, and brand assets uploaded to your workspace. AgentTrust retains ownership of the software architecture, NOVA reasoning agents, and platform interfaces.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[var(--color-coral)]" />
                    4. Service Availability &amp; Liability
                  </h3>
                  <p>
                    AgentTrust is engineered for high availability with 99.9% uptime targets. We shall not be liable for indirect, incidental, or consequential damages resulting from third-party provider downtime (such as email servers or communication gateways).
                  </p>
                </section>
              </>
            )}
          </div>

          {/* Footer Bar */}
          <div className="pt-4 mt-4 border-t border-[var(--color-line)] flex items-center justify-between shrink-0">
            <span className="text-xs text-[var(--color-ink-faint)]">
              Questions? Email{" "}
              <a
                href="mailto:support@agenttrust.ai"
                className="text-[var(--color-coral-ink)] hover:underline"
              >
                support@agenttrust.ai
              </a>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-ink)] text-white hover:bg-black transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
