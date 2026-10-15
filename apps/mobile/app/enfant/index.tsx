import { PIN_LENGTH, type ChildPublic } from "@devoirs/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { PinPad } from "@/components/PinPad";
import { Body, Button, ErrorText, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { useChildren } from "@/lib/use-children";

/** Choix du profil puis code PIN. */
export default function ChildEntry() {
  const c = useTheme();
  const { children, error: loadError } = useChildren();
  const [selected, setSelected] = useState<ChildPublic | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Un seul enfant, ou appareil dédié : on présélectionne le profil.
  useEffect(() => {
    if (!children || selected) return;
    void secureStorage.get(STORAGE_KEYS.dedicatedChildId).then((dedicatedId) => {
      const match =
        children.find((ch) => ch.id === dedicatedId) ?? (children.length === 1 ? children[0] : undefined);
      if (match) setSelected(match);
    });
  }, [children, selected]);

  useEffect(() => {
    if (!selected || pin.length !== PIN_LENGTH) return;
    setPending(true);
    api<{ token: string }>("/api/child-session", { method: "POST", body: { childId: selected.id, pin } })
      .then(async ({ token }) => {
        await secureStorage.set(STORAGE_KEYS.childToken, token);
        router.replace("/enfant/accueil");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("errors.generic"));
        setPin("");
        setPending(false);
      });
  }, [pin, selected]);

  if (!children) {
    return (
      <Screen center>
        {loadError ? <ErrorText>{loadError}</ErrorText> : <ActivityIndicator color={c.primary} />}
      </Screen>
    );
  }

  if (!selected) {
    return (
      <Screen center>
        <Title>{t("childSpace.whoAreYou")}</Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
          {children.map((ch) => (
            <Pressable
              key={ch.id}
              accessibilityRole="button"
              accessibilityLabel={ch.displayName}
              onPress={() => setSelected(ch)}
              style={{ alignItems: "center", gap: 8 }}
            >
              <Avatar id={ch.avatar} size={96} />
              <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{ch.displayName}</Text>
            </Pressable>
          ))}
        </View>
        <Button
          label={t("childSpace.parentArea")}
          variant="secondary"
          onPress={() => router.push("/deverrouiller")}
        />
      </Screen>
    );
  }

  return (
    <Screen center>
      <Avatar id={selected.avatar} size={96} />
      <Title>{t("childSpace.hello", { name: selected.displayName })}</Title>
      <Body center>{t("childSpace.enterPin")}</Body>
      <PinPad
        value={pin}
        onChange={(v) => {
          setError(null);
          setPin(v);
        }}
        disabled={pending}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      {children.length > 1 ? (
        <Button
          label={t("childSpace.switchProfile")}
          variant="secondary"
          onPress={() => {
            setSelected(null);
            setPin("");
            setError(null);
          }}
        />
      ) : (
        <Button
          label={t("childSpace.parentArea")}
          variant="secondary"
          onPress={() => router.push("/deverrouiller")}
        />
      )}
    </Screen>
  );
}
