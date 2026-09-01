import { useState, useEffect } from "react";
import { PageFade, PageHeader, Card, Badge, Button } from "../components/ui";
import { FormattedChatMessage } from "../components/FormattedChatMessage";
import {
  RefreshCw,
  MessageSquare,
  Send,
  Zap,
  Bot,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Building2,
  Package,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

export default function Conversations() {
  const { session, workspaceId } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active selected thread for detail view
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [simulatingReply, setSimulatingReply] = useState(false);
  const [sellerMessageText, setSellerMessageText] = useState("");
  const [replyText, setReplyText] = useState(
    "We are interested in 250 quintals, but can you offer ₹5,200 per quintal?",
  );

  const fetchConversations = async (isInitial = false) => {
    if (!session || !workspaceId) return;
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<{ conversations: any[] }>(
        "/api/conversations",
        { session, workspaceId },
      );
      const list = data.conversations || [];
      setConversations(list);
      setSelectedConv((prev: any) => {
        if (!prev) return list[0] || null;
        const matched = list.find((c) => c.id === prev.id);
        return matched ? { ...matched, messages: matched.messages || prev.messages } : prev;
      });
    } catch (err: any) {
      setError(err.message || "Failed to load conversations");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);

    const handleUpdate = () => fetchConversations(false);
    window.addEventListener("conversationsUpdated", handleUpdate);
    window.addEventListener("opportunitiesUpdated", handleUpdate);
    return () => {
      window.removeEventListener("conversationsUpdated", handleUpdate);
      window.removeEventListener("opportunitiesUpdated", handleUpdate);
    };
  }, [session, workspaceId]);

  const handleSync = async () => {
    if (!session || !workspaceId) return;
    setSyncing(true);
    setError(null);
    try {
      await fetchApi("/api/integrations/gmail/sync", {
        method: "POST",
        session,
        workspaceId,
      });
      await fetchConversations(false);
    } catch (err: any) {
      setError(err.message || "Failed to sync replies");
    } finally {
      setSyncing(false);
    }
  };

  const handleSimulateReply = async (
    convId: string,
    customMessage?: string,
  ) => {
    if (!session || !workspaceId || !selectedConv) return;
    const textToUse = customMessage || replyText;
    if (!textToUse.trim()) return;

    setSimulatingReply(true);
    setError(null);

    // 1. Optimistically append inbound user message & thinking badge immediately
    const tempInboundMsg = {
      id: `temp_in_${Date.now()}`,
      direction: "INBOUND",
      role: "user",
      isSimulated: true,
      content: textToUse,
      createdAt: new Date().toISOString(),
    };

    const tempThinkingMsg = {
      id: `temp_asst_${Date.now()}`,
      direction: "OUTBOUND",
      role: "assistant",
      content: "⚡ NOVA is analyzing buyer counteroffer & calculating optimal pricing strategy...",
      metadata: { negotiationAnalysis: true },
      createdAt: new Date().toISOString(),
    };

    setSelectedConv((prev: any) =>
      prev
        ? {
            ...prev,
            messages: [
              ...(prev.messages || []),
              tempInboundMsg,
              tempThinkingMsg,
            ],
          }
        : prev,
    );

    try {
      await fetchApi<any>(`/api/conversations/${convId}/reply`, {
        method: "POST",
        session,
        workspaceId,
        body: {
          messageText: textToUse,
          isSimulated: true,
        },
      });

      // Refetch current conversation details without unmounting
      const updatedDetail = await fetchApi<any>(
        `/api/conversations/${convId}`,
        { session, workspaceId },
      );
      setSelectedConv(updatedDetail);
      fetchConversations(false);
      window.dispatchEvent(new Event("dealsUpdated"));
    } catch (err: any) {
      setError(err.message || "Failed to simulate buyer reply");
      const freshDetail = await fetchApi<any>(
        `/api/conversations/${convId}`,
        { session, workspaceId },
      ).catch(() => null);
      if (freshDetail) setSelectedConv(freshDetail);
    } finally {
      setSimulatingReply(false);
    }
  };

  const handleApproveAndSend = async (responseText?: string) => {
    if (!session || !workspaceId || !selectedConv) return;
    const textToSend =
      responseText ||
      selectedConv.messages?.find(
        (m: any) => m.metadata?.negotiationAnalysis?.draftResponse,
      )?.metadata?.negotiationAnalysis?.draftResponse ||
      "Thank you for your prompt response. We accept your terms and look forward to dispatching the consignment.";

    // Optimistically append sent outbound message immediately
    const tempOutbound = {
      id: `temp_out_${Date.now()}`,
      direction: "OUTBOUND",
      role: "assistant",
      content: textToSend,
      metadata: { status: "SENT", approvedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    setSelectedConv((prev: any) =>
      prev
        ? {
            ...prev,
            messages: [...(prev.messages || []), tempOutbound],
          }
        : prev,
    );

    try {
      await fetchApi(`/api/conversations/${selectedConv.id}/messages`, {
        method: "POST",
        session,
        workspaceId,
        body: {
          role: "assistant",
          direction: "OUTBOUND",
          content: textToSend,
          metadata: {
            approvedAt: new Date().toISOString(),
            status: "SENT",
          },
        },
      });

      const updatedDetail = await fetchApi<any>(
        `/api/conversations/${selectedConv.id}`,
        { session, workspaceId },
      );
      setSelectedConv(updatedDetail);
      fetchConversations(false);
      window.dispatchEvent(new Event("dealsUpdated"));
    } catch (err: any) {
      setError(err.message || "Failed to send counteroffer");
    }
  };

  const handleSendSellerMessage = async () => {
    if (!sellerMessageText.trim() || !selectedConv) return;
    const textToSend = sellerMessageText.trim();
    setSellerMessageText("");
    await handleApproveAndSend(textToSend);
  };

  const handleEditResponse = (responseText?: string) => {
    const textToEdit =
      responseText ||
      selectedConv?.messages?.find(
        (m: any) => m.metadata?.negotiationAnalysis?.draftResponse,
      )?.metadata?.negotiationAnalysis?.draftResponse ||
      "";
    if (textToEdit) {
      setSellerMessageText(textToEdit);
    }
  };

  return (
    <PageFade>
      <PageHeader
        eyebrow="COMMUNICATION & NEGOTIATION"
        title="Conversations"
        subtitle="Tracked email threads with buyers & AI negotiation recommendations"
        actions={
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Replies"}
          </Button>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-[var(--radius-md)] border border-red-100 text-sm">
          {error}
        </div>
      )}

      {loading && conversations.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-serif text-xl text-[var(--color-ink)]">
            Loading active conversation threads...
          </p>
        </Card>
      ) : conversations.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
          <div className="h-12 w-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-ink-faint)] mb-4">
            <MessageSquare size={24} />
          </div>
          <h2 className="font-serif text-2xl text-[var(--color-ink)] mb-2">
            No active conversations yet
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
            When you approve and send sales outreach to qualified opportunities,
            tracked conversation threads will appear here automatically.
          </p>
          <Button onClick={() => (window.location.href = "/app/opportunities")}>
            View Qualified Opportunities
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thread List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="label-mono text-xs text-[var(--color-ink-faint)] uppercase tracking-wider mb-2">
              Active Threads ({conversations.length})
            </div>
            {conversations.map((conv) => {
              const lastMsg = conv.messages?.[0];
              const isSelected = selectedConv?.id === conv.id;
              const companyName =
                conv.title || conv.opportunity?.companyName || "Buyer";
              const dealStage = conv.deal?.stage || "QUOTE_SENT";

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-4 rounded-[var(--radius-lg)] border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--color-surface-2)] border-[var(--color-coral)] shadow-md"
                      : "bg-[var(--color-surface)] border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-serif text-base font-medium text-[var(--color-ink)] truncate">
                      {companyName}
                    </h3>
                    <Badge
                      tone={dealStage === "NEGOTIATING" ? "coral" : "sage"}
                    >
                      {dealStage}
                    </Badge>
                  </div>

                  <div className="text-xs text-[var(--color-ink-soft)] flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1">
                      <Package
                        size={13}
                        className="text-[var(--color-ink-faint)]"
                      />
                      {conv.deal?.productName ||
                        conv.opportunity?.productName ||
                        "B2B Supply"}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-ink-faint)] line-clamp-2 italic bg-[var(--color-bg-sunk)] p-2 rounded border border-[var(--color-line)]/50">
                    {conv.lastMessagePreview ||
                      lastMsg?.content ||
                      "Outreach sent to buyer."}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[var(--color-line)]/50 text-[11px] text-[var(--color-ink-faint)]">
                    <span>
                      {new Date(
                        conv.lastActivityAt || conv.updatedAt,
                      ).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-[var(--color-coral-ink)]">
                      View Details →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thread Detail View */}
          <div className="lg:col-span-2">
            {!selectedConv ? (
              <Card className="p-12 text-center h-full flex flex-col items-center justify-center">
                <MessageSquare
                  size={32}
                  className="text-[var(--color-ink-faint)] mb-3"
                />
                <h3 className="font-serif text-xl text-[var(--color-ink)]">
                  Select a conversation thread
                </h3>
                <p className="text-xs text-[var(--color-ink-soft)] mt-1">
                  Click any thread on the left to inspect sent outreach, buyer
                  replies, and AI counter-strategies.
                </p>
              </Card>
            ) : (
              <Card className="p-6 space-y-6">
                {/* Header */}
                <div className="border-b border-[var(--color-line)] pb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--color-ink)]">
                      {selectedConv.title ||
                        selectedConv.opportunity?.companyName}
                    </h2>
                    <div className="text-xs text-[var(--color-ink-soft)] mt-1 flex items-center gap-2">
                      <span>
                        Product:{" "}
                        <strong className="text-[var(--color-ink)]">
                          {selectedConv.deal?.productName ||
                            selectedConv.opportunity?.productName ||
                            "B2B Goods"}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Stage:{" "}
                        <strong className="text-[var(--color-coral-ink)]">
                          {selectedConv.deal?.stage || "QUOTE_SENT"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={simulatingReply}
                      onClick={() => handleSimulateReply(selectedConv.id)}
                    >
                      <Zap size={14} className="text-[var(--color-coral)]" />
                      {simulatingReply
                        ? "Simulating AI Analysis..."
                        : "⚡ Simulate Buyer Reply (Demo)"}
                    </Button>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {(selectedConv.messages || []).map((msg: any) => {
                    const isInbound =
                      msg.direction === "INBOUND" || msg.role === "user";
                    const isAiAnalysis =
                      msg.metadata?.negotiationAnalysis ||
                      msg.role === "assistant";
                    const isWhatsApp =
                      msg.metadata?.channel === "WHATSAPP" ||
                      selectedConv.title?.includes("WhatsApp");

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-[var(--radius-md)] border space-y-2 ${
                          isInbound
                            ? isWhatsApp
                              ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 ml-6 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                              : "bg-blue-50/70 border-blue-200 text-blue-950 ml-6"
                            : isAiAnalysis
                              ? "bg-[var(--color-surface-2)] border-[var(--color-coral)]/40 text-[var(--color-ink)]"
                              : isWhatsApp
                                ? "bg-emerald-50/30 border-emerald-300/50 text-[var(--color-ink)] mr-6"
                                : "bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-ink)] mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5">
                            {isWhatsApp && (
                              <Badge
                                tone="sage"
                                className="text-[10px] py-0 font-mono"
                              >
                                💬 WhatsApp
                              </Badge>
                            )}
                            {isInbound ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                📥 INBOUND REPLY{" "}
                                {msg.isSimulated && "(Simulated Demo)"}
                              </span>
                            ) : isAiAnalysis ? (
                              <span className="text-[var(--color-coral-ink)] font-bold flex items-center gap-1">
                                <Sparkles size={14} /> NOVA AI RECOMMENDATION
                              </span>
                            ) : (
                              <span className="text-[var(--color-sage)] font-bold">
                                📤 OUTBOUND OUTREACH
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-normal flex items-center gap-1 text-[var(--color-ink-faint)]">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isWhatsApp && !isInbound && (
                              <span className="text-emerald-600 font-bold ml-1">
                                ✓✓
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {isAiAnalysis ? (
                            <FormattedChatMessage
                              content={msg.content}
                              payload={msg.metadata}
                              onActionClick={(action, actPayload) => {
                                if (
                                  action === "send_counteroffer" ||
                                  action === "approve_counteroffer" ||
                                  action === "send_email_now" ||
                                  action?.includes("approve") ||
                                  action?.includes("send")
                                ) {
                                  const draftText =
                                    actPayload?.responseText ||
                                    msg.metadata?.negotiationAnalysis?.draftResponse;
                                  handleApproveAndSend(draftText);
                                } else if (
                                  action === "edit_counteroffer" ||
                                  action?.includes("edit")
                                ) {
                                  const draftText =
                                    actPayload?.responseText ||
                                    msg.metadata?.negotiationAnalysis?.draftResponse;
                                  handleEditResponse(draftText);
                                }
                              }}
                            />
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 1. REAL SELLER OUTBOUND MESSAGE COMPOSER */}
                <div className="pt-4 border-t border-[var(--color-line)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
                      <Send size={13} className="text-[var(--color-coral)]" /> Send Response to Buyer (As Seller):
                    </label>
                    <span className="text-[11px] text-[var(--color-ink-faint)]">
                      Outbound Official Channel
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={sellerMessageText}
                      onChange={(e) => setSellerMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSendSellerMessage();
                        }
                      }}
                      placeholder="Type your message, counteroffer, or quotation to buyer..."
                      className="flex-1 text-sm border border-[var(--color-line)] rounded-[var(--radius-md)] p-2.5 bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-coral)] shadow-xs"
                    />
                    <Button
                      size="sm"
                      className="bg-[var(--color-coral)] hover:opacity-90 text-white font-semibold px-4 cursor-pointer gap-1.5"
                      onClick={handleSendSellerMessage}
                      disabled={!sellerMessageText.trim()}
                    >
                      <Send size={14} /> Send Outbound
                    </Button>
                  </div>
                </div>

                {/* 2. DEMO BUYER SIMULATION TEST TOOL (Clearly marked) */}
                <div className="p-3.5 rounded-xl border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)]/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={13} className="text-amber-500" /> Demo Simulator: Test What Buyer Replies
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Testing Tool
                    </span>
                  </div>

                  {/* Preset quick test chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[var(--color-ink-faint)] mr-1">Quick Scenarios:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateReply(
                          selectedConv.id,
                          "We are interested in 250 quintals, but can you offer ₹5,200 per quintal?",
                        )
                      }
                      className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)] text-[var(--color-ink)] cursor-pointer transition-colors"
                    >
                      🏷️ Counter ₹5,200/Qtl
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateReply(
                          selectedConv.id,
                          "We accept your proposed terms and pricing! Please send the dispatch agreement and invoice.",
                        )
                      }
                      className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--color-surface)] border border-emerald-500/40 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 cursor-pointer transition-colors"
                    >
                      🤝 Accept & Request Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateReply(
                          selectedConv.id,
                          "What is your moisture percentage and can you deliver by this Friday?",
                        )
                      }
                      className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)] text-[var(--color-ink)] cursor-pointer transition-colors"
                    >
                      🚚 Quality & Delivery Query
                    </button>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type custom simulated message FROM buyer..."
                      className="flex-1 text-xs border border-[var(--color-line)] rounded-[var(--radius-md)] p-2 bg-[var(--color-surface)] text-[var(--color-ink)]"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={simulatingReply}
                      onClick={() => handleSimulateReply(selectedConv.id)}
                      className="text-xs cursor-pointer"
                    >
                      <Zap size={13} className="text-amber-500" /> Simulate Inbound
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageFade>
  );
}
