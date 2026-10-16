import type { HomeworkListItem } from "@devoirs/shared";
import { fontSize } from "@devoirs/ui";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { Body, Button, Card, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function HomeworkList() {
  const c = useTheme();
  const [items, setItems] = useState<HomeworkListItem[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      api<{ items: HomeworkListItem[] }>("/api/child/homework", { asChild: true })
        .then((r) => setItems(r.items))
        .catch(() => router.replace("/enfant"));
    }, []),
  );
  return (
    <Screen>
      <Title>{t("homework.title")}</Title>
      <Button label={`📷 ${t("homework.newHelp")}`} onPress={() => router.push("/enfant/devoirs/nouveau")} />
      <Title>{t("homework.historyTitle")}</Title>
      {items === null && <ActivityIndicator color={c.primary} />}
      {items?.length === 0 && <Body muted>{t("homework.historyEmpty")}</Body>}
      {items?.map((h) => (
        <Pressable
          key={h.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/enfant/devoirs/[id]", params: { id: h.id } })}
        >
          <Card>
            <Text style={{ color: c.text, fontSize: fontSize.lg, fontWeight: "800" }}>
              {h.subject ? t(`subjects.${h.subject}`) : t("homework.newHelp")}
            </Text>
            <Body muted>
              {new Date(h.createdAt).toLocaleDateString("fr-FR")}{" "}
              {h.exerciseKind ? `· ${h.exerciseKind}` : ""} · {t(`homework.statuses.${h.status}`)}
            </Body>
          </Card>
        </Pressable>
      ))}
      <Button
        label={t("diagnostic.backHome")}
        variant="secondary"
        onPress={() => router.replace("/enfant/accueil")}
      />
    </Screen>
  );
}
