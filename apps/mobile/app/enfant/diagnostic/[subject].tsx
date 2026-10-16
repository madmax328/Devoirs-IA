import { SUBJECTS, type DiagnosticStep, type StudentResponse, type Subject } from "@devoirs/shared";
import { translate, DEFAULT_LOCALE, type MessageKey } from "@devoirs/shared/i18n";
import { radius, spacing } from "@devoirs/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Coach } from "@/components/child/Coach";
import { ExercisePlayer } from "@/components/child/ExercisePlayer";
import { Body, Button, Card, ErrorText, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const SHOWN = 3;

export default function DiagnosticScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ subject: string }>();
  const subject = (SUBJECTS as readonly string[]).includes(params.subject ?? "")
    ? (params.subject as Subject)
    : null;
  const [step, setStep] = useState<DiagnosticStep | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    if (!subject) return;
    api<DiagnosticStep>("/api/child/diagnostic", { method: "POST", body: { subject }, asChild: true })
      .then((s) => {
        setStep(s);
        shownAt.current = Date.now();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errors.generic")));
  }, [subject]);

  const send = useCallback(
    async (body: { response: StudentResponse } | { skipped: true }) => {
      if (!step?.exercise) return;
      setPending(true);
      setError(null);
      try {
        const next = await api<DiagnosticStep>(`/api/child/diagnostic/${step.sessionId}/answer`, {
          method: "POST",
          asChild: true,
          body: { exerciseId: step.exercise.id, durationMs: Date.now() - shownAt.current, ...body },
        });
        setStep(next);
        setShowFeedback(next.feedback !== null && next.feedback.kind !== "retry");
        if (next.exercise?.id !== step.exercise.id) shownAt.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setPending(false);
      }
    },
    [step],
  );

  if (!step) {
    return (
      <Screen center>
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={c.primary} />}
      </Screen>
    );
  }
  const feedbackText = step.feedback
    ? translate(DEFAULT_LOCALE, step.feedback.messageKey as MessageKey)
    : null;

  if (showFeedback && feedbackText) {
    return (
      <Screen center>
        <View
          accessibilityLiveRegion="polite"
          style={{
            borderWidth: 2,
            borderColor: step.feedback?.kind === "good" ? c.primary : c.accent,
            borderRadius: radius.lg,
            padding: spacing.xl,
            backgroundColor: c.surface,
            width: "100%",
          }}
        >
          <Text style={{ color: c.text, fontSize: 22, fontWeight: "800", textAlign: "center" }}>
            {feedbackText}
          </Text>
        </View>
        <Button label={t("diagnostic.continue")} onPress={() => setShowFeedback(false)} />
      </Screen>
    );
  }

  if (!step.exercise) {
    const s = step.summary;
    return (
      <Screen>
        <Title>{t("diagnostic.finishedTitle")}</Title>
        <Coach>
          <Body>{t("diagnostic.finishedIntro")}</Body>
        </Coach>
        {s && (
          <>
            <Card>
              <Title>{t("diagnostic.masteredTitle")}</Title>
              {s.mastered.length === 0 ? (
                <Body muted>{t("diagnostic.nothingMastered")}</Body>
              ) : (
                s.mastered.map((n) => <Body key={n.id}>✓ {n.title}</Body>)
              )}
            </Card>
            <Card>
              <Title>{t("diagnostic.toWorkTitle")}</Title>
              {s.toWork.length === 0 ? (
                <Body muted>{t("diagnostic.nothingToWork")}</Body>
              ) : (
                <>
                  <Body muted>{t("diagnostic.toWorkHint")}</Body>
                  {s.toWork.slice(0, SHOWN).map((n, i) => (
                    <Body key={n.id}>
                      {i + 1}. {n.title}
                    </Body>
                  ))}
                  {s.toWork.length > SHOWN && (
                    <Body muted>{t("diagnostic.andMore", { n: s.toWork.length - SHOWN })}</Body>
                  )}
                </>
              )}
            </Card>
          </>
        )}
        <Button label={t("diagnostic.backHome")} onPress={() => router.replace("/enfant/accueil")} />
      </Screen>
    );
  }

  const pct = step.progress.asked / step.progress.max;
  return (
    <Screen>
      <Body muted>
        {t("diagnostic.title")} · {subject ? t(`subjects.${subject}`) : ""}
      </Body>
      <View style={{ height: 10, backgroundColor: c.surfaceAlt, borderRadius: 5, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, height: "100%", backgroundColor: c.primary }} />
      </View>
      <Body muted>{t("diagnostic.progress", { n: step.progress.asked + 1, max: step.progress.max })}</Body>
      {step.feedback?.kind === "retry" && feedbackText ? <ErrorText>{feedbackText}</ErrorText> : null}
      <ExercisePlayer
        key={step.exercise.id}
        exercise={step.exercise}
        disabled={pending}
        onSubmit={(response) => void send({ response })}
        onSkip={() => void send({ skipped: true })}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Body muted center>
        {t("diagnostic.canStop")}
      </Body>
      <Button
        label={t("diagnostic.backHome")}
        variant="secondary"
        onPress={() => router.replace("/enfant/accueil")}
      />
    </Screen>
  );
}
