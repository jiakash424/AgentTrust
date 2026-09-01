import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  ChevronRight,
  PackageSearch,
  Upload,
  Pencil,
  Trash2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import {
  Button,
  Badge,
  Modal,
  Segmented,
  PageHeader,
  PageFade,
} from "../components/ui";
import { formatINR, type AiStatus } from "../lib/data";
import { cn } from "../lib/cn";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const statusBadge: Record<
  AiStatus,
  { tone: "sage" | "amber" | "rose" | "neutral"; label: string }
> = {
  "ai-ready": { tone: "sage", label: "AI READY" },
  "needs-attention": { tone: "amber", label: "NEEDS ATTENTION" },
  "low-stock": { tone: "rose", label: "LOW STOCK" },
  draft: { tone: "neutral", label: "DRAFT" },
};

const filters = [
  { id: "all", label: "All" },
  { id: "ai-ready", label: "AI Ready" },
  { id: "needs-attention", label: "Needs Attention" },
  { id: "low-stock", label: "Low Stock" },
  { id: "draft", label: "Draft" },
];

const inputCls =
  "w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus:outline-none focus:border-[var(--color-line-strong)] focus:bg-[var(--color-surface)]";

export default function Products() {
  const navigate = useNavigate();
  const { session, workspaceId } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "Quintal",
    units: "500",
    price: "",
    costPrice: "",
    minSellingPrice: "",
    targetSellingPrice: "",
    logisticsCostPerUnit: "",
    sku: "",
  });

  const fetchProducts = async () => {
    try {
      const data = await fetchApi<any[]>("/api/products", {
        session,
        workspaceId: workspaceId || undefined,
        cache: "no-store",
      });
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [session, workspaceId]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = p.name
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      const matchesFilter = filter === "all" || p.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter, products]);

  function clearFilters() {
    setQuery("");
    setFilter("all");
  }

  const [discoveryToast, setDiscoveryToast] = useState<{
    productName: string;
    stage: "discovering" | "completed";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const currentForm = { ...form };
    const addedProdName = currentForm.name.trim();
    setAddOpen(false);
    setForm({
      name: "",
      category: "",
      unit: "kg",
      units: "500",
      price: "",
      costPrice: "",
      minSellingPrice: "",
      targetSellingPrice: "",
      logisticsCostPerUnit: "",
      sku: "",
    });

    try {
      await fetchApi("/api/products", {
        session,
        workspaceId: workspaceId || undefined,
        method: "POST",
        body: currentForm,
      });
      fetchProducts();

      // Launch rich autonomous discovery notification
      setDiscoveryToast({
        productName: addedProdName,
        stage: "discovering",
      });

      setTimeout(() => {
        setDiscoveryToast({
          productName: addedProdName,
          stage: "completed",
        });
      }, 3500);

      setTimeout(() => {
        setDiscoveryToast(null);
      }, 8000);
    } catch (err: any) {
      console.error("Failed to add product:", err);
      alert(err.message || "Failed to add product. Please try again.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const prodId = editingProduct.id;
    const currentForm = { ...form };
    setEditingProduct(null);

    try {
      await fetchApi(`/api/products/${prodId}`, {
        session,
        workspaceId: workspaceId || undefined,
        method: "PUT",
        body: currentForm,
      });
      fetchProducts();
    } catch (err: any) {
      console.error("Failed to update product:", err);
      alert(err.message || "Failed to update product.");
    }
  };

  const openEditModal = (p: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProduct(p);
    setForm({
      name: p.name || "",
      category: p.category || "",
      unit: p.unit || "Quintal",
      units: p.units !== undefined ? String(p.units) : "500",
      price: p.basePrice ? String(p.basePrice) : "",
      costPrice: p.costPrice ? String(p.costPrice) : "",
      minSellingPrice: p.minSellingPrice ? String(p.minSellingPrice) : "",
      targetSellingPrice: p.targetSellingPrice
        ? String(p.targetSellingPrice)
        : "",
      logisticsCostPerUnit: p.logisticsCostPerUnit
        ? String(p.logisticsCostPerUnit)
        : "",
      sku: p.sku || "",
    });
  };

  const handleDelete = async (pId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await fetchApi(`/api/products/${pId}`, {
        session,
        workspaceId: workspaceId || undefined,
        method: "DELETE",
      });
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    setAddOpen(false);

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length >= 1 && cols[0]) {
        try {
          await fetchApi("/api/products", {
            session,
            workspaceId: workspaceId || undefined,
            method: "POST",
            body: JSON.stringify({
              name: cols[0],
              category: cols[1] || "General",
              units: cols[2] || "500",
              price: cols[3] || "2800",
              unit: cols[4] || "Quintal",
            }),
          });
          fetchProducts();
        } catch (err) {
          console.error("Failed to add", cols[0], err);
        }
      }
    }
  };

  return (
    <PageFade>
      <PageHeader
        eyebrow="CATALOG"
        title="Products"
        subtitle="The products NOVA understands and represents"
        actions={
          <Button
            onClick={() => {
              setForm({
                name: "",
                category: "",
                unit: "Quintal",
                units: "500",
                price: "",
                costPrice: "",
                minSellingPrice: "",
                targetSellingPrice: "",
                logisticsCostPerUnit: "",
                sku: "",
              });
              setAddOpen(true);
            }}
          >
            <Plus size={16} />
            Add Product
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className={cn(inputCls, "pl-10")}
          />
        </div>
        <Segmented options={filters} value={filter} onChange={setFilter} />
      </div>

      {loading ? (
        <div className="py-24 text-center text-[var(--color-ink-faint)]">
          Loading products...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-bg-sunk)] text-[var(--color-ink-faint)] mb-5">
            <PackageSearch size={26} />
          </div>
          <h3 className="font-serif text-2xl text-[var(--color-ink)]">
            No products here
          </h3>
          <p className="text-[var(--color-ink-soft)] mt-2 max-w-sm text-[15px]">
            No real data yet. Add products to your catalog to use them in
            workflows.
          </p>
          <Button variant="outline" className="mt-6" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-card overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[740px]">
            <colgroup>
              <col style={{ width: "76px" }} />
              <col />
              <col style={{ width: "135px" }} />
              <col style={{ width: "155px" }} />
              <col style={{ width: "135px" }} />
              <col style={{ width: "145px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
                <th className="py-3.5 pl-5 pr-2 text-left label-mono text-[var(--color-ink-faint)] font-medium">
                  Item
                </th>
                <th className="py-3.5 px-3 text-left label-mono text-[var(--color-ink-faint)] font-medium">
                  Product
                </th>
                <th className="py-3.5 px-3 text-right label-mono text-[var(--color-ink-faint)] font-medium">
                  Availability
                </th>
                <th className="py-3.5 px-3 text-right label-mono text-[var(--color-ink-faint)] font-medium">
                  Target Price
                </th>
                <th className="py-3.5 px-3 text-center label-mono text-[var(--color-ink-faint)] font-medium">
                  AI Status
                </th>
                <th className="py-3.5 pl-3 pr-5 text-right label-mono text-[var(--color-ink-faint)] font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {filtered.map((p, i) => {
                const badge =
                  statusBadge[p.status as AiStatus] || statusBadge["ai-ready"];
                const displayUnit =
                  p.unit && !/^\d+$/.test(String(p.unit).trim())
                    ? p.unit
                    : "kg";
                const displayPrice = p.targetSellingPrice || p.basePrice || 38;

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/app/products/${p.id}`)}
                    className="group hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                  >
                    {/* Column 1: Item Thumbnail */}
                    <td className="py-4 pl-5 pr-2 align-middle">
                      <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--color-bg-sunk)] overflow-hidden shrink-0">
                        <img
                          src={
                            p.image ||
                            `https://loremflickr.com/200/200/product,${encodeURIComponent(p.name.split(" ")[0] || "box")}`
                          }
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </td>

                    {/* Column 2: Product Title & Category */}
                    <td className="py-4 px-3 align-middle">
                      <div className="font-medium text-[var(--color-ink)] truncate group-hover:text-[var(--color-coral-ink)] transition-colors">
                        {p.name}
                      </div>
                      <div className="label-mono text-[var(--color-ink-faint)] mt-1 truncate">
                        {p.category}
                      </div>
                    </td>

                    {/* Column 3: Availability (Strict Right Align) */}
                    <td className="py-4 px-3 align-middle text-right text-[var(--color-ink-soft)] text-sm font-medium tabular-nums whitespace-nowrap">
                      {p.units?.toLocaleString("en-IN") || 0} {displayUnit}
                    </td>

                    {/* Column 4: Target Price (Strict Right Align) */}
                    <td className="py-4 px-3 align-middle text-right font-serif text-[var(--color-ink)] text-[15px] font-bold tabular-nums whitespace-nowrap">
                      ₹{displayPrice.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-sans font-normal text-[var(--color-ink-faint)]">
                        / {displayUnit}
                      </span>
                    </td>

                    {/* Column 5: AI Status (Strict Center Align) */}
                    <td className="py-4 px-3 align-middle text-center">
                      <div className="inline-flex justify-center items-center">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </div>
                    </td>

                    {/* Column 6: Actions (Strict Right Align & Baseline Aligned) */}
                    <td
                      className="py-4 pl-3 pr-5 align-middle text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => openEditModal(p, e)}
                          className="p-2 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium border border-[var(--color-line)]"
                          title="Edit product values"
                        >
                          <Pencil size={13} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium border border-red-500/20"
                          title="Delete product"
                        >
                          <Trash2 size={13} />
                        </button>
                        <Link
                          to={`/app/products/${p.id}`}
                          className="p-1.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors inline-flex items-center"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Product Commercial Profile"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Upload CSV/TXT File
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 h-11 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-dashed border-[var(--color-line-strong)] text-[var(--color-ink-soft)] text-sm transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)]">
                <Upload size={16} />
                <span>
                  Select a file (CSV: Name, Category, Units, Price, Unit)
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <div className="text-center text-[var(--color-ink-faint)] text-xs mt-3 uppercase tracking-wider font-semibold">
              OR ADD MANUALLY
            </div>
          </div>

          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Product Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter product or service name (e.g., Wheat, Atta, Industrial Fittings)"
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Food & Agriculture"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Commercial Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={inputCls}
              >
                <option value="Quintal">Quintal</option>
                <option value="Kg">Kg</option>
                <option value="Ton">Ton</option>
                <option value="Piece">Piece</option>
                <option value="Box">Box</option>
                <option value="Liter">Liter</option>
                <option value="Unit">Unit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Cost Price (₹)
              </label>
              <input
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                placeholder="2600"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Min Price (₹)
              </label>
              <input
                value={form.minSellingPrice}
                onChange={(e) =>
                  setForm({ ...form, minSellingPrice: e.target.value })
                }
                placeholder="2550"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Target Price (₹)
              </label>
              <input
                value={form.targetSellingPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    targetSellingPrice: e.target.value,
                    price: e.target.value,
                  })
                }
                placeholder="2700"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Available Stock Quantity
            </label>
            <input
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
              placeholder="500"
              inputMode="numeric"
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Plus size={16} />
              Add Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        open={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title="Edit Product Commercial Profile"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Product Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Wheat Flour"
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Food & Agriculture"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Commercial Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={inputCls}
              >
                <option value="Quintal">Quintal</option>
                <option value="Kg">Kg</option>
                <option value="Ton">Ton</option>
                <option value="Piece">Piece</option>
                <option value="Box">Box</option>
                <option value="Liter">Liter</option>
                <option value="Unit">Unit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Cost Price (₹)
              </label>
              <input
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                placeholder="2600"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Min Price (₹)
              </label>
              <input
                value={form.minSellingPrice}
                onChange={(e) =>
                  setForm({ ...form, minSellingPrice: e.target.value })
                }
                placeholder="2550"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
                Target Price (₹)
              </label>
              <input
                value={form.targetSellingPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    targetSellingPrice: e.target.value,
                    price: e.target.value,
                  })
                }
                placeholder="2700"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Available Stock Quantity
            </label>
            <input
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
              placeholder="500"
              inputMode="numeric"
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProduct(null)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Pencil size={16} />
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Autonomous Opportunity Discovery Floating Toast */}
      <AnimatePresence>
        {discoveryToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-[var(--color-surface)]/95 backdrop-blur-md border border-[var(--color-coral)]/40 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-coral)]/20 to-[var(--color-gold)]/20 flex items-center justify-center text-[var(--color-coral)] shrink-0 border border-[var(--color-coral)]/30">
              {discoveryToast.stage === "discovering" ? (
                <Sparkles size={20} className="animate-spin text-[var(--color-coral)]" />
              ) : (
                <CheckCircle2 size={22} className="text-[var(--color-sage)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  {discoveryToast.stage === "discovering"
                    ? "🚀 Autonomous Buyer Discovery Started"
                    : "✓ Opportunities Discovered & Populated!"}
                </span>
                <button
                  type="button"
                  onClick={() => setDiscoveryToast(null)}
                  className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[12px] text-[var(--color-ink-soft)] mt-0.5 leading-snug">
                {discoveryToast.stage === "discovering"
                  ? `NOVA AI is scanning regional B2B markets & finding verified buyers for "${discoveryToast.productName}"...`
                  : `Verified commercial buyer accounts have been saved to your Opportunities section.`}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-coral)]/10 text-[var(--color-coral-ink)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-coral)] animate-pulse" />
                  Background Agent Active
                </span>
                {discoveryToast.stage === "completed" && (
                  <Link
                    to="/app/opportunities"
                    className="text-[11px] font-semibold text-[var(--color-coral-ink)] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    View Opportunities <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageFade>
  );
}
