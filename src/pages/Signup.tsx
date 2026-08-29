import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Wordmark, NovaMark } from "../components/brand";
import { Toggle } from "../components/ui";
import { BrandPanel } from "./Login";
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

const onboardingSteps = [
  {
    title: "Tell us about your business",
    helper: "This helps NOVA represent you accurately to AI buyers.",
  },
  {
    title: "Add your products",
    helper: "Start with your best sellers — you can import the rest later.",
  },
  {
    title: "Connect inventory",
    helper: "Sync live stock so NOVA always quotes what you can deliver.",
  },
  {
    title: "Configure AI commerce",
    helper: "Set the guardrails NOVA operates within.",
  },
  {
    title: "Meet NOVA",
    helper: "Your AI commerce teammate is ready.",
  },
];

export default function Signup() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/app?new=true", { replace: true });
    }
  }, [user, authLoading, navigate]);
  const [stage, setStage] = useState<"form" | "onboarding">("form");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [industry, setIndustry] = useState("Drinkware & Gifting");
  const [firstProduct, setFirstProduct] = useState("");
  const [inventorySource, setInventorySource] = useState("Zoho Inventory");
  const [discovery, setDiscovery] = useState(true);
  const [negotiation, setNegotiation] = useState(false);

  const total = onboardingSteps.length;
  const current = onboardingSteps[step];

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          business_name: form.business,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      // In a real app we'd wait for email confirmation if enabled, but assuming it's auto-confirm or they're signed in
      setStage("onboarding");
    }
  };

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <BrandPanel statement="Set up your AI commerce workspace in minutes." />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-10">
            <Wordmark />
          </div>

          <AnimatePresence mode="wait">
            {stage === "form" ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="font-serif text-[2.15rem] leading-tight text-[var(--color-ink)]">
                  Create your AI commerce workspace
                </h1>
                <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">
                  Join merchants selling to AI buyers.
                </p>

                <button
                  onClick={handleGoogleSignup}
                  className="mt-8 flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <GoogleG />
                  Continue with Google
                </button>

                <div className="my-6 flex items-center gap-4">
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                  <span className="label-mono text-[var(--color-ink-faint)]">
                    or
                  </span>
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm border border-red-100">
                    {error}
                  </div>
                )}

                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Your name">
                      <input
                        placeholder="Alex Morgan"
                        className={inputCls}
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field label="Business name">
                      <input
                        placeholder="Acme Global"
                        className={inputCls}
                        value={form.business}
                        onChange={(e) =>
                          setForm({ ...form, business: e.target.value })
                        }
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Work email">
                    <input
                      type="email"
                      placeholder="alex@company.com"
                      className={inputCls}
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      placeholder="••••••••"
                      className={inputCls}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white shadow-[0_1px_2px_rgba(184,72,42,0.25)] transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99]",
                      loading && "opacity-70 cursor-not-allowed",
                    )}
                  >
                    {loading ? "Creating..." : "Continue"}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-[var(--color-coral-ink)] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* progress */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-mono text-[var(--color-coral-ink)]">
                      Step {step + 1} of {total}
                    </span>
                    <span className="label-mono text-[var(--color-ink-faint)]">
                      {Math.round(((step + 1) / total) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-sunk)]">
                    <motion.div
                      className="h-full rounded-full bg-[var(--color-coral)]"
                      animate={{ width: `${((step + 1) / total) * 100}%` }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h2 className="font-serif text-[1.9rem] leading-tight text-[var(--color-ink)]">
                      {current.title}
                    </h2>
                    <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">
                      {current.helper}
                    </p>

                    <div className="mt-7 min-h-[172px]">
                      {step === 0 && (
                        <div className="space-y-4">
                          <Field label="Business name">
                            <input
                              className={inputCls}
                              value={form.business}
                              placeholder="Acme Global"
                              onChange={(e) =>
                                setForm({ ...form, business: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Industry">
                            <input
                              className={inputCls}
                              value={industry}
                              onChange={(e) => setIndustry(e.target.value)}
                            />
                          </Field>
                        </div>
                      )}

                      {step === 1 && (
                        <div className="space-y-4">
                          <Field label="Your best-selling product">
                            <input
                              className={inputCls}
                              placeholder="Stainless Steel Water Bottle"
                              value={firstProduct}
                              onChange={(e) => setFirstProduct(e.target.value)}
                            />
                          </Field>
                          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-4 text-[13px] text-[var(--color-ink-soft)]">
                            NOVA will enrich this listing so AI buyers can
                            understand it instantly.
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-3">
                          {[
                            { name: "Zoho Inventory", cat: "Live stock sync" },
                            { name: "Shopify", cat: "Catalog & orders" },
                            { name: "Manual upload", cat: "CSV import" },
                          ].map((c, i) => {
                            const isSelected = inventorySource === c.name;
                            return (
                              <button
                                key={c.name}
                                onClick={() => setInventorySource(c.name)}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-colors",
                                  isSelected
                                    ? "border-[var(--color-coral)] bg-[var(--color-coral-soft)]"
                                    : "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-line-strong)]",
                                )}
                              >
                                <div>
                                  <div className="text-sm font-medium text-[var(--color-ink)]">
                                    {c.name}
                                  </div>
                                  <div className="label-mono text-[var(--color-ink-faint)] mt-0.5">
                                    {c.cat}
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-coral)] text-white">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-6 py-4 border-b border-[var(--color-line)]">
                            <div>
                              <div className="text-sm font-medium text-[var(--color-ink)]">
                                AI Discovery
                              </div>
                              <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
                                Let AI buyers discover your offers.
                              </p>
                            </div>
                            <Toggle
                              checked={discovery}
                              onChange={setDiscovery}
                            />
                          </div>
                          <div className="flex items-start justify-between gap-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-[var(--color-ink)]">
                                AI Negotiation
                              </div>
                              <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
                                NOVA negotiates within your guardrails.
                              </p>
                            </div>
                            <Toggle
                              checked={negotiation}
                              onChange={setNegotiation}
                            />
                          </div>
                        </div>
                      )}

                      {step === 4 && (
                        <div className="flex flex-col items-center text-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-8">
                          <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 18,
                            }}
                          >
                            <NovaMark size={44} active />
                          </motion.div>
                          <h3 className="font-serif text-xl text-[var(--color-ink)] mt-4">
                            NOVA is ready
                          </h3>
                          <p className="mt-2 text-sm text-[var(--color-ink-soft)] max-w-xs">
                            Your workspace is set up. NOVA is already analyzing
                            your catalog for growth opportunities.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex items-center gap-3">
                  {step > 0 && (
                    <button
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  )}
                  {step < total - 1 ? (
                    <button
                      onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white shadow-[0_1px_2px_rgba(184,72,42,0.25)] transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99]"
                    >
                      Continue
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/app")}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-coral)] text-sm font-medium text-white shadow-[0_1px_2px_rgba(184,72,42,0.25)] transition-all hover:bg-[var(--color-coral-ink)] active:scale-[0.99]"
                    >
                      Enter workspace
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>

                <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">
                  <Link
                    to="/login"
                    className="font-medium text-[var(--color-coral-ink)] hover:underline"
                  >
                    Back to sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
