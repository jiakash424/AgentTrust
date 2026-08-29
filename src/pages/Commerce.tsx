import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Search, PackageCheck, ArrowRight } from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Toggle,
  ScoreRing,
  PageHeader,
  PageFade,
  Drawer,
} from "../components/ui";
import { NovaMark } from "../components/brand";
import { commerceCapabilities, buyerActivity } from "../lib/data";

export default function Commerce() {
  const [caps, setCaps] = useState(() => {
    const saved = localStorage.getItem("nova_commerce_caps");
    if (saved) return JSON.parse(saved);
    return commerceCapabilities;
  });

  const [negOpen, setNegOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("nova_commerce_caps", JSON.stringify(caps));
  }, [caps]);

  const readiness = Math.round(
    (caps.filter((c: any) => c.on).length / caps.length) * 100,
  );

  const toggle = (id: string) =>
    setCaps((prev: any) =>
      prev.map((c: any) => (c.id === id ? { ...c, on: !c.on } : c)),
    );

  return (
    <PageFade className="max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Agentic Commerce"
        title="Make your business ready to sell to AI buyers"
        subtitle="The capabilities that let AI agents discover, understand, and transact with you."
      />

      {/* Readiness hero */}
      <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-center rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-line)] shadow-card p-8 md:p-10">
        <div className="flex justify-center">
          <ScoreRing
            value={readiness}
            size={210}
            label="Ready for AI buyers"
            sublabel="AI commerce"
          />
        </div>
        <div>
          <h2 className="font-serif text-2xl text-[var(--color-ink)] leading-snug max-w-md">
            Your products are almost ready for AI buyers.
          </h2>
          <p className="text-[15px] text-[var(--color-ink-soft)] mt-3 max-w-md leading-relaxed">
            Turn on the remaining capability to unlock cross-border AI buyer
            discovery and autonomous quote-to-close.
          </p>
          <div className="mt-6 flex flex-wrap gap-6">
            {[
              {
                k: "Capabilities on",
                v: `${caps.filter((c: any) => c.on).length}/${caps.length}`,
              },
              { k: "AI buyer searches", v: "0 this week" },
              { k: "Open quote requests", v: "0" },
            ].map((x) => (
              <div key={x.k}>
                <div className="font-serif text-2xl text-[var(--color-ink)]">
                  {x.v}
                </div>
                <div className="label-mono text-[var(--color-ink-faint)] mt-0.5">
                  {x.k}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="label-mono text-[var(--color-ink-faint)] mt-12 mb-5">
        Your AI commerce capabilities
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {caps.map((c: any, i: number) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="p-6 h-full flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h3 className="font-serif text-lg text-[var(--color-ink)]">
                      {c.name}
                    </h3>
                    {c.on ? (
                      <Badge tone="sage" dot>
                        ON
                      </Badge>
                    ) : (
                      <Badge tone="amber" dot>
                        NEEDS SETUP
                      </Badge>
                    )}
                  </div>
                  <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed">
                    {c.desc}
                  </p>
                </div>
                <Toggle checked={c.on} onChange={() => toggle(c.id)} />
              </div>
              {c.id === "negotiation" && !c.on && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 self-start"
                  onClick={() => setNegOpen(true)}
                >
                  Configure limits
                </Button>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Buyer activity */}
      <div className="label-mono text-[var(--color-ink-faint)] mt-12 mb-5">
        Recent AI buyer activity
      </div>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        <Card className="p-2">
          {buyerActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search
                size={32}
                className="text-[var(--color-ink-faint)] mb-3"
              />
              <div className="text-[15px] text-[var(--color-ink-soft)] font-medium">
                No buyer activity yet
              </div>
              <div className="text-[13px] text-[var(--color-ink-faint)] mt-1">
                AI buyer searches will appear here once your products are live.
              </div>
            </div>
          ) : (
            buyerActivity.map((b, i) => (
              <div
                key={b.id}
                className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-2)] transition-colors"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--color-line)",
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-iris-soft)] text-[var(--color-iris)]">
                  {b.kind === "quote" ? (
                    <FileText size={18} />
                  ) : b.kind === "eval" ? (
                    <PackageCheck size={18} />
                  ) : (
                    <Search size={18} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] text-[var(--color-ink)]">
                    {b.title}
                  </div>
                  <div className="text-[13px] text-[var(--color-ink-faint)] truncate">
                    {b.detail}
                  </div>
                </div>
                <span className="label-mono text-[var(--color-ink-faint)] shrink-0">
                  {b.time}
                </span>
                {b.kind === "quote" && (
                  <Button size="sm" variant="outline">
                    Review with NOVA
                  </Button>
                )}
              </div>
            ))
          )}
        </Card>

        <Card
          className="p-6 flex flex-col"
          style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
        >
          <NovaMark size={20} active />
          <p className="font-serif text-xl leading-snug mt-4">
            Your products were evaluated by 0 AI buyer searches this week.
          </p>
          <p
            style={{ color: "rgba(255,255,255,0.6)" }}
            className="text-[14px] mt-3 leading-relaxed"
          >
            Completing AI negotiation could convert more of these into quote
            requests automatically.
          </p>
          <Button
            className="mt-auto self-start group"
            onClick={() => setNegOpen(true)}
          >
            Set up negotiation
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Button>
        </Card>
      </div>

      <Drawer
        open={negOpen}
        onClose={() => setNegOpen(false)}
        title="AI negotiation policy"
      >
        <p className="text-[14px] text-[var(--color-ink-soft)] mb-6">
          Define the limits NOVA can operate within when negotiating with AI
          buyers.
        </p>
        <div className="space-y-5">
          {[
            { label: "Base price", value: "₹300" },
            { label: "Minimum price", value: "₹250" },
            { label: "Maximum discount", value: "10%" },
          ].map((f) => (
            <div key={f.label}>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-1.5">
                {f.label}
              </label>
              <input
                defaultValue={f.value}
                className="w-full h-11 px-3.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink)] outline-none focus:border-[var(--color-coral)] transition-colors"
              />
            </div>
          ))}
          <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-line)] p-4">
            <div>
              <div className="text-[15px] text-[var(--color-ink)]">
                Require approval per deal
              </div>
              <div className="text-[13px] text-[var(--color-ink-faint)]">
                Ask before NOVA sends a counter-offer.
              </div>
            </div>
            <Toggle checked onChange={() => {}} />
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <Button
            className="flex-1"
            onClick={() => {
              toggle("negotiation");
              setNegOpen(false);
            }}
          >
            Enable negotiation
          </Button>
          <Button variant="outline" onClick={() => setNegOpen(false)}>
            Cancel
          </Button>
        </div>
      </Drawer>
    </PageFade>
  );
}
