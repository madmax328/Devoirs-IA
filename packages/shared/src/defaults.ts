import { DEFAULT_CURFEW, DEFAULT_SESSION_MINUTES } from "./constants";
import type { ChildSettings } from "./schemas";

export function defaultChildSettings(overrides: Partial<ChildSettings> = {}): ChildSettings {
  return {
    subjects: ["MATHS", "FRANCAIS"],
    sessionMinutes: DEFAULT_SESSION_MINUTES,
    curfew: DEFAULT_CURFEW,
    dysFont: false,
    textToSpeech: false,
    ...overrides,
  };
}
