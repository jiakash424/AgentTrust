import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { fetchApi } from "../lib/api";
import { HermesEventItem } from "../nova/AgentThinkingConsole";

interface WorkflowStep {
  label: string;
  state: "active" | "done";
}

interface WorkflowContextType {
  activeWorkflowId: string | null;
  workflowPrompt: string | null;
  workflowStatus:
    "IDLE" | "RUNNING" | "COMPLETED" | "PARTIAL" | "RATE_LIMITED" | "FAILED";
  activeStatus: { title: string; subtitle?: string } | null;
  steps: WorkflowStep[];
  thinkingEvents: HermesEventItem[];
  discoveredCount: number;
  qualifiedCount: number;
  errorMessage: string | null;
  startBackgroundWorkflow: (prompt: string) => Promise<string | null>;
  clearWorkflowState: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined,
);

const stepMap: Record<string, { title: string; subtitle?: string }> = {
  workflow_started: {
    title: "Starting NOVA Autonomous Agent",
    subtitle: "Initializing agent process",
  },
  HERMES_STARTED: {
    title: "Starting NOVA Autonomous Agent",
    subtitle: "Spawning process",
  },
  HERMES_THINKING: {
    title: "NOVA is working",
    subtitle: "Autonomous reasoning",
  },
  HERMES_RESEARCHING: {
    title: "Research in progress",
    subtitle: "Searching public web & business directories",
  },
  HERMES_BROWSING: {
    title: "Inspecting web pages",
    subtitle: "Reading candidate evidence",
  },
  HERMES_VERIFYING: {
    title: "Verifying contact details & location",
    subtitle: "Evidence verification",
  },
  HERMES_ANALYZING: {
    title: "Processing results",
    subtitle: "Evaluating buyer fit",
  },
  saving_opportunities: {
    title: "Saving opportunities",
    subtitle: "Database synchronization",
  },
  HERMES_COMPLETED: {
    title: "Completed",
    subtitle: "All qualified entities saved",
  },
  workflow_completed: {
    title: "Completed",
    subtitle: "All qualified entities saved",
  },
  HERMES_FAILED: {
    title: "Failed",
    subtitle: "Execution encountered an error",
  },
  workflow_failed: {
    title: "Failed",
    subtitle: "Execution encountered an error",
  },
};

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const { session, workspaceId } = useAuth();
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("nova_active_wf_id")
      : null,
  );
  const [workflowPrompt, setWorkflowPrompt] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("nova_active_wf_prompt")
      : null,
  );
  const [workflowStatus, setWorkflowStatus] = useState<
    "IDLE" | "RUNNING" | "COMPLETED" | "PARTIAL" | "RATE_LIMITED" | "FAILED"
  >("IDLE");
  const [activeStatus, setActiveStatus] = useState<{
    title: string;
    subtitle?: string;
  } | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [thinkingEvents, setThinkingEvents] = useState<HermesEventItem[]>([]);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [qualifiedCount, setQualifiedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize state changes to localStorage
  useEffect(() => {
    if (activeWorkflowId)
      localStorage.setItem("nova_active_wf_id", activeWorkflowId);
    else localStorage.removeItem("nova_active_wf_id");

    if (workflowPrompt)
      localStorage.setItem("nova_active_wf_prompt", workflowPrompt);
    else localStorage.removeItem("nova_active_wf_prompt");
  }, [activeWorkflowId, workflowPrompt]);

  // Maintain EventSource in background across page navigation
  useEffect(() => {
    if (!activeWorkflowId || workflowStatus !== "RUNNING") return;

    const token =
      session?.access_token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("agenttrust_unique_client_token") || "dev_tok"
        : "dev_tok");
    let es: EventSource | null = null;
    try {
      es = new EventSource(
        `/api/lead-discovery/${activeWorkflowId}/stream?token=${token}`,
      );

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const stage = payload.stage || payload.type || payload.event?.type;
          const stepName =
            payload.stepName ||
            payload.summary ||
            payload.text ||
            payload.event?.summary ||
            stage;
          const timestamp = payload.timestamp || new Date().toISOString();

          if (stage) {
            const evtItem: HermesEventItem = {
              id: `${stage}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              type: (stage.startsWith("HERMES_") ? stage : "THINKING") as any,
              step: payload.completedSteps || 1,
              thought: stepName,
              observableAction: stepName,
              summary: stepName,
              timestamp,
            };

            setThinkingEvents((prev) => [...prev, evtItem]);

            const mapped = stepMap[stage];
            setActiveStatus({
              title: mapped?.title || stepName || "NOVA Autonomous Engine",
              subtitle: mapped?.subtitle || stepName,
            });
          }

          if (
            stage === "HERMES_COMPLETED" ||
            stage === "workflow_completed" ||
            stage === "FINAL"
          ) {
            setWorkflowStatus("COMPLETED");
            setActiveStatus({
              title: "Completed",
              subtitle: "All qualified entities saved",
            });
            window.dispatchEvent(new Event("opportunitiesUpdated"));
            if (es) es.close();
          }

          if (stage === "HERMES_FAILED" || stage === "workflow_failed") {
            setWorkflowStatus("FAILED");
            setActiveStatus({ title: "Failed", subtitle: "Execution error" });
            setErrorMessage(
              payload.details?.error ||
                payload.error ||
                "Workflow execution failed",
            );
            if (es) es.close();
          }
        } catch (err) {
          console.warn("[WorkflowContext] SSE message parse error:", err);
        }
      };

      es.onerror = async () => {
        if (es) {
          es.close();
          es = null;
        }
        try {
          const res = await fetch(`/api/workflows/${activeWorkflowId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-workspace-id": workspaceId || "",
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "COMPLETED") {
              setWorkflowStatus("COMPLETED");
              window.dispatchEvent(new Event("opportunitiesUpdated"));
            } else if (data.status === "FAILED") {
              setWorkflowStatus("FAILED");
              setErrorMessage(data.errorMessage || "Workflow execution failed");
            }
          }
        } catch (e) {}
      };
    } catch (err: any) {
      console.error("[WorkflowContext] EventSource error:", err);
    }

    return () => {
      if (es) {
        es.close();
        es = null;
      }
    };
  }, [activeWorkflowId, session, workspaceId, workflowStatus]);

  const startBackgroundWorkflow = async (
    prompt: string,
  ): Promise<string | null> => {
    const activeWs =
      workspaceId || localStorage.getItem("nova_active_workspace") || "";

    setWorkflowPrompt(prompt);
    setWorkflowStatus("RUNNING");
    setActiveStatus({
      title: "Initializing Hermes Autonomous Agent...",
      subtitle: "Starting reasoning loop",
    });
    setSteps([]);
    setThinkingEvents([]);
    setDiscoveredCount(0);
    setQualifiedCount(0);
    setErrorMessage(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      if (activeWs) {
        headers["x-workspace-id"] = activeWs;
      }

      const res = await fetch("/api/lead-discovery/start", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userRequest: prompt,
          locationScope: "INDIA",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to start workflow");
      }

      const data = await res.json();
      setActiveWorkflowId(data.workflowId);
      return data.workflowId;
    } catch (err: any) {
      setWorkflowStatus("FAILED");
      setErrorMessage(err.message || "Failed to start workflow");
      return null;
    }
  };

  const clearWorkflowState = () => {
    setActiveWorkflowId(null);
    setWorkflowPrompt(null);
    setWorkflowStatus("IDLE");
    setActiveStatus(null);
    setSteps([]);
    setThinkingEvents([]);
    setDiscoveredCount(0);
    setQualifiedCount(0);
    setErrorMessage(null);
    localStorage.removeItem("nova_active_wf_id");
    localStorage.removeItem("nova_active_wf_prompt");
    localStorage.removeItem("nova_history_wf_id");
  };

  return (
    <WorkflowContext.Provider
      value={{
        activeWorkflowId,
        workflowPrompt,
        workflowStatus,
        activeStatus,
        steps,
        thinkingEvents,
        discoveredCount,
        qualifiedCount,
        errorMessage,
        startBackgroundWorkflow,
        clearWorkflowState,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
}
