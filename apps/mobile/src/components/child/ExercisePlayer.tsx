import {
  draftToResponse,
  emptyDraft,
  isDraftComplete,
  setPair,
  toggleChoice,
  toggleOrderItem,
  type Draft,
  type PublicExercise,
  type StudentResponse,
} from "@devoirs/shared";
import { fontSize, minTouchTarget, radius, spacing } from "@devoirs/ui";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Body, Button } from "../ui";

type Props = {
  exercise: PublicExercise;
  disabled?: boolean;
  onSubmit: (r: StudentResponse) => void;
  onSkip?: () => void;
};

function Option({
  label,
  selected,
  active,
  onPress,
  disabled,
  right,
}: {
  label: string;
  selected: boolean;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  right?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={right ? `${label}, ${right}` : label}
      onPress={onPress}
      disabled={disabled}
      style={{
        minHeight: minTouchTarget,
        borderWidth: 2,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        justifyContent: "center",
        borderColor: active ? c.accent : selected ? c.primary : c.border,
        backgroundColor: selected ? c.surfaceAlt : c.surface,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ color: c.text, fontSize: fontSize.lg, fontWeight: selected ? "800" : "500" }}>
        {label}
      </Text>
      {right ? <Text style={{ color: c.textMuted, fontSize: fontSize.sm }}>{right}</Text> : null}
    </Pressable>
  );
}

/** Affiche un exercice et recueille la réponse (même logique que le site, via @devoirs/shared). */
export function ExercisePlayer({ exercise, disabled, onSubmit, onSkip }: Props) {
  const c = useTheme();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(exercise));
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const p = exercise.payload;
  const inputStyle = {
    minHeight: minTouchTarget,
    borderWidth: 2,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: c.text,
    backgroundColor: c.surface,
    fontSize: fontSize.lg,
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: c.text, fontSize: fontSize.xl, lineHeight: 30 }}>{exercise.statement}</Text>

      {p.type === "MCQ" && draft.type === "MCQ" && (
        <View style={{ gap: spacing.sm }}>
          <Body muted>{p.multiple ? t("exercisePlayer.chooseMany") : t("exercisePlayer.chooseOne")}</Body>
          {p.choices.map((choice, i) => (
            <Option
              key={i}
              label={choice}
              selected={draft.selected.includes(i)}
              disabled={disabled}
              onPress={() => setDraft(toggleChoice(draft, i, p.multiple))}
            />
          ))}
        </View>
      )}

      {p.type === "NUMERIC" && draft.type === "NUMERIC" && (
        <View style={{ gap: spacing.sm }}>
          <Body>
            {t("exercisePlayer.yourAnswer")}
            {p.unit ? ` (${t("exercisePlayer.unit", { unit: p.unit })})` : ""}
          </Body>
          <TextInput
            accessibilityLabel={t("exercisePlayer.yourAnswer")}
            keyboardType="numbers-and-punctuation"
            placeholder={t("exercisePlayer.numberPlaceholder")}
            placeholderTextColor={c.textMuted}
            value={draft.value}
            onChangeText={(v) => setDraft({ ...draft, value: v })}
            editable={!disabled}
            style={[inputStyle, { fontSize: 24 }]}
          />
          {p.format === "fraction_simplified" && <Body muted>{t("exercisePlayer.expectFraction")}</Body>}
          {p.format === "integer" && <Body muted>{t("exercisePlayer.expectInteger")}</Body>}
          {p.format === "decimal" && <Body muted>{t("exercisePlayer.expectDecimal")}</Body>}
        </View>
      )}

      {p.type === "FILL_BLANKS" && draft.type === "FILL_BLANKS" && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs }}>
          {p.segments.map((s, i) =>
            "text" in s ? (
              <Text key={i} style={{ color: c.text, fontSize: fontSize.lg }}>
                {s.text}
              </Text>
            ) : (
              <TextInput
                key={i}
                accessibilityLabel={t("exercisePlayer.blankLabel", { n: s.blankId })}
                autoCapitalize="none"
                autoCorrect={false}
                value={draft.values[s.blankId] ?? ""}
                onChangeText={(v) => setDraft({ ...draft, values: { ...draft.values, [s.blankId]: v } })}
                editable={!disabled}
                style={[inputStyle, { minWidth: 130 }]}
              />
            ),
          )}
        </View>
      )}

      {p.type === "MATCHING" && draft.type === "MATCHING" && (
        <View style={{ gap: spacing.sm }}>
          <Body muted>{t("exercisePlayer.matchingHelp")}</Body>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              {p.left.map((l, li) => {
                const paired = p.right.find((r) => r.index === draft.pairs[li]);
                return (
                  <Option
                    key={li}
                    label={l}
                    right={paired ? `→ ${paired.label}` : undefined}
                    selected={paired !== undefined}
                    active={activeLeft === li}
                    disabled={disabled}
                    onPress={() => setActiveLeft(li)}
                  />
                );
              })}
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              {p.right.map((r) => (
                <Option
                  key={r.index}
                  label={r.label}
                  selected={Object.values(draft.pairs).includes(r.index)}
                  disabled={disabled || activeLeft === null}
                  onPress={() => {
                    if (activeLeft === null) return;
                    setDraft(setPair(draft, activeLeft, r.index));
                    setActiveLeft(null);
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {p.type === "ORDERING" && draft.type === "ORDERING" && (
        <View style={{ gap: spacing.sm }}>
          <Body muted>{t("exercisePlayer.orderingHelp")}</Body>
          {p.items.map((item) => {
            const pos = draft.order.indexOf(item);
            return (
              <Option
                key={item}
                label={item}
                right={pos >= 0 ? `n° ${pos + 1}` : undefined}
                selected={pos >= 0}
                disabled={disabled}
                onPress={() => setDraft(toggleOrderItem(draft, item))}
              />
            );
          })}
          {draft.order.length > 0 && (
            <Button
              label={t("exercisePlayer.orderingReset")}
              variant="secondary"
              onPress={() => setDraft({ ...draft, order: [] })}
              disabled={disabled}
            />
          )}
        </View>
      )}

      {p.type === "TRUE_FALSE" && draft.type === "TRUE_FALSE" && (
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {([true, false] as const).map((v) => (
            <View key={String(v)} style={{ flex: 1 }}>
              <Option
                label={v ? t("exercisePlayer.true") : t("exercisePlayer.false")}
                selected={draft.value === v}
                disabled={disabled}
                onPress={() => setDraft({ ...draft, value: v })}
              />
            </View>
          ))}
        </View>
      )}

      {p.type === "SHORT_TEXT" && draft.type === "SHORT_TEXT" && (
        <TextInput
          accessibilityLabel={t("exercisePlayer.yourAnswer")}
          multiline
          value={draft.text}
          onChangeText={(v) => setDraft({ ...draft, text: v })}
          editable={!disabled}
          style={[inputStyle, { minHeight: 120, textAlignVertical: "top", paddingTop: spacing.md }]}
        />
      )}

      <Button
        label={t("diagnostic.validate")}
        onPress={() => onSubmit(draftToResponse(draft))}
        disabled={disabled || !isDraftComplete(exercise, draft)}
      />
      {onSkip && (
        <Button label={t("diagnostic.dontKnow")} variant="secondary" onPress={onSkip} disabled={disabled} />
      )}
    </View>
  );
}
