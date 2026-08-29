import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Wordmark, NovaMark, Logo } from "../components/brand";
import { StatusDot } from "../components/ui";
import { cn } from "../lib/cn";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const inputCls =
  "w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus:outline-none focus:border-[var(--color-coral)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-coral)]/25";

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.39Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.8l-3.72-2.9c-1.03.7-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.71v2.98A11.5 11.5 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.65a6.9 6.9 0 0 1 0-4.3V7.37H1.71a11.52 11.52 0 0 0 0 10.26l3.84-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.2 15.11 0 12 0 7.42 0 3.46 2.63 1.71 6.37l3.84 2.98C6.46 6.77 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function BrandPanel({ statement }: { statement: string }) {
  return (
    <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between overflow-hidden p-12 bg-[var(--color-ink)] text-white">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-coral) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-iris) 0%, transparent 70%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <Logo size={30} />
          <span className="font-semibold text-[20px] tracking-tight text-white font-sans">
            AgentTrust
          </span>
        </div>
      </div>

      <div className="relative">
        <p className="label-mono text-[var(--color-coral)] mb-5">
          AI-NATIVE COMMERCE
        </p>
        <h2 className="font-serif text-[2.6rem] leading-[1.1] max-w-md">
          {statement}
        </h2>
      </div>

      <div className="relative label-mono text-white/40">
        Trusted by growing merchants
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<
    "email_otp" | "phone_otp" | "password"
  >("email_otp");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/app?new=true", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const formatPhone = (raw: string) => {
    const cleaned = raw.trim().replace(/[^\d+]/g, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.length === 10) return `+91${cleaned}`;
    return `+${cleaned}`;
  };

  const navigateToDashboard = () => {
    localStorage.removeItem("nova_active_prompt");
    localStorage.removeItem("nova_active_wf_id");
    localStorage.removeItem("nova_history_wf_id");
    navigate("/app?new=true");
  };

  // Step 1: Send Supabase Real OTP to Email
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setInfoMessage(
        `We've sent a 6-digit verification code to ${email.trim()}. Check your inbox.`,
      );
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send Email OTP code");
    } finally {
      setLoading(false);
    }
  };

  // Step 1 (Mobile): Send Supabase Real SMS OTP to Mobile Phone
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = formatPhone(phone);
    if (!formatted) return;
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });

      if (error) throw error;

      setInfoMessage(
        `We've sent a 6-digit verification code to ${formatted}. Check your SMS.`,
      );
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send SMS OTP code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Supabase 6-Digit OTP Token (Email or Phone SMS)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (authMode === "email_otp") {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpToken.trim(),
          type: "email",
        });

        if (error) throw error;
        if (data.session) navigateToDashboard();
      } else {
        const formatted = formatPhone(phone);
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formatted,
          token: otpToken.trim(),
          type: "sms",
        });

        if (error) throw error;
        if (data.session) navigateToDashboard();
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired 6-digit OTP code");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Password Login Fallback
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigateToDashboard();
    }
  };

  const handleGoogleLogin = async () => {
    localStorage.removeItem("nova_active_prompt");
    localStorage.removeItem("nova_active_wf_id");
    localStorage.removeItem("nova_history_wf_id");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <BrandPanel statement="Your AI-native commerce operating system." />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[390px]"
        >
          <div className="lg:hidden mb-10">
            <Wordmark />
          </div>

          <h1 className="font-serif text-[2.25rem] leading-tight text-[var(--color-ink)]">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">
            Sign in to your AgentTrust workspace.
          </p>

          {/* Authentication Mode Tabs */}
          <div className="mt-6 flex rounded-lg bg-[var(--color-surface-2)] p-1 border border-[var(--color-line)]">
            <button
              type="button"
              onClick={() => {
                setAuthMode("email_otp");
                setStep("input");
                setError(null);
                setInfoMessage(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                authMode === "email_otp"
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]",
              )}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("phone_otp");
                setStep("input");
                setError(null);
                setInfoMessage(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                authMode === "phone_otp"
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]",
              )}
            >
              Mobile SMS OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setError(null);
                setInfoMessage(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                authMode === "password"
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]",
              )}
            >
              Password
            </button>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)] cursor-pointer"
          >
            <GoogleG />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-[var(--color-line)]" />
            <span className="label-mono text-[var(--color-ink-faint)]">or</span>
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>

          {infoMessage && (
            <div className="mb-4 p-3.5 bg-blue-50/80 text-blue-700 rounded-md text-xs border border-blue-100 leading-relaxed">
              {infoMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-xs border border-red-100 leading-relaxed">
              {error}
            </div>
          )}

          {authMode === "email_otp" ? (
            step === "input" ? (
              /* STEP 1: Enter Email to Receive OTP */
              <form onSubmit={handleSendEmailOtp} className="space-y-4">
                <div>
                  <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99] cursor-pointer",
                    "shadow-[0_1px_2px_rgba(184,72,42,0.25)]",
                    loading && "opacity-70 cursor-not-allowed",
                  )}
                >
                  {loading ? "Sending Email OTP..." : "Send 6-Digit Email OTP"}
                </button>
              </form>
            ) : (
              /* STEP 2: Enter & Verify 6-Digit OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label-mono text-[var(--color-ink-faint)]">
                      6-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("input");
                        setError(null);
                      }}
                      className="text-xs text-[var(--color-coral-ink)] hover:underline cursor-pointer"
                    >
                      Change email
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className={cn(
                      inputCls,
                      "tracking-[0.5em] text-center font-mono font-bold text-lg",
                    )}
                    value={otpToken}
                    onChange={(e) =>
                      setOtpToken(e.target.value.replace(/\D/g, ""))
                    }
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpToken.length < 6}
                  className={cn(
                    "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99] cursor-pointer",
                    "shadow-[0_1px_2px_rgba(184,72,42,0.25)]",
                    (loading || otpToken.length < 6) &&
                      "opacity-70 cursor-not-allowed",
                  )}
                >
                  {loading ? "Verifying..." : "Verify OTP & Sign In"}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={loading}
                    className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-coral-ink)] hover:underline cursor-pointer"
                  >
                    Didn't receive code? Resend OTP
                  </button>
                </div>
              </form>
            )
          ) : authMode === "phone_otp" ? (
            step === "input" ? (
              /* STEP 1: Enter Mobile Phone to Receive SMS OTP */
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    className={inputCls}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-[var(--color-ink-faint)] mt-1.5">
                    We'll send a 6-digit SMS OTP via Twilio/Supabase SMS
                    provider.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99] cursor-pointer",
                    "shadow-[0_1px_2px_rgba(184,72,42,0.25)]",
                    loading && "opacity-70 cursor-not-allowed",
                  )}
                >
                  {loading ? "Sending SMS OTP..." : "Send 6-Digit SMS OTP"}
                </button>
              </form>
            ) : (
              /* STEP 2: Enter & Verify Mobile SMS OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label-mono text-[var(--color-ink-faint)]">
                      6-Digit SMS OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("input");
                        setError(null);
                      }}
                      className="text-xs text-[var(--color-coral-ink)] hover:underline cursor-pointer"
                    >
                      Change number
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className={cn(
                      inputCls,
                      "tracking-[0.5em] text-center font-mono font-bold text-lg",
                    )}
                    value={otpToken}
                    onChange={(e) =>
                      setOtpToken(e.target.value.replace(/\D/g, ""))
                    }
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpToken.length < 6}
                  className={cn(
                    "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99] cursor-pointer",
                    "shadow-[0_1px_2px_rgba(184,72,42,0.25)]",
                    (loading || otpToken.length < 6) &&
                      "opacity-70 cursor-not-allowed",
                  )}
                >
                  {loading ? "Verifying SMS..." : "Verify SMS & Sign In"}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={loading}
                    className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-coral-ink)] hover:underline cursor-pointer"
                  >
                    Didn't receive SMS? Resend OTP
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Password Login */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-mono text-[var(--color-ink-faint)]">
                    Password
                  </label>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99] cursor-pointer",
                  "shadow-[0_1px_2px_rgba(184,72,42,0.25)]",
                  loading && "opacity-70 cursor-not-allowed",
                )}
              >
                {loading ? "Signing in..." : "Continue"}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">
            New to AgentTrust?{" "}
            <Link
              to="/signup"
              className="font-medium text-[var(--color-coral-ink)] hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
