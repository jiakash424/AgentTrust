import { z } from "zod";
import { GeminiProvider } from "./gemini";
import { NvidiaNimProvider } from "./nvidia";
import { OpenRouterProvider } from "./openrouter";

export interface AIProvider {
  chat(messages: any[], tools?: any[]): Promise<any>;
  structured<T>(messages: any[], schema: z.ZodSchema<T>): Promise<T>;
  healthCheck?(): Promise<{ ok: boolean; model: string; error?: string }>;
}

export interface ProviderTelemetry {
  provider: string;
  model: string;
  requestCount: number;
  successfulRequests: number;
  rateLimitCount: number;
  fallbackCount: number;
  lastError: string | null;
}

// Global queue manager to throttle Gemini requests to 1 request at a time with 100ms delay
class AIQueueManager {
  private geminiQueue: Array<() => Promise<void>> = [];
  private isProcessingGemini = false;
  private lastGeminiTime = 0;
  private minGeminiIntervalMs = 100;

  async enqueueGemini<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.geminiQueue.push(async () => {
        try {
          const now = Date.now();
          const elapsed = now - this.lastGeminiTime;
          if (elapsed < this.minGeminiIntervalMs) {
            await new Promise((r) =>
              setTimeout(r, this.minGeminiIntervalMs - elapsed),
            );
          }
          this.lastGeminiTime = Date.now();
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingGemini || this.geminiQueue.length === 0) return;
    this.isProcessingGemini = true;

    while (this.geminiQueue.length > 0) {
      const nextTask = this.geminiQueue.shift();
      if (nextTask) {
        await nextTask().catch(() => {});
      }
    }

    this.isProcessingGemini = false;
  }
}

export const aiQueue = new AIQueueManager();

export class ResilientAIProvider implements AIProvider {
  private providers: Array<{ name: string; model: string; instance: AIProvider }> = [];
  public telemetry: ProviderTelemetry;

  constructor() {
    // 1. Configure OpenRouter (Fastest + GLM support)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.push({
        name: "OpenRouter",
        model: process.env.OPENROUTER_MODEL || "z-ai/glm-5.2",
        instance: new OpenRouterProvider(),
      });
    }

    // 2. Configure Gemini Flash Lite
    if (process.env.GEMINI_API_KEY) {
      this.providers.push({
        name: "Gemini",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        instance: new GeminiProvider(),
      });
    }

    // 3. Configure NVIDIA NIM
    if (process.env.NVIDIA_API_KEY) {
      this.providers.push({
        name: "NVIDIA",
        model: process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct",
        instance: new NvidiaNimProvider(),
      });
    }

    // If no providers loaded, fallback to default OpenRouter
    if (this.providers.length === 0) {
      this.providers.push({
        name: "OpenRouter",
        model: "z-ai/glm-5.2",
        instance: new OpenRouterProvider(),
      });
    }

    const primary = this.providers[0];
    this.telemetry = {
      provider: primary.name,
      model: primary.model,
      requestCount: 0,
      successfulRequests: 0,
      rateLimitCount: 0,
      fallbackCount: 0,
      lastError: null,
    };
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    this.telemetry.requestCount++;
    let lastError: any = null;

    for (let i = 0; i < this.providers.length; i++) {
      const p = this.providers[i];
      try {
        const res = await this.executeProviderCall(p.name, () =>
          p.instance.chat(messages, tools),
        );
        this.telemetry.successfulRequests++;
        this.telemetry.provider = p.name;
        this.telemetry.model = p.model;
        return res;
      } catch (err: any) {
        lastError = err;
        this.telemetry.lastError = err.message;
        this.telemetry.fallbackCount++;
        console.warn(
          `[AI Resilience] ${p.name} failed: ${err.message}. Shifting to next high-performance tier...`,
        );
      }
    }

    throw lastError || new Error("All AI providers failed.");
  }

  async structured<T>(messages: any[], schema: z.ZodSchema<T>): Promise<T> {
    this.telemetry.requestCount++;
    let lastError: any = null;

    for (let i = 0; i < this.providers.length; i++) {
      const p = this.providers[i];
      try {
        const res = await this.executeProviderCall(p.name, () =>
          p.instance.structured(messages, schema),
        );
        this.telemetry.successfulRequests++;
        this.telemetry.provider = p.name;
        this.telemetry.model = p.model;
        return res;
      } catch (err: any) {
        lastError = err;
        this.telemetry.lastError = err.message;
        this.telemetry.fallbackCount++;
        console.warn(
          `[AI Resilience] ${p.name} structured() failed: ${err.message}. Shifting to next tier...`,
        );
      }
    }

    throw (
      lastError ||
      new Error("All AI providers failed during structured output.")
    );
  }

  private executeProviderCall<T>(
    providerName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (providerName === "Gemini") {
      return aiQueue.enqueueGemini(fn);
    }
    return fn();
  }

  async healthCheck(): Promise<{ ok: boolean; model: string; error?: string }> {
    const primary = this.providers[0];
    if (!primary) {
      return { ok: false, model: "none", error: "No providers configured" };
    }
    if (primary.instance.healthCheck) {
      return await primary.instance.healthCheck();
    }
    return { ok: true, model: primary.model };
  }

  private isRateLimitOrQuotaError(err: any): boolean {
    const msg = String(err?.message || "").toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("resource_exhausted") ||
      msg.includes("too many requests") ||
      msg.includes("overloaded")
    );
  }
}

export function getAIProvider(): ResilientAIProvider {
  return new ResilientAIProvider();
}

export async function complete(prompt: string): Promise<string> {
  const ai = getAIProvider();
  const msg = await ai.chat([{ role: "user", content: prompt }]);
  return msg.content || "";
}
