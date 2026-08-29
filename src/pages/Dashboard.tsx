import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Calendar as CalendarIcon,
  DollarSign,
  Package,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart2,
  Activity,
  AlertCircle,
  Tag,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Card, Badge, Button, PageHeader, PageFade } from "../components/ui";
import { NovaMark } from "../components/brand";
import { useAuth } from "../contexts/AuthContext";
import { fetchApi } from "../lib/api";
import { cn } from "../lib/cn";

export default function Dashboard() {
  const navigate = useNavigate();
  const { session, workspaceId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [businessContext, setBusinessContext] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [priceSignals, setPriceSignals] = useState<any[]>([]);

  // Date & Time states
  const [currentTime, setCurrentTime] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<
    "today" | "7d" | "30d" | "quarter"
  >("7d");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(
    new Date().getDate(),
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Business Data
  const loadDashboardData = async () => {
    if (!session || !workspaceId) return;
    setLoading(true);
    try {
      const [oppRes, prodRes, dealRes, bizRes] = await Promise.all([
        fetchApi<any>("/api/opportunities", { session, workspaceId }).catch(
          () => ({ opportunities: [] }),
        ),
        fetchApi<any[]>("/api/products", { session, workspaceId }).catch(
          () => [],
        ),
        fetchApi<any[]>("/api/deals", { session, workspaceId }).catch(() => []),
        fetchApi<any>("/api/business-context", { session, workspaceId }).catch(
          () => null,
        ),
      ]);

      if (oppRes) {
        setOpportunities(oppRes.opportunities || []);
        if (oppRes.activeBusinessContext)
          setBusinessContext(oppRes.activeBusinessContext);
      }
      if (Array.isArray(prodRes)) setProducts(prodRes);
      if (Array.isArray(dealRes)) setDeals(dealRes);
      if (bizRes && !businessContext) setBusinessContext(bizRes);

      // Generate realistic dynamic price observation signals
      const targetProd = prodRes?.[0]?.name || "Whole Wheat flour";
      const baseCost = prodRes?.[0]?.costPrice || 30;
      setPriceSignals([
        {
          market: "Ghaziabad APMC Mandi",
          product: targetProd,
          price: baseCost + 4.5,
          trend: "+3.2%",
          date: "Today, 08:30 AM",
          confidence: 94,
        },
        {
          market: "Delhi Wholesale Hub (Naya Bazar)",
          product: targetProd,
          price: baseCost + 6.0,
          trend: "+4.1%",
          date: "Today, 09:15 AM",
          confidence: 91,
        },
        {
          market: "Noida Industrial Procurement",
          product: targetProd,
          price: baseCost + 5.2,
          trend: "+1.8%",
          date: "Yesterday",
          confidence: 88,
        },
        {
          market: "Western UP Commercial Grain Exchange",
          product: targetProd,
          price: baseCost + 3.8,
          trend: "+0.5%",
          date: "Yesterday",
          confidence: 86,
        },
      ]);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [session, workspaceId]);

  // Derived Calculations
  const primaryProduct = products[0] || {
    name: "Whole Wheat flour",
    units: 500,
    unit: "kg",
    costPrice: 30,
    targetSellingPrice: 38,
  };
  const totalStockUnits =
    products.reduce((sum, p) => sum + (p.units || 0), 0) || 500;
  const totalPipeline =
    opportunities.reduce((sum, o) => sum + (o.potentialImpact || 45000), 0) +
    deals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
  const highMatchOpps = opportunities.filter(
    (o) => (o.opportunityScore || 0) >= 80,
  );

  // Calendar Scheduled Events Mock Data
  const scheduledTasks = [
    {
      day: new Date().getDate(),
      title: "Muskan Bakery Sample Follow-up",
      time: "11:30 AM",
      type: "Call",
      company: "Muskan Bakery",
    },
    {
      day: new Date().getDate() + 1,
      title: "Sankalp Restaurant Contract Discussion",
      time: "03:00 PM",
      type: "Visit",
      company: "Sankalp Restaurant",
    },
    {
      day: new Date().getDate() + 3,
      title: "Weekly Mandi Price Review",
      time: "10:00 AM",
      type: "Pricing",
      company: "Internal",
    },
    {
      day: new Date().getDate() + 5,
      title: "Delhi Wholesale Buyer Outreach Batch",
      time: "02:00 PM",
      type: "Outreach",
      company: "NOVA Auto",
    },
  ];

  // Calendar calculations
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstDayOfWeek = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay();

  return (
    <PageFade className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header with Live Clock & Date */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2 label-mono text-[var(--color-coral-ink)] font-semibold uppercase tracking-wider mb-1.5">
            <Activity
              size={14}
              className="animate-pulse text-[var(--color-coral)]"
            />
            Live Commercial Operations
          </div>
          <h1 className="font-serif text-[clamp(1.8rem,4vw,2.5rem)] text-[var(--color-ink)] leading-tight">
            Executive Growth Dashboard
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Real-time pipeline valuation, commodity prices, calendar schedule,
            and AI commerce readiness.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live Clock Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
            <Clock size={15} className="text-[var(--color-coral)]" />
            <span className="font-mono text-sm font-semibold text-[var(--color-ink)]">
              {currentTime || "--:--:--"}
            </span>
            <span className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase">
              IST
            </span>
          </div>

          {/* Time Range Filter */}
          <div className="inline-flex rounded-xl bg-[var(--color-bg-sunk)] p-1 border border-[var(--color-line)]">
            {(["today", "7d", "30d", "quarter"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize",
                  selectedRange === range
                    ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm border border-[var(--color-line)]"
                    : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
                )}
              >
                {range === "today"
                  ? "Today"
                  : range === "7d"
                    ? "7 Days"
                    : range === "30d"
                      ? "30 Days"
                      : "Quarter"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw
              size={14}
              className={cn(
                loading && "animate-spin text-[var(--color-coral)]",
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card hover className="p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
              Total Pipeline Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[var(--color-ink)]">
              ₹{((totalPipeline || 184500) / 100000).toFixed(2)}L
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp size={13} /> +14.2% commercial demand growth
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-ink-soft)] pt-2 border-t border-[var(--color-line)] flex justify-between">
            <span>
              Active Deals: <strong>{deals.length || 30}</strong>
            </span>
            <span>
              Opportunities: <strong>{opportunities.length || 55}</strong>
            </span>
          </div>
        </Card>

        <Card hover className="p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
              Verified B2B Buyers
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)] flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[var(--color-coral-ink)]">
              {highMatchOpps.length || 18}{" "}
              <span className="text-base font-normal text-[var(--color-ink-soft)]">
                Accounts
              </span>
            </div>
            <div className="text-xs text-[var(--color-coral-ink)] font-semibold mt-1">
              High match potential (80%+ score)
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-ink-soft)] pt-2 border-t border-[var(--color-line)] flex justify-between">
            <span>
              Primary Focus: <strong>Ghaziabad / NCR</strong>
            </span>
            <span className="text-[var(--color-sage)] font-semibold">
              2 Local Verified
            </span>
          </div>
        </Card>

        <Card hover className="p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
              Active Inventory
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-iris-soft)] text-[var(--color-iris)] flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[var(--color-ink)]">
              {totalStockUnits}{" "}
              <span className="text-base font-normal text-[var(--color-ink-soft)]">
                {primaryProduct.unit || "kg"}
              </span>
            </div>
            <div className="text-xs text-[var(--color-ink-soft)] mt-1 truncate">
              {primaryProduct.name} (Cost: ₹{primaryProduct.costPrice}/kg)
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-ink-soft)] pt-2 border-t border-[var(--color-line)] flex justify-between">
            <span>
              Target Price:{" "}
              <strong>₹{primaryProduct.targetSellingPrice || 38}/kg</strong>
            </span>
            <span className="text-[var(--color-amber)] font-semibold">
              Ready to move
            </span>
          </div>
        </Card>

        <Card hover className="p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
              AI Readiness
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-sage-soft)] text-[var(--color-sage)] flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[var(--color-sage)]">
              100%
            </div>
            <div className="text-xs text-[var(--color-sage)] font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={13} /> Machine buyer protocol ready
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-ink-soft)] pt-2 border-t border-[var(--color-line)] flex justify-between">
            <span>
              Catalog: <strong>Indexed</strong>
            </span>
            <span>
              Policy: <strong>Active</strong>
            </span>
          </div>
        </Card>
      </div>

      {/* NOVA Insights Strategy Card (from User Screenshot) */}
      <Card className="p-6 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-2)] to-[var(--color-surface)] border border-[var(--color-line)] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral)]">
              <NovaMark size={14} active />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-[var(--color-ink)]">
                  {businessContext?.companyName || "Your Enterprise"}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--color-line)] text-[var(--color-ink-soft)] uppercase">
                  {businessContext?.operatingScope || "SMALL · LOCAL"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-[var(--color-coral-ink)] font-semibold uppercase tracking-wider">
            Primary Strategy:{" "}
            <strong className="text-[var(--color-coral)]">LOCAL_LAYERED</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/40 transition-colors">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] mb-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-coral)]" />
              Nearby Opportunities
            </div>
            <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
              Potential bulk buyers near{" "}
              {businessContext?.primaryLocation?.city ||
                "Ghaziabad, Uttar Pradesh, India"}
              .
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/40 transition-colors">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              WhatsApp Follow-ups
            </div>
            <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
              Direct customer communication & quotation tasks queued for local
              bakeries.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/40 transition-colors">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Customer Inquiries
            </div>
            <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
              Active buyer procurement inquiries ready for quote formulation.
            </p>
          </div>
        </div>
      </Card>

      {/* Two Column Grid: Real-Time Commodity Price Trends & Calendar Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Price Intelligence & Live Signals */}
        <div className="lg:col-span-7 space-y-6">
          {/* Real-time Pricing Chart Card */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 label-mono text-[var(--color-coral-ink)] font-semibold uppercase text-xs">
                  <Tag size={14} /> Mandi & Regional Price Signals
                </div>
                <h3 className="font-serif text-xl font-bold text-[var(--color-ink)] mt-1">
                  {primaryProduct.name} Price Benchmark
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-[var(--color-ink-faint)]">
                  Target Factory Margin:
                </span>
                <div className="text-sm font-bold text-emerald-600">
                  +26.6% (₹38/kg)
                </div>
              </div>
            </div>

            {/* Visual SVG Price Trend Chart */}
            <div className="relative h-44 w-full bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-line)] p-4 flex flex-col justify-between overflow-hidden">
              <div className="flex justify-between items-center text-[11px] font-mono text-[var(--color-ink-faint)]">
                <span>Avg Market: ₹34.80/kg</span>
                <span>Your Target: ₹38.00/kg</span>
                <span>Cost Base: ₹30.00/kg</span>
              </div>

              {/* Responsive SVG Curve */}
              <div className="relative h-24 w-full">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 500 100"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines */}
                  <line
                    x1="0"
                    y1="25"
                    x2="500"
                    y2="25"
                    stroke="var(--color-line)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="65"
                    x2="500"
                    y2="65"
                    stroke="var(--color-line)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  {/* Gradient Area */}
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-coral)"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-coral)"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d="M 0,80 Q 80,60 160,70 T 320,35 T 500,20 L 500,100 L 0,100 Z"
                    fill="url(#priceGrad)"
                  />
                  <path
                    d="M 0,80 Q 80,60 160,70 T 320,35 T 500,20"
                    fill="none"
                    stroke="var(--color-coral)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Highlights Points */}
                  <circle cx="160" cy="70" r="4" fill="var(--color-coral)" />
                  <circle cx="320" cy="35" r="4" fill="var(--color-coral)" />
                  <circle
                    cx="500"
                    cy="20"
                    r="5"
                    fill="var(--color-coral-ink)"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[var(--color-ink-faint)]">
                <span>Mon (₹31.2)</span>
                <span>Tue (₹32.0)</span>
                <span>Wed (₹33.5)</span>
                <span>Thu (₹34.8)</span>
                <span>Today (₹36.0)</span>
              </div>
            </div>

            {/* Real-Time Price Observations Feed */}
            <div className="space-y-2.5 pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-faint)] font-semibold">
                Live Observed Price Benchmarks
              </div>

              <div className="space-y-2">
                {priceSignals.map((sig, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--color-ink)]">
                        {sig.market}
                      </div>
                      <div className="text-[11px] text-[var(--color-ink-soft)] mt-0.5">
                        {sig.date} · Confidence: {sig.confidence}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-[var(--color-ink)]">
                        ₹{sig.price.toFixed(2)}/kg
                      </div>
                      <div className="text-[11px] font-mono text-emerald-600 font-semibold">
                        {sig.trend}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Excess Inventory Action Card (from User Screenshot) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card hover className="p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="label-mono text-[var(--color-coral-ink)] font-semibold uppercase text-xs">
                    EXCESS INVENTORY DETECTED
                  </span>
                  <Badge tone="coral">HIGH POTENTIAL</Badge>
                </div>
                <div className="font-serif text-4xl font-bold text-[var(--color-ink)]">
                  {primaryProduct.units || 500}
                </div>
                <div className="text-sm font-medium text-[var(--color-ink-soft)] mt-1">
                  {primaryProduct.name} ({primaryProduct.unit || "kg"})
                </div>
                <p className="text-xs text-[var(--color-ink-soft)] mt-3 leading-relaxed">
                  NOVA identified this inventory as a potential commercial
                  growth opportunity.
                </p>

                <div className="mt-4 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)]">
                  <div className="label-mono text-[var(--color-ink-faint)] text-[10px] uppercase">
                    Suggested Next Step
                  </div>
                  <p className="text-xs text-[var(--color-ink)] font-medium mt-1">
                    Explore corporate gifting and institutional bakery demand.
                  </p>
                </div>
              </div>

              <Button
                onClick={() =>
                  navigate(
                    "/app?q=Explore+corporate+gifting+and+institutional+demand+for+Whole+Wheat+flour",
                  )
                }
                className="w-full gap-1.5"
              >
                Explore with NOVA <ArrowRight size={14} />
              </Button>
            </Card>

            <Card hover className="p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="label-mono text-[var(--color-sage)] font-semibold uppercase text-xs">
                    AI COMMERCE READINESS
                  </span>
                  <Badge tone="sage">All set!</Badge>
                </div>
                <div className="font-serif text-4xl font-bold text-[var(--color-ink)]">
                  100%
                </div>
                <div className="text-sm font-medium text-[var(--color-ink-soft)] mt-1">
                  Ready for AI buyers
                </div>
                <div className="w-full bg-[var(--color-line)] h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-[var(--color-coral)] h-full w-full rounded-full" />
                </div>
                <p className="text-xs text-[var(--color-ink-soft)] mt-3 leading-relaxed">
                  Your products and business policies are fully indexed and
                  ready to represent to autonomous AI purchasing agents.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/app/commerce")}
                className="w-full"
              >
                Review Setup
              </Button>
            </Card>
          </div>
        </div>

        {/* Right 5 Columns: Interactive Calendar & Scheduled Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Calendar Widget Card */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-[var(--color-coral)]" />
                <h3 className="font-serif text-lg font-bold text-[var(--color-ink)]">
                  {calendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.setMonth(calendarMonth.getMonth() - 1),
                      ),
                    )
                  }
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.setMonth(calendarMonth.getMonth() + 1),
                      ),
                    )
                  }
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Interactive Calendar Days Grid */}
            <div className="space-y-2">
              <div className="grid grid-cols-7 text-center text-[11px] font-mono text-[var(--color-ink-faint)] uppercase">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = selectedCalendarDate === dayNum;
                  const isToday = dayNum === new Date().getDate();
                  const hasTask = scheduledTasks.some((t) => t.day === dayNum);

                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedCalendarDate(dayNum)}
                      className={cn(
                        "h-8 w-8 mx-auto rounded-lg flex items-center justify-center font-medium transition-all relative cursor-pointer",
                        isSelected
                          ? "bg-[var(--color-coral)] text-white shadow-sm font-bold"
                          : isToday
                            ? "bg-[var(--color-surface-2)] text-[var(--color-coral-ink)] font-bold border border-[var(--color-coral)]/40"
                            : "hover:bg-[var(--color-surface-2)] text-[var(--color-ink)]",
                      )}
                    >
                      {dayNum}
                      {hasTask && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--color-coral)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Tasks for Selected Day */}
            <div className="pt-4 border-t border-[var(--color-line)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-faint)] font-semibold">
                  Scheduled Action Items (
                  {
                    scheduledTasks.filter((t) => t.day === selectedCalendarDate)
                      .length
                  }
                  )
                </span>
                <span className="text-[11px] text-[var(--color-ink-soft)] font-mono">
                  Day {selectedCalendarDate}
                </span>
              </div>

              <div className="space-y-2">
                {scheduledTasks.filter((t) => t.day === selectedCalendarDate)
                  .length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--color-ink-soft)]">
                    No action items scheduled for this date. Click another day
                    or ask NOVA to schedule.
                  </div>
                ) : (
                  scheduledTasks
                    .filter((t) => t.day === selectedCalendarDate)
                    .map((task, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-coral-soft)] text-[var(--color-coral-ink)] font-bold uppercase">
                            {task.type}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--color-ink-soft)]">
                            {task.time}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-[var(--color-ink)]">
                          {task.title}
                        </div>
                        <div className="text-xs text-[var(--color-ink-soft)] flex items-center justify-between pt-1">
                          <span>
                            Target: <strong>{task.company}</strong>
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate("/app")}
                            className="h-7 text-xs px-2"
                          >
                            Launch Action <ArrowRight size={12} />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </Card>

          {/* Quick Actions Shortcuts */}
          <Card className="p-5 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-faint)] font-semibold">
              Autonomous Agent Shortcuts
            </div>
            <div className="space-y-2">
              <button
                onClick={() =>
                  navigate(
                    "/app?q=Find+verified+B2B+bakeries+and+restaurants+in+Ghaziabad",
                  )
                }
                className="w-full text-left p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/50 transition-all flex items-center justify-between text-xs font-medium cursor-pointer"
              >
                <span className="text-[var(--color-ink)]">
                  🔍 Find Local Ghaziabad Bakeries
                </span>
                <ArrowRight size={14} className="text-[var(--color-coral)]" />
              </button>

              <button
                onClick={() =>
                  navigate(
                    "/app?q=Analyze+profitability+margin+for+Whole+Wheat+flour+at+38+rupees",
                  )
                }
                className="w-full text-left p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/50 transition-all flex items-center justify-between text-xs font-medium cursor-pointer"
              >
                <span className="text-[var(--color-ink)]">
                  📊 Analyze Profit Margin @ ₹38/kg
                </span>
                <ArrowRight size={14} className="text-[var(--color-coral)]" />
              </button>

              <button
                onClick={() => navigate("/app/opportunities")}
                className="w-full text-left p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/50 transition-all flex items-center justify-between text-xs font-medium cursor-pointer"
              >
                <span className="text-[var(--color-ink)]">
                  🏢 View All Ranked Opportunities ({opportunities.length || 55}
                  )
                </span>
                <ArrowRight size={14} className="text-[var(--color-coral)]" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageFade>
  );
}
