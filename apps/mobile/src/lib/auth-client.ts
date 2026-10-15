import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL, APP_SCHEME } from "./config";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins:
    Platform.OS === "web"
      ? []
      : [expoClient({ scheme: APP_SCHEME, storagePrefix: "devoirs", storage: SecureStore })],
});
