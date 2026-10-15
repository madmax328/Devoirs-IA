import { MAX_CHILDREN_PER_PARENT } from "@devoirs/shared";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Body, Button, Card, ErrorText, Screen, Title } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useChildren } from "@/lib/use-children";

export default function ParentHome() {
  const c = useTheme();
  const { children, error } = useChildren();

  return (
    <Screen>
      <Title>{t("parent.dashboardTitle")}</Title>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {children === null && !error ? <ActivityIndicator color={c.primary} /> : null}
      {children?.length === 0 ? <Body muted>{t("parent.noChildren")}</Body> : null}

      {children?.map((child) => (
        <Pressable
          key={child.id}
          accessibilityRole="button"
          accessibilityLabel={`${child.displayName}, ${t(`levels.${child.level}`)}`}
          onPress={() => router.push({ pathname: "/parent/enfant/[id]", params: { id: child.id } })}
        >
          <Card>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
              <Avatar id={child.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{child.displayName}</Text>
                <Body muted>
                  {t("parent.levelLabel")} : {t(`levels.${child.level}`)}
                </Body>
              </View>
            </View>
          </Card>
        </Pressable>
      ))}

      {children && children.length > 0 ? (
        <Button
          label={t("parent.openChildSpace")}
          variant="accent"
          onPress={() => router.replace("/enfant")}
        />
      ) : null}
      {children && children.length < MAX_CHILDREN_PER_PARENT ? (
        <Button label={t("parent.addChild")} onPress={() => router.push("/parent/enfant-nouveau")} />
      ) : null}
      {children && children.length >= MAX_CHILDREN_PER_PARENT ? (
        <Body muted>{t("parent.maxChildren", { max: MAX_CHILDREN_PER_PARENT })}</Body>
      ) : null}

      <Button
        label={t("auth.logout")}
        variant="secondary"
        onPress={async () => {
          await authClient.signOut();
          router.replace("/connexion");
        }}
      />
    </Screen>
  );
}
