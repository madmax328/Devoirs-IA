import { createTranslator, translateError, DEFAULT_LOCALE } from "@devoirs/shared/i18n";

export const t = createTranslator(DEFAULT_LOCALE);
export const tError = (message: string) => translateError(DEFAULT_LOCALE, message);
