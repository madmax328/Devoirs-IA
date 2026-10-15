"use client";

import type { ApiError } from "@devoirs/shared";
import { translate, DEFAULT_LOCALE, type MessageKey } from "@devoirs/shared/i18n";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Appelle l'API du site ; en cas d'erreur, lève une erreur déjà traduite en français. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : {},
      body: init.body !== undefined ? JSON.stringify(init.body) : null,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(0, "NETWORK", translate(DEFAULT_LOCALE, "errors.network"));
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiError | null)?.error;
    const params =
      err?.details && typeof err.details === "object" && !Array.isArray(err.details)
        ? (err.details as Record<string, string | number>)
        : undefined;
    const message = translate(DEFAULT_LOCALE, (err?.message ?? "errors.generic") as MessageKey, params);
    throw new ApiClientError(res.status, err?.code ?? "UNKNOWN", message);
  }
  return data as T;
}
