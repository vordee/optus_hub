import { clearToken, getStoredToken } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "/api";
const GET_CACHE_TTL_MS = 5_000;

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const requestCache = new Map<string, CacheEntry>();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function parseResponseBody(bodyText: string): unknown {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (method !== "GET") {
    requestCache.clear();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method,
      headers,
    });
    return handleResponse<T>(response);
  }

  const cacheKey = [path, token || "", method].join("|");
  const cachedEntry = requestCache.get(cacheKey);
  const now = Date.now();
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.promise as Promise<T>;
  }

  const requestPromise = fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
  }).then(handleResponse<T>);
  requestCache.set(cacheKey, { expiresAt: now + GET_CACHE_TTL_MS, promise: requestPromise });

  try {
    return await requestPromise;
  } catch (error) {
    requestCache.delete(cacheKey);
    throw error;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const bodyText = await response.text();
  const data = parseResponseBody(bodyText) as { detail?: string } | string | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      requestCache.clear();
      throw new ApiError("Sessão expirada. Entre novamente.", response.status);
    }
    if (typeof data === "string") {
      throw new ApiError(data || "Falha na requisição.", response.status);
    }
    throw new ApiError(data?.detail ?? "Falha na requisição.", response.status);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<string> {
  requestCache.clear();
  const response = await apiRequest<{ access_token: string }>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.access_token;
}
