import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/brand";
import { Button } from "../components/ui";

/**
 * Dedicated Supabase OAuth & Magic Link Callback Handler
 * Exchanges PKCE authorization codes, establishes authenticated sessions,
 * and handles OAuth error responses gracefully.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      // 1. Check for explicit error parameters returned in URL
      const urlError =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        searchParams.get("error_code");

      if (urlError) {
        console.error("[AuthCallback] OAuth Redirect Error from Provider:", {
          error: searchParams.get("error"),
          code: searchParams.get("error_code"),
          description: searchParams.get("error_description"),
        });

        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            searchParams.get("error_description") ||
              "Unable to complete authentication with the external provider.",
          );
        }
        return;
      }

      // 2. Check for Implicit Flow Hash Tokens (#access_token=...&refresh_token=...)
      if (window.location.hash.includes("access_token")) {
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("[AuthCallback] Hash SetSession Error:", error);
            throw error;
          }

          if (data.session && isMounted) {
            setStatus("success");
            setTimeout(() => {
              navigate("/app?new=true", { replace: true });
            }, 600);
            return;
          }
        }
      }

      // 3. Check for PKCE authorization code in URL (?code=...)
      const code = searchParams.get("code");

      try {
        if (code) {
          // Exchange authorization code for Supabase access & refresh tokens
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("[AuthCallback] Code Exchange Error:", error);
            throw error;
          }

          if (data.session && isMounted) {
            setStatus("success");
            setTimeout(() => {
              navigate("/app?new=true", { replace: true });
            }, 600);
            return;
          }
        }

        // 4. Fallback check for session already captured via URL hash / listener
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (sessionData.session && isMounted) {
          setStatus("success");
          setTimeout(() => {
            navigate("/app?new=true", { replace: true });
          }, 600);
        } else {
          // Wait briefly for onAuthStateChange to fire
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (session && isMounted) {
                setStatus("success");
                authListener.subscription.unsubscribe();
                navigate("/app?new=true", { replace: true });
              }
            },
          );

          // If no session after timeout, redirect to login
          setTimeout(() => {
            if (isMounted && status === "processing") {
              navigate("/login", { replace: true });
            }
          }, 3500);
        }
      } catch (err: any) {
        console.error("[AuthCallback] Authentication exchange failed:", err);
        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            err.message || "Failed to exchange authentication credentials.",
          );
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-8 text-center shadow-lift"
      >
        <div className="flex justify-center mb-6">
          <Logo size={44} />
        </div>

        {status === "processing" && (
          <div className="space-y-4">
            <div className="flex justify-center text-[var(--color-coral)]">
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h2 className="text-lg font-medium text-[var(--color-ink)]">
              Verifying credentials...
            </h2>
            <p className="text-sm text-[var(--color-ink-faint)]">
              Completing secure authentication with AgentTrust.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex justify-center text-[var(--color-sage)]">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-lg font-medium text-[var(--color-ink)]">
              Authentication Successful
            </h2>
            <p className="text-sm text-[var(--color-ink-faint)]">
              Redirecting to your autonomous commerce workspace...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="flex justify-center text-[var(--color-coral)]">
              <AlertCircle size={40} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                Authentication Error
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {errorMessage}
              </p>
            </div>

            <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-ink-faint)] text-left space-y-1">
              <p className="font-semibold text-[var(--color-ink)]">
                OAuth Configuration Checklist:
              </p>
              <p>
                1. Ensure Google Client ID &amp; Secret match in Supabase
                Dashboard.
              </p>
              <p>
                2. Set Google Cloud Authorized Redirect URI to:
                <br />
                <code className="text-[var(--color-coral-ink)] break-all font-mono">
                  https://tcvjwrtqtfjbgjgksohc.supabase.co/auth/v1/callback
                </code>
              </p>
              <p>
                3. Add Site URL &amp; Redirect URL in Supabase Auth settings.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Link to="/login">
                <Button variant="primary" className="gap-2">
                  Return to Sign In <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
