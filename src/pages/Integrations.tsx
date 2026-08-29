import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";
import {
  Boxes,
  Users,
  Mail,
  Receipt,
  ShoppingBag,
  Globe,
  Check,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Button,
  Badge,
  Card,
  Modal,
  Segmented,
  PageHeader,
  PageFade,
} from "../components/ui";
import { GmailConnectModal } from "../components/GmailConnectModal";
import { WhatsAppConnectModal } from "../components/WhatsAppConnectModal";
import {
  integrations as seedIntegrations,
  type Integration,
} from "../lib/data";
import { cn } from "../lib/cn";

type CategoryStyle = { icon: LucideIcon; tile: string; ink: string };

const categoryStyles: Record<string, CategoryStyle> = {
  Inventory: {
    icon: Boxes,
    tile: "bg-[var(--color-iris-soft)]",
    ink: "text-[var(--color-iris)]",
  },
  CRM: {
    icon: Users,
    tile: "bg-[var(--color-coral-soft)]",
    ink: "text-[var(--color-coral-ink)]",
  },
  Email: {
    icon: Mail,
    tile: "bg-[var(--color-sage-soft)]",
    ink: "text-[var(--color-sage)]",
  },
  Messaging: {
    icon: Mail,
    tile: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    ink: "text-emerald-600",
  },
  Accounting: {
    icon: Receipt,
    tile: "bg-[var(--color-amber-soft)]",
    ink: "text-[var(--color-amber)]",
  },
  Commerce: {
    icon: ShoppingBag,
    tile: "bg-[#f7e4e1]",
    ink: "text-[var(--color-rose)]",
  },
  Google: {
    icon: Globe,
    tile: "bg-[var(--color-bg-sunk)]",
    ink: "text-[var(--color-ink-soft)]",
  },
};

function fallbackStyle(): CategoryStyle {
  return {
    icon: Globe,
    tile: "bg-[var(--color-bg-sunk)]",
    ink: "text-[var(--color-ink-soft)]",
  };
}

