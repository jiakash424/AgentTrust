import { useState, useEffect } from "react";
import { Modal, Button, Badge, Card } from "./ui";
import {
  Sparkles,
  Send,
  ShieldCheck,
  CheckCircle2,
  Phone,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/cn";

interface WhatsAppComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: {
    id?: string;
    name?: string;
    phone?: string;
    industry?: string;
    companyName?: string;
  };
  onMessageSent?: () => void;
}

export function WhatsAppLeadComposerModal({
  isOpen,
  onClose,
  lead,
  onMessageSent,
}: WhatsAppComposerModalProps) {
  const { session, workspaceId } = useAuth();

  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [content, setContent] = useState("");
  const [personalizationReason, setPersonalizationReason] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState<
    "DRAFT" | "PENDING_APPROVAL" | "SENT" | "ERROR"
  >("DRAFT");
  const [errorMessage, setErrorMessage] = useState("");

  const phoneOptions = (lead?.phone || "")
    .split(/[,/|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  useEffect(() => {
    if (lead) {
      const phones = (lead.phone || "")
        .split(/[,/|]/)
        .map((p) => p.trim())
        .filter(Boolean);
      setRecipientPhone(phones[0] || lead.phone || "");
      setRecipientName(lead.name || "Client");
      setCompanyName(lead.companyName || lead.name || "Enterprise");
      setStatusStep("DRAFT");
      setErrorMessage("");
    }
  }, [lead]);

  const handleGenerateAIDraft = async () => {
    if (!session || !workspaceId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/whatsapp/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          leadId: lead?.id,
          contactName: recipientName,
          companyName,
          phone: recipientPhone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setContent(data.messageText || "");
        setPersonalizationReason(data.personalizationReason || "");
        setStatusStep("DRAFT");
      }
    } catch (err) {
      console.error("Failed to generate AI WhatsApp draft:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateAndSend = async (submitForApprovalOnly = false) => {
    if (!content.trim() || !recipientPhone.trim() || !session || !workspaceId)
      return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      // 1. Create message draft/pending approval
      const createRes = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          leadId: lead?.id,
          recipientPhone,
          content,
          submitForApproval: submitForApprovalOnly,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create WhatsApp message");
      }
      const createdData = await createRes.json();
      const msgId = createdData.message?.id;

      if (submitForApprovalOnly) {
        setStatusStep("PENDING_APPROVAL");
        if (onMessageSent) onMessageSent();
        setTimeout(() => onClose(), 1600);
        return;
      }

      // 2. Approve & Send immediately
      const approveRes = await fetch(
        `/api/whatsapp/messages/${msgId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "x-workspace-id": workspaceId,
          },
        },
      );

      if (approveRes.ok) {
        setStatusStep("SENT");
        if (onMessageSent) onMessageSent();
        setTimeout(() => onClose(), 1500);
      } else {
        const errData = await approveRes.json().catch(() => ({}));
        setErrorMessage(errData.error || "Failed to transmit via WhatsApp API");
        setStatusStep("ERROR");
      }
    } catch (err: any) {
      console.error("Transmit error:", err);
      setErrorMessage(err.message || "Failed to submit message");
      setStatusStep("ERROR");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="">
      <div className="p-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-[var(--color-ink)] flex items-center gap-2">
                WhatsApp Business Composer
                <Badge tone="sage" className="text-[10px]">
                  Official API
                </Badge>
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Send compliant personalized B2B outreach to {recipientName}.
              </p>
            </div>
          </div>
        </div>

        {/* Recipient Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs">
          <div>
            <span className="text-[var(--color-ink-faint)] block mb-0.5 font-mono">
              Recipient Name & Company:
            </span>
            <span className="font-semibold text-[var(--color-ink)]">
              {recipientName} • {companyName}
            </span>
          </div>
          <div>
            <span className="text-[var(--color-ink-faint)] block mb-0.5 font-mono">
              WhatsApp Phone Number:
            </span>
            {phoneOptions.length > 1 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {phoneOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRecipientPhone(num)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer",
                      recipientPhone === num
                        ? "bg-emerald-600 text-white font-bold"
                        : "bg-[var(--color-bg-sunk)] text-[var(--color-ink)] hover:bg-[var(--color-surface)] border border-[var(--color-line)]",
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-mono text-[var(--color-coral)] font-bold">
                <Phone size={12} />
                {recipientPhone || "Missing Phone Number"}
              </div>
            )}
          </div>
        </div>

        {/* AI Generator Action */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-[var(--color-ink-faint)]">
            Message Content
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateAIDraft}
            disabled={generating}
            className="text-xs h-8"
          >
            {generating ? (
              <Sparkles size={12} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={12} className="mr-1.5 text-emerald-500" />
            )}
            Generate AI WhatsApp Message
          </Button>
        </div>

        {/* Text Area */}
        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Hi [Name], we noticed your enterprise operates in this sector..."
          className="w-full p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-emerald-500 resize-none font-sans"
        />

        {personalizationReason && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <ShieldCheck size={14} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">AI Strategy Logic:</span>{" "}
              {personalizationReason}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {statusStep === "SENT" && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-semibold">
              Message submitted to WhatsApp Cloud API successfully!
            </span>
          </div>
        )}

        {statusStep === "PENDING_APPROVAL" && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2">
            <ShieldCheck size={16} />
            <span className="font-semibold">
              Draft submitted for Manager Approval! View in Approvals tab.
            </span>
          </div>
        )}

        {statusStep === "ERROR" && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-semibold">
              {errorMessage || "Failed to transmit message. Please verify configuration."}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-line)]">
          <Button variant="ghost" size="sm" onClick={onClose} className="whitespace-nowrap">
            Cancel
          </Button>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateAndSend(true)}
              disabled={submitting || !content.trim()}
              className="whitespace-nowrap text-xs"
            >
              Submit for Approval
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateAndSend(false)}
              disabled={submitting || !content.trim() || !recipientPhone.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none whitespace-nowrap text-xs shadow-xs"
            >
              {submitting ? (
                "Sending..."
              ) : (
                <>
                  <Send size={14} className="mr-1.5" />
                  Approve & Send via WhatsApp
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
