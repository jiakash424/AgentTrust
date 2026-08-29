export interface RetryOptions {
  retries?: number;
  minTimeoutMs?: number;
  maxTimeoutMs?: number;
  factor?: number;
  onRetry?: (error: any, attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  const minTimeoutMs = options.minTimeoutMs ?? 500;
  const maxTimeoutMs = options.maxTimeoutMs ?? 4000;
  const factor = options.factor ?? 2;

  let attempt = 0;

  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      if (attempt > retries) {
        throw error;
      }

      if (options.onRetry) {
        options.onRetry(error, attempt);
      }

      const backoff = Math.min(
        minTimeoutMs * Math.pow(factor, attempt - 1),
        maxTimeoutMs,
      );

      const jitter = backoff * (0.8 + Math.random() * 0.4);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
}
