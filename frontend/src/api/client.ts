/**
 * Typed fetch wrapper.
 *
 * Owns the access/refresh token lifecycle: on a 401 it refreshes once and
 * replays the request. Concurrent 401s share a single refresh so a page with
 * several requests in flight does not burn the whole rotation chain.
 */

import type { ApiErrorBody, TokenPair } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const ACCESS_KEY = "hirelens.access_token";
const REFRESH_KEY = "hirelens.refresh_token";

export class ApiError extends Error {
  // Written out rather than declared as constructor parameter properties,
  // which `erasableSyntaxOnly` disallows.
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorBody["error"]["details"];

  constructor(
    message: string,
    status: number,
    code = "error",
    details?: ApiErrorBody["error"]["details"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level validation messages, ready to show under inputs. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details ?? []) {
      const field = detail.field.replace(/^body\./, "");
      map[field] ??= detail.message;
    }
    return map;
  }
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: TokenPair) {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

type LogoutHandler = () => void;
let onSessionExpired: LogoutHandler = () => {};

/** Let the auth context react when the session can no longer be renewed. */
export function setSessionExpiredHandler(handler: LogoutHandler) {
  onSessionExpired = handler;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    tokenStore.clear();
    return false;
  }

  tokenStore.set((await response.json()) as TokenPair);
  return true;
}

function ensureRefresh(): Promise<boolean> {
  refreshInFlight ??= refreshTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let code = `http_${response.status}`;
  let details: ApiErrorBody["error"]["details"];

  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error) {
      message = body.error.message || message;
      code = body.error.code || code;
      details = body.error.details;
    }
  } catch {
    // A non-JSON error body (a proxy page, say) keeps the generic message.
  }

  return new ApiError(message, response.status, code, details);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip the Authorization header — used by login/register. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions, retry = true): Promise<Response> {
  const { method = "GET", body, anonymous = false, signal } = options;
  const headers = new Headers();
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    // Let the browser set the multipart boundary itself.
    payload = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  if (!anonymous && tokenStore.access) {
    headers.set("Authorization", `Bearer ${tokenStore.access}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload, signal });

  if (response.status === 401 && !anonymous && retry) {
    if (await ensureRefresh()) {
      return send(path, options, false);
    }
    tokenStore.clear();
    onSessionExpired();
  }

  return response;
}

/** Perform a request and parse the JSON body, throwing ApiError on failure. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Fetch a file response (CSV export) as a Blob plus its suggested filename. */
export async function requestBlob(
  path: string,
  fallbackName: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await send(path, {});

  if (!response.ok) {
    throw await toApiError(response);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);

  return { blob: await response.blob(), filename: match?.[1] ?? fallbackName };
}

/** Trigger a browser download for a fetched blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
