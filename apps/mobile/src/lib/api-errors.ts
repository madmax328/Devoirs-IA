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

/** Transforme le corps d'erreur de l'API ({ error: { code, message, details } }) en message français. */
export function toApiError(status: number, body: unknown): ApiClientError {
  const err =
    typeof body === "object" && body !== null && "error" in body
      ? (body as { error?: { code?: string; message?: string; details?: unknown } }).error
      : undefined;
  const details = err?.details;
  const params =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, string | number>)
      : undefined;
  const message = translate(DEFAULT_LOCALE, (err?.message ?? "errors.generic") as MessageKey, params);
  return new ApiClientError(status, err?.code ?? "UNKNOWN", message);
}
