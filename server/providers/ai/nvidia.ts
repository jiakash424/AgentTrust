import { z } from "zod";
import type { AIProvider } from "./index";

export class NvidiaNimProvider implements AIProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor() {
    this.baseUrl =
      process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    this.model =
      process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b";
    this.apiKey = process.env.NVIDIA_API_KEY || "";

    if (!this.apiKey && process.env.APP_DEMO_MODE === "false") {
      throw new Error(
        "NVIDIA_API_KEY is not configured in the server environment.",
      );
    }
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const body: any = {
          model: this.model,
          messages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 4096,
        };

        if (tools && tools.length > 0) {
          body.tools = tools;
          body.tool_choice = "auto";
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          throw new Error(
            "PROVIDER_AUTH_FAILED: Authentication with AI provider failed.",
          );
        }
        if (response.status === 429) {
          throw new Error("PROVIDER_RATE_LIMITED: Rate limit exceeded.");
        }
        if (response.status >= 500) {
          const errText = await response.text();
          console.error(
            `[NVIDIA] Provider returned ${response.status}:`,
            errText,
          );
          throw new Error(
            `PROVIDER_SERVER_ERROR: Provider returned ${response.status}`,
          );
        }
        if (!response.ok) {
          const errText = await response.text();
          console.error(
            `[NVIDIA] Provider returned ${response.status}:`,
            errText,
          );
          throw new Error(
            `PROVIDER_ERROR: Provider returned ${response.status}`,
          );
        }

        const data = await response.json();
        const msg = data.choices[0].message;
        // NVIDIA nemotron returns reasoning_content separately; ensure content is populated
        if (!msg.content && msg.reasoning_content) {
          msg.content = msg.reasoning_content;
        }
        return msg;
      } catch (err: any) {
        attempt++;
        if (err.name === "AbortError") {
          if (attempt >= maxRetries)
            throw new Error("PROVIDER_TIMEOUT: Request timed out.");
        } else if (err.message?.includes("PROVIDER_AUTH_FAILED")) {
          throw err; // don't retry auth errors
        } else if (attempt >= maxRetries) {
          throw err;
        }
        // exponential backoff
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  async structured<T>(messages: any[], schema: z.ZodSchema<T>): Promise<T> {
    const schemaDesc = JSON.stringify(
      (schema as any).shape ? Object.keys((schema as any).shape) : "schema",
    );
    const sysMsg = {
      role: "system",
      content: `You must respond with valid JSON only. No markdown fences, no explanation, no reasoning. Output ONLY the JSON object. Your JSON must contain exactly these fields: ${schemaDesc}`,
    };

    const messagesWithSys = [sysMsg, ...messages];

    const message = await this.chat(messagesWithSys);
    const content = message.content || "";

    try {
      let jsonStr = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      // Robust JSON extraction if reasoning text preceeds the JSON object
      const firstBraceIndex = jsonStr.indexOf("{");
      const lastBraceIndex = jsonStr.lastIndexOf("}");
      if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
        jsonStr = jsonStr.substring(firstBraceIndex, lastBraceIndex + 1);
      }

      const parsed = JSON.parse(jsonStr);
      const safe = schema.safeParse(parsed);
      if (safe.success) {
        return safe.data;
      }
      return parsed as T;
    } catch (err) {
      throw new Error("AI provider returned invalid structured data.");
    }
  }
}
