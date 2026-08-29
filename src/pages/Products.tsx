import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Plus,
  Search,
  ChevronRight,
  PackageSearch,
  Upload,
  Pencil,
  Trash2,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const currentForm = { ...form };
    setAddOpen(false);
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

    try {
      await fetchApi("/api/products", {
        session,
        workspaceId: workspaceId || undefined,
        method: "POST",
        body: currentForm,
      });
      fetchProducts();
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
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-card overflow-hidden">
          {/* Header row (desktop) */}
          <div className="hidden md:grid grid-cols-[auto_1fr_140px_150px_140px_auto] items-center gap-4 px-5 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
            <span className="label-mono text-[var(--color-ink-faint)] w-14">
              Item
            </span>
            <span className="label-mono text-[var(--color-ink-faint)]">
              Product
            </span>
            <span className="label-mono text-[var(--color-ink-faint)]">
              Availability
            </span>
            <span className="label-mono text-[var(--color-ink-faint)]">
              Target Price
            </span>
            <span className="label-mono text-[var(--color-ink-faint)]">
              AI Status
            </span>
            <span className="label-mono text-[var(--color-ink-faint)] text-right">
              Actions
            </span>
          </div>

          {filtered.map((p, i) => {
            const badge =
              statusBadge[p.status as AiStatus] || statusBadge["ai-ready"];
            const displayUnit = p.unit || "Quintal";
            const displayPrice = p.targetSellingPrice || p.basePrice || 2800;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.04,
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  to={`/app/products/${p.id}`}
                  className={cn(
                    "group grid md:grid-cols-[auto_1fr_140px_150px_140px_auto] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-surface-2)] cursor-pointer block",
                    i !== filtered.length - 1 &&
                      "border-b border-[var(--color-line)]",
                  )}
                >
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

                  <div className="min-w-0">
                    <div className="font-medium text-[var(--color-ink)] truncate group-hover:text-[var(--color-coral-ink)] transition-colors">
                      {p.name}
                    </div>
                    <div className="label-mono text-[var(--color-ink-faint)] mt-1">
                      {p.category}
                    </div>
                    {/* mobile meta */}
                    <div className="md:hidden mt-2 flex items-center gap-3 text-[13px] text-[var(--color-ink-soft)]">
                      <span>
                        {p.units?.toLocaleString("en-IN") || 0} {displayUnit}
                      </span>
                      <span className="text-[var(--color-line-strong)]">·</span>
                      <span className="font-serif">
                        ₹{displayPrice.toLocaleString("en-IN")} / {displayUnit}
                      </span>
                    </div>
                    <div className="md:hidden mt-2">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                  </div>

                  <div className="hidden md:block text-[var(--color-ink-soft)] text-sm font-medium">
                    {p.units?.toLocaleString("en-IN") || 0} {displayUnit}
                  </div>
                  <div className="hidden md:block font-serif text-[var(--color-ink)] text-[15px] font-bold">
                    ₹{displayPrice.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-sans font-normal text-[var(--color-ink-faint)]">
                      / {displayUnit}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => openEditModal(p, e)}
                      className="p-2 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-[var(--color-line)]"
                      title="Edit product values"
                    >
                      <Pencil size={13} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-red-500/20"
                      title="Delete product"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight
                      size={16}
                      className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-ink)] transition-colors ml-1"
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
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
    </PageFade>
  );
}
