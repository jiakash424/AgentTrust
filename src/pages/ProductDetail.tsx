import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { Button, Card, Badge, Drawer, Toggle } from "../components/ui";
import { NovaMark } from "../components/brand";
import { formatINR } from "../lib/data";
import { fetchApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/cn";

const inputCls =
  "w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] transition-colors focus:outline-none focus:border-[var(--color-line-strong)] focus:bg-[var(--color-surface)]";

function DefRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 py-3",
        !last && "border-b border-[var(--color-line)]",
      )}
    >
      <span className="text-sm text-[var(--color-ink-soft)]">{label}</span>
      <span className="text-sm text-[var(--color-ink)] text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5">
      <div className="label-mono text-[var(--color-ink-faint)]">{label}</div>
      <div className="font-serif text-lg text-[var(--color-ink)] mt-1.5">
        {value}
      </div>
    </div>
  );
}

function ProfileCard({
  header,
  rows,
}: {
  header: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <Card className="p-5">
      <div className="label-mono text-[var(--color-coral-ink)] mb-1">
        {header}
      </div>
      <div>
        {rows.map((r, i) => (
          <DefRow
            key={r.label}
            label={r.label}
            value={r.value}
            last={i === rows.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

const capabilities = [
  "Discoverable",
  "Product Queries",
  "Availability",
  "Quote Requests",
  "Bulk Orders",
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, workspaceId } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [policyOpen, setPolicyOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("250");
  const [maxDiscount, setMaxDiscount] = useState("10");
  const [approval, setApproval] = useState(true);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      await fetchApi(`/api/products/${id}`, {
        session,
        workspaceId: workspaceId || undefined,
        method: "DELETE",
      });
      navigate("/app/products");
    } catch (err) {
      console.error(err);
      alert("Failed to delete product");
    }
  };

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        const data = await fetchApi(`/api/products/${id}`, {
          session,
          workspaceId: workspaceId || undefined,
          cache: "no-store",
        });
        setProduct(data);
      } catch (err) {
        console.error("Failed to load product detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, session, workspaceId]);

  if (loading) {
    return (
      <div className="py-32 text-center text-[var(--color-ink-faint)]">
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-32">
        <h2 className="font-serif text-3xl text-[var(--color-ink)]">
          Product not found
        </h2>
        <p className="text-[var(--color-ink-soft)] mt-2">
          This product may have been removed from the catalog.
        </p>
        <Link to="/app/products" className="mt-6">
          <Button variant="outline">
            <ArrowLeft size={16} />
            Back to products
          </Button>
        </Link>
      </div>
    );
  }

  const minP = Math.round((product.basePrice || 0) * 0.83);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to="/app/products"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors mb-5"
      >
        <ArrowLeft size={16} />
        Products
      </Link>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <h1 className="font-serif text-[2.25rem] leading-[1.05] text-[var(--color-ink)]">
          {product.name}
        </h1>
        <Badge tone="sage" dot>
          Active
        </Badge>
      </div>

      <div className="grid gap-8 grid-cols-1 min-[1000px]:grid-cols-[1fr_320px]">
        {/* LEFT */}
        <div className="space-y-8 min-w-0">
          <Card className="overflow-hidden">
            <div className="aspect-[4/3] bg-[var(--color-bg-sunk)]">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile
              label="Available"
              value={`${product.units?.toLocaleString("en-IN") || 0} units`}
            />
            <Tile label="MOQ" value={`${product.moq || 50} units`} />
            <Tile
              label="Base Price"
              value={formatINR(product.basePrice || 0)}
            />
            <Tile label="Lead Time" value={product.leadTime || "3-5 days"} />
            <Tile
              label="Customization"
              value={product.customization || "Standard printing"}
            />
          </div>

          <div>
            <div className="label-mono text-[var(--color-coral-ink)] mb-2">
              AI COMMERCE PROFILE
            </div>
            <p className="text-[var(--color-ink-soft)] text-[15px] mb-5">
              Structured information that AI buyers can understand.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileCard
                header="PRODUCT"
                rows={[
                  { label: "Material", value: "Standard grade" },
                  { label: "Description", value: product.description || "N/A" },
                  { label: "Category", value: product.category || "General" },
                ]}
              />
              <ProfileCard
                header="COMMERCE"
                rows={[
                  {
                    label: "Base price",
                    value: formatINR(product.basePrice || 0),
                  },
                  {
                    label: "Tier 500+",
                    value: formatINR(
                      Math.round((product.basePrice || 0) * 0.94),
                    ),
                  },
                  { label: "Currency", value: "INR (₹)" },
                  { label: "Payment terms", value: "50% advance, net 30" },
                ]}
              />
              <ProfileCard
                header="FULFILLMENT"
                rows={[
                  {
                    label: "Delivery regions",
                    value: "Pan-India, select export",
                  },
                  { label: "Packaging", value: "Recyclable, brandable" },
                  { label: "Lead time", value: product.leadTime || "3-5 days" },
                  { label: "MOQ", value: `${product.moq || 50} units` },
                ]}
              />
              <ProfileCard
                header="POLICIES"
                rows={[
                  { label: "Returns", value: "7-day defect replacement" },
                  { label: "Warranty", value: "12 months manufacturing" },
                  { label: "Negotiation allowed", value: "Yes, within policy" },
                  {
                    label: "Customization",
                    value: product.customization || "Standard",
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* RIGHT rail */}
        <div className="space-y-4 min-[1000px]:sticky min-[1000px]:top-6 min-[1000px]:self-start">
          <Card className="p-5">
            <div className="label-mono text-[var(--color-ink-faint)] mb-4">
              AI STATUS
            </div>
            <ul className="space-y-3">
              {capabilities.map((c) => (
                <li key={c} className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)] shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="text-sm text-[var(--color-ink)]">{c}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="label-mono text-[var(--color-ink-faint)] mb-4">
              Negotiation policy
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-soft)]">Base Price</span>
                <span className="font-serif text-[var(--color-ink)]">
                  {formatINR(product.basePrice || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-soft)]">
                  Minimum Price
                </span>
                <span className="font-serif text-[var(--color-ink)]">
                  {formatINR(minP)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-soft)]">
                  Maximum Discount
                </span>
                <span className="font-serif text-[var(--color-ink)]">10%</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setPolicyOpen(true)}
            >
              Edit Policy
            </Button>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={() =>
              navigate(
                `/app?q=${encodeURIComponent(`What should I do to grow my sales for ${product.name}?`)}`,
              )
            }
          >
            <NovaMark size={18} />
            Ask NOVA about this product
          </Button>

          <Button
            className="w-full !bg-white !text-[#ef4444] border !border-[#ef4444] hover:!bg-[#fef2f2]"
            size="lg"
            onClick={handleDelete}
          >
            Delete Product
          </Button>
        </div>
      </div>

      <Drawer
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="Negotiation policy"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPolicyOpen(false);
          }}
          className="space-y-6"
        >
          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Minimum price (₹)
            </label>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-mono text-[var(--color-ink-faint)] block mb-2">
              Maximum discount (%)
            </label>
            <input
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-[var(--color-line)]">
            <div>
              <div className="text-sm text-[var(--color-ink)] font-medium">
                Require approval
              </div>
              <div className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
                Ask before NOVA closes below minimum.
              </div>
            </div>
            <Toggle checked={approval} onChange={setApproval} />
          </div>
          <Button type="submit" className="w-full">
            Save policy
          </Button>
        </form>
      </Drawer>
    </motion.div>
  );
}
