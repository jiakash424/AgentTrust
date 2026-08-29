#!/usr/bin/env node
/**
 * AgentTrust MCP Server
 *
 * Exposes robust, typed tools over the Model Context Protocol
 * (stdio transport) with parameter normalization (supports camelCase,
 * snake_case, ID aliases, and name lookups).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new McpServer({
  name: "agenttrust",
  version: "1.0.0",
});

// Helper to resolve workspace
async function resolveWorkspace(workspaceId?: string) {
  if (workspaceId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { businessProfile: true },
    });
    if (ws) return ws;
  }
  return await prisma.workspace.findFirst({
    include: { businessProfile: true },
  });
}

// ─── READ TOOLS ──────────────────────────────────────────────────────────

server.tool(
  "get_business_context",
  "Get the seller's business profile — company name, location, industry, and operating details for the current workspace.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const bp = ws.businessProfile;
    const products = await prisma.product.findMany({
      where: { workspaceId: ws.id },
      select: { category: true, name: true },
    });
    const categories = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ];

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              workspaceId: ws.id,
              companyName: bp?.companyName || ws.name,
              industry: bp?.industry || "B2B Wholesale",
              location: (bp?.primaryLocation as any)?.city || "India",
              description: bp?.businessDescription || null,
              totalProducts: products.length,
              productNames: products.map((p) => p.name).slice(0, 10),
              productCategories: categories,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "get_products",
  "List products in the seller's inventory. Returns name, category, stock, prices. Use to understand the catalog before advising.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
    limit: z.number().optional().default(50).describe("Max products to return"),
    category: z.string().optional().describe("Filter by category"),
    search: z.string().optional().describe("Search product by name"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const where: any = { workspaceId: ws.id };
    if (args.category)
      where.category = { contains: args.category, mode: "insensitive" };
    if (args.search)
      where.name = { contains: args.search, mode: "insensitive" };

    const products = await prisma.product.findMany({
      where,
      take: args.limit || 50,
      orderBy: { name: "asc" },
    });

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      units: p.units,
      unit: p.unit,
      costPrice: p.costPrice,
      basePrice: p.basePrice,
      targetSellingPrice: p.targetSellingPrice,
      minSellingPrice: p.minSellingPrice,
      maxDiscountPercent: p.maxDiscountPercent,
      description: p.description?.substring(0, 200),
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: data.length, products: data }, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "get_product",
  "Get full details for a specific product by ID or name.",
  {
    productId: z.string().optional().describe("Product ID"),
    id: z.string().optional().describe("Product ID alias"),
    product_id: z.string().optional().describe("Product ID alias"),
    name: z.string().optional().describe("Product name to look up"),
  },
  async (args) => {
    const prodId = args.productId || args.id || args.product_id;
    let p = null;
    if (prodId) {
      p = await prisma.product.findUnique({ where: { id: prodId } });
    }
    if (!p && args.name) {
      p = await prisma.product.findFirst({
        where: { name: { contains: args.name, mode: "insensitive" } },
      });
    }

    if (!p)
      return {
        content: [{ type: "text" as const, text: "Product not found." }],
      };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: p.id,
              name: p.name,
              category: p.category,
              sku: p.sku,
              unit: p.unit,
              units: p.units,
              costPrice: p.costPrice,
              basePrice: p.basePrice,
              targetSellingPrice: p.targetSellingPrice,
              minSellingPrice: p.minSellingPrice,
              maxDiscountPercent: p.maxDiscountPercent,
              description: p.description,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "get_opportunities",
  "List discovered buyer opportunities. Returns company name, location, score, status, and category.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
    limit: z.number().optional().default(20).describe("Max opportunities"),
    status: z.string().optional().describe("Filter by verification status"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const where: any = { workspaceId: ws.id };
    if (args.status) where.verificationStatus = args.status;

    const opps = await prisma.opportunity.findMany({
      where,
      take: args.limit || 20,
      orderBy: { opportunityScore: "desc" },
    });

    const data = opps.map((o) => ({
      id: o.id,
      companyName: o.companyName,
      city: o.city,
      category: o.category,
      opportunityScore: o.opportunityScore,
      verificationStatus: o.verificationStatus,
      phone: o.phone,
      publicEmail: o.publicEmail,
      website: o.website,
      description: o.description?.substring(0, 150),
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { count: data.length, opportunities: data },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "get_opportunity",
  "Get full details for a specific opportunity by ID or company name, including sources and verified facts.",
  {
    opportunityId: z.string().optional().describe("Opportunity ID"),
    id: z.string().optional().describe("Opportunity ID alias"),
    opportunity_id: z.string().optional().describe("Opportunity ID alias"),
    companyName: z
      .string()
      .optional()
      .describe("Opportunity company name to look up"),
    company_name: z
      .string()
      .optional()
      .describe("Opportunity company name alias"),
  },
  async (args) => {
    const oppId = args.opportunityId || args.id || args.opportunity_id;
    const cName = args.companyName || args.company_name;

    let o = null;
    if (oppId) {
      o = await prisma.opportunity.findUnique({
        where: { id: oppId },
        include: { sources: true },
      });
    }

    if (!o && cName) {
      o = await prisma.opportunity.findFirst({
        where: {
          OR: [
            { companyName: { contains: cName, mode: "insensitive" } },
            { title: { contains: cName, mode: "insensitive" } },
          ],
        },
        include: { sources: true },
      });
    }

    if (!o)
      return {
        content: [
          {
            type: "text" as const,
            text: `Opportunity not found (searched for ID: ${oppId || "none"}, name: ${cName || "none"}).`,
          },
        ],
      };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: o.id,
              companyName: o.companyName,
              title: o.title,
              city: o.city,
              category: o.category,
              opportunityScore: o.opportunityScore,
              verificationStatus: o.verificationStatus,
              phone: o.phone,
              publicEmail: o.publicEmail,
              website: o.website,
              description: o.description,
              verifiedFacts: o.verifiedFacts,
              aiInsights: o.aiInsights,
              sources: o.sources.map((s) => ({
                type: s.sourceType,
                url: s.sourceUrl,
                name: s.sourceName,
              })),
              createdAt: o.createdAt,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "get_leads",
  "List qualified leads in the workspace.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
    limit: z.number().optional().default(20).describe("Max leads"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const leads = await prisma.lead.findMany({
      where: { workspaceId: ws.id },
      take: args.limit || 20,
      orderBy: { createdAt: "desc" },
    });

    const data = leads.map((l) => ({
      id: l.id,
      name: l.name,
      industry: l.industry,
      location: l.location,
      website: l.website,
      publicEmail: l.publicEmail,
      status: l.status,
      matchScore: l.matchScore,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: data.length, leads: data }, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "get_deals",
  "List active deals in the sales pipeline.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
    limit: z.number().optional().default(20).describe("Max deals"),
    stage: z.string().optional().describe("Filter by stage"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const where: any = { workspaceId: ws.id };
    if (args.stage) where.stage = args.stage;

    const deals = await prisma.deal.findMany({
      where,
      take: args.limit || 20,
      orderBy: { lastActivityAt: "desc" },
    });

    const data = deals.map((d) => ({
      id: d.id,
      title: d.title,
      companyName: d.companyName,
      stage: d.stage,
      productName: d.productName,
      estimatedValue: d.estimatedValue,
      matchScore: d.matchScore,
      lastActivityAt: d.lastActivityAt,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: data.length, deals: data }, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "get_sales_metrics",
  "Get aggregated sales metrics: total products, opportunities, leads, deals, pipeline value, and conversion stats.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const [productCount, oppCount, leadCount, dealCount, deals] =
      await Promise.all([
        prisma.product.count({ where: { workspaceId: ws.id } }),
        prisma.opportunity.count({ where: { workspaceId: ws.id } }),
        prisma.lead.count({ where: { workspaceId: ws.id } }),
        prisma.deal.count({ where: { workspaceId: ws.id } }),
        prisma.deal.findMany({
          where: { workspaceId: ws.id },
          select: { stage: true, estimatedValue: true },
        }),
      ]);

    const pipelineValue = deals.reduce(
      (s, d) => s + (d.estimatedValue || 0),
      0,
    );
    const wonDeals = deals.filter((d) => d.stage === "WON").length;
    const conversionRate =
      dealCount > 0 ? Math.round((wonDeals / dealCount) * 100) : 0;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              workspaceId: ws.id,
              totalProducts: productCount,
              totalOpportunities: oppCount,
              totalLeads: leadCount,
              totalDeals: dealCount,
              pipelineValue,
              wonDeals,
              conversionRate: `${conversionRate}%`,
              dealsByStage: deals.reduce((acc: Record<string, number>, d) => {
                acc[d.stage] = (acc[d.stage] || 0) + 1;
                return acc;
              }, {}),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "get_market_prices",
  "Get market price signals for products in the workspace.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
  },
  async (args) => {
    const ws = await resolveWorkspace(args.workspaceId || args.workspace_id);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const obs = await prisma.priceObservation.findMany({
      where: { workspaceId: ws.id },
      take: 20,
      orderBy: { observedAt: "desc" },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              count: obs.length,
              signals: obs.map((s) => ({
                productId: s.productId,
                opportunityId: s.opportunityId,
                price: s.price,
                currency: s.currency,
                unit: s.unit,
                source: s.source,
                confidence: s.confidence,
                observedAt: s.observedAt,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "get_conversation_history",
  "Get recent messages from a conversation.",
  {
    conversationId: z.string().optional().describe("Conversation ID"),
    id: z.string().optional().describe("Conversation ID alias"),
    conversation_id: z.string().optional().describe("Conversation ID alias"),
    limit: z.number().optional().default(20).describe("Max messages"),
  },
  async (args) => {
    const convId = args.conversationId || args.id || args.conversation_id;
    if (!convId)
      return {
        content: [
          { type: "text" as const, text: "conversationId is required." },
        ],
      };

    const msgs = await prisma.conversationMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "desc" },
      take: args.limit || 20,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              count: msgs.length,
              messages: msgs.reverse().map((m) => ({
                role: m.role,
                content: m.content.substring(0, 500),
                createdAt: m.createdAt,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ─── WRITE TOOLS ─────────────────────────────────────────────────────────

server.tool(
  "create_opportunity",
  "Save a newly discovered buyer opportunity to the database. Use after verifying a real buyer through research.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    workspace_id: z.string().optional().describe("Workspace ID alias"),
    companyName: z.string().optional().describe("Company or buyer name"),
    company_name: z.string().optional().describe("Company or buyer name alias"),
    name: z.string().optional().describe("Buyer name alias"),
    city: z.string().optional().describe("City/location"),
    category: z
      .string()
      .optional()
      .default("POTENTIAL_BUYER")
      .describe("POTENTIAL_BUYER, POTENTIAL_SUPPLIER, DISTRIBUTOR"),
    phone: z.string().optional().describe("Public phone number"),
    publicEmail: z.string().optional().describe("Public email"),
    public_email: z.string().optional().describe("Public email alias"),
    email: z.string().optional().describe("Email alias"),
    website: z.string().optional().describe("Website URL"),
    description: z.string().optional().describe("Why this buyer is relevant"),
    opportunityScore: z
      .number()
      .optional()
      .default(80)
      .describe("Confidence score 0-100"),
    verifiedFacts: z
      .array(z.string())
      .optional()
      .describe("Verified facts about the buyer"),
    sourceUrls: z
      .array(z.string())
      .optional()
      .describe("Source URLs for verification"),
  },
  async (params) => {
    const ws = await resolveWorkspace(
      params.workspaceId || params.workspace_id,
    );
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const cName =
      params.companyName ||
      params.company_name ||
      params.name ||
      "Discovered B2B Buyer";
    const email =
      params.publicEmail || params.public_email || params.email || null;

    // Check for duplicate
    const existing = await prisma.opportunity.findFirst({
      where: {
        workspaceId: ws.id,
        companyName: { equals: cName, mode: "insensitive" },
      },
    });

    if (existing) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Opportunity "${cName}" already exists (ID: ${existing.id}).`,
          },
        ],
      };
    }

    const opp = await prisma.opportunity.create({
      data: {
        workspaceId: ws.id,
        companyName: cName,
        city: params.city || null,
        category: params.category || "POTENTIAL_BUYER",
        phone: params.phone || null,
        publicEmail: email,
        website: params.website || null,
        description: params.description || "Discovered by NOVA Agent",
        opportunityScore: params.opportunityScore || 80,
        verifiedFacts: (params.verifiedFacts || []) as any,
        verificationStatus:
          (params.verifiedFacts?.length || 0) > 0 ? "VERIFIED" : "QUALIFIED",
      },
    });

    // Create sources if provided
    if (params.sourceUrls?.length) {
      for (const url of params.sourceUrls) {
        await prisma.opportunitySource.create({
          data: {
            opportunityId: opp.id,
            sourceUrl: url,
            sourceType: "WEB",
            sourceName: "NOVA Agent Research",
          },
        });
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Created opportunity "${cName}" (ID: ${opp.id}, score: ${opp.opportunityScore}).`,
        },
      ],
    };
  },
);

server.tool(
  "update_opportunity",
  "Update an existing opportunity's fields.",
  {
    opportunityId: z.string().optional().describe("Opportunity ID to update"),
    id: z.string().optional().describe("Opportunity ID alias"),
    companyName: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    publicEmail: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    opportunityScore: z.number().optional(),
    verificationStatus: z.string().optional(),
  },
  async (args) => {
    const oppId = args.opportunityId || args.id;
    if (!oppId)
      return {
        content: [
          { type: "text" as const, text: "opportunityId is required." },
        ],
      };

    const updateData: any = {};
    for (const [k, v] of Object.entries(args)) {
      if (k !== "opportunityId" && k !== "id" && v !== undefined)
        updateData[k] = v;
    }

    const opp = await prisma.opportunity.update({
      where: { id: oppId },
      data: updateData,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Updated opportunity "${opp.companyName}" (ID: ${opp.id}).`,
        },
      ],
    };
  },
);

server.tool(
  "create_lead",
  "Create a new qualified lead in the database.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    name: z.string().describe("Lead/company name"),
    industry: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
    publicEmail: z.string().optional(),
    description: z.string().optional(),
    matchScore: z.number().optional().default(70),
  },
  async (params) => {
    const ws = await resolveWorkspace(params.workspaceId);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    const lead = await prisma.lead.create({
      data: {
        workspaceId: ws.id,
        name: params.name,
        industry: params.industry,
        location: params.location,
        website: params.website,
        publicEmail: params.publicEmail,
        description: params.description,
        matchScore: params.matchScore || 70,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Created lead "${lead.name}" (ID: ${lead.id}).`,
        },
      ],
    };
  },
);

server.tool(
  "create_notification",
  "Create a deal activity notification visible in the UI.",
  {
    workspaceId: z.string().optional().describe("Workspace ID"),
    title: z.string().describe("Notification title"),
    type: z
      .string()
      .describe(
        "Activity type: BUYER_DISCOVERED, OPPORTUNITY_CREATED, RESEARCH_COMPLETED, etc.",
      ),
    details: z.string().optional().describe("JSON details string"),
  },
  async (params) => {
    const ws = await resolveWorkspace(params.workspaceId);
    if (!ws)
      return {
        content: [{ type: "text" as const, text: "No workspace found." }],
      };

    await prisma.dealActivity.create({
      data: {
        workspaceId: ws.id,
        title: params.title,
        type: params.type,
        details: params.details ? JSON.parse(params.details) : undefined,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Notification created: "${params.title}"`,
        },
      ],
    };
  },
);

server.tool(
  "save_agent_note",
  "Save an internal research note or finding to a conversation for later reference.",
  {
    conversationId: z.string().describe("Conversation ID"),
    note: z.string().describe("Research note content"),
  },
  async ({ conversationId, note }) => {
    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: "system",
        content: note,
        metadata: { type: "agent_note" } as any,
      },
    });

    return {
      content: [
        {
          type: "text" as const,
          text: "Note saved to conversation.",
        },
      ],
    };
  },
);

// ─── Start server ────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("AgentTrust MCP Server failed:", err);
  process.exit(1);
});
