import { useState, useEffect } from "react";
import { PageHeader, PageFade, Card, Badge, Button } from "../components/ui";
import { Server, Database, Brain, Globe, Mail } from "lucide-react";

export default function Diagnostics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setData({ status: "error", error: err.message });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <PageFade>
        <PageHeader
          title="Diagnostics"
          subtitle="System Health and Configuration"
        />
        <Card className="p-8 text-center">Loading status...</Card>
      </PageFade>
    );
  }

  const items = [
    {
      icon: Server,
      name: "Backend API",
      status: data?.status === "ok" ? "CONFIGURED" : "ERROR",
    },
    {
      icon: Database,
      name: "PostgreSQL Database",
      status: data?.database === "ok" ? "CONFIGURED" : "ERROR",
    },
    {
      icon: Brain,
      name: "NVIDIA NIM (AI)",
      status: data?.nvidia === "configured" ? "CONFIGURED" : "MISSING",
    },
    {
      icon: Globe,
      name: "Tavily Search API",
      status: data?.tavily === "configured" ? "CONFIGURED" : "MISSING",
    },
    {
      icon: Globe,
      name: "Overpass API",
      status: data?.overpass === "configured" ? "CONFIGURED" : "MISSING",
    },
  ];

  return (
    <PageFade>
      <PageHeader
        title="Diagnostics"
        subtitle="Protected System Health and Configuration"
      />

      <div className="grid gap-4 mt-6">
        {items.map((item, i) => (
          <Card key={i} className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-sunk)] flex items-center justify-center text-[var(--color-ink-faint)]">
                <item.icon size={20} />
              </div>
              <div>
                <div className="font-medium text-[var(--color-ink)]">
                  {item.name}
                </div>
                <div className="text-sm text-[var(--color-ink-soft)]">
                  {item.status === "CONFIGURED"
                    ? "Ready for production workflows"
                    : "Action required to enable this provider"}
                </div>
              </div>
            </div>
            <Badge tone={item.status === "CONFIGURED" ? "sage" : "rose"}>
              {item.status}
            </Badge>
          </Card>
        ))}
      </div>

      {!import.meta.env.DEV && (
        <div className="mt-8 p-4 bg-amber-50 text-amber-800 rounded border border-amber-200 text-sm">
          Warning: This page is accessible in production because APP_DEMO_MODE
          or similar is misconfigured. Ensure this route is protected in
          production builds.
        </div>
      )}
    </PageFade>
  );
}
