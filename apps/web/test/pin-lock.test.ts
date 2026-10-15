import { PIN_MAX_FAILURES } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import { isLocked, minutesLeft, onFailure, onSuccess, type PinLockState } from "@/server/pin-lock";

const now = new Date("2026-10-15T18:00:00Z");
const fresh: PinLockState = { pinFailedCount: 0, pinLockCount: 0, pinLockedUntil: null };

function fail(state: PinLockState, times: number): PinLockState {
  let s = state;
  for (let i = 0; i < times; i++) s = onFailure(s, now);
  return s;
}

describe("verrouillage du PIN", () => {
  it("ne bloque pas avant le nombre maximal d'échecs", () => {
    const s = fail(fresh, PIN_MAX_FAILURES - 1);
    expect(isLocked(s, now)).toBe(false);
    expect(s.pinFailedCount).toBe(PIN_MAX_FAILURES - 1);
  });

  it("bloque 1 minute au premier verrouillage", () => {
    const s = fail(fresh, PIN_MAX_FAILURES);
    expect(isLocked(s, now)).toBe(true);
    expect(minutesLeft(s, now)).toBe(1);
  });

  it("allonge le blocage à chaque verrouillage, jusqu'à 60 minutes", () => {
    let s = fresh;
    const durations: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = fail({ ...s, pinLockedUntil: null }, PIN_MAX_FAILURES);
      durations.push(minutesLeft(s, now));
    }
    expect(durations).toEqual([1, 5, 15, 60, 60, 60]);
  });

  it("se débloque une fois le délai passé", () => {
    const s = fail(fresh, PIN_MAX_FAILURES);
    expect(isLocked(s, new Date(now.getTime() + 61_000))).toBe(false);
  });

  it("remet tout à zéro après un PIN correct", () => {
    expect(onSuccess()).toEqual(fresh);
  });
});
