import {
  AVATARS,
  CHILD_LEVELS,
  SUBJECTS,
  createChildSchema,
  defaultChildSettings,
  updateChildSchema,
  type Avatar as AvatarId,
  type ChildLevel,
  type ChildPublic,
  type Subject,
} from "@devoirs/shared";
import { Text } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { api } from "@/lib/api";
import { t, tError } from "@/lib/i18n";
import { avatarEmoji } from "./Avatar";
import { Body, Button, Card, Checkbox, Chip, ErrorText, Field, Row, Screen, Title } from "./ui";

export function ChildForm({ child }: { child?: ChildPublic }) {
  const editing = child !== undefined;
  const initial = child?.settings ?? defaultChildSettings();
  const [displayName, setDisplayName] = useState(child?.displayName ?? "");
  const [level, setLevel] = useState<ChildLevel>(child?.level ?? "SIXIEME");
  const [avatar, setAvatar] = useState<AvatarId>(child?.avatar ?? "renard");
  const [subjects, setSubjects] = useState<Subject[]>(initial.subjects);
  const [curfew, setCurfew] = useState(initial.curfew);
  const [dysFont, setDysFont] = useState(initial.dysFont);
  const [pin, setPin] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggle = (s: Subject) =>
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function save() {
    setError(null);
    const settings = { subjects, curfew, dysFont };
    const parsed = editing
      ? updateChildSchema.safeParse({ displayName, level, avatar, settings, ...(pin ? { pin } : {}) })
      : createChildSchema.safeParse({ displayName, level, avatar, pin, settings, parentalConsent: consent });
    if (!parsed.success) {
      setError(tError(parsed.error.issues[0]?.message ?? "errors.generic"));
      return;
    }
    setPending(true);
    try {
      if (editing) await api(`/api/children/${child.id}`, { method: "PATCH", body: parsed.data });
      else await api("/api/children", { method: "POST", body: parsed.data });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
      setPending(false);
    }
  }

  function remove() {
    if (!editing) return;
    Alert.alert(t("common.delete"), t("child.deleteConfirm", { name: child.displayName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/children/${child.id}`, { method: "DELETE" });
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : t("errors.generic"));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Title>{editing ? t("child.editTitle") : t("child.formTitle")}</Title>
      <Card>
        <Field
          label={t("child.displayName")}
          hint={t("child.displayNameHint")}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={20}
          autoCapitalize="words"
        />
        <Body>{t("child.level")}</Body>
        <Row>
          {CHILD_LEVELS.map((l) => (
            <Chip key={l} label={t(`levels.${l}`)} selected={level === l} onPress={() => setLevel(l)} />
          ))}
        </Row>
        <Body>{t("child.avatar")}</Body>
        <Row>
          {AVATARS.map((a) => (
            <Chip key={a} label={t(`avatars.${a}`)} selected={avatar === a} onPress={() => setAvatar(a)}>
              <Text style={{ fontSize: 28 }}>{avatarEmoji(a)}</Text>
            </Chip>
          ))}
        </Row>
        <Body>{t("child.subjects")}</Body>
        <Row>
          {SUBJECTS.map((s) => (
            <Chip
              key={s}
              label={t(`subjects.${s}`)}
              selected={subjects.includes(s)}
              onPress={() => toggle(s)}
            />
          ))}
        </Row>
        <Field
          label={t("child.curfew")}
          hint={t("child.curfewHint")}
          value={curfew}
          onChangeText={setCurfew}
          maxLength={5}
          keyboardType="numbers-and-punctuation"
        />
        <Checkbox label={t("child.dysFont")} checked={dysFont} onChange={setDysFont} />
        <Field
          label={t("child.pin")}
          hint={t("child.pinHint")}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, ""))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder={editing ? "••••" : ""}
        />
      </Card>
      {!editing && (
        <Card>
          <Title>{t("child.consentTitle")}</Title>
          <Body muted>{t("child.consentText")}</Body>
          <Checkbox label={t("child.consentCheckbox")} checked={consent} onChange={setConsent} />
        </Card>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={t("common.save")} onPress={save} loading={pending} />
      {editing && <Button label={t("common.delete")} variant="danger" onPress={remove} disabled={pending} />}
    </Screen>
  );
}
