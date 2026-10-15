import { PIN_LENGTH } from "@devoirs/shared";

export type PinKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "back";

export const PIN_KEYS: readonly (PinKey | null)[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  null,
  "0",
  "back",
];

export function pressPinKey(value: string, key: PinKey): string {
  if (key === "back") return value.slice(0, -1);
  return value.length >= PIN_LENGTH ? value : value + key;
}

export const isPinComplete = (value: string) => value.length === PIN_LENGTH;
