import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Building2,
  Check,
  Edit3,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Target,
  Users,
  Sliders,
  ChevronLeft,
} from "lucide-react";
import { Modal, Button, Badge, Card } from "./ui";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface BusinessContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (resolvedContext: any, strategy: any) => void;
}

export function BusinessContextModal({
  isOpen,
  onClose,
  onProfileUpdated,
}: BusinessContextModalProps) {
  const { session, workspaceId } = useAuth();
  const [stepIndex, setStepIndex] = useState<number>(1);
  const [naturalInput, setNaturalInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState("");
  const [businessSize, setBusinessSize] = useState<
    "SOLO" | "SMALL" | "MEDIUM" | "LARGE"
  >("SMALL");
  const [operatingScope, setOperatingScope] = useState<
    "LOCAL" | "CITY" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL"
  >("LOCAL");
  const [primaryCity, setPrimaryCity] = useState("");
  const [localSearchRadius, setLocalSearchRadius] = useState<number>(20);
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([
    "Find Local Customers",
    "Find B2B Buyers",
  ]);
  const [targetBuyerProfiles, setTargetBuyerProfiles] = useState<string[]>([]);
  const [newBuyer, setNewBuyer] = useState("");

  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locDetectedSuccess, setLocDetectedSuccess] = useState(false);

  const handleDetectLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLoc(true);
    setLocDetectedSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.county ||
              addr.state_district ||
              addr.state;
            const state = addr.state || "";
            const country = addr.country || "";
            const fullLocLabel = [city, state, country]
              .filter(Boolean)
              .join(", ");
            if (fullLocLabel) {
              setPrimaryCity(fullLocLabel);
              setLocDetectedSuccess(true);
            }
          } else {
            const ipRes = await fetch("https://ipapi.co/json/");
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              const fullLocLabel = [
                ipData.city,
                ipData.region,
                ipData.country_name,
              ]
                .filter(Boolean)
                .join(", ");
              if (fullLocLabel) {
                setPrimaryCity(fullLocLabel);
                setLocDetectedSuccess(true);
              }
            }
          }
        } catch (err) {
          try {
            const ipRes = await fetch("https://ipapi.co/json/");
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              const fullLocLabel = [
                ipData.city,
                ipData.region,
                ipData.country_name,
              ]
                .filter(Boolean)
                .join(", ");
              if (fullLocLabel) {
                setPrimaryCity(fullLocLabel);
                setLocDetectedSuccess(true);
              }
            }
          } catch (e) {}
        } finally {
          setDetectingLoc(false);
        }
      },
      async (err) => {
        console.warn(
          "Browser GPS permission denied, attempting IP location detection:",
          err.message,
        );
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            const fullLocLabel = [
              ipData.city,
              ipData.region,
              ipData.country_name,
            ]
              .filter(Boolean)
              .join(", ");
            if (fullLocLabel) {
              setPrimaryCity(fullLocLabel);
              setLocDetectedSuccess(true);
            }
          }
        } catch (e) {}
        setDetectingLoc(false);
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  const loadData = async () => {
    if (!session || !workspaceId) return;
    try {
      const data = await fetchApi<any>("/api/business-context", {
        session,
        workspaceId,
      });
      if (data && data.resolvedContext) {
        const rc = data.resolvedContext;
        setCompanyName(rc.companyName || "");
        setIndustry(rc.industry || "");
        setBusinessType(rc.businessType || "");
        setProducts(rc.products || []);
        setBusinessSize(rc.businessSize || "SMALL");
        setOperatingScope(rc.operatingScope || "LOCAL");
        setPrimaryCity(
          rc.primaryLocation?.city || rc.primaryLocation?.label || "",
        );
        setLocalSearchRadius(rc.localSearchRadius || 20);
        setPrimaryGoals(rc.primaryGoals || ["Find Local Customers"]);
        setTargetBuyerProfiles(rc.targetBuyerProfiles || []);
        setAiSuggestions(data.profile?.aiSuggestions || null);
      }
    } catch (err) {
      console.warn("Failed to load business profile:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStepIndex(1);
    }
  }, [isOpen, session, workspaceId]);

  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const handleRunAIAnalysis = async () => {
    if (!naturalInput.trim()) return;
    setAnalyzing(true);
    setAiSuccessMessage(null);
    try {
      const data = await fetchApi<any>("/api/business-context/analyze", {
        method: "POST",
        session,
        workspaceId,
        body: { text: naturalInput },
      });

      if (data && data.suggestions) {
        const sug = data.suggestions;
        setAiSuggestions(sug);
        if (sug.suggestedCompany && !companyName) {
          setCompanyName(sug.suggestedCompany);
        }
        if (sug.suggestedIndustry) {
          setIndustry(sug.suggestedIndustry);
        }
        if (sug.suggestedBusinessType) {
          setBusinessType(sug.suggestedBusinessType);
        }
        if (sug.suggestedBusinessSize) {
          setBusinessSize(sug.suggestedBusinessSize);
        }
        if (sug.suggestedOperatingScope) {
          setOperatingScope(sug.suggestedOperatingScope);
        }
        if (sug.suggestedProducts && Array.isArray(sug.suggestedProducts) && sug.suggestedProducts.length) {
          setProducts((prev) => {
            const set = new Set([...prev, ...sug.suggestedProducts]);
            return Array.from(set);
          });
        }
        if (sug.suggestedTargetBuyers && Array.isArray(sug.suggestedTargetBuyers) && sug.suggestedTargetBuyers.length) {
          setTargetBuyerProfiles((prev) => {
            const set = new Set([...prev, ...sug.suggestedTargetBuyers]);
            return Array.from(set);
          });
        }
        if (sug.suggestedPrimaryCity) {
          setPrimaryCity(sug.suggestedPrimaryCity);
        }
        setAiSuccessMessage(
          `AI analyzed your description: ${sug.suggestedProducts?.length || 0} products & ${sug.suggestedTargetBuyers?.length || 0} buyer profiles configured!`,
        );
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveConfirmed = async () => {
    setSaving(true);
    try {
      const bodyPayload = {
        companyName: companyName.trim() || "My Business",
        industry: industry.trim() || "General Commerce",
        businessType: businessType.trim() || "Commercial Supplier",
        businessSize,
        operatingScope,
        businessModes:
          operatingScope === "LOCAL" || operatingScope === "CITY"
            ? ["LOCAL_BUSINESS", "B2B"]
            : ["B2B"],
        primaryLocation: primaryCity.trim()
          ? {
              city: primaryCity.trim(),
              label: primaryCity.trim(),
              country: "India",
            }
          : null,
        localSearchRadius,
        products,
        targetBuyerProfiles,
        primaryGoals,
      };

      const data = await fetchApi<any>("/api/business-context", {
        method: "PUT",
        session,
        workspaceId,
        body: bodyPayload,
      });

      if (data && data.success) {
        if (onProfileUpdated) {
          onProfileUpdated(data.resolvedContext, data.strategy);
        }
        onClose();
      }
    } catch (err) {
      console.error("Save confirmed profile failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const addProduct = () => {
    if (!newProduct.trim()) return;
    setProducts((prev) => Array.from(new Set([...prev, newProduct.trim()])));
    setNewProduct("");
  };

  const removeProduct = (idx: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const addBuyer = () => {
    if (!newBuyer.trim()) return;
    setTargetBuyerProfiles((prev) =>
      Array.from(new Set([...prev, newBuyer.trim()])),
    );
    setNewBuyer("");
  };

  const removeBuyer = (idx: number) => {
    setTargetBuyerProfiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleGoal = (goal: string) => {
    setPrimaryGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="">
      <div className="p-1 space-y-5">
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-coral)]/20 to-[var(--color-gold)]/20 flex items-center justify-center text-[var(--color-coral)] border border-[var(--color-coral)]/30">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-[var(--color-ink)] flex items-center gap-2">
                Adaptive Business Intelligence Setup
                <Badge tone="sage" className="text-[10px]">
                  Step {stepIndex} of 6
                </Badge>
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Configures AgentTrust to your exact business size, location, and
                sales strategy.
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: Business Identity */}
        {stepIndex === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-ink)] block mb-1.5">
                Step 1: What is your business?
              </label>
              <textarea
                rows={3}
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                placeholder="e.g., Describe your business, products offered, target buyers, or commercial services..."
                className="w-full p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-coral)] resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
                  Company / Business Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., My Business Name"
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)]"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-[var(--color-ink-faint)] block mb-1">
                  Industry / Category
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Manufacturing, Trading, FMCG, Agriculture, Services"
                  className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)]"
                />
              </div>
            </div>

            {products.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[var(--color-coral)]" />
                    AI Extracted Products & Commodities ({products.length}):
                  </span>
                  <span className="text-[10px] text-[var(--color-ink-faint)]">
                    Ready for B2B buyer discovery
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {products.map((p, idx) => (
                    <Badge
                      key={idx}
                      tone="coral"
                      className="text-xs px-2.5 py-0.5 font-medium flex items-center gap-1"
                    >
                      <span>{p}</span>
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {aiSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-lg bg-[var(--color-sage)]/10 border border-[var(--color-sage)]/30 text-xs font-medium text-[var(--color-sage)] flex items-center gap-2"
              >
                <Check size={14} className="shrink-0 font-bold text-[var(--color-sage)]" />
                <span>{aiSuccessMessage}</span>
              </motion.div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunAIAnalysis}
                disabled={analyzing || !naturalInput.trim()}
                className="cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <Sparkles size={14} className="animate-spin mr-1.5 text-[var(--color-coral)]" />
                    Analyzing Description...
                  </>
                ) : aiSuccessMessage ? (
                  <>
                    <Check size={14} className="mr-1.5 text-[var(--color-sage)] font-bold" />
                    Re-Analyze with AI
                  </>
                ) : (
                  <>
                    <Sparkles
                      size={14}
                      className="mr-1.5 text-[var(--color-gold)]"
                    />
                    Analyze Description with AI
                  </>
                )}
              </Button>
              <Button size="sm" onClick={() => setStepIndex(2)} className="cursor-pointer">
                Next: Products <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Products Offered */}
        {stepIndex === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-ink)] block mb-1">
                Step 2: What products or services do you sell?
              </label>
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                List the primary items NOVA will discover B2B buyers for.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3 min-h-[40px] p-2.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)]">
                {products.length === 0 ? (
                  <span className="text-xs text-[var(--color-ink-faint)] italic">
                    No products added yet. Type below to add.
                  </span>
                ) : (
                  products.map((p, idx) => (
                    <Badge
                      key={idx}
                      tone="neutral"
                      className="text-xs flex items-center gap-1"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => removeProduct(idx)}
                        className="hover:text-red-400 font-bold ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addProduct())
                  }
                  placeholder="e.g., Type product or service name to add..."
                  className="flex-1 h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)]"
                />
                <Button size="sm" variant="secondary" onClick={addProduct}>
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
              <Button variant="ghost" size="sm" onClick={() => setStepIndex(1)}>
                <ChevronLeft size={14} className="mr-1" /> Back
              </Button>
              <Button size="sm" onClick={() => setStepIndex(3)}>
                Next: Business Size <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Business Size */}
        {stepIndex === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-ink)] block mb-1">
                Step 3: How large is your business?
              </label>
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                Sets dashboard simplicity, workflow rules, and approval
                requirements.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: "SOLO",
                    label: "SOLO (1–5 people)",
                    desc: "Simple clean dashboard & direct follow-ups",
                  },
                  {
                    id: "SMALL",
                    label: "SMALL (6–50 people)",
                    desc: "Local & B2B growth with minimal approval",
                  },
                  {
                    id: "MEDIUM",
                    label: "MEDIUM (51–500 people)",
                    desc: "Pipeline CRM & regional outreach",
                  },
                  {
                    id: "LARGE",
                    label: "LARGE (500+ people)",
                    desc: "Enterprise account ICP & strict approvals",
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setBusinessSize(s.id as any)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      businessSize === s.id
                        ? "border-[var(--color-coral)] bg-[var(--color-coral)]/10 ring-1 ring-[var(--color-coral)]"
                        : "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-line-strong)]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--color-ink)]">
                      {s.label}
                    </div>
                    <div className="text-[11px] text-[var(--color-ink-soft)] mt-1">
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
              <Button variant="ghost" size="sm" onClick={() => setStepIndex(2)}>
                <ChevronLeft size={14} className="mr-1" /> Back
              </Button>
              <Button size="sm" onClick={() => setStepIndex(4)}>
                Next: Operating Area <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Operating Scope & Location */}
        {stepIndex === 4 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-ink)] block mb-1">
                Step 4: Where do you operate?
              </label>
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                Determines search radius & geographic discovery layers.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: "LOCAL", label: "LOCAL (Nearby Area)" },
                  { id: "CITY", label: "CITY" },
                  { id: "REGIONAL", label: "REGIONAL" },
                  { id: "NATIONAL", label: "NATIONAL (Country)" },
                  { id: "INTERNATIONAL", label: "INTERNATIONAL" },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setOperatingScope(scope.id as any)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      operatingScope === scope.id
                        ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-white"
                        : "border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>

              {(operatingScope === "LOCAL" || operatingScope === "CITY") && (
                <Card className="p-4 space-y-3 bg-[var(--color-surface-2)]/60">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono text-[var(--color-ink-faint)] block">
                        Primary Operating City / Location
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={detectingLoc}
                        className="text-xs text-[var(--color-coral)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        {detectingLoc ? (
                          <Sparkles size={12} className="animate-spin" />
                        ) : (
                          <MapPin size={12} />
                        )}
                        {detectingLoc
                          ? "Detecting location..."
                          : "📍 Detect My Location Automatically"}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={primaryCity}
                        onChange={(e) => setPrimaryCity(e.target.value)}
                        placeholder="e.g., City, State, Country"
                        className="w-full h-10 px-3 pr-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] font-medium"
                      />
                      {locDetectedSuccess && (
                        <span
                          className="absolute right-2.5 top-2.5 text-xs text-green-500 font-bold"
                          title="Location detected automatically"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-[var(--color-ink-faint)] mb-1">
                      <span>Local Search Radius</span>
                      <span className="text-[var(--color-coral)] font-bold">
                        {localSearchRadius} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={localSearchRadius}
                      onChange={(e) =>
                        setLocalSearchRadius(Number(e.target.value))
                      }
                      className="w-full accent-[var(--color-coral)] cursor-pointer"
                    />
                  </div>
                </Card>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
              <Button variant="ghost" size="sm" onClick={() => setStepIndex(3)}>
                <ChevronLeft size={14} className="mr-1" /> Back
              </Button>
              <Button size="sm" onClick={() => setStepIndex(5)}>
                Next: Primary Goals <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Primary Goals */}
        {stepIndex === 5 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-ink)] block mb-1">
                Step 5: What are your primary growth goals?
              </label>
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                Select all that apply to tailor AI priority actions.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  "Find Local Customers",
                  "Find B2B Buyers",
                  "Automate WhatsApp",
                  "Follow Up with Customers",
                  "Manage Sales Deals",
                  "Find Wholesale Distributors",
                  "Find Bulk Suppliers",
                  "Enterprise Pipeline CRM",
                ].map((goal) => {
                  const active = primaryGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={`p-2.5 rounded-lg border text-xs font-medium text-left cursor-pointer transition-all ${
                        active
                          ? "border-[var(--color-coral)] bg-[var(--color-coral)]/10 text-[var(--color-coral-ink)]"
                          : "border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {goal}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
              <Button variant="ghost" size="sm" onClick={() => setStepIndex(4)}>
                <ChevronLeft size={14} className="mr-1" /> Back
              </Button>
              <Button size="sm" onClick={() => setStepIndex(6)}>
                Next: Review Profile <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: Confirmation Screen (USER CONFIRMED SUMMARY) */}
        {stepIndex === 6 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--color-sage)]/10 border border-[var(--color-sage)]/30 flex items-center gap-3">
              <ShieldCheck
                size={22}
                className="text-[var(--color-sage)] shrink-0"
              />
              <div>
                <div className="text-sm font-semibold text-[var(--color-ink)]">
                  Confirmed Business Profile Ready
                </div>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Your confirmed selections take precedence over AI suggestions.
                </p>
              </div>
            </div>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2">
                <div className="text-base font-bold text-[var(--color-ink)]">
                  {companyName || "My Business"}
                </div>
                <Badge tone="coral" className="text-xs">
                  {businessSize} • {operatingScope}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-ink-faint)] block">
                      Industry:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStepIndex(1)}
                      className="text-[10px] text-[var(--color-coral-ink)] hover:underline font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Food & Agriculture"
                    className="w-full mt-0.5 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-line)] text-xs text-[var(--color-ink)] font-medium"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-ink-faint)] block">
                      Operating City:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStepIndex(4)}
                      className="text-[10px] text-[var(--color-coral-ink)] hover:underline font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <input
                    type="text"
                    value={primaryCity}
                    onChange={(e) => setPrimaryCity(e.target.value)}
                    placeholder="e.g. Ghaziabad, Uttar Pradesh, India"
                    className="w-full mt-0.5 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-line)] text-xs text-[var(--color-ink)] font-medium"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[var(--color-ink-faint)] block mb-1">
                  Products Offered:
                </span>
                <div className="flex flex-wrap gap-1">
                  {products.length === 0 ? (
                    <span className="text-xs text-[var(--color-ink-faint)] italic">
                      None specified
                    </span>
                  ) : (
                    products.map((p) => (
                      <Badge key={p} tone="neutral" className="text-[11px]">
                        {p}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[var(--color-ink-faint)] block mb-1">
                  Target Buyer Profiles:
                </span>
                <div className="flex flex-wrap gap-1">
                  {targetBuyerProfiles.length === 0 ? (
                    <span className="text-xs text-[var(--color-ink-faint)] italic">
                      Derived dynamically by AI
                    </span>
                  ) : (
                    targetBuyerProfiles.map((b) => (
                      <Badge key={b} tone="amber" className="text-[11px]">
                        {b}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
              <Button variant="ghost" size="sm" onClick={() => setStepIndex(1)}>
                <Edit3 size={14} className="mr-1" /> Edit Inputs
              </Button>
              <Button onClick={handleSaveConfirmed} disabled={saving}>
                {saving ? (
                  "Activating Profile..."
                ) : (
                  <>
                    <Check size={16} className="mr-1.5" />
                    Confirm & Activate Business Context
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
