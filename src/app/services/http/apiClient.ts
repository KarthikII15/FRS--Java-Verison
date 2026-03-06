import { authConfig } from "../../config/authConfig";

interface RequestOptions extends RequestInit {
  accessToken?: string | null;
  timeoutMs?: number;
  scopeHeaders?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? authConfig.timeoutMs);

  try {
    const response = await fetch(`${authConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        ...(options.scopeHeaders ?? {}),
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new ApiError(
        typeof body === "string" ? body : body?.message ?? "Request failed",
        response.status
      );
    }

    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}
