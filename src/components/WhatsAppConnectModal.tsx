import { useState, useEffect } from "react";
import { Modal, Button, Badge, Card } from "./ui";
import {
  MessageSquare,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface WhatsAppConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnectionSaved?: () => void;
}

export function WhatsAppConnectModal({
  open,
  onClose,
  onConnectionSaved,
}: WhatsAppConnectModalProps) {
  const { session, workspaceId } = useAuth();

  const [mode, setMode] = useState<"OFFICIAL_META" | "DEMO">("OFFICIAL_META");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const loadConfig = async () => {
    if (!session || !workspaceId) return;
    try {
      const res = await fetch("/api/whatsapp/config", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.connection) {
          setPhoneNumberId(data.connection.phoneNumberId || "");
          setWabaId(data.connection.wabaId || "");
          setDisplayPhoneNumber(data.connection.displayPhoneNumber || "");
          if (data.connection.mode) setMode(data.connection.mode);
        }
      }
    } catch (err) {
      console.warn("Failed to load WhatsApp config:", err);
    }
  };

  useEffect(() => {
    if (open) loadConfig();
  }, [open, session, workspaceId]);

  const handleSave = async () => {
    if (!session || !workspaceId) return;
    setLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          mode,
          phoneNumberId:
            mode === "DEMO" ? "demo_phone_id" : phoneNumberId.trim(),
          wabaId: mode === "DEMO" ? "demo_waba_id" : wabaId.trim(),
          displayPhoneNumber:
            mode === "DEMO"
              ? "+91 98765 43210 (Demo)"
              : displayPhoneNumber.trim(),
          accessToken:
            mode === "DEMO" ? "demo_access_token" : accessToken.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(data.testResult);
        if (onConnectionSaved) onConnectionSaved();
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to save configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="p-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-[var(--color-ink)] flex items-center gap-2">
                Connect WhatsApp Business API
                <Badge tone="sage" className="text-[10px]">
                  Official API
                </Badge>
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Connect Meta WhatsApp Business Platform for direct compliant
                customer outreach.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)]">
          <button
            type="button"
            onClick={() => setMode("OFFICIAL_META")}
            className={`p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              mode === "OFFICIAL_META"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            }`}
          >
            Meta WhatsApp Cloud API
          </button>
          <button
            type="button"
            onClick={() => setMode("DEMO")}
            className={`p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              mode === "DEMO"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            }`}
          >
            Demo / Sandbox Mode
          </button>
        </div>

        {mode === "OFFICIAL_META" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
                Phone Number ID (from Meta Developer Portal)
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g., 108429482910482"
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
                WABA Account ID
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g., 9482019482019"
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
                Display Phone Number
              </label>
              <input
                type="text"
                value={displayPhoneNumber}
                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                placeholder="e.g., +91 98765 43210"
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)]"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
                System User Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAA..."
                className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] font-mono"
              />
            </div>
          </div>
        ) : (
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30 text-xs space-y-2">
            <div className="font-semibold text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Active Demo / Sandbox Mode
            </div>
            <p className="text-[var(--color-ink-soft)]">
              Demo mode lets you test WhatsApp AI draft generation, human
              approval workflows, simulated customer replies, and real-time
              conversion stats without needing Meta API keys.
            </p>
          </Card>
        )}

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testResult.success
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600"
                : "bg-red-500/10 border border-red-500/30 text-red-500"
            }`}
          >
            {testResult.success ? (
              <Check size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
          >
            {loading ? (
              "Verifying..."
            ) : (
              <>
                <ShieldCheck size={16} className="mr-1.5" />
                Save & Test WhatsApp Connection
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
