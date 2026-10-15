import { router } from "expo-router";
import { useState } from "react";
import { Body, Button, Card, ErrorText, Field, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";

/** Depuis l'espace enfant, l'accès à l'espace parent demande le mot de passe du parent. */
export default function UnlockParent() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function unlock() {
    setError(null);
    setPending(true);
    try {
      await api("/api/parent/unlock", { method: "POST", body: { password } });
      await api("/api/child-session", { method: "DELETE", asChild: true }).catch(() => undefined);
      await secureStorage.remove(STORAGE_KEYS.childToken);
      router.replace("/parent");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
      setPending(false);
    }
  }

  return (
    <Screen>
      <Title>{t("childSpace.parentArea")}</Title>
      <Card>
        <Body muted>{t("parent.unlockHint")}</Body>
        <Field
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button label={t("common.continue")} onPress={unlock} loading={pending} />
        <Button label={t("common.back")} variant="secondary" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}
