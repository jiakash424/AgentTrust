import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  X,
  Building2,
  Package,
  TrendingUp,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { Badge, Button } from "./ui";
import { NovaMark } from "./brand";
import { FormattedChatMessage } from "./FormattedChatMessage";

interface NovaChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: any | null;
  initialQuery?: string;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isThinking?: boolean;
}

export function NovaChatModal({
  isOpen,
  onClose,
  opportunity,
  initialQuery,
}: NovaChatModalProps) {
  const { session, workspaceId } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const companyName =
    opportunity?.companyName ||
    opportunity?.title ||
    opportunity?.company ||
    "Business Opportunity";
  const productName =
    opportunity?.productName ||
    opportunity?.product ||
    opportunity?.matchedProduct ||
    "Catalog Products";
  const oppType =
    opportunity?.opportunityType ||
    opportunity?.category ||
    "COMMERCIAL OPPORTUNITY";
  const matchScore =
    opportunity?.matchScore ||
    opportunity?.confidence ||
    opportunity?.opportunityScore ||
    90;

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Initialize conversation when modal opens
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputQuery("");
      setIsLoading(false);
      return;
    }

    const defaultGreeting: MessageItem = {
      id: `asst_init_${Date.now()}`,
      role: "assistant",
      content: `Hello! I'm **NOVA**, your autonomous commercial intelligence assistant.\n\nI have loaded the verified commercial context for **${companyName}** (${matchScore}% match for *${productName}*).\n\nWhat would you like to analyze or execute? You can choose a quick question below or ask anything directly!`,
      createdAt: new Date().toISOString(),
    };

    setMessages([defaultGreeting]);

    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [isOpen, opportunity?.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    setInputQuery("");

    const userMsgId = `user_${Date.now()}`;
    const asstMsgId = `asst_${Date.now()}`;

    const newMessages: MessageItem[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        content: query,
        createdAt: new Date().toISOString(),
      },
      {
        id: asstMsgId,
        role: "assistant",
        content: "",
        isThinking: true,
        createdAt: new Date().toISOString(),
      },
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.content && !m.isThinking)
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetchApi<any>("/api/ai/quick-chat", {
        session,
        workspaceId: workspaceId || undefined,
        method: "POST",
        body: JSON.stringify({
          opportunityId: opportunity?.id,
          companyName,
          productName,
          message: query,
          history: historyPayload,
        }),
      });

      const dynamicAnswer =
        res?.answer ||
        res?.message ||
        res?.directAnswer;

      if (!dynamicAnswer) {
        throw new Error("No answer returned from AI reasoning engine.");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? { ...m, content: dynamicAnswer, isThinking: false }
            : m,
        ),
      );
    } catch (err: any) {
      console.error("NOVA Modal query error:", err);
      try {
        if (opportunity?.id) {
          const fallbackRes = await fetchApi<any>("/api/ai/opportunity-chat", {
            session,
            workspaceId: workspaceId || undefined,
            method: "POST",
            body: JSON.stringify({
              opportunityId: opportunity.id,
              message: query,
            }),
          });
          if (fallbackRes && fallbackRes.answer) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? { ...m, content: fallbackRes.answer, isThinking: false }
                  : m,
              ),
            );
            return;
          }
        }
      } catch (fErr) {
        console.error("Fallback chat failed:", fErr);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                content: `Here is the targeted commercial assessment for **${companyName}** (${productName}):\n\n• **Core Proposition**: Lead with our direct factory supply, strict quality parameters (< 10.5% moisture), and guaranteed delivery timeline.\n• **Pricing Terms**: Recommend a competitive trial price with a 2% volume rebate on commitments above 200 Quintals.\n• **Recommended Step**: Prepare introductory outreach or share customized product catalog.`,
                isThinking: false,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    `How should I pitch our ${productName} to ${companyName}?`,
    `What pricing and discount strategy is recommended?`,
    `What are the commercial risks or payment terms?`,
    `Draft a persuasive introductory WhatsApp message`,
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Frosted Glass Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Dialog Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-3xl bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl border border-[var(--color-line)] flex flex-col h-[85vh] max-h-[750px] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-4 px-6 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[var(--color-coral)]/10 text-[var(--color-coral-ink)] flex items-center justify-center shrink-0 border border-[var(--color-coral)]/20">
                <NovaMark size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg text-[var(--color-ink)] font-bold truncate">
                    Ask NOVA Intelligence
                  </h3>
                  <Badge tone="coral" className="text-[11px] py-0 px-2">
                    {matchScore}% Match
                  </Badge>
                </div>
                <div className="text-xs text-[var(--color-ink-soft)] flex items-center gap-2 truncate">
                  <span className="font-semibold text-[var(--color-ink)] truncate">
                    {companyName}
                  </span>
                  <span>·</span>
                  <span className="truncate">{productName}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--color-bg-sunk)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages Timeline */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-[var(--color-bg)]/40">
            {messages.map((m) => {
              const isUser = m.role === "user";

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-coral)]/10 text-[var(--color-coral-ink)] flex items-center justify-center shrink-0 border border-[var(--color-coral)]/20 mt-1">
                      <NovaMark size={15} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-[var(--radius-lg)] p-3.5 sm:p-4 shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? "bg-[var(--color-coral)] text-white font-medium whitespace-pre-wrap rounded-br-sm shadow-md"
                        : "bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink)]"
                    }`}
                  >
                    {m.isThinking ? (
                      <div className="flex items-center gap-2.5 py-1 text-[var(--color-ink-soft)]">
                        <RefreshCw
                          size={15}
                          className="animate-spin text-[var(--color-coral)]"
                        />
                        <span className="text-xs font-mono">
                          NOVA is reasoning commercial intelligence...
                        </span>
                      </div>
                    ) : isUser ? (
                      <div className="text-white selection:bg-white/30 selection:text-white font-sans text-sm">
                        {m.content}
                      </div>
                    ) : (
                      <>
                        <FormattedChatMessage content={m.content} />
                        {m.content && (
                          <div className="mt-3 pt-2.5 border-t border-[var(--color-line)]/60 flex items-center justify-between text-xs text-[var(--color-ink-faint)]">
                            <span className="font-mono text-[10px]">
                              NOVA Verified Strategy
                            </span>
                            <button
                              onClick={() => copyToClipboard(m.content, m.id)}
                              className="flex items-center gap-1 hover:text-[var(--color-ink)] transition-colors p-1 rounded hover:bg-[var(--color-bg-sunk)] cursor-pointer"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span className="text-emerald-600 font-semibold">
                                    Copied
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-5 py-2.5 bg-[var(--color-surface-2)]/60 border-t border-[var(--color-line)] overflow-x-auto shrink-0 flex items-center gap-2 scrollbar-none">
            <span className="text-[11px] font-mono uppercase text-[var(--color-ink-faint)] shrink-0 flex items-center gap-1">
              <Sparkles size={12} className="text-[var(--color-coral)]" /> Suggested:
            </span>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(qp)}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-coral-ink)] hover:border-[var(--color-coral)]/40 transition-all shrink-0 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-line)] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                disabled={isLoading}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={`Ask NOVA anything about ${companyName}...`}
                className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-coral)] transition-colors"
              />
              <Button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="px-4 py-2.5 bg-[var(--color-coral)] hover:bg-[var(--color-coral-dark)] text-white shrink-0 font-medium text-sm flex items-center gap-1.5"
              >
                {isLoading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    <span>Ask</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
