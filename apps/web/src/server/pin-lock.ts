import { PIN_LOCK_MINUTES, PIN_MAX_FAILURES } from "@devoirs/shared";

export interface PinLockState {
  pinFailedCount: number;
  pinLockCount: number;
  pinLockedUntil: Date | null;
}

export function isLocked(state: PinLockState, now: Date): boolean {
  return state.pinLockedUntil !== null && state.pinLockedUntil > now;
}

export function minutesLeft(state: PinLockState, now: Date): number {
  if (!state.pinLockedUntil) return 0;
  return Math.max(1, Math.ceil((state.pinLockedUntil.getTime() - now.getTime()) / 60000));
}

/**
 * Après PIN_MAX_FAILURES échecs, blocage de plus en plus long (1, 5, 15 puis 60 min).
 * Le compteur de blocages ne retombe à zéro qu'après un PIN correct.
 */
export function onFailure(state: PinLockState, now: Date): PinLockState {
  const failed = state.pinFailedCount + 1;
  if (failed < PIN_MAX_FAILURES) return { ...state, pinFailedCount: failed };
  const step = Math.min(state.pinLockCount, PIN_LOCK_MINUTES.length - 1);
  const minutes = PIN_LOCK_MINUTES[step] ?? 60;
  return {
    pinFailedCount: 0,
    pinLockCount: state.pinLockCount + 1,
    pinLockedUntil: new Date(now.getTime() + minutes * 60000),
  };
}

export function onSuccess(): PinLockState {
  return { pinFailedCount: 0, pinLockCount: 0, pinLockedUntil: null };
}
