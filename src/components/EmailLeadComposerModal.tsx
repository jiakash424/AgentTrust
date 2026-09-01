import { useState, useEffect } from "react";
import { Modal, Button, Badge } from "./ui";
import {
  Sparkles,
  Mail,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: {
    id?: string;
    companyName?: string;
    contactName?: string;
    publicEmail?: string;
    productName?: string;
    city?: string;
  };
  lead?: {
    id?: string;
    name?: string;
    email?: string;
    companyName?: string;
    industry?: string;
  };
  onMessageSent?: () => void;
}

export function EmailLeadComposerModal({
  isOpen,
  onClose,
  opportunity,
  lead,
  onMessageSent,
}: EmailComposerModalProps) {
  const { session, workspaceId } = useAuth();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [personalizationReason, setPersonalizationReason] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState<
    "DRAFT" | "PENDING_APPROVAL" | "SENT" | "ERROR"
  >("DRAFT");
  const [errorMessage, setErrorMessage] = useState("");

  const targetComp =
    opportunity?.companyName || lead?.companyName || lead?.name || "Client";
  const targetName =
    opportunity?.contactName || lead?.name || targetComp || "Procurement Manager";
  const targetEmail =
    opportunity?.publicEmail || lead?.email || "contact@" + targetComp.toLowerCase().replace(/\s+/g, "") + ".com";

  useEffect(() => {
    if (opportunity || lead) {
      setCompanyName(targetComp);
      setRecipientName(targetName);
      setRecipientEmail(targetEmail);
      setStatusStep("DRAFT");
      setErrorMessage("");

      // Auto-generate AI draft upon opening if empty
      handleGenerateAIDraft();
    }
  }, [isOpen, opportunity, lead]);

  const handleGenerateAIDraft = async () => {
    if (!session || !workspaceId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/outreach/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          opportunityId: opportunity?.id,
          leadId: lead?.id,
          companyName: targetComp,
          contactName: targetName,
          email: recipientEmail || targetEmail,
          productName: opportunity?.productName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubject(data.subject || "");
        setBody(data.body || "");
        setPersonalizationReason(data.personalizationReason || "");
        setStatusStep("DRAFT");
      }
    } catch (err) {
      console.error("Failed to generate AI email draft:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateAndSubmit = async (submitForApprovalOnly = true) => {
    if (!subject.trim() || !body.trim() || !session || !workspaceId) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const createRes = await fetch("/api/outreach/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          opportunityId: opportunity?.id,
          leadId: lead?.id,
          recipientEmail: recipientEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          personalizationReason,
          submitForApproval: submitForApprovalOnly,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to submit email outreach");
      }

      setStatusStep(submitForApprovalOnly ? "PENDING_APPROVAL" : "SENT");
      if (onMessageSent) onMessageSent();
      setTimeout(() => onClose(), 1600);
    } catch (err: any) {
      console.error("Transmit error:", err);
      setErrorMessage(err.message || "Failed to submit outreach message");
      setStatusStep("ERROR");
    } finally {
      setSubmitting(false);
    }
  };

  const mailtoUrl = `mailto:${encodeURIComponent(
    recipientEmail || targetEmail,
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Modal open={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500/20 to-amber-500/20 flex items-center justify-center text-[var(--color-coral-ink)] border border-[var(--color-coral)]/30">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-[var(--color-ink)] flex items-center gap-2">
                B2B Email Outreach Composer
                <Badge tone="coral" className="text-[10px]">
                  AI Synthesized
                </Badge>
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Personalized commercial proposal for {targetComp}.
              </p>
            </div>
          </div>
        </div>

        {/* Recipient Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs">
          <div>
            <span className="text-[var(--color-ink-faint)] block mb-0.5 font-mono">
              Recipient & Company:
            </span>
            <span className="font-semibold text-[var(--color-ink)]">
              {targetName} • {targetComp}
            </span>
          </div>
          <div>
            <span className="text-[var(--color-ink-faint)] block mb-0.5 font-mono">
              Target Email Address:
            </span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded px-2 py-1 text-xs text-[var(--color-ink)] font-mono focus:outline-none focus:border-[var(--color-coral)]"
              placeholder="buyer@enterprise.com"
            />
          </div>
        </div>

        {/* Subject Line */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-mono text-[var(--color-ink-faint)]">
              Email Subject
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateAIDraft}
              disabled={generating}
              className="text-xs h-7 gap-1"
            >
              <Sparkles
                size={12}
                className={
                  generating
                    ? "animate-spin text-[var(--color-coral)]"
                    : "text-[var(--color-coral)]"
                }
              />
              Regenerate AI Draft
            </Button>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Partnership & Wholesale Supply Inquiry"
            className="w-full p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-coral)]"
          />
        </div>

        {/* Body Textarea */}
        <div>
          <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
            Proposal Body
          </label>
          <textarea
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dear Procurement Team..."
            className="w-full p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-coral)] resize-none font-sans leading-relaxed"
          />
        </div>

        {personalizationReason && (
          <div className="p-2.5 rounded-lg bg-[var(--color-coral-soft)] border border-[var(--color-coral)]/30 text-xs text-[var(--color-coral-ink)] flex items-start gap-2">
            <ShieldCheck size={14} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">AI Targeting Logic:</span>{" "}
              {personalizationReason}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {statusStep === "PENDING_APPROVAL" && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2">
            <ShieldCheck size={16} />
            <span className="font-semibold">
              Draft submitted for Manager Approval! View in Approvals tab.
            </span>
          </div>
        )}

        {statusStep === "SENT" && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-semibold">
              Email outreach recorded and transmitted successfully!
            </span>
          </div>
        )}

        {statusStep === "ERROR" && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-[var(--color-line)]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <a
              href={mailtoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-ink)] border border-[var(--color-line)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <ExternalLink size={12} className="text-[var(--color-ink-soft)]" />
              Open in Mail App
            </a>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateAndSubmit(true)}
              disabled={submitting || !body.trim()}
              className="text-xs"
            >
              Submit for Approval
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateAndSubmit(false)}
              disabled={submitting || !body.trim()}
              className="bg-[var(--color-coral)] hover:bg-[var(--color-coral-dark)] text-white border-none text-xs font-semibold shadow-xs"
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send size={13} className="mr-1.5" />
                  Approve & Transmit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
