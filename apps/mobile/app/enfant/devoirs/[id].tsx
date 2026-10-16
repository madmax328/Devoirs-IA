import type { HomeworkView } from "@devoirs/shared";
import { fontSize, radius, spacing } from "@devoirs/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { Coach } from "@/components/child/Coach";
import { HelpCard } from "@/components/child/HelpCard";
import { Body, Button, Card, ErrorText, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function HomeworkSession() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hw, setHw] = useState<HomeworkView | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<HomeworkView>(`/api/child/homework/${id}`, { asChild: true })
      .then((v) => {
        setHw(v);
        setStatement(v.analysis?.statement ?? "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errors.generic")));
  }, [id]);

  async function call(path: string, body: object): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      setHw(await api<HomeworkView>(path, { method: "POST", asChild: true, body }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
      return false;
    } finally {
      setPending(false);
    }
  }

  if (!hw)
    return (
      <Screen center>
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={c.primary} />}
      </Screen>
    );
  const a = hw.analysis;
  const inputStyle = {
    minHeight: 90,
    borderWidth: 2,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: c.text,
    backgroundColor: c.surface,
    fontSize: fontSize.md,
    textAlignVertical: "top" as const,
  };

  if (hw.status === "UNREADABLE" || hw.status === "OUT_OF_SCOPE") {
    return (
      <Screen>
        <Title>
          {hw.status === "UNREADABLE" ? t("homework.unreadableTitle") : t("homework.outOfScopeTitle")}
        </Title>
        <Coach>
          <Body>
            {hw.status === "UNREADABLE"
              ? (a?.unreadableReason ?? t("homework.analysisFailed"))
              : t("homework.outOfScopeMessage")}
          </Body>
          <Body muted>{t("homework.photoTip")}</Body>
        </Coach>
        <Button label={t("homework.retakePhoto")} onPress={() => router.replace("/enfant/devoirs/nouveau")} />
      </Screen>
    );
  }

  if (hw.status === "TO_CONFIRM" && a) {
    return (
      <Screen>
        <Title>{t("homework.confirmTitle")}</Title>
        <Body muted>
          {t("homework.detected", {
            subject: a.subject ? t(`subjects.${a.subject}`) : "?",
            level: a.level ? t(`levels.${a.level}`) : "?",
            kind: a.exerciseKind,
          })}
        </Body>
        {a.outOfScope === "above_level" && (
          <Coach>
            <Body>{t("homework.aboveLevel")}</Body>
          </Coach>
        )}
        {editing ? (
          <TextInput
            accessibilityLabel={t("homework.confirmTitle")}
            multiline
            value={statement}
            onChangeText={setStatement}
            style={[inputStyle, { minHeight: 160 }]}
          />
        ) : (
          <Card>
            <Text style={{ color: c.text, fontSize: fontSize.lg, lineHeight: 26 }}>{a.statement}</Text>
          </Card>
        )}
        {pending ? (
          <Body muted>{t("homework.coachThinking")}</Body>
        ) : editing ? (
          <Button
            label={t("homework.confirmSaveEdit")}
            disabled={statement.trim().length < 5}
            onPress={() =>
              void call(`/api/child/homework/${hw.id}/confirm`, { correctedStatement: statement })
            }
          />
        ) : (
          <>
            <Button
              label={t("homework.confirmYes")}
              onPress={() => void call(`/api/child/homework/${hw.id}/confirm`, { correctedStatement: null })}
            />
            <Button label={t("homework.confirmEdit")} variant="secondary" onPress={() => setEditing(true)} />
          </>
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Screen>
    );
  }

  const active = hw.status === "IN_PROGRESS";
  return (
    <Screen>
      {a && <Body muted>{`${a.subject ? t(`subjects.${a.subject}`) : ""} · ${a.exerciseKind}`}</Body>}
      <View style={{ gap: spacing.md }} accessibilityLiveRegion="polite">
        {hw.messages.map((m) => {
          const coach = m.role === "coach";
          const label =
            !coach && m.action === "hint" && !m.text
              ? `💡 ${t("homework.hint")}`
              : !coach && m.action === "stuck"
                ? `🆘 ${t("homework.stuck")}`
                : m.text;
          return (
            <View
              key={m.id}
              style={{
                alignSelf: coach ? "flex-start" : "flex-end",
                maxWidth: "88%",
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: coach ? c.surface : c.primary,
                borderWidth: coach ? 1 : 0,
                borderColor: c.border,
              }}
            >
              <Text style={{ color: coach ? c.textMuted : c.onPrimary, fontSize: 12 }}>
                {coach ? t("homework.coach") : t("homework.you")}
                {m.hintLevel ? ` · ${t("homework.hintUsed", { level: m.hintLevel })}` : ""}
              </Text>
              <Text style={{ color: coach ? c.text : c.onPrimary, fontSize: fontSize.md, lineHeight: 22 }}>
                {label}
              </Text>
            </View>
          );
        })}
        {pending && <Body muted>{t("homework.coachThinking")}</Body>}
      </View>

      {hw.status === "SAFETY_STOP" && <HelpCard />}

      {hw.status === "COMPLETED" && hw.recap && (
        <Card>
          <Title>{t("homework.finishedTitle")}</Title>
          {hw.recap.learned.length > 0 && <Body>{t("homework.learnedTitle")}</Body>}
          {hw.recap.learned.map((l, i) => (
            <Body key={i}>✓ {l}</Body>
          ))}
          {hw.recap.notionsToWork.length > 0 && <Body>{t("homework.toWorkTitle")}</Body>}
          {hw.recap.notionsToWork.map((n) => (
            <Body key={n.id} muted>
              • {n.title}
            </Body>
          ))}
        </Card>
      )}

      {active && (
        <>
          <TextInput
            accessibilityLabel={t("homework.yourMessage")}
            placeholder={t("homework.messagePlaceholder")}
            placeholderTextColor={c.textMuted}
            multiline
            value={text}
            onChangeText={setText}
            maxLength={1000}
            editable={!pending}
            style={inputStyle}
          />
          <Button
            label={t("homework.sendMessage")}
            disabled={pending || !text.trim()}
            onPress={async () => {
              if (await call(`/api/child/homework/${hw.id}/messages`, { action: "message", text }))
                setText("");
            }}
          />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={`💡 ${t("homework.hint")}`}
                variant="secondary"
                disabled={pending}
                onPress={() =>
                  void call(`/api/child/homework/${hw.id}/messages`, { action: "hint", text: "" })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={`🆘 ${t("homework.stuck")}`}
                variant="secondary"
                disabled={pending}
                onPress={() =>
                  void call(`/api/child/homework/${hw.id}/messages`, { action: "stuck", text: "" })
                }
              />
            </View>
          </View>
        </>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        label={t("homework.backToList")}
        variant="secondary"
        onPress={() => router.replace("/enfant/devoirs")}
      />
    </Screen>
  );
}
