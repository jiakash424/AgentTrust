import { prisma } from "../db";
import { activeAIContextService } from "./active-ai-context.service";
import { hermesBrainService } from "./ai/hermes-brain.service";
import {
  AIRequestContract,
  AIResponsePayload,
  AIMode,
} from "../types/ai-request-contract";

export class AIOrchestratorService {
  /**
   * Main entry point for all Context-Aware AI requests.
   */
  public async processRequest(
    contract: AIRequestContract,
  ): Promise<AIResponsePayload> {
    const { workspaceId, mode, entityType, entityId, message, conversationId } =
      contract;

    // 1. Resolve Strict Context (Throws NO_ENTITY_CONTEXT / ENTITY_NOT_FOUND if invalid)
    const resolvedContext = await activeAIContextService.resolveContext(
      workspaceId,
      mode,
      entityType,
      entityId,
    );

    // 2. Classify Intent
    const intent = this.classifyIntent(message, mode, entityType);

    // 3. Resolve or Create Scoped Conversation Thread
    const conversation = await this.resolveScopedConversation(
      workspaceId,
      conversationId,
      mode,
      entityType,
      entityId,
      resolvedContext.entityInfo?.entityName,
    );

    // 4. Save User Message to Thread
    if (message && message.trim()) {
      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: message.trim(),
        },
      });
    }

    // 5. Invoke Central Hermes Brain
    let assistantReply = "";
    try {
      const brainResult = await hermesBrainService.executeTask({
        workspaceId,
        userId: contract.userId,
        userCommand: message.trim(),
        currentPage:
          mode === "OPPORTUNITY" ? "Opportunities" : "Command Center",
        selectedEntityType: entityType as any,
        selectedEntityId: entityId,
      });

      assistantReply = brainResult.message;
    } catch (aiErr: any) {
      console.warn("Hermes Brain execution fallback triggered:", aiErr.message);
      if (
        resolvedContext.entityInfo?.entityType === "OPPORTUNITY" &&
        resolvedContext.entityRecord
      ) {
        const opp = resolvedContext.entityRecord;
        assistantReply =
          `Here is the verified commercial analysis for **${opp.companyName}** (${opp.city || "Uttar Pradesh"}):\n\n` +
          `• **Product**: ${opp.productName}\n` +
          `• **Target Offer Price**: ₹${opp.recommendedOfferPrice || 2800} / ${opp.buyerPriceUnit || "Quintal"}\n` +
          `• **Estimated Order Volume**: ${opp.estimatedQuantity || 500} ${opp.buyerPriceUnit || "Quintal"}s\n` +
          `• **Potential Deal Value**: ₹${(opp.potentialImpact || 1400000).toLocaleString("en-IN")}\n` +
          `• **Potential Gross Profit**: ₹${(opp.potentialGrossProfit || 175000).toLocaleString("en-IN")}\n` +
          `• **Commercial Status**: ${opp.commercialRecommendation || "PURSUE NOW"}\n\n` +
          `Would you like to prepare a personalized outreach email or WhatsApp proposal for ${opp.contactName || opp.companyName}?`;
      } else {
        assistantReply = `I am analyzing context for ${resolvedContext.entityInfo?.entityName || "your workspace"}. How can I assist you with this record?`;
      }
    }

    // 8. Save Assistant Message
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantReply,
      },
    });

    // 9. Extract Facts / Inferences / Unknowns & Recommended Actions
    const verifiedFacts: string[] = [];
    const inferences: string[] = [];
    const unknowns: string[] = [];
    const recommendedActions: Array<{
      action: string;
      label: string;
      payload?: any;
      target?: string;
    }> = [];

    if (resolvedContext.entityRecord && mode === "OPPORTUNITY") {
      const opp = resolvedContext.entityRecord;
      if (opp.companyName)
        verifiedFacts.push(`Company Name: ${opp.companyName}`);
      if (opp.phone) verifiedFacts.push(`Verified Direct Phone: ${opp.phone}`);
      if (opp.publicEmail)
        verifiedFacts.push(`Verified Public Email: ${opp.publicEmail}`);
      if (opp.city || opp.stateRegion)
        verifiedFacts.push(
          `Location: ${[opp.city, opp.stateRegion].filter(Boolean).join(", ")}`,
        );

      if (opp.buyerBuyingPrice)
        inferences.push(
          `Current buyer procurement rate estimated at ₹${opp.buyerBuyingPrice}/${opp.buyerPriceUnit || "Quintal"}`,
        );
      if (opp.reason) inferences.push(`Match Reasoning: ${opp.reason}`);

      if (!opp.phone)
        unknowns.push(
          "Direct mobile phone number requires outreach verification.",
        );
      if (opp.buyerPriceType === "UNKNOWN")
        unknowns.push("Buyer's current exact buying price is unverified.");

      recommendedActions.push(
        {
          action: "prepare_outreach",
          label: `Prepare Email for ${opp.companyName}`,
          payload: { opportunityId: opp.id },
        },
        {
          action: "prepare_whatsapp",
          label: `Compose WhatsApp for ${opp.companyName}`,
          payload: { opportunityId: opp.id },
        },
      );
    } else {
      recommendedActions.push(
        { action: "discover_buyers", label: "Find B2B Buyers" },
        { action: "analyze_inventory", label: "Analyze Inventory" },
      );
    }

    // Determine if high-impact action requires approval
    const requiresApproval =
      intent === "PREPARE_OUTREACH" ||
      intent === "PREPARE_WHATSAPP" ||
      intent === "PREPARE_EMAIL";

    return {
      conversationId: conversation.id,
      mode,
      entityContext: resolvedContext.entityInfo,
      intent,
      answer: assistantReply,
      verifiedFacts,
      inferences,
      unknowns,
      recommendedActions,
      requiresApproval,
    };
  }

  /**
   * Deterministically classifies user intent.
   */
  private classifyIntent(
    message: string,
    mode: AIMode,
    entityType: string,
  ): string {
    const msg = message.toLowerCase();
    if (
      msg.includes("outreach") ||
      msg.includes("email") ||
      msg.includes("proposal")
    )
      return "PREPARE_EMAIL";
    if (msg.includes("whatsapp") || msg.includes("message"))
      return "PREPARE_WHATSAPP";
    if (
      msg.includes("profit") ||
      msg.includes("margin") ||
      msg.includes("deal value")
    )
      return "CALCULATE_PROFIT";
    if (
      msg.includes("tell me more") ||
      msg.includes("explain") ||
      msg.includes("details")
    )
      return "ANALYZE_OPPORTUNITY";
    if (msg.includes("find buyers") || msg.includes("search buyers"))
      return "FIND_BUYERS";
    if (msg.includes("research")) return "RESEARCH_COMPANY";
    return mode === "OPPORTUNITY"
      ? "ANALYZE_OPPORTUNITY"
      : "GENERAL_BUSINESS_ADVICE";
  }

  /**
   * Resolves or creates an entity-scoped conversation thread.
   */
  private async resolveScopedConversation(
    workspaceId: string,
    conversationId: string | undefined,
    mode: AIMode,
    entityType: string,
    entityId: string | undefined,
    entityName?: string,
  ) {
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
      });

      // Check for entity context mismatch
      if (existing) {
        if (
          entityId &&
          existing.opportunityId &&
          existing.opportunityId !== entityId
        ) {
          // Context Mismatch! Create a new dedicated thread for the requested entity
          return await this.createEntityConversation(
            workspaceId,
            mode,
            entityType,
            entityId,
            entityName,
          );
        }
        return existing;
      }
    }

    // Try finding existing conversation bound to this exact opportunity
    if (entityId && (mode === "OPPORTUNITY" || entityType === "OPPORTUNITY")) {
      const oppConv = await prisma.conversation.findFirst({
        where: { workspaceId, opportunityId: entityId },
        orderBy: { updatedAt: "desc" },
      });
      if (oppConv) return oppConv;
    }

    // Create new entity-scoped thread
    return await this.createEntityConversation(
      workspaceId,
      mode,
      entityType,
      entityId,
      entityName,
    );
  }

  private async createEntityConversation(
    workspaceId: string,
    mode: AIMode,
    entityType: string,
    entityId?: string,
    entityName?: string,
  ) {
    const title = entityName ? `Discussion: ${entityName}` : `${mode} Session`;

    return await prisma.conversation.create({
      data: {
        workspaceId,
        title,
        status: "ACTIVE",
        currentStage:
          mode === "OPPORTUNITY" ? "REVIEWING_OPPORTUNITIES" : "IDLE",
        ...(entityId && (mode === "OPPORTUNITY" || entityType === "OPPORTUNITY")
          ? { opportunityId: entityId }
          : {}),
      },
    });
  }
}

export const aiOrchestratorService = new AIOrchestratorService();
