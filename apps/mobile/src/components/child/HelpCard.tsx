import { radius, spacing } from "@devoirs/ui";
import { Linking, View } from "react-native";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Body, Button, Title } from "../ui";

/** Numéros d'aide en cas de détresse : un appui lance l'appel. */
export function HelpCard() {
  const c = useTheme();
  return (
    <View
      style={{
        borderWidth: 3,
        borderColor: c.accent,
        borderRadius: radius.lg,
        padding: spacing.xl,
        gap: spacing.md,
        backgroundColor: c.surface,
      }}
    >
      <Title>{t("safety.distressTitle")}</Title>
      <Button
        label={t("safety.call3018")}
        variant="accent"
        onPress={() => void Linking.openURL("tel:3018")}
      />
      <Body muted>{t("safety.call3018Detail")}</Body>
      <Button label={t("safety.call119")} variant="accent" onPress={() => void Linking.openURL("tel:119")} />
      <Body muted>{t("safety.call119Detail")}</Body>
      <Body>{t("safety.emergency")}</Body>
    </View>
  );
}
