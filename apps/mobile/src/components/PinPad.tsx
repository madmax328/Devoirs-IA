import { PIN_LENGTH } from "@devoirs/shared";
import { radius, spacing } from "@devoirs/ui";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, Text, View } from "react-native";
import { t } from "@/lib/i18n";
import { PIN_KEYS, pressPinKey } from "@/lib/pin";
import { useTheme } from "@/lib/theme";

export function PinPad({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center", gap: spacing.xl }}>
      <View accessibilityLabel={t("childSpace.enterPin")} style={{ flexDirection: "row", gap: spacing.lg }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: c.primary,
              backgroundColor: i < value.length ? c.primary : "transparent",
            }}
          />
        ))}
      </View>
      <View
        style={{ width: 3 * 80 + 2 * spacing.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}
      >
        {PIN_KEYS.map((k, i) =>
          k === null ? (
            <View key={i} style={{ width: 80, height: 80 }} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={k === "back" ? t("common.back") : k}
              disabled={disabled}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                onChange(pressPinKey(value, k));
              }}
              style={({ pressed }) => ({
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 2,
                borderColor: c.border,
                backgroundColor: pressed ? c.surfaceAlt : c.surface,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Text style={{ color: c.text, fontSize: 28, fontWeight: "800" }}>{k === "back" ? "⌫" : k}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}
