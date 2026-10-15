import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore n'existe pas sur le web : on retombe sur localStorage (usage de développement).
const web = {
  getItem: (k: string) => (typeof localStorage === "undefined" ? null : localStorage.getItem(k)),
  setItem: (k: string, v: string) => localStorage.setItem(k, v),
  removeItem: (k: string) => localStorage.removeItem(k),
};

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    return Platform.OS === "web" ? web.getItem(key) : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") web.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") web.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  childToken: "devoirs.childToken",
  /** Profil enfant attaché à cet appareil (« appareil de l'enfant »). */
  dedicatedChildId: "devoirs.dedicatedChildId",
} as const;
