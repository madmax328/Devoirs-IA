import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

/** Aiguillage : connexion parent, espace enfant (appareil dédié) ou espace parent. */
export default function Index() {
  const c = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [dedicated, setDedicated] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void secureStorage.get(STORAGE_KEYS.dedicatedChildId).then(setDedicated);
  }, []);

  if (isPending || dedicated === undefined) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}
      >
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/connexion" />;
  return <Redirect href={dedicated ? "/enfant" : "/parent"} />;
}
