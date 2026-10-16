import type { ChildPublic, DiagnosticOverviewItem } from "@devoirs/shared";
import { fontSize, spacing } from "@devoirs/ui";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Coach } from "@/components/child/Coach";
import { Body, Button, Card, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

export default function ChildHome() {
  const c = useTheme();
  const [child, setChild] = useState<ChildPublic | null>(null);
  const [items, setItems] = useState<DiagnosticOverviewItem[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        api<{ child: ChildPublic }>("/api/child/me", { asChild: true }),
        api<{ items: DiagnosticOverviewItem[] }>("/api/child/diagnostic", { asChild: true }),
      ])
        .then(([me, ov]) => {
          if (!active) return;
          setChild(me.child);
          setItems(ov.items);
        })
        .catch(() => router.replace("/enfant"));
      return () => {
        active = false;
      };
    }, []),
  );

  async function switchProfile() {
    await api("/api/child-session", { method: "DELETE", asChild: true }).catch(() => undefined);
    await secureStorage.remove(STORAGE_KEYS.childToken);
    router.replace("/enfant");
  }

  if (!child || !items) {
    return (
      <Screen center>
        <ActivityIndicator color={c.primary} />
      </Screen>
    );
  }

  const firstTime = items.every((i) => i.status === "NOT_STARTED" || i.status === "UNAVAILABLE");
  const open = (subject: string) =>
    router.push({ pathname: "/enfant/diagnostic/[subject]", params: { subject } });

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Avatar id={child.avatar} />
        <Title>{t("childSpace.hello", { name: child.displayName })}</Title>
      </View>
      <Coach>
        {firstTime ? (
          <>
            <Text style={{ color: c.text, fontSize: fontSize.md, fontWeight: "800" }}>
              {t("coach.hello", { name: child.displayName })}
            </Text>
            <Body>{t("coach.intro1")}</Body>
            <Body>{t("coach.intro2")}</Body>
            <Body>{t("coach.intro3")}</Body>
          </>
        ) : (
          <Body>{t("diagnostic.subtitle")}</Body>
        )}
      </Coach>
      <Card>
        <Text style={{ color: c.text, fontSize: fontSize.lg, fontWeight: "800" }}>
          📷 {t("homework.newHelp")}
        </Text>
        <Body muted>{t("homework.newHelpHint")}</Body>
        <Button label={t("homework.title")} onPress={() => router.push("/enfant/devoirs")} />
      </Card>
      <Title>{t("diagnostic.title")}</Title>
      {items.map((item) => (
        <Card key={item.subject}>
          <Text style={{ color: c.text, fontSize: fontSize.lg, fontWeight: "800" }}>
            {t(`subjects.${item.subject}`)}
          </Text>
          {item.status === "IN_PROGRESS" && item.progress && (
            <Body muted>{t("diagnostic.progress", { n: item.progress.asked, max: item.progress.max })}</Body>
          )}
          {item.status === "COMPLETED" && item.summary && (
            <Body muted>
              ✓ {item.summary.mastered.length} · {t("diagnostic.toWorkTitle").toLowerCase()} :{" "}
              {item.summary.toWork.length}
            </Body>
          )}
          {item.status === "UNAVAILABLE" && <Body muted>{t("diagnostic.unavailableMessage")}</Body>}
          {item.status === "NOT_STARTED" && (
            <Button
              label={firstTime ? t("coach.letsGo") : t("diagnostic.start")}
              onPress={() => open(item.subject)}
            />
          )}
          {item.status === "IN_PROGRESS" && (
            <Button label={t("diagnostic.resume")} onPress={() => open(item.subject)} />
          )}
          {item.status === "COMPLETED" && <Body>{t("diagnostic.done")} ✓</Body>}
        </Card>
      ))}
      <Button label={t("childSpace.switchProfile")} variant="secondary" onPress={switchProfile} />
    </Screen>
  );
}
