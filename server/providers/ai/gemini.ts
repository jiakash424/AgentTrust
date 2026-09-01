import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import type { AIProvider } from "./index";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "PROVIDER_CONFIG_MISSING: GEMINI_API_KEY is not configured.",
      );
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  }

  /**
   * Chat completion with optional tool/function calling.
   * Returns an OpenAI-style message object so the AgentLoop works unchanged.
   */
  async chat(messages: any[], tools?: any[]): Promise<any> {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Build Gemini-native tool declarations from OpenAI-style tool defs
        const geminiTools =
          tools && tools.length > 0
            ? [
                {
                  functionDeclarations: tools.map((t: any) => ({
                    name: t.function.name,
                    description: t.function.description,
                    parameters: this.convertJsonSchemaToGemini(
                      t.function.parameters,
                    ),
                  })),
                },
              ]
            : undefined;

        // Convert OpenAI-style messages to Gemini format
        const { systemInstruction, contents } = this.convertMessages(messages);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await this.client.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: 0.2,
            topP: 0.7,
            maxOutputTokens: 4096,
            tools: geminiTools,
          },
        });

        clearTimeout(timeoutId);

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error("PROVIDER_ERROR: No candidates in Gemini response.");
        }

        const candidate = response.candidates[0];
        const parts = candidate.content?.parts || [];

        // Check if response contains function calls
        const functionCalls = parts.filter((p: any) => p.functionCall);

        if (functionCalls.length > 0) {
          // Return OpenAI-style tool_calls format so AgentLoop works
          return {
            role: "assistant",
            content: null,
            tool_calls: functionCalls.map((p: any, idx: number) => ({
              id: `call_${Date.now()}_${idx}`,
              type: "function",
              function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args || {}),
              },
            })),
          };
        }

        // Plain text response
        const textContent =
          (response as any).text ||
          parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join("") ||
          "";

        return {
          role: "assistant",
          content: textContent,
        };
      } catch (err: any) {
        attempt++;

        if (err.name === "AbortError") {
          if (attempt >= maxRetries)
            throw new Error("PROVIDER_TIMEOUT: Request timed out after 60s.");
        } else if (err.message?.includes("API key not valid")) {
          throw new Error("PROVIDER_AUTH_FAILED: Invalid Gemini API key.");
        } else if (
          err.status === 429 ||
          err.message?.includes("429") ||
          err.message?.includes("RESOURCE_EXHAUSTED") ||
          err.message?.includes("Rate limit exceeded") ||
          err.message?.includes("RATE_LIMITED")
        ) {
          console.log(
            `[Gemini] Rate limit hit. Shifting instantly to NVIDIA NIM Provider...`,
          );
          const { NvidiaNimProvider } = await import("./nvidia");
          const nvidia = new NvidiaNimProvider();
          return nvidia.chat(messages, tools);
        } else if (
          err.status === 404 ||
          err.message?.includes("404") ||
          err.message?.includes("not found")
        ) {
          console.warn(`[Gemini] Model ${this.model} not found. Falling back to gemini-2.5-flash-lite...`);
          this.model = "gemini-2.5-flash-lite";
          continue;
        } else if (
          err.status === 503 ||
          err.message?.includes("503") ||
          err.message?.includes("overloaded")
        ) {
          if (attempt >= maxRetries)
            throw new Error(
              "PROVIDER_UNAVAILABLE: Model is currently unavailable.",
            );
        } else if (err.message?.includes("PROVIDER_CONFIG_MISSING")) {
          throw err; // don't retry config errors
        } else if (err.message?.includes("PROVIDER_AUTH_FAILED")) {
          throw err; // don't retry auth errors
        } else if (attempt >= maxRetries) {
          throw err;
        }

        // Default exponential backoff for other errors
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }

    throw new Error("PROVIDER_ERROR: Exhausted all retries.");
  }

  /**
   * Structured output: ask the model to return JSON matching a Zod schema.
   * Falls back to NVIDIA if Gemini is rate-limited.
   */
  async structured<T>(messages: any[], schema: z.ZodSchema<T>): Promise<T> {
    const schemaDesc = JSON.stringify(
      (schema as any).shape ? Object.keys((schema as any).shape) : "schema",
    );
    const sysMsg = {
      role: "system",
      content: `You must respond with valid JSON only. No markdown fences, no explanation. Your JSON must contain exactly these fields: ${schemaDesc}`,
    };

    const messagesWithSys = [sysMsg, ...messages];

    let message: any;
    try {
      message = await this.chat(messagesWithSys);
    } catch (err: any) {
      // If Gemini chat itself threw (e.g. NVIDIA fallback also failed), try NVIDIA structured directly
      if (
        err.message?.includes("RATE_LIMITED") ||
        err.message?.includes("PROVIDER_SERVER_ERROR") ||
        err.message?.includes("PROVIDER_UNAVAILABLE")
      ) {
        console.log(
          "[Gemini] structured() falling back to NVIDIA structured()...",
        );
        const { NvidiaNimProvider } = await import("./nvidia");
        const nvidia = new NvidiaNimProvider();
        return nvidia.structured(messagesWithSys, schema);
      }
      throw err;
    }

    const content = message.content || "";

    try {
      let jsonStr = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      // Try to extract JSON object if there's extra text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);
      return schema.parse(parsed);
    } catch (err) {
      console.error(
        "[GeminiProvider] Failed to parse structured output:",
        content.substring(0, 500),
      );
      throw new Error("AI provider returned invalid structured data.");
    }
  }

  /**
   * Health check: make a real, minimal request to verify the API key and model work.
   */
  async healthCheck(): Promise<{ ok: boolean; model: string; error?: string }> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: "Respond with exactly: OK",
        config: { maxOutputTokens: 10 },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { ok: true, model: this.model };
    } catch (err: any) {
      return { ok: false, model: this.model, error: err.message };
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /**
   * Convert OpenAI-style messages into Gemini's { systemInstruction, contents } format.
   */
  private convertMessages(messages: any[]): {
    systemInstruction: string | null;
    contents: any[];
  } {
    let systemInstruction: string | null = null;
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // Gemini uses a dedicated systemInstruction field
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n${msg.content}`
          : msg.content;
      } else if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant") {
        if (msg.tool_calls) {
          // Convert back to Gemini function call parts
          const parts = msg.tool_calls.map((tc: any) => ({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments || "{}"),
            },
          }));
          contents.push({ role: "model", parts });
        } else {
          contents.push({
            role: "model",
            parts: [{ text: msg.content || "" }],
          });
        }
      } else if (msg.role === "tool") {
        // Gemini expects functionResponse parts
        let parsed: any;
        try {
          parsed = JSON.parse(msg.content);
        } catch {
          parsed = { result: msg.content };
        }

        function normalizeFunctionResponse(result: unknown) {
          if (result === null || result === undefined) {
            return { result: null };
          }
          if (Array.isArray(result)) {
            return { result };
          }
          if (typeof result === "object") {
            return result;
          }
          return { result };
        }

        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: msg.name,
                response: normalizeFunctionResponse(parsed),
              },
            },
          ],
        });
      }
    }

    return { systemInstruction, contents };
  }

  /**
   * Convert a simplified JSON Schema (from OpenAI tools) to Gemini's schema format.
   */
  private convertJsonSchemaToGemini(jsonSchema: any): any {
    if (!jsonSchema) return undefined;

    const result: any = {};

    if (jsonSchema.type === "object") {
      result.type = Type.OBJECT;
      if (jsonSchema.properties) {
        result.properties = {};
        for (const [key, value] of Object.entries<any>(jsonSchema.properties)) {
          result.properties[key] = this.convertJsonSchemaToGemini(value);
        }
      }
      if (jsonSchema.required) {
        result.required = jsonSchema.required;
      }
    } else if (jsonSchema.type === "array") {
      result.type = Type.ARRAY;
      if (jsonSchema.items) {
        result.items = this.convertJsonSchemaToGemini(jsonSchema.items);
      }
    } else if (jsonSchema.type === "string") {
      result.type = Type.STRING;
    } else if (jsonSchema.type === "number" || jsonSchema.type === "integer") {
      result.type = Type.NUMBER;
    } else if (jsonSchema.type === "boolean") {
      result.type = Type.BOOLEAN;
    } else {
      result.type = Type.STRING; // fallback
    }

    if (jsonSchema.description) {
      result.description = jsonSchema.description;
    }

    return result;
  }
}
