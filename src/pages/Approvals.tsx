import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Pencil,
  Sparkles,
  Undo2,
  X,
  CheckCircle2,
  Send,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Modal,
  PageFade,
  PageHeader,
} from "../components/ui";
import { approvals as seedApprovals, type Approval } from "../lib/data";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

type Decision = "pending" | "approved" | "rejected";

interface ApprovalState {
  decision: Decision;
  edited: boolean;
  message: string;
  counter: string;
  sending?: boolean;
  sent?: boolean;
}

export default function Approvals() {
  const { session, workspaceId } = useAuth();
  const [approvalsList, setApprovalsList] = useState<Approval[]>(seedApprovals);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<Record<string, ApprovalState>>(() =>
    Object.fromEntries(
      seedApprovals.map((a) => [
        a.id,
        {
          decision: "pending",
          edited: false,
          message: a.preview || "",
          counter: "",
        },
      ]),
    ),
  );

  const [editing, setEditing] = useState<Approval | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftCounter, setDraftCounter] = useState("");

  const loadRealApprovals = async (isInitial = false) => {
    if (!session || !workspaceId) return;
    if (isInitial) setLoading(true);
    try {
      const data = await fetchApi<{ approvals: any[] }>("/api/approvals", {
        session,
        workspaceId,
      });
      if (data && Array.isArray(data.approvals) && data.approvals.length > 0) {
        const mapped: Approval[] = data.approvals.map((m: any) => ({
          id: m.id,
          title: m.subject || `Outreach proposal for ${m.company}`,
          company: m.company,
          type: m.type || "outreach",
          body: m.body,
          preview: m.preview,
          recommendation: m.recommendation,
          meta: m.meta,
        }));

        setApprovalsList(mapped);

        const newStates: Record<string, ApprovalState> = {};
        data.approvals.forEach((m: any) => {
          const isAppr = m.status === "APPROVED" || m.status === "SENT";
          const isRej = m.status === "REJECTED";
          newStates[m.id] = {
            decision: isAppr ? "approved" : isRej ? "rejected" : "pending",
            edited: false,
            message: m.preview || "",
            counter: "",
            sent: m.status === "SENT",
          };
        });
        setStates(newStates);
      }
    } catch (err) {
      console.error("Failed to load real approvals:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadRealApprovals(true);
    const handleUpdate = () => loadRealApprovals(false);
    window.addEventListener("outreachUpdated", handleUpdate);
    window.addEventListener("approvalsUpdated", handleUpdate);
    return () => {
      window.removeEventListener("outreachUpdated", handleUpdate);
      window.removeEventListener("approvalsUpdated", handleUpdate);
    };
  }, [session, workspaceId]);

  function update(id: string, patch: Partial<ApprovalState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const handleApprove = async (a: Approval) => {
    update(a.id, { decision: "approved", sending: true });
    if (!session || !workspaceId) return;

    try {
      const apprRes = await fetch(`/api/outreach/${a.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });

      if (apprRes.ok) {
        // Try auto-sending via connected Gmail
        const sendRes = await fetch(`/api/outreach/${a.id}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            "x-workspace-id": workspaceId,
          },
        });

        if (sendRes.ok) {
          update(a.id, { decision: "approved", sending: false, sent: true });
        } else {
          update(a.id, { decision: "approved", sending: false, sent: false });
        }
      } else {
        update(a.id, { decision: "approved", sending: false });
      }
    } catch (err) {
      console.error("Failed to approve outreach:", err);
      update(a.id, { decision: "approved", sending: false });
    }
  };

  const handleReject = async (a: Approval) => {
    update(a.id, { decision: "rejected" });
    if (!session || !workspaceId) return;

    try {
      await fetch(`/api/outreach/${a.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
    } catch (err) {
      console.error("Failed to reject outreach:", err);
    }
  };

  function openEdit(a: Approval) {
    setDraftMessage(states[a.id]?.message || a.preview || "");
    setDraftCounter(states[a.id]?.counter || "");
    setEditing(a);
  }

  async function saveEdit() {
    if (!editing || !session || !workspaceId) return;
    try {
      await fetch(`/api/outreach/${editing.id}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          subject: editing.company
            ? `Outreach proposal for ${editing.company}`
            : "B2B Procurement Proposal",
          body: draftMessage,
        }),
      });

      update(editing.id, {
        decision: "pending",
        edited: true,
        message: draftMessage,
        counter: draftCounter,
      });
    } catch (err) {
      console.error("Failed to save edit:", err);
    }
    setEditing(null);
  }

  const allResolved =
    approvalsList.length > 0 &&
    approvalsList.every((a) => states[a.id]?.decision !== "pending");

  return (
    <PageFade>
      <PageHeader
        eyebrow="DECISION CENTER"
        title="Approvals"
        subtitle="Review actions before NOVA proceeds."
      />

      <AnimatePresence>
        {allResolved && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <Card className="flex flex-col items-center text-center py-14 px-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)] mb-4">
                <CheckCircle2 size={28} />
              </span>
              <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                You're all caught up
              </h2>
              <p className="text-[var(--color-ink-soft)] mt-2 text-[15px] max-w-sm">
                Every request has been handled. NOVA will surface new approvals
                here as deals progress.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5 max-w-3xl">
        {loading && approvalsList.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-ink-faint)]">
            Loading real workspace approvals...
          </div>
        ) : (
          approvalsList.map((a) => (
            <ApprovalCard
              key={a.id}
              approval={a}
              state={
                states[a.id] || {
                  decision: "pending",
                  edited: false,
                  message: a.preview || "",
                  counter: "",
                }
              }
              onApprove={() => handleApprove(a)}
              onReject={() => handleReject(a)}
              onUndo={() => update(a.id, { decision: "pending" })}
              onEdit={() => openEdit(a)}
            />
          ))
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing?.type === "negotiation"
            ? "Edit counter offer"
            : "Edit outreach message"
        }
      >
        {editing && (
          <div className="flex flex-col gap-5">
            {editing.type === "negotiation" ? (
              <div>
                <label className="label-mono text-[var(--color-ink-faint)] mb-2 block">
                  Counter price
                </label>
                <input
                  value={draftCounter}
                  onChange={(e) => setDraftCounter(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] font-serif text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]/40"
                />
              </div>
            ) : (
              <div>
                <label className="label-mono text-[var(--color-ink-faint)] mb-2 block">
                  Message to {editing.company}
                </label>
                <textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[14px] leading-relaxed text-[var(--color-ink)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-coral)]/40"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageFade>
  );
}

function ApprovalCard({
  approval,
  state,
  onApprove,
  onReject,
  onUndo,
  onEdit,
}: {
  approval: Approval;
  state: ApprovalState;
  onApprove: () => void;
  onReject: () => void;
  onUndo: () => void;
  onEdit: () => void;
}) {
  const resolved = state.decision !== "pending";
  const isApproved = state.decision === "approved";

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors duration-300",
        isApproved && "border-[var(--color-sage)]/40",
        state.decision === "rejected" && "opacity-80",
      )}
    >
      <div
        className="h-1 w-full transition-colors"
        style={{
          background: isApproved
            ? "var(--color-sage)"
            : state.decision === "rejected"
              ? "var(--color-rose)"
              : "var(--color-coral)",
        }}
      />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge tone={approval.type === "negotiation" ? "coral" : "iris"}>
                {approval.type === "negotiation" ? "Negotiation" : "Outreach"}
              </Badge>
              {state.edited && !resolved && (
                <span className="label-mono text-[var(--color-amber)]">
                  Edited
                </span>
              )}
              {state.sent && (
                <Badge tone="sage">Dispatched via Gmail SMTP</Badge>
              )}
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-[var(--color-ink)] leading-tight break-words">
              {approval.type === "outreach"
                ? `NOVA recommends contacting ${approval.company}`
                : approval.company}
            </h3>
            <p className="text-[14px] text-[var(--color-ink-soft)] mt-1.5 leading-relaxed break-words">
              {approval.body}
            </p>
          </div>
        </div>

        {approval.type !== "negotiation" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {approval.meta.map((m) => {
                const isStatus = m.label.toLowerCase().includes("status") || m.label.toLowerCase().includes("stage");
                const isApprovedOrSent = m.value.toLowerCase().includes("sent") || m.value.toLowerCase().includes("approved");
                const isPending = m.value.toLowerCase().includes("pending");

                return (
                  <div
                    key={m.label}
                    className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] min-w-0 overflow-hidden"
                  >
                    <div className="label-mono text-[10px] text-[var(--color-ink-faint)] mb-1 uppercase tracking-wider truncate">
                      {m.label}
                    </div>
                    {isStatus ? (
                      <Badge
                        tone={isApprovedOrSent ? "sage" : isPending ? "amber" : "neutral"}
                        className="text-xs truncate font-semibold"
                      >
                        {m.value}
                      </Badge>
                    ) : (
                      <div
                        className="text-sm font-semibold text-[var(--color-ink)] truncate font-mono"
                        title={m.value}
                      >
                        {m.value}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {state.message && (
              <div className="border-l-2 border-[var(--color-coral)] pl-4 py-2 bg-[var(--color-bg-sunk)]/50 rounded-r-lg">
                <div className="label-mono text-[11px] text-[var(--color-coral-ink)] font-bold mb-1">
                  Message preview
                </div>
                <p className="text-[13px] sm:text-sm leading-relaxed text-[var(--color-ink-soft)] italic break-words whitespace-pre-wrap">
                  "{state.message}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {approval.meta.map((m) => {
              const highlight = m.label === "NOVA counter";
              return (
                <div
                  key={m.label}
                  className={cn(
                    "rounded-[var(--radius-md)] p-4 border min-w-0 overflow-hidden",
                    highlight
                      ? "bg-[var(--color-coral-soft)] border-transparent"
                      : "bg-[var(--color-surface-2)] border-[var(--color-line)]",
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    {highlight && (
                      <Sparkles
                        size={12}
                        className="text-[var(--color-coral-ink)] shrink-0"
                      />
                    )}
                    <span
                      className={cn(
                        "label-mono text-xs truncate",
                        highlight
                          ? "text-[var(--color-coral-ink)]"
                          : "text-[var(--color-ink-faint)]",
                      )}
                    >
                      {m.label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "font-serif text-lg sm:text-xl font-bold truncate",
                      highlight
                        ? "text-[var(--color-coral-ink)]"
                        : "text-[var(--color-ink)]",
                    )}
                    title={highlight && state.edited ? state.counter : m.value}
                  >
                    {highlight && state.edited ? state.counter : m.value}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center gap-1.5 text-[13px] text-[var(--color-ink-soft)]">
          <Sparkles size={13} className="text-[var(--color-coral-ink)]" />
          <span className="text-[var(--color-ink-faint)]">Recommendation:</span>
          <span className="font-medium text-[var(--color-ink)]">
            {approval.recommendation}
          </span>
        </div>

        <div className="mt-6 pt-5 border-t border-[var(--color-line)]">
          <AnimatePresence mode="wait" initial={false}>
            {resolved ? (
              <motion.div
                key="resolved"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center justify-between"
              >
                <div
                  className={cn(
                    "inline-flex items-center gap-2 text-[14px] font-semibold",
                    isApproved
                      ? "text-[var(--color-sage)]"
                      : "text-[var(--color-rose)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-white",
                      isApproved
                        ? "bg-[var(--color-sage)]"
                        : "bg-[var(--color-rose)]",
                    )}
                  >
                    {isApproved ? <Check size={14} /> : <X size={14} />}
                  </span>
                  {isApproved
                    ? state.sent
                      ? "Approved & Email Sent"
                      : "Approved"
                    : "Rejected"}
                </div>
                <button
                  onClick={onUndo}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                >
                  <Undo2 size={14} /> Undo
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Button onClick={onApprove} disabled={state.sending}>
                  <Send size={14} className="mr-1.5" />
                  {state.sending
                    ? "Sending..."
                    : approval.type === "negotiation"
                      ? "Approve Counter"
                      : "Approve & Send"}
                </Button>
                <Button variant="outline" onClick={onEdit}>
                  <Pencil size={14} /> Edit
                </Button>
                <Button variant="ghost" onClick={onReject}>
                  Reject
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}
