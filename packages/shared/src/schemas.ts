import { z } from "zod";
import { AVATARS, CHILD_LEVELS, PIN_LENGTH, SUBJECTS } from "./constants";

// Les messages d'erreur sont des clés i18n (voir i18n/locales/fr.ts → errors).

export const pinSchema = z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), "errors.pinFormat");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "errors.required").max(60, "errors.tooLong"),
  email: z.string().trim().toLowerCase().pipe(z.email("errors.email")),
  password: z.string().min(10, "errors.passwordTooShort").max(128, "errors.tooLong"),
  acceptTerms: z.literal(true, "errors.mustAcceptTerms"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("errors.email")),
  password: z.string().min(1, "errors.required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const childSettingsSchema = z.object({
  subjects: z.array(z.enum(SUBJECTS)).min(1, "errors.atLeastOneSubject"),
  sessionMinutes: z.number().int().min(5).max(30),
  curfew: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "errors.timeFormat"),
  dysFont: z.boolean(),
  textToSpeech: z.boolean(),
});
export type ChildSettings = z.infer<typeof childSettingsSchema>;

const displayName = z
  .string()
  .trim()
  .min(1, "errors.required")
  .max(20, "errors.tooLong")
  // Prénom ou pseudo : lettres, espaces, tirets, apostrophes. Pas de chiffres ni d'e-mail.
  .regex(/^[\p{L}][\p{L} '’-]*$/u, "errors.displayName");

export const createChildSchema = z.object({
  displayName,
  level: z.enum(CHILD_LEVELS),
  avatar: z.enum(AVATARS),
  pin: pinSchema,
  settings: childSettingsSchema.partial().optional(),
  parentalConsent: z.literal(true, "errors.mustConsent"),
});
export type CreateChildInput = z.infer<typeof createChildSchema>;

export const updateChildSchema = z.object({
  displayName: displayName.optional(),
  level: z.enum(CHILD_LEVELS).optional(),
  avatar: z.enum(AVATARS).optional(),
  pin: pinSchema.optional(),
  settings: childSettingsSchema.partial().optional(),
});
export type UpdateChildInput = z.infer<typeof updateChildSchema>;

export const registerDeviceSchema = z.object({
  platform: z.enum(["ios", "android", "web"]),
  label: z.string().trim().max(40).optional(),
  dedicatedChildId: z.string().nullable().optional(),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const childLoginSchema = z.object({
  childId: z.string().min(1),
  pin: pinSchema,
});
export type ChildLoginInput = z.infer<typeof childLoginSchema>;

// ───────── Réponses de l'API (partagées web + mobile)

export const childPublicSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  level: z.enum(CHILD_LEVELS),
  avatar: z.enum(AVATARS),
  settings: childSettingsSchema,
  createdAt: z.string(),
});
export type ChildPublic = z.infer<typeof childPublicSchema>;

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
