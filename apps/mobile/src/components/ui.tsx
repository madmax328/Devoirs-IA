import { fontSize, minTouchTarget, radius, spacing } from "@devoirs/ui";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

export function Screen({ children, center = false }: { children: ReactNode; center?: boolean }) {
  const c = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          center && { flexGrow: 1, justifyContent: "center", alignItems: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted = false,
  center = false,
}: {
  children: ReactNode;
  muted?: boolean;
  center?: boolean;
}) {
  const c = useTheme();
  return (
    <Text
      style={{
        color: muted ? c.textMuted : c.text,
        fontSize: fontSize.md,
        lineHeight: 22,
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </Text>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: c.danger, fontWeight: "700", fontSize: fontSize.md }}
    >
      {children}
    </Text>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "accent" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const c = useTheme();
  const filled = variant === "primary" || variant === "accent";
  const bg = variant === "primary" ? c.primary : variant === "accent" ? c.accent : "transparent";
  const fg =
    variant === "primary"
      ? c.onPrimary
      : variant === "accent"
        ? c.onAccent
        : variant === "danger"
          ? c.danger
          : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: filled ? bg : fg, opacity: disabled ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: c.text, fontWeight: "700", fontSize: fontSize.md }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
        {...input}
      />
      {hint ? <Text style={{ color: c.textMuted, fontSize: fontSize.sm }}>{hint}</Text> : null}
    </View>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start", minHeight: 44 }}
    >
      <View
        style={[styles.box, { borderColor: c.primary, backgroundColor: checked ? c.primary : "transparent" }]}
      >
        {checked ? <Text style={{ color: c.onPrimary, fontWeight: "900" }}>✓</Text> : null}
      </View>
      <Text style={{ color: c.text, flex: 1, fontSize: fontSize.md, lineHeight: 22 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.surfaceAlt : c.surface,
        },
      ]}
    >
      {children}
      <Text style={{ color: c.text, fontWeight: selected ? "800" : "500" }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  button: {
    minHeight: minTouchTarget,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  buttonText: { fontSize: fontSize.lg, fontWeight: "800" },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    minHeight: minTouchTarget,
    minWidth: 88,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
