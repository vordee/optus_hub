import { clearToken, getStoredToken } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "/api";

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
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const bodyText = await response.text();
  const data = parseResponseBody(bodyText) as { detail?: string } | string | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
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
  const response = await apiRequest<{ access_token: string }>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.access_token;
}
