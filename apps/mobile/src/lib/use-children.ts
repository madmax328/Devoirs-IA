import type { ChildPublic } from "@devoirs/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { api } from "./api";

/** Liste des profils enfants, rechargée à chaque retour sur l'écran. */
export function useChildren() {
  const [children, setChildren] = useState<ChildPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api<{ children: ChildPublic[] }>("/api/children")
        .then((r) => active && setChildren(r.children))
        .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
      return () => {
        active = false;
      };
    }, []),
  );

  return { children, error };
}
