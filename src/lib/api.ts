import { getOrCreateClientToken } from "./client-token";

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  session?: any;
  workspaceId?: string;
  body?: any;
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { session, workspaceId, headers = {}, body, ...rest } = options;
  const clientToken = getOrCreateClientToken();

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-client-token": clientToken,
    ...(headers as Record<string, string>),
  };

  if (session?.access_token) {
    reqHeaders["Authorization"] = `Bearer ${session.access_token}`;
  } else if (!reqHeaders["Authorization"]) {
    reqHeaders["Authorization"] = `Bearer ${clientToken}`;
  }

  if (workspaceId) {
    reqHeaders["x-workspace-id"] = workspaceId;
  }

  const formattedBody =
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)
      ? JSON.stringify(body)
      : body;

  try {
    const response = await fetch(endpoint, {
      ...rest,
      body: formattedBody,
      headers: reqHeaders,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data?.error ||
          data?.message ||
          response.statusText ||
          "An error occurred",
        data,
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors, CORS, timeouts etc.
    throw new ApiError(0, error.message || "Network error occurred");
  }
}
