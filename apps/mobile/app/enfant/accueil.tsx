import type { ChildPublic } from "@devoirs/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Body, Button, Card, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

export default function ChildHome() {
  const c = useTheme();
  const [child, setChild] = useState<ChildPublic | null>(null);

  useEffect(() => {
    api<{ child: ChildPublic }>("/api/child/me", { asChild: true })
      .then((r) => setChild(r.child))
      .catch(() => router.replace("/enfant"));
  }, []);

  async function switchProfile() {
    await api("/api/child-session", { method: "DELETE", asChild: true }).catch(() => undefined);
    await secureStorage.remove(STORAGE_KEYS.childToken);
    router.replace("/enfant");
  }

  if (!child)
    return (
      <Screen center>
        <ActivityIndicator color={c.primary} />
      </Screen>
    );

  return (
    <Screen center>
      <Avatar id={child.avatar} size={120} />
      <Title>{t("childSpace.hello", { name: child.displayName })}</Title>
      <Card>
        <Body center>{t("childSpace.comingSoon")}</Body>
      </Card>
      <Button label={t("childSpace.switchProfile")} variant="secondary" onPress={switchProfile} />
    </Screen>
  );
}
