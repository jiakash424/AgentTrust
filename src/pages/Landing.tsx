import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Plug,
  Boxes,
  Compass,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Wordmark, NovaMark } from "../components/brand";
import { Button, StatusDot } from "../components/ui";
import Footer from "../components/layout/Footer";

const nav = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how" },
  { label: "Solutions", href: "#solutions" },
  { label: "AI Commerce", href: "#commerce" },
];

const rotating = ["Grow your business.", "Become ready for AI buyers."];

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="relative"
    >
      {/* Main NOVA card */}
      <div className="relative bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-line)] shadow-float p-6 md:p-7">
        <div className="flex items-center gap-2 mb-5">
          <NovaMark size={18} active />
          <span className="label-mono text-[var(--color-ink-faint)]">NOVA</span>
          <span className="ml-auto label-mono text-[var(--color-ink-faint)] flex items-center gap-1.5">
            <StatusDot tone="sage" pulse /> Working
          </span>
        </div>
        <p className="font-serif text-[22px] leading-snug text-[var(--color-ink)] mb-6">
          Your excess inventory has a high-potential B2B opportunity.
        </p>
        <div className="space-y-3">
          {[
            { label: "Inventory analyzed", state: "done" },
            { label: "3 growth opportunities found", state: "done" },
            { label: "Researching potential buyers", state: "active" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.25 }}
              className="flex items-center gap-3 text-[15px]"
            >
              {s.state === "done" ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center">
                  <StatusDot tone="coral" pulse />
                </span>
              )}
              <span
                className={
                  s.state === "done"
                    ? "text-[var(--color-ink)]"
                    : "text-[var(--color-ink-soft)] font-medium"
                }
              >
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating opportunity chip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.1, type: "spring", stiffness: 200, damping: 18 }}
        className="absolute -right-4 md:-right-8 -bottom-6 bg-[var(--color-ink)] text-white rounded-[var(--radius-md)] p-4 shadow-float w-52"
      >
        <div className="label-mono text-white/50 mb-1">Est. opportunity</div>
        <div className="font-serif text-2xl">₹12L – ₹18L</div>
        <div className="text-[12px] text-white/60 mt-1">Corporate gifting</div>
      </motion.div>

      {/* Floating readiness chip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.3, type: "spring", stiffness: 200, damping: 18 }}
        className="absolute -left-4 md:-left-10 -top-6 bg-[var(--color-surface)] rounded-[var(--radius-md)] p-3.5 shadow-lift border border-[var(--color-line)] w-40"
      >
        <div className="label-mono text-[var(--color-ink-faint)] mb-1">
          AI readiness
        </div>
        <div className="font-serif text-2xl text-[var(--color-ink)]">82%</div>
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [line, setLine] = useState(0);

  useEffect(() => {
    // If returning from OAuth redirect with hash tokens or query code
    if (
      window.location.hash.includes("access_token") ||
      window.location.search.includes("code=") ||
      window.location.search.includes("error=")
    ) {
      navigate(
        "/auth/callback" + window.location.search + window.location.hash,
        { replace: true },
      );
      return;
    }

    const t = setInterval(
      () => setLine((l) => (l + 1) % rotating.length),
      2600,
    );
    return () => clearInterval(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-line)]">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 h-16 flex items-center gap-8">
          <Link to="/">
            <Wordmark />
          </Link>
          <nav className="hidden md:flex items-center gap-7 ml-2">
            {nav.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="text-[14px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 right-0 h-[420px] w-[420px] rounded-full bg-[var(--color-coral-soft)] blur-[120px] opacity-60" />
          <div className="absolute top-20 -left-20 h-[320px] w-[320px] rounded-full bg-[var(--color-iris-soft)] blur-[120px] opacity-50" />
        </div>
        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 label-mono text-[var(--color-coral-ink)] bg-[var(--color-coral-soft)] px-3 py-1.5 rounded-full mb-7"
            >
              <Sparkles size={12} /> AI Growth &amp; Agentic Commerce
            </motion.div>
            <h1 className="font-serif text-[clamp(2.6rem,6vw,4.2rem)] leading-[1.03] text-[var(--color-ink)] tracking-[-0.01em]">
              {rotating.map((r, i) => (
                <motion.span
                  key={r}
                  animate={{ opacity: line === i ? 1 : 0.28 }}
                  transition={{ duration: 0.6 }}
                  className="block"
                >
                  {r}
                </motion.span>
              ))}
            </h1>
            <p className="mt-7 text-[17px] leading-relaxed text-[var(--color-ink-soft)] max-w-xl">
              AgentTrust helps merchants discover growth opportunities,
              understand their business, and make their products ready to be
              discovered, evaluated, and transacted with by AI agents.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="group">
                  Get Started
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Button>
              </Link>
              <a href="#how">
                <Button variant="outline" size="lg">
                  See how it works
                </Button>
              </a>
            </div>
            <div className="mt-8 label-mono text-[var(--color-ink-faint)]">
              Your AI-native commerce operating system
            </div>
          </div>

          <div className="lg:pl-6">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Two engines / Solutions */}
      <section id="solutions" className="max-w-6xl mx-auto px-5 lg:px-8 py-24 scroll-mt-16">
        <div id="product" className="scroll-mt-16"></div>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="label-mono text-[var(--color-coral-ink)] mb-3">
            Two engines. One merchant.
          </div>
          <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.08] text-[var(--color-ink)]">
            One assistant that grows revenue and opens the door to AI buyers.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              tag: "AI Growth",
              title: "Understand where your next revenue opportunity is.",
              points: [
                "Analyze inventory & sales patterns",
                "Discover high-potential segments",
                "Qualify leads and manage outreach",
              ],
              icon: Compass,
              tone: "coral",
            },
            {
              tag: "Agentic Commerce",
              title:
                "Make your products understandable and transact-able by AI buyers.",
              points: [
                "Structured, AI-readable catalog",
                "Live availability & pricing rules",
                "Quote requests & AI-to-AI negotiation",
              ],
              icon: ShieldCheck,
              tone: "iris",
            },
          ].map((c) => (
            <motion.div
              key={c.tag}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-line)] shadow-card p-8 hover:shadow-lift transition-shadow"
            >
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] mb-6"
                style={{
                  background:
                    c.tone === "coral"
                      ? "var(--color-coral-soft)"
                      : "var(--color-iris-soft)",
                  color:
                    c.tone === "coral"
                      ? "var(--color-coral)"
                      : "var(--color-iris)",
                }}
              >
                <c.icon size={20} />
              </span>
              <div className="label-mono text-[var(--color-ink-faint)] mb-2">
                {c.tag}
              </div>
              <h3 className="font-serif text-2xl text-[var(--color-ink)] leading-snug mb-6">
                {c.title}
              </h3>
              <ul className="space-y-3">
                {c.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-3 text-[15px] text-[var(--color-ink-soft)]"
                  >
                    <Check
                      size={16}
                      className="text-[var(--color-sage)] shrink-0"
                      strokeWidth={2.5}
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How NOVA works */}
      <section
        id="how"
        className="border-y border-[var(--color-line)] bg-[var(--color-surface-2)] scroll-mt-16"
      >
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-24">
          <div className="max-w-2xl mb-14">
            <div className="label-mono text-[var(--color-coral-ink)] mb-3">
              How NOVA works
            </div>
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.08] text-[var(--color-ink)]">
              From connected business to AI-commerce ready.
            </h2>
          </div>
          <div className="grid md:grid-cols-5 gap-px bg-[var(--color-line)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-line)]">
            {[
              { n: "01", t: "Connect your business", i: Plug },
              { n: "02", t: "NOVA understands your products", i: Boxes },
              { n: "03", t: "Discover growth opportunities", i: Compass },
              { n: "04", t: "Become AI-commerce ready", i: ShieldCheck },
              { n: "05", t: "AI buyers discover your offers", i: Sparkles },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-[var(--color-surface)] p-6 flex flex-col gap-4 min-h-[200px] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <span className="font-serif text-3xl text-[var(--color-line-strong)]">
                  {s.n}
                </span>
                <s.i size={20} className="text-[var(--color-coral)]" />
                <span className="text-[15px] text-[var(--color-ink)] mt-auto leading-snug">
                  {s.t}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        id="commerce"
        className="max-w-6xl mx-auto px-5 lg:px-8 py-28 scroll-mt-16"
      >
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-ink)] p-12 md:p-16 text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-[var(--color-coral)] blur-[120px] opacity-25" />
          <div className="relative">
            <NovaMark size={28} active />
            <h2 className="font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-white mt-6 max-w-2xl mx-auto">
              Meet NOVA — the operating system for your growth and commerce.
            </h2>
            <p className="text-white/60 mt-5 max-w-lg mx-auto text-[16px]">
              Start free. Connect your business and see your first opportunity
              in minutes.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
