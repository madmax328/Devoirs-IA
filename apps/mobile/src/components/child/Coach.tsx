import { radius, spacing } from "@devoirs/ui";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

/** Le coach (personnage provisoire, en attendant les illustrations). */
export function Coach({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
      <View
        accessible={false}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: c.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: c.onAccent, fontSize: 26 }}>✦</Text>
      </View>
      <View
        style={{
          flex: 1,
          gap: spacing.sm,
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          borderTopLeftRadius: 4,
          padding: spacing.lg,
        }}
      >
        {children}
      </View>
    </View>
  );
}
