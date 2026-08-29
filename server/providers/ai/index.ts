import { z } from "zod";
import { GeminiProvider } from "./gemini";
import { NvidiaNimProvider } from "./nvidia";

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

// Global queue manager to throttle Gemini requests to 1 request at a time with 1s delay
class AIQueueManager {
  private geminiQueue: Array<() => Promise<void>> = [];
  private isProcessingGemini = false;
  private lastGeminiTime = 0;
  private minGeminiIntervalMs = 1000;

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
  private primary: AIProvider;
  private fallback: AIProvider | null = null;
  private primaryName = "NVIDIA";
  private fallbackName = "Gemini";
  private primaryModel =
    process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b";
  private fallbackModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  public telemetry: ProviderTelemetry;

  constructor() {
    const primaryType = (process.env.AI_PROVIDER || "nvidia").toLowerCase();

    if (primaryType === "gemini") {
      this.primaryName = "Gemini";
      this.fallbackName = "NVIDIA";
      this.primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      this.fallbackModel =
        process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b";
      this.primary = new GeminiProvider();
      if (process.env.NVIDIA_API_KEY) {
        this.fallback = new NvidiaNimProvider();
      }
    } else {
      // DEFAULT PRIMARY: NVIDIA NIM (nemotron-3-super-120b-a12b)
      this.primaryName = "NVIDIA";
      this.fallbackName = "Gemini";
      this.primaryModel =
        process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b";
      this.fallbackModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      this.primary = new NvidiaNimProvider();
      if (process.env.GEMINI_API_KEY) {
        this.fallback = new GeminiProvider();
      }
    }

    this.telemetry = {
      provider: this.primaryName,
      model: this.primaryModel,
      requestCount: 0,
      successfulRequests: 0,
      rateLimitCount: 0,
      fallbackCount: 0,
      lastError: null,
    };
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    this.telemetry.requestCount++;

    // Try primary provider with 3 max retries & backoff
    let attempts = 0;
    while (attempts < 3) {
      try {
        const res = await this.executeProviderCall(this.primaryName, () =>
          this.primary.chat(messages, tools),
        );
        this.telemetry.successfulRequests++;
        return res;
      } catch (err: any) {
        attempts++;
        if (this.isRateLimitOrQuotaError(err)) {
          this.telemetry.rateLimitCount++;
          this.telemetry.lastError = err.message;
          console.warn(
            `[${this.primaryName}] Rate limit hit (attempt ${attempts}/3).`,
          );

          if (this.fallback && attempts >= 1) {
            this.telemetry.fallbackCount++;
            this.telemetry.provider = this.fallbackName;
            this.telemetry.model = this.fallbackModel;
            console.warn(
              `[AI Failover] Shifting from ${this.primaryName} to ${this.fallbackName}...`,
            );

            try {
              const fallbackRes = await this.executeProviderCall(
                this.fallbackName,
                () => this.fallback!.chat(messages, tools),
              );
              this.telemetry.successfulRequests++;
              return fallbackRes;
            } catch (fallbackErr: any) {
              this.telemetry.lastError = fallbackErr.message;
              throw fallbackErr;
            }
          }
        } else {
          this.telemetry.lastError = err.message;
          if (attempts >= 3) throw err;
        }

        // Exponential backoff
        await new Promise((r) => setTimeout(r, attempts * 1000));
      }
    }
  }

  async structured<T>(messages: any[], schema: z.ZodSchema<T>): Promise<T> {
    this.telemetry.requestCount++;

    let attempts = 0;
    while (attempts < 3) {
      try {
        const res = await this.executeProviderCall(this.primaryName, () =>
          this.primary.structured(messages, schema),
        );
        this.telemetry.successfulRequests++;
        return res;
      } catch (err: any) {
        attempts++;
        if (this.isRateLimitOrQuotaError(err)) {
          this.telemetry.rateLimitCount++;
          this.telemetry.lastError = err.message;
          console.warn(
            `[${this.primaryName}] Rate limit hit during structured() (attempt ${attempts}/3).`,
          );

          if (this.fallback && attempts >= 1) {
            this.telemetry.fallbackCount++;
            this.telemetry.provider = this.fallbackName;
            this.telemetry.model = this.fallbackModel;
            console.warn(
              `[AI Failover] Shifting structured() from ${this.primaryName} to ${this.fallbackName}...`,
            );

            try {
              const fallbackRes = await this.executeProviderCall(
                this.fallbackName,
                () => this.fallback!.structured(messages, schema),
              );
              this.telemetry.successfulRequests++;
              return fallbackRes;
            } catch (fallbackErr: any) {
              this.telemetry.lastError = fallbackErr.message;
              throw fallbackErr;
            }
          }
        } else {
          this.telemetry.lastError = err.message;
          if (attempts >= 3) throw err;
        }

        await new Promise((r) => setTimeout(r, attempts * 1000));
      }
    }

    throw new Error(
      `AI_PROVIDER_ERROR: ${this.telemetry.lastError || "Execution failed"}`,
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
    if (this.primary.healthCheck) {
      return await this.primary.healthCheck();
    }
    return { ok: true, model: this.primaryModel };
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
