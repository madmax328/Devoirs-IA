import { enUS } from "./locales/en-US";
import { fr, type Messages } from "./locales/fr";
import { ptBR } from "./locales/pt-BR";
import type { DeepPartial, DotKeys } from "./types";

export const LOCALES = ["fr-FR", "pt-BR", "en-US"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr-FR";

export type MessageKey = DotKeys<Messages>;
export type { Messages };
export { fr };

const dictionaries: Record<Locale, DeepPartial<Messages>> = { "fr-FR": fr, "pt-BR": ptBR, "en-US": enUS };

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type TranslateParams = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(fr, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function createTranslator(locale: Locale = DEFAULT_LOCALE) {
  return (key: MessageKey, params?: TranslateParams) => translate(locale, key, params);
}

/** Les erreurs Zod portent des clés i18n ; on les traduit si c'en est une. */
export function translateError(locale: Locale, message: string): string {
  return lookup(fr, message) !== undefined ? translate(locale, message as MessageKey) : message;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