export default function Integrations() {
  const [items, setItems] = useState<Integration[]>(seedIntegrations);
  const [filter, setFilter] = useState("all");
  const [managing, setManaging] = useState<Integration | null>(null);
  const [gmailModalOpen, setGmailModalOpen] = useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const { session, workspaceId } = useAuth();

  const fetchGmailStatus = () => {
    if (!session || !workspaceId) return;

    fetch("/api/integrations/gmail/status", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "x-workspace-id": workspaceId,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const isConnected =
          data.connected === true ||
          data.status === "CONNECTED" ||
          data.connection?.status === "CONNECTED";
        const emailAddress = data.emailAddress || data.connection?.emailAddress;

        setItems((prev) =>
          prev.map((i) => {
            if (i.id === "email") {
              return {
                ...i,
                connected: isConnected,
                description: isConnected
                  ? `Connected: ${emailAddress} is ready to send approved outreach.`
                  : "You can discover buyers and prepare outreach without connecting Gmail. Connect Gmail only when you're ready to send approved messages.",
              };
            }
            return i;
          }),
        );
      })
      .catch((err) => console.error("Failed to fetch Gmail status", err));
  };

  const fetchWhatsAppStatus = () => {
    if (!session || !workspaceId) return;

    fetch("/api/whatsapp/config", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "x-workspace-id": workspaceId,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const conn = data.connection;
        const isConn =
          conn && (conn.status === "CONNECTED" || conn.status === "DEMO_MODE");
        setItems((prev) =>
          prev.map((i) => {
            if (i.id === "whatsapp") {
              return {
                ...i,
                connected: isConn,
                description: isConn
                  ? `Connected (${conn.status}): ${conn.displayPhoneNumber || conn.phoneNumberId || "Active WhatsApp Business API"}`
                  : i.description,
              };
            }
            return i;
          }),
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchGmailStatus();
    fetchWhatsAppStatus();
  }, [session, workspaceId]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(seedIntegrations.map((i) => i.category)));
    return [
      { id: "all", label: "All" },
      ...unique.map((c) => ({ id: c, label: c })),
    ];
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => filter === "all" || i.category === filter),
    [items, filter],
  );

  function handleConnect(id: string) {
    if (id === "email") {
      setGmailModalOpen(true);
    } else if (id === "whatsapp") {
      setWhatsAppModalOpen(true);
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, connected: true } : i)),
      );
    }
  }

  async function handleDisconnect(id: string) {
    if (id === "email" && session && workspaceId) {
      try {
        await fetch("/api/integrations/gmail/disconnect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            "x-workspace-id": workspaceId,
          },
          body: JSON.stringify({}),
        });

        setItems((prev) =>
          prev.map((i) => {
            if (i.id === "email") {
              return {
                ...i,
                connected: false,
                description:
                  "You can discover buyers and prepare outreach without connecting Gmail. Connect Gmail only when you're ready to send approved messages.",
              };
            }
            return i;
          }),
        );
      } catch (err) {
        console.error("Failed to disconnect Gmail", err);
      }
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, connected: false } : i)),
      );
    }
    setManaging(null);
  }

  const connectedCount = items.filter((i) => i.connected).length;

  return (
    <PageFade>
      <PageHeader
        eyebrow="CONNECTIONS"
        title="Integrations"
        subtitle="Connect the systems NOVA works with"
        actions={
          <Badge tone="sage" dot>
            {connectedCount} connected
          </Badge>
        }
      />

      <div className="mb-7 overflow-x-auto pb-1">
        <Segmented options={categories} value={filter} onChange={setFilter} />
      </div>

      <div className="grid grid-cols-1 min-[1000px]:grid-cols-3 sm:grid-cols-2 gap-5">
        {filtered.map((it, i) => {
          const style = categoryStyles[it.category] ?? fallbackStyle();
          const Icon = style.icon;
          return (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.05,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Card hover className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)]",
                      style.tile,
                      style.ink,
                    )}
                  >
                    <Icon size={22} />
                  </div>
                  {it.connected ? (
                    <Badge tone="sage" dot>
                      Connected
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Optional</Badge>
                  )}
                </div>

                <div className="mt-5 flex-1">
                  <h3 className="font-serif text-xl text-[var(--color-ink)]">
                    {it.name}
                  </h3>
                  <div className="label-mono text-[var(--color-ink-faint)] mt-1.5">
                    {it.category}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                    {it.description}
                  </p>
                </div>

                <div className="mt-6">
                  {it.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setManaging(it)}
                    >
                      <Settings2 size={15} />
                      Manage connection
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleConnect(it.id)}
                    >
                      Connect {it.name}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Gmail Connection Modal */}
      <GmailConnectModal
        open={gmailModalOpen}
        onClose={() => setGmailModalOpen(false)}
        onConnected={(email) => {
          fetchGmailStatus();
          setGmailModalOpen(false);
        }}
      />

      {/* WhatsApp Connection Modal */}
      <WhatsAppConnectModal
        open={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        onConnectionSaved={() => {
          fetchWhatsAppStatus();
          setWhatsAppModalOpen(false);
        }}
      />

      {/* Management Modal */}
      <Modal
        open={managing !== null}
        onClose={() => setManaging(null)}
        title={managing ? `Manage ${managing.name}` : "Manage"}
      >
        {managing && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-line)] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                <Check size={16} strokeWidth={3} />
              </span>
              <div>
                <div className="text-sm font-medium text-[var(--color-ink)]">
                  {managing.name} connected
                </div>
                <div className="label-mono text-[var(--color-ink-faint)] mt-0.5">
                  {managing.category}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
              {managing.description}
            </p>
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => setManaging(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                className="border-[var(--color-rose)]/40 text-[var(--color-rose)] hover:bg-[#f7e4e1]"
                onClick={() => handleDisconnect(managing.id)}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageFade>
  );
}
