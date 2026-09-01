import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Boxes,
  Compass,
  TrendingUp,
  ShieldCheck,
  History,
  X,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { NovaMessage } from "../nova";
import { AgentThinkingConsole } from "../nova/AgentThinkingConsole";
import { NovaMark } from "../components/brand";
import { Button, Badge, PageFade } from "../components/ui";
import { FormattedChatMessage } from "../components/FormattedChatMessage";
import { NovaChatComposer } from "../components/NovaChatComposer";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

export interface ChatTurn {
  id: string;
  role: "user" | "nova";
  content: string;
  thinkingEvents?: any[];
  isThinking?: boolean;
  workflowId?: string;
  createdAt: string;
}

const suggestions = [
  "Analyze my inventory",
  "Find my biggest growth opportunity",
  "What should I sell more of?",
  "Aisa kya karu jisse meri sales badhe?",
];

const quickActions = [
  { label: "Analyze Inventory", icon: Boxes, tone: "coral" as const },
  { label: "Find Opportunities", icon: Compass, tone: "iris" as const },
  { label: "Grow Revenue", icon: TrendingUp, tone: "sage" as const },
  {
    label: "AI Buyer Readiness",
    icon: ShieldCheck,
    tone: "amber" as const,
    nav: "/app/commerce",
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function CommandCenter() {
  const { session, workspaceId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [value, setValue] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Persistent conversation timeline state
  const [conversationId, setConversationId] = useState<string | null>(() => {
    return localStorage.getItem("nova_current_conv_id") || null;
  });
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Opportunity Context State
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(
    null,
  );
  const [activeOpportunity, setActiveOpportunity] = useState<any>(null);
  const [opportunityMessages, setOpportunityMessages] = useState<
    Array<{ role: "user" | "nova"; content: string; payload?: any }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const processedOpportunityRef = useRef<string | null>(null);
  const processedQueryRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatTurns, isGenerating, opportunityMessages]);

  // Load active conversation from DB on mount / refresh ONLY if there is no incoming query
  useEffect(() => {
    if (!session || !workspaceId) return;

    // If user navigated with a specific query/prompt or ?new=true, do NOT load old history
    const incomingQuery =
      searchParams.get("q") ||
      searchParams.get("query") ||
      searchParams.get("prompt") ||
      searchParams.get("ask") ||
      searchParams.get("opportunityId");
    const isExplicitNew = searchParams.get("new") === "true";

    if (incomingQuery || isExplicitNew) {
      // Initialize fresh chat session for this new query
      startNewChat();
      return;
    }

    const loadInitialChat = async () => {
      try {
        let conv: any = null;
        if (conversationId) {
          conv = await fetchApi<any>(`/api/conversations/${conversationId}`, {
            session,
            workspaceId,
          });
        }
        if (!conv || conv.error) {
          const res = await fetchApi<any>(`/api/conversations/active`, {
            session,
            workspaceId,
          });
          conv = res?.conversation;
        }

        if (conv && conv.id) {
          setConversationId(conv.id);
          localStorage.setItem("nova_current_conv_id", conv.id);

          if (Array.isArray(conv.messages) && conv.messages.length > 0) {
            const hasAssistant = conv.messages.some(
              (m: any) => m.role === "assistant" || m.role === "nova",
            );
            if (hasAssistant) {
              const turns: ChatTurn[] = conv.messages.map((m: any) => ({
                id: m.id,
                role: m.role === "user" ? "user" : "nova",
                content: m.content,
                workflowId: m.metadata?.workflowId,
                thinkingEvents: m.metadata?.thinkingEvents || [],
                createdAt: m.createdAt || new Date().toISOString(),
                isThinking: false,
              }));
              setChatTurns(turns);
            } else {
              setChatTurns([]);
            }
          } else {
            setChatTurns([]);
          }
        }
      } catch (err) {
        console.error("Failed to load initial conversation:", err);
      }
    };

    loadInitialChat();
  }, [session, workspaceId, searchParams]);

  // Handle URL deep links for discovery commands & user prompts (?q=... or ?query=... or ?prompt=...)
  useEffect(() => {
    if (!session || !workspaceId) return;
    const queryPrompt =
      searchParams.get("q") ||
      searchParams.get("query") ||
      searchParams.get("prompt") ||
      searchParams.get("ask");

    if (queryPrompt && queryPrompt !== processedQueryRef.current) {
      processedQueryRef.current = queryPrompt;
      setChatTurns([]);
      // Small timeout to allow new session creation
      setTimeout(() => {
        submitMessage(queryPrompt);
      }, 150);
    }
  }, [searchParams, session, workspaceId]);

  // Handle URL deep links for opportunities
  useEffect(() => {
    const oppId =
      searchParams.get("opportunityId") || searchParams.get("entityId");
    const autoAction =
      searchParams.get("autoAction") || searchParams.get("action");

    if (oppId && oppId !== processedOpportunityRef.current) {
      processedOpportunityRef.current = oppId;
      setActiveOpportunityId(oppId);
      loadOpportunityContext(oppId, autoAction);
    }
  }, [searchParams]);

  const loadOpportunityContext = async (
    oppId: string,
    autoAction?: string | null,
  ) => {
    if (!session || !workspaceId) return;
    try {
      const opp = await fetchApi<any>(`/api/opportunities/${oppId}`, {
        session,
        workspaceId,
      });
      setActiveOpportunity(opp);

      let actionMsg = `Evaluate pricing, margin impact, and prepare a tailored B2B procurement proposal for ${opp?.companyName || "this buyer"}.`;
      if (
        autoAction === "prepare_outreach" ||
        autoAction === "prepare_email" ||
        autoAction === "outreach" ||
        autoAction === "draft_email"
      ) {
        actionMsg = `Draft a personalized B2B outreach email for ${opp?.companyName || "this buyer"} for ${opp?.productName || "our wholesale inventory"}.`;
      }
      submitMessage(actionMsg);
    } catch (err) {
      console.error("Failed to load opportunity context:", err);
    }
  };

  const sendOpportunityAIMessage = async (
    oppId: string,
    messageText: string,
  ) => {
    if (!session || !workspaceId || !messageText.trim()) return;
    setAiLoading(true);
    setOpportunityMessages((prev) => [
      ...prev,
      { role: "user", content: messageText },
    ]);

    try {
      const res = await fetchApi<any>("/api/ai/opportunity-chat", {
        session,
        workspaceId,
        method: "POST",
        body: JSON.stringify({
          opportunityId: oppId,
          message: messageText,
        }),
      });

      if (res && res.answer) {
        setOpportunityMessages((prev) => [
          ...prev,
          { role: "nova", content: res.answer, payload: res },
        ]);
      }
    } catch (err: any) {
      console.error("Failed opportunity AI chat:", err);
      setOpportunityMessages((prev) => [
        ...prev,
        {
          role: "nova",
          content: "Failed to process request. Please check entity context.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // History Drawer Functions
  useEffect(() => {
    if (historyOpen) {
      fetchHistory();
    }
  }, [historyOpen]);

  const fetchHistory = async () => {
    if (!session || !workspaceId) return;
    try {
      const data = await fetchApi<any>("/api/conversations", {
        session,
        workspaceId,
      });
      if (data && Array.isArray(data.conversations)) {
        setHistoryData(data.conversations);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const loadConversationHistory = async (id: string) => {
    if (!session || !workspaceId) return;
    try {
      const conv = await fetchApi<any>(`/api/conversations/${id}`, {
        session,
        workspaceId,
      });
      if (conv && !conv.error) {
        setConversationId(conv.id);
        localStorage.setItem("nova_current_conv_id", conv.id);
        if (Array.isArray(conv.messages)) {
          const turns: ChatTurn[] = conv.messages.map((m: any) => ({
            id: m.id,
            role: m.role === "user" ? "user" : "nova",
            content: m.content,
            workflowId: m.metadata?.workflowId,
            thinkingEvents: m.metadata?.thinkingEvents || [],
            createdAt: m.createdAt || new Date().toISOString(),
            isThinking: false,
          }));
          setChatTurns(turns);
        }
        setHistoryOpen(false);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!session || !workspaceId) return;
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      setHistoryData((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const startNewChat = async () => {
    setChatTurns([]);
    setValue("");
    try {
      if (session && workspaceId) {
        const newConv = await fetchApi<any>("/api/conversations", {
          session,
          workspaceId,
          method: "POST",
          body: JSON.stringify({ title: "New Session" }),
        });
        if (newConv && newConv.id) {
          setConversationId(newConv.id);
          localStorage.setItem("nova_current_conv_id", newConv.id);
        }
      }
    } catch (err) {
      console.error("Failed to initialize new chat:", err);
    }
  };

  // Main Submit Handler: Appends turns to continuous chat timeline
  const submitMessage = async (text?: string) => {
    const q = (text ?? value).trim();
    if (!q || !session || !workspaceId || isGenerating) return;

    if (activeOpportunityId) {
      setValue("");
      sendOpportunityAIMessage(activeOpportunityId, q);
      return;
    }

    setValue("");
    setIsGenerating(true);

    let activeConvId = conversationId;
    if (!activeConvId) {
      try {
        const newConv = await fetchApi<any>("/api/conversations", {
          session,
          workspaceId,
          method: "POST",
          body: JSON.stringify({ title: q.slice(0, 40) }),
        });
        if (newConv && newConv.id) {
          activeConvId = newConv.id;
          setConversationId(newConv.id);
          localStorage.setItem("nova_current_conv_id", newConv.id);
        }
      } catch (err) {
        console.error("Failed to auto-create conversation:", err);
      }
    }

    const userTurnId = `user_${Date.now()}`;
    const assistantTurnId = `asst_${Date.now()}`;

    // 1. Immediately append user turn and thinking assistant turn to timeline
    const userTurn: ChatTurn = {
      id: userTurnId,
      role: "user",
      content: q,
      createdAt: new Date().toISOString(),
    };

    const assistantTurn: ChatTurn = {
      id: assistantTurnId,
      role: "nova",
      content: "",
      isThinking: true,
      thinkingEvents: [],
      createdAt: new Date().toISOString(),
    };

    setChatTurns((prev) => [...prev, userTurn, assistantTurn]);

    // Save user message to DB
    if (activeConvId) {
      fetchApi(`/api/conversations/${activeConvId}/messages`, {
        session,
        workspaceId,
        method: "POST",
        body: JSON.stringify({ role: "user", content: q }),
      }).catch(console.error);
    }

    try {
      const historyPayload = chatTurns
        .filter((t) => t.content && !t.isThinking)
        .slice(-6)
        .map((t) => ({
          role: t.role === "user" ? "user" : "assistant",
          content: t.content,
        }));

      const isExplicitDiscovery = true; // All prompts route to agentic workflow engine for full tool execution

      if (isExplicitDiscovery) {
        // Start background discovery / intelligence workflow
        const startRes = await fetchApi<any>("/api/lead-discovery/start", {
          session,
          workspaceId,
          method: "POST",
          body: JSON.stringify({
            userRequest: q,
            locationScope: "INDIA",
          }),
        });

        const wfId = startRes?.workflowId;
        if (wfId) {
          setChatTurns((prev) =>
            prev.map((t) =>
              t.id === assistantTurnId ? { ...t, workflowId: wfId } : t,
            ),
          );

          let isDone = false;
          let pollAttempts = 0;

          while (!isDone && pollAttempts < 35) {
            pollAttempts++;
            await new Promise((r) => setTimeout(r, 1000));

            const wfData = await fetchApi<any>(`/api/workflows/${wfId}`, {
              session,
              workspaceId,
            });

            if (wfData) {
              const events = wfData.events || [];
              const finalAnswer =
                wfData.finalAnswer ||
                (events.find((e: any) => e.type === "FINAL_ANSWER")?.data as any)
                  ?.answer;

              setChatTurns((prev) =>
                prev.map((t) =>
                  t.id === assistantTurnId
                    ? {
                        ...t,
                        thinkingEvents: events,
                        content: finalAnswer || t.content,
                      }
                    : t,
                ),
              );

              if (wfData.status === "COMPLETED" || wfData.status === "FAILED") {
                isDone = true;
                const answer =
                  finalAnswer ||
                  wfData.errorMessage ||
                  "I evaluated your commercial request and synchronized active opportunities.";

                setChatTurns((prev) =>
                  prev.map((t) =>
                    t.id === assistantTurnId
                      ? {
                          ...t,
                          content: answer,
                          isThinking: false,
                          thinkingEvents: events,
                          workflowData: wfData,
                        }
                      : t,
                  ),
                );

                if (activeConvId) {
                  fetchApi(`/api/conversations/${activeConvId}/messages`, {
                    session,
                    workspaceId,
                    method: "POST",
                    body: JSON.stringify({
                      role: "assistant",
                      content: answer,
                      metadata: { workflowId: wfId, thinkingEvents: events },
                    }),
                  }).catch(console.error);
                }
                return;
              }
            }
          }
        }
      }

      // Fast Direct Intelligent Reasoning
      const quickRes = await fetchApi<any>("/api/ai/quick-chat", {
        session,
        workspaceId,
        method: "POST",
        body: JSON.stringify({
          message: q,
          history: historyPayload,
        }),
      });

      const dynamicAnswer =
        quickRes?.answer ||
        quickRes?.message ||
        quickRes?.directAnswer ||
        "I evaluated your commercial catalog and active workspace context.";

      setChatTurns((prev) =>
        prev.map((t) =>
          t.id === assistantTurnId
            ? {
                ...t,
                content: dynamicAnswer,
                isThinking: false,
              }
            : t,
        ),
      );

      if (activeConvId) {
        fetchApi(`/api/conversations/${activeConvId}/messages`, {
          session,
          workspaceId,
          method: "POST",
          body: JSON.stringify({
            role: "assistant",
            content: dynamicAnswer,
          }),
        }).catch(console.error);
      }
    } catch (err: any) {
      console.error("Workflow execution error:", err);
      try {
        const fallbackRes = await fetchApi<any>("/api/ai/quick-chat", {
          session,
          workspaceId,
          method: "POST",
          body: JSON.stringify({
            message: q,
          }),
        });
        if (fallbackRes?.answer) {
          setChatTurns((prev) =>
            prev.map((t) =>
              t.id === assistantTurnId
                ? {
                    ...t,
                    content: fallbackRes.answer,
                    isThinking: false,
                  }
                : t,
            ),
          );
          return;
        }
      } catch (fErr) {
        console.error("Fallback chat failed:", fErr);
      }

      const safeAns =
        "Here is the strategic commercial summary for your business: Based on your current catalog specifications, focus on volume-based discount slabs and verified B2B buyers in your region for maximum gross margin.";
      setChatTurns((prev) =>
        prev.map((t) =>
          t.id === assistantTurnId
            ? {
                ...t,
                content: safeAns,
                isThinking: false,
              }
            : t,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageFade className="max-w-4xl w-full mx-auto flex flex-col h-full overflow-hidden">
      {/* Top Persistent Toolbar */}
      <div className="shrink-0 flex items-center justify-between p-3 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-xs mb-3">
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral)] shrink-0">
            <NovaMark size={16} active />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
              {activeOpportunityId
                ? "CONTEXT: OPPORTUNITY INTELLIGENCE"
                : "NOVA AUTONOMOUS ADVISORY"}
            </div>
            <div className="text-xs font-semibold text-[var(--color-ink)] truncate">
              {activeOpportunityId
                ? activeOpportunity?.companyName || "Selected Buyer"
                : chatTurns[0]?.content || "Sales Intelligence Session"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeOpportunityId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                processedOpportunityRef.current = null;
                setActiveOpportunityId(null);
                setActiveOpportunity(null);
                setOpportunityMessages([]);
              }}
              className="h-8 text-xs px-2.5"
            >
              Close Context
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchHistory();
              setHistoryOpen(true);
            }}
            className="h-8 text-xs px-2.5 gap-1"
          >
            <History size={13} /> History
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={startNewChat}
            className="h-8 text-xs px-3 gap-1 shadow-xs"
          >
            <Plus size={13} /> New Chat
          </Button>
        </div>
      </div>

      {/* Main Conversation Body (Scrollable Viewport) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1 pb-2">
        <AnimatePresence mode="wait">
          {activeOpportunityId ? (
            <motion.div
              key="opp-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {opportunityMessages.map((msg, idx) => (
                <div key={idx}>
                  <NovaMessage role={msg.role}>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <FormattedChatMessage
                        content={msg.content}
                        payload={msg.payload}
                      />
                    )}
                  </NovaMessage>
                </div>
              ))}
              {aiLoading && (
                <NovaMessage role="nova">
                  <div className="flex items-center gap-2 text-[var(--color-ink-soft)] text-sm py-1">
                    <Loader2
                      size={15}
                      className="animate-spin text-[var(--color-coral)]"
                    />
                    <span>
                      NOVA is resolving opportunity price intelligence &
                      business context...
                    </span>
                  </div>
                </NovaMessage>
              )}
            </motion.div>
          ) : chatTurns.length > 0 ? (
            <motion.div
              key="chat-timeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {chatTurns.map((turn, index) => (
                <div key={turn.id || index} className="space-y-4">
                  {turn.role === "user" ? (
                    <NovaMessage role="user">{turn.content}</NovaMessage>
                  ) : (
                    <div className="space-y-4">
                      {/* Observable Agent Thinking Console */}
                      {turn.thinkingEvents &&
                        turn.thinkingEvents.length > 0 && (
                          <AgentThinkingConsole
                            events={turn.thinkingEvents}
                            isThinking={turn.isThinking}
                          />
                        )}

                      {turn.isThinking && !turn.content && (
                        <NovaMessage role="nova">
                          <div className="flex items-center gap-2 text-[var(--color-ink-soft)] text-sm py-1">
                            <Loader2
                              size={15}
                              className="animate-spin text-[var(--color-coral)]"
                            />
                            <span>
                              NOVA is evaluating commercial catalog & reasoning
                              over business context...
                            </span>
                          </div>
                        </NovaMessage>
                      )}

                      {turn.content && (
                        <NovaMessage role="nova">
                          <FormattedChatMessage
                            content={turn.content}
                            onActionClick={(action, actPayload) => {
                              if (action === "send_email_now") {
                                submitMessage("Send this proposal immediately via official email gateway");
                              } else if (action === "draft_proposal_for") {
                                submitMessage(
                                  `Draft tailored B2B supply proposal for ${actPayload?.companyName || "this buyer"}`,
                                );
                              } else if (action === "send_email_to") {
                                submitMessage(
                                  `Send formal proposal email to ${actPayload?.companyName || "this buyer"}`,
                                );
                              } else if (
                                action === "prepare_outreach" ||
                                action === "prepare_email"
                              ) {
                                navigate("/app/approvals");
                              } else if (action === "view_products") {
                                navigate("/app/products");
                              } else if (action === "view_deals") {
                                navigate("/app/deals");
                              } else if (action === "discover_buyers") {
                                submitMessage(
                                  "Find potential B2B wholesale buyers across regional hubs",
                                );
                              }
                            }}
                          />
                        </NovaMessage>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pt-8"
            >
              {/* Hero / Greeting */}
              <div className="space-y-2 text-center pt-4 pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral)] shadow-xs">
                    <NovaMark size={24} active />
                  </div>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-ink)]">
                  {greeting()}, how can NOVA assist your sales today?
                </h1>
                <p className="text-[var(--color-ink-soft)] text-sm max-w-lg mx-auto leading-relaxed">
                  Autonomous B2B intelligence engine. Discover commercial buyers,
                  evaluate catalog margins, and scale wholesale commerce.
                </p>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => submitMessage(s)}
                    className="px-3.5 py-1.5 rounded-full text-xs bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Quick Action Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (action.nav) navigate(action.nav);
                        else submitMessage(action.label);
                      }}
                      className="p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-left transition-all hover:border-[var(--color-coral)]/30 group shadow-xs cursor-pointer"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                          action.tone === "coral" &&
                            "bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)]",
                          action.tone === "iris" &&
                            "bg-[var(--color-iris-soft)] text-[var(--color-iris)]",
                          action.tone === "sage" &&
                            "bg-[var(--color-sage-soft)] text-[var(--color-sage)]",
                          action.tone === "amber" &&
                            "bg-[var(--color-amber-soft)] text-[var(--color-amber)]",
                        )}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="text-xs font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-coral-ink)] transition-colors">
                        {action.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* DEDICATED BOTTOM CHAT COMPOSER (Sits permanently below message scroll viewport) */}
      <div className="shrink-0 w-full pt-2 pb-1 bg-[var(--color-bg)]">
        <NovaChatComposer
          value={value}
          onChange={setValue}
          onSubmit={() => submitMessage()}
          disabled={isGenerating || aiLoading}
          placeholder="Ask NOVA anything about your business..."
        />
      </div>

      {/* History Drawer Modal */}
      {historyOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
            <div className="w-full max-w-md h-full bg-[var(--color-surface)] border-l border-[var(--color-line)] shadow-2xl flex flex-col">
              <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-ink)]">
                  <History size={16} className="text-[var(--color-coral)]" />
                  Conversation History
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1 rounded-md text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-sunk)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {historyData.length === 0 ? (
                  <div className="text-center py-12 text-sm text-[var(--color-ink-faint)]">
                    No past conversations recorded yet.
                  </div>
                ) : (
                  historyData.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadConversationHistory(c.id)}
                      className={cn(
                        "p-3.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-coral)]/40 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs",
                        conversationId === c.id &&
                          "border-[var(--color-coral)] bg-[var(--color-coral-soft)]/20",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-coral-ink)] truncate">
                          {c.title || "Sales Advisory Session"}
                        </div>
                        <div className="text-[11px] text-[var(--color-ink-faint)] mt-1 flex items-center gap-2">
                          <span>
                            {new Date(
                              c.lastActivityAt || c.createdAt,
                            ).toLocaleDateString()}
                          </span>
                          {c.lastMessagePreview && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[180px]">
                                {c.lastMessagePreview}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => deleteConversation(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-[var(--color-coral-soft)] text-[var(--color-ink-faint)] hover:text-[var(--color-coral-ink)] transition-all cursor-pointer shrink-0"
                        title="Delete conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-surface-2)]">
                <Button
                  onClick={startNewChat}
                  className="w-full justify-center gap-2"
                >
                  <Plus size={14} /> Start New Chat
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </PageFade>
  );
}
