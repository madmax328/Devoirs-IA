import { Platform } from "react-native";
import { ApiClientError, toApiError } from "./api-errors";
import { authClient } from "./auth-client";
import { API_URL } from "./config";
import { t } from "./i18n";
import { STORAGE_KEYS, secureStorage } from "./storage";

export { ApiClientError };

type Options = { method?: string; body?: unknown; asChild?: boolean };

/** Appelle l'API : cookie de session parent + jeton enfant si demandé. */
export async function api<T>(
  path: string,
  { method = "GET", body, asChild = false }: Options = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (Platform.OS !== "web") {
    const getCookie = (authClient as unknown as { getCookie?: () => string }).getCookie;
    const cookie = getCookie?.();
    if (cookie) headers.cookie = cookie;
  }
  if (asChild) {
    const token = await secureStorage.get(STORAGE_KEYS.childToken);
    if (token) headers["x-child-session"] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : null,
      credentials: Platform.OS === "web" ? "include" : "omit",
    });
  } catch {
    throw new ApiClientError(0, "NETWORK", t("errors.network"));
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}
