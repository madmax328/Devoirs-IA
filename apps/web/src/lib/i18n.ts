import { createTranslator, translateError, DEFAULT_LOCALE } from "@devoirs/shared/i18n";

// Pour l'instant, le site est en français. La détection de langue viendra avec pt-BR / en-US.
export const t = createTranslator(DEFAULT_LOCALE);
export const tError = (message: string) => translateError(DEFAULT_LOCALE, message);
