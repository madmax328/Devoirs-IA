import type { ApiError as ApiErrorBody } from "@devoirs/shared";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

/** Erreur métier : `message` est une clé i18n (errors.*), traduite côté client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const errors = {
  badRequest: (details?: unknown) => new HttpError(400, "BAD_REQUEST", "errors.generic", details),
  unauthorized: () => new HttpError(401, "UNAUTHORIZED", "errors.unauthorized"),
  forbidden: () => new HttpError(403, "FORBIDDEN", "errors.forbidden"),
  notFound: () => new HttpError(404, "NOT_FOUND", "errors.notFound"),
};

function errorResponse(status: number, body: ApiErrorBody): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return errorResponse(err.status, {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }
  if (err instanceof ZodError) {
    const fields = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return errorResponse(400, {
      error: { code: "VALIDATION", message: fields[0]?.message ?? "errors.generic", details: fields },
    });
  }
  // Pas de données personnelles dans les logs : uniquement le type et le message technique.
  console.error("[api] erreur inattendue", err instanceof Error ? `${err.name}: ${err.message}` : typeof err);
  return errorResponse(500, { error: { code: "INTERNAL", message: "errors.generic" } });
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw errors.badRequest();
  }
  return schema.parse(raw);
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Enveloppe un handler de route pour transformer toute erreur en réponse JSON propre. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
