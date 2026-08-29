import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { autonomousCatalogDiscoveryService } from "../services/autonomous-catalog-discovery.service";

const router = Router();

function parseNullableFloat(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = parseFloat(String(val).trim());
  return isNaN(num) ? null : num;
}

function parseNullableInt(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  const num = parseInt(String(val).trim(), 10);
  return isNaN(num) ? fallback : num;
}

// GET /api/products - Fetch all products for the workspace
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id - Fetch a single product
router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        workspaceId: req.workspaceId,
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// DELETE /api/products/:id - Delete a product
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Delete related inventory items first
    await prisma.inventoryItem.deleteMany({
      where: { productId: req.params.id },
    });

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// DELETE /api/products - Clear all products & inventory items for workspace
router.delete("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    await prisma.inventoryItem.deleteMany({ where: { workspaceId } });
    await prisma.product.deleteMany({ where: { workspaceId } });
    res.json({
      success: true,
      message: "Product inventory cleared successfully",
    });
  } catch (error: any) {
    console.error("Failed to clear product inventory:", error);
    res.status(500).json({ error: "Failed to clear product inventory" });
  }
});

// POST /api/products - Create a new product with commercial pricing profile
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const {
      name,
      category,
      units,
      price,
      costPrice,
      minSellingPrice,
      targetSellingPrice,
      maxDiscountPercent,
      logisticsCostPerUnit,
      sku,
      unit,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const trimmedName = name.trim();
    const parsedUnits = parseNullableInt(units, 500);
    const parsedCostPrice = parseNullableFloat(costPrice);
    const parsedMinPrice = parseNullableFloat(minSellingPrice);
    const parsedTargetPrice =
      parseNullableFloat(targetSellingPrice) || parseNullableFloat(price);
    const parsedBasePrice = parseNullableFloat(price) || parsedTargetPrice;
    const parsedMaxDiscount = parseNullableFloat(maxDiscountPercent);
    const parsedLogisticsCost = parseNullableFloat(logisticsCostPerUnit);

    let imageUrl = `https://loremflickr.com/800/800/product,${encodeURIComponent(trimmedName.split(" ")[0] || "product")}`;

    try {
      if (process.env.PEXELS_API_KEY) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const pexelsRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(trimmedName)}&per_page=1`,
          {
            headers: { Authorization: process.env.PEXELS_API_KEY as string },
            signal: controller.signal,
          },
        ).finally(() => clearTimeout(timeoutId));

        if (pexelsRes.ok) {
          const data = await pexelsRes.json();
          if (data.photos && data.photos.length > 0) {
            imageUrl = data.photos[0].src.large;
          }
        }
      }
    } catch (err) {}

    const newProduct = await prisma.product.create({
      data: {
        workspace: { connect: { id: req.workspaceId } },
        name: trimmedName,
        category: category || "General",
        units: parsedUnits,
        basePrice: parsedBasePrice,
        costPrice: parsedCostPrice,
        minSellingPrice: parsedMinPrice,
        targetSellingPrice: parsedTargetPrice,
        maxDiscountPercent: parsedMaxDiscount,
        logisticsCostPerUnit: parsedLogisticsCost,
        sku: sku || null,
        unit: unit || "Quintal",
        image: imageUrl,
        status: "ai-ready",
      },
    });

    // Create corresponding InventoryItem
    try {
      await prisma.inventoryItem.create({
        data: {
          workspaceId: req.workspaceId,
          productId: newProduct.id,
          quantity: parsedUnits,
        },
      });
    } catch (invErr) {
      console.warn("Inventory item creation non-fatal error:", invErr);
    }

    // Trigger Autonomous Hermes Opportunity Discovery
    autonomousCatalogDiscoveryService
      .triggerCatalogDiscovery(req.workspaceId, {
        productId: newProduct.id,
        reason: "PRODUCT_CREATED",
        force: true,
      })
      .catch(console.error);

    res.json(newProduct);
  } catch (error: any) {
    console.error("Failed to create product:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create product" });
  }
});

// PUT /api/products/:id - Update product commercial profile
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      units,
      price,
      costPrice,
      minSellingPrice,
      targetSellingPrice,
      maxDiscountPercent,
      logisticsCostPerUnit,
      sku,
      unit,
    } = req.body;

    const parsedUnits =
      units !== undefined ? parseNullableInt(units, 0) : undefined;
    const parsedCostPrice =
      costPrice !== undefined ? parseNullableFloat(costPrice) : undefined;
    const parsedMinPrice =
      minSellingPrice !== undefined
        ? parseNullableFloat(minSellingPrice)
        : undefined;
    const parsedTargetPrice =
      targetSellingPrice !== undefined
        ? parseNullableFloat(targetSellingPrice)
        : undefined;
    const parsedBasePrice =
      price !== undefined ? parseNullableFloat(price) : undefined;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category } : {}),
        ...(parsedUnits !== undefined ? { units: parsedUnits } : {}),
        ...(parsedBasePrice !== undefined
          ? { basePrice: parsedBasePrice }
          : {}),
        ...(parsedCostPrice !== undefined
          ? { costPrice: parsedCostPrice }
          : {}),
        ...(parsedMinPrice !== undefined
          ? { minSellingPrice: parsedMinPrice }
          : {}),
        ...(parsedTargetPrice !== undefined
          ? { targetSellingPrice: parsedTargetPrice }
          : {}),
        ...(maxDiscountPercent !== undefined
          ? { maxDiscountPercent: parseNullableFloat(maxDiscountPercent) }
          : {}),
        ...(logisticsCostPerUnit !== undefined
          ? { logisticsCostPerUnit: parseNullableFloat(logisticsCostPerUnit) }
          : {}),
        ...(sku ? { sku } : {}),
        ...(unit ? { unit } : {}),
      },
    });

    if (parsedUnits !== undefined) {
      try {
        await prisma.inventoryItem.updateMany({
          where: { productId: id, workspaceId: req.workspaceId },
          data: { quantity: parsedUnits },
        });
      } catch (invErr) {}
    }

    // Trigger Autonomous Hermes Opportunity Discovery
    autonomousCatalogDiscoveryService
      .triggerCatalogDiscovery(req.workspaceId, {
        productId: updated.id,
        reason: "PRODUCT_UPDATED",
      })
      .catch(console.error);

    res.json(updated);
  } catch (error: any) {
    console.error("Failed to update product:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to update product" });
  }
});

export default router;
