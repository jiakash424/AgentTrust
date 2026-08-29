import { useEffect, useState } from "react";
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  ShieldCheck,
  Zap,
  Radio,
} from "lucide-react";
import { Button, Card, Badge } from "./ui";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function OpportunityMonitorPanel() {
  const { session, workspaceId } = useAuth();
  const [monitor, setMonitor] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningNow, setRunningNow] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings Form State
  const [frequencyMinutes, setFrequencyMinutes] = useState(60);
  const [inAppNotifyEnabled, setInAppNotifyEnabled] = useState(true);
  const [whatsAppNotifyEnabled, setWhatsAppNotifyEnabled] = useState(false);
  const [minMatchScoreAlert, setMinMatchScoreAlert] = useState(70);

  const fetchMonitorStatus = async () => {
    try {
      const res = await fetchApi<any>("/api/monitoring/status", {
        session,
        workspaceId: workspaceId || undefined,
      });
      if (res && res.monitor) {
        setMonitor(res.monitor);
        setFrequencyMinutes(res.monitor.frequencyMinutes || 60);
        setInAppNotifyEnabled(res.monitor.inAppNotifyEnabled ?? true);
        setWhatsAppNotifyEnabled(res.monitor.whatsAppNotifyEnabled ?? false);
        setMinMatchScoreAlert(res.monitor.minMatchScoreAlert ?? 70);
      }
    } catch (err) {
      console.error("[OpportunityMonitorPanel] Error fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetchApi<any>("/api/monitoring/history", {
        session,
        workspaceId: workspaceId || undefined,
      });
      if (res && Array.isArray(res.runs)) {
        setHistory(res.runs);
      }
    } catch (err) {
      console.error("[OpportunityMonitorPanel] Error fetching history:", err);
    }
  };

  useEffect(() => {
    fetchMonitorStatus();
    fetchHistory();
  }, [session, workspaceId]);

  // Connect Real-Time Server-Sent Events (SSE) for live toasts
  useEffect(() => {
    if (!workspaceId) return;

    const eventSource = new EventSource(
      `/api/monitoring/events?workspaceId=${workspaceId}`,
    );

    eventSource.addEventListener("OPPORTUNITY_NEW_FOUND", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setToastMessage(`🎯 ${data.title}`);
        fetchMonitorStatus();
        fetchHistory();
        setTimeout(() => setToastMessage(null), 8000);
      } catch (err) {}
    });

    eventSource.addEventListener("OPPORTUNITY_MONITOR_COMPLETED", () => {
      setRunningNow(false);
      fetchMonitorStatus();
      fetchHistory();
    });

    return () => {
      eventSource.close();
    };
  }, [workspaceId]);

  const handleToggle = async () => {
    if (!session || !workspaceId || !monitor) return;
    const newEnabled = !monitor.enabled;
    try {
      const res = await fetchApi<any>("/api/monitoring/toggle", {
        session,
        workspaceId,
        method: "POST",
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (res && res.monitor) {
        setMonitor(res.monitor);
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleRunNow = async () => {
    if (!session || !workspaceId) return;
    setRunningNow(true);
    try {
      await fetchApi<any>("/api/monitoring/run-now", {
        session,
        workspaceId,
        method: "POST",
      });
      setTimeout(() => {
        fetchMonitorStatus();
        fetchHistory();
      }, 3000);
    } catch (err) {
      setRunningNow(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!session || !workspaceId) return;
    try {
      const res = await fetchApi<any>("/api/monitoring/settings", {
        session,
        workspaceId,
        method: "POST",
        body: JSON.stringify({
          frequencyMinutes: Number(frequencyMinutes),
          inAppNotifyEnabled,
          whatsAppNotifyEnabled,
          minMatchScoreAlert: Number(minMatchScoreAlert),
        }),
      });
      if (res && res.monitor) {
        setMonitor(res.monitor);
        setSettingsOpen(false);
      }
    } catch (err) {
      console.error("Save settings error:", err);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 animate-pulse flex items-center justify-between">
        <div className="h-6 bg-[var(--color-bg-sunk)] rounded w-48" />
        <div className="h-8 bg-[var(--color-bg-sunk)] rounded w-24" />
      </Card>
    );
  }

  const isEnabled = monitor?.enabled ?? true;
  const statusLabel =
    monitor?.status === "RUNNING" || runningNow
      ? "RESEARCHING NOW..."
      : isEnabled
        ? "ACTIVE"
        : "PAUSED";

  return (
    <div className="space-y-4">
      {/* Real-time SSE Live Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-sage)] p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <Radio size={18} className="text-[var(--color-sage)] animate-pulse" />
          <p className="text-sm font-medium text-[var(--color-ink)]">
            {toastMessage}
          </p>
        </div>
      )}

      {/* Main Panel Card */}
      <Card className="p-6 border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="label-mono text-[var(--color-ink-faint)] flex items-center gap-1.5 uppercase tracking-wider">
                <Activity size={15} className="text-[var(--color-coral-ink)]" />
                AUTONOMOUS OPPORTUNITY MONITOR
              </span>
              <Badge
                tone={
                  monitor?.status === "RUNNING" || runningNow
                    ? "amber"
                    : isEnabled
                      ? "sage"
                      : "neutral"
                }
              >
                ● {statusLabel}
              </Badge>
            </div>
            <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)]">
              Continuous NOVA Agent Background Research
            </h3>
            <p className="text-sm text-[var(--color-ink-soft)] max-w-2xl">
              NOVA periodically wakes up in the background, evaluates your
              active seller context, and autonomously discovers new B2B buyer
              opportunities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isEnabled ? "outline" : "primary"}
              size="sm"
              onClick={handleToggle}
            >
              {isEnabled ? <Pause size={14} /> : <Play size={14} />}
              {isEnabled ? "Pause Monitor" : "Enable Monitor"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunNow}
              disabled={runningNow || monitor?.status === "RUNNING"}
            >
              <RefreshCw
                size={14}
                className={
                  runningNow || monitor?.status === "RUNNING"
                    ? "animate-spin"
                    : ""
                }
              />
              {runningNow || monitor?.status === "RUNNING"
                ? "Running..."
                : "Run Now"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings size={14} />
              Settings
            </Button>
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-[var(--color-line)] text-xs">
          <div>
            <span className="label-mono text-[var(--color-ink-faint)] block mb-1">
              Check Frequency
            </span>
            <span className="font-serif text-lg font-bold text-[var(--color-ink)]">
              Every {monitor?.frequencyMinutes || 60}m
            </span>
          </div>

          <div>
            <span className="label-mono text-[var(--color-ink-faint)] block mb-1">
              Last Research Run
            </span>
            <span className="font-mono text-sm text-[var(--color-ink)]">
              {monitor?.lastRunAt
                ? new Date(monitor.lastRunAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not run yet"}
            </span>
          </div>

          <div>
            <span className="label-mono text-[var(--color-ink-faint)] block mb-1">
              Next Scheduled Run
            </span>
            <span className="font-mono text-sm text-[var(--color-sage)] font-semibold">
              {monitor?.nextRunAt
                ? new Date(monitor.nextRunAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Paused"}
            </span>
          </div>

          <div>
            <span className="label-mono text-[var(--color-ink-faint)] block mb-1">
              Runs Executed Today
            </span>
            <span className="font-serif text-lg font-bold text-[var(--color-ink)]">
              {monitor?.runsTodayCount || 0} / {monitor?.maxDailyRuns || 24}
            </span>
          </div>
        </div>

        {/* Settings Sub-panel Modal */}
        {settingsOpen && (
          <div className="mt-5 p-5 rounded-[var(--radius-md)] bg-[var(--color-bg-sunk)] border border-[var(--color-line)] space-y-4 animate-in fade-in">
            <h4 className="font-serif font-bold text-base text-[var(--color-ink)] flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--color-sage)]" />
              Autonomous Monitoring Preferences
            </h4>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label-mono text-[var(--color-ink-faint)] block mb-1.5">
                  Check Frequency
                </label>
                <select
                  value={frequencyMinutes}
                  onChange={(e) => setFrequencyMinutes(Number(e.target.value))}
                  className="w-full text-sm rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-[var(--color-ink)]"
                >
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 1 hour (Default)</option>
                  <option value={180}>Every 3 hours</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={1440}>Daily (Every 24 hours)</option>
                </select>
              </div>

              <div>
                <label className="label-mono text-[var(--color-ink-faint)] block mb-1.5">
                  Min Match Score Alert
                </label>
                <select
                  value={minMatchScoreAlert}
                  onChange={(e) =>
                    setMinMatchScoreAlert(Number(e.target.value))
                  }
                  className="w-full text-sm rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-[var(--color-ink)]"
                >
                  <option value={60}>Score ≥ 60 (All Matches)</option>
                  <option value={70}>Score ≥ 70 (Strong Matches)</option>
                  <option value={80}>
                    Score ≥ 80 (High Value Matches Only)
                  </option>
                </select>
              </div>

              <div>
                <label className="label-mono text-[var(--color-ink-faint)] block mb-1.5">
                  Alert Channels
                </label>
                <div className="space-y-1.5 text-xs text-[var(--color-ink-soft)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inAppNotifyEnabled}
                      onChange={(e) => setInAppNotifyEnabled(e.target.checked)}
                      className="rounded border-[var(--color-line)] text-[var(--color-coral)]"
                    />
                    In-App Realtime Toasts (SSE)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsAppNotifyEnabled}
                      onChange={(e) =>
                        setWhatsAppNotifyEnabled(e.target.checked)
                      }
                      className="rounded border-[var(--color-line)] text-[var(--color-coral)]"
                    />
                    WhatsApp Alerts (Opt-in)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-line)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSettings}>
                Save Preferences
              </Button>
            </div>
          </div>
        )}

        {/* History Log Table */}
        <div className="mt-5">
          <span className="label-mono text-[var(--color-ink-faint)] block mb-3 uppercase tracking-wider">
            Recent Background Research Telemetry Log
          </span>

          {history.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-faint)] italic">
              No background monitoring runs recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-[var(--color-ink-faint)] font-mono uppercase">
                    <th className="py-2 pr-4 font-normal">Run Time</th>
                    <th className="py-2 px-4 font-normal">Status</th>
                    <th className="py-2 px-4 font-normal">Checked</th>
                    <th className="py-2 px-4 font-normal">New Buyers</th>
                    <th className="py-2 px-4 font-normal">
                      Duplicates Ignored
                    </th>
                    <th className="py-2 pl-4 font-normal">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {history.slice(0, 5).map((run) => (
                    <tr key={run.id} className="text-[var(--color-ink-soft)]">
                      <td className="py-2.5 pr-4 font-mono">
                        {new Date(run.startedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          tone={
                            run.status === "COMPLETED"
                              ? "sage"
                              : run.status === "FAILED"
                                ? "coral"
                                : "neutral"
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {run.opportunitiesFound}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[var(--color-sage)]">
                        +{run.newOpportunitiesFound}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[var(--color-ink-faint)]">
                        {run.duplicateOpportunitiesIgnored}
                      </td>
                      <td className="py-2.5 pl-4 truncate max-w-xs">
                        {run.summary || "Completed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
