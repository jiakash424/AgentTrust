import { useState } from "react";
import {
  Mail,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Loader2,
  KeyRound,
} from "lucide-react";
import { Modal, Button } from "./ui";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";

interface GmailConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: (emailAddress: string) => void;
}

export function GmailConnectModal({
  open,
  onClose,
  onConnected,
}: GmailConnectModalProps) {
  const { session, workspaceId } = useAuth();
  const [emailAddress, setEmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim() || !appPassword.trim()) {
      setError(
        "Please enter both your Gmail address and 16-character App Password.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi<any>("/api/integrations/gmail-smtp/connect", {
        session,
        workspaceId: workspaceId || undefined,
        method: "POST",
        body: JSON.stringify({
          emailAddress: emailAddress.trim(),
          appPassword: appPassword.replace(/\s+/g, "").trim(),
        }),
      });

      if (res.error) throw new Error(res.error);

      setSuccessEmail(res.emailAddress || emailAddress.trim());
      if (onConnected) onConnected(res.emailAddress || emailAddress.trim());

      // Reset form fields safely
      setEmailAddress("");
      setAppPassword("");
    } catch (err: any) {
      console.error("Gmail connection error:", err);
      setError(
        err.message ||
          "Unable to connect to Gmail. Check 2-Step Verification and App Password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setError(null);
    setSuccessEmail(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleModalClose} title="Connect Gmail">
      {successEmail ? (
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-sage-soft)] flex items-center justify-center text-[var(--color-sage)]">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="font-serif text-2xl text-[var(--color-ink)] mb-1">
              Gmail connected
            </h3>
            <p className="text-sm text-[var(--color-ink-soft)]">
              <span className="font-semibold text-[var(--color-ink)]">
                {successEmail}
              </span>{" "}
              is ready to send approved outreach.
            </p>
          </div>
          <Button onClick={handleModalClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-5">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-4 flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="text-[var(--color-coral)] shrink-0 mt-0.5"
            />
            <div className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
              NOVA uses a secure Google App Password to dispatch emails. You can
              discover buyers and prepare outreach without connecting Gmail.
              Connect Gmail only when you're ready to send approved messages.
            </div>
          </div>

          {error && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-rose-soft)] border border-[var(--color-rose)]/30 p-3 text-xs text-[var(--color-rose)] leading-relaxed">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider mb-1.5">
              Gmail address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-3 text-[var(--color-ink-faint)]"
              />
              <input
                type="email"
                required
                placeholder="user@gmail.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-sunk)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-coral)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-faint)] uppercase tracking-wider mb-1.5">
              Gmail App Password
            </label>
            <div className="relative">
              <KeyRound
                size={16}
                className="absolute left-3 top-3 text-[var(--color-ink-faint)]"
              />
              <input
                type="password"
                required
                placeholder="xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-sunk)] border border-[var(--color-line)] text-sm font-mono text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-coral)]"
              />
            </div>
            <p className="text-[12px] text-[var(--color-ink-faint)] mt-2 leading-relaxed">
              Use a Google App Password, not your normal Gmail password.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-sunk)] p-3 text-[12px] text-[var(--color-ink-soft)] leading-relaxed">
            <span className="font-semibold text-[var(--color-ink)]">
              How to get an App Password:
            </span>
            <ol className="list-decimal pl-4 mt-1 space-y-1 text-[11px] text-[var(--color-ink-faint)]">
              <li>Enable 2-Step Verification in your Google Account.</li>
              <li>Go to Google Account Security → App passwords.</li>
              <li>
                Generate an App Password for "NOVA Sales Workspace" and paste it
                above.
              </li>
            </ol>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--color-coral-ink)] font-medium mt-2 hover:underline"
            >
              Open Google App Passwords <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleModalClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-1.5" />
                  Testing Gmail connection...
                </>
              ) : (
                "Test & Connect Gmail"
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
