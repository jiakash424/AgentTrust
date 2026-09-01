import { z } from "zod";
import type { AIProvider } from "./index";

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
    this.model = process.env.OPENROUTER_MODEL || "z-ai/glm-5.2";
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const body: any = {
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: 4000,
        };

        if (tools && tools.length > 0) {
          body.tools = tools;
          body.tool_choice = "auto";
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AgentTrust Intelligence Engine",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          
          // If token limit or model issue, try fallback model
          if (res.status === 402 || res.status === 400 || res.status === 404) {
            console.warn(`[OpenRouter] Model ${this.model} error: ${errMsg}. Retrying with fallback fast model...`);
            this.model = "inclusionai/ling-3.0-flash-fin:free";
            attempt++;
            continue;
          }
          throw new Error(`OPENROUTER_ERROR (${res.status}): ${errMsg}`);
        }

        const data = await res.json();
        const choice = data.choices?.[0];

        if (choice?.message?.tool_calls) {
          return {
            role: "assistant",
            content: choice.message.content || null,
            tool_calls: choice.message.tool_calls,
          };
        }

        return {
          role: "assistant",
          content: choice?.message?.content || "",
        };
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }

    throw new Error("OpenRouter exhausted retries");
  }

  async structured<T>(messages: any[], schema: z.ZodSchema<T>): Promise<T> {
    const jsonPrompt = `${messages[messages.length - 1]?.content || ""}\n\nIMPORTANT: Respond ONLY with valid JSON conforming to the requested schema. Do not enclose in markdown blocks if possible.`;
    const formattedMessages = [
      ...messages.slice(0, -1),
      { role: "user", content: jsonPrompt },
    ];

    const response = await this.chat(formattedMessages);
    const content = response.content || "{}";

    let cleanJson = content.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleanJson);
    return schema.parse(parsed);
  }
}
