import { MAX_HOMEWORK_PHOTOS, type HomeworkView } from "@devoirs/shared";
import { radius, spacing } from "@devoirs/ui";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Coach } from "@/components/child/Coach";
import { Body, Button, ErrorText, Field, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { pickPhoto, type PickedPhoto } from "@/lib/photo";

export default function NewHomework() {
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(source: "camera" | "library") {
    setError(null);
    try {
      const p = await pickPhoto(source);
      if (p === "denied") setError(t("errors.forbidden"));
      else if (p) setPhotos((cur) => [...cur, p].slice(0, MAX_HOMEWORK_PHOTOS));
    } catch {
      setError(t("homework.photoTooBig"));
    }
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      const hw = await api<HomeworkView>("/api/child/homework", {
        method: "POST",
        asChild: true,
        body: {
          photos: photos.map(({ mediaType, base64 }) => ({ mediaType, base64 })),
          text: text.trim() || null,
        },
      });
      router.replace({ pathname: "/enfant/devoirs/[id]", params: { id: hw.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
      setPending(false);
    }
  }

  if (pending) {
    return (
      <Screen center>
        <Coach>
          <Body>{t("homework.reading")}</Body>
        </Coach>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{t("homework.newHelp")}</Title>
      <Coach>
        <Body>{t("homework.newHelpHint")}</Body>
        <Body muted>{t("homework.photoTip")}</Body>
      </Coach>
      {photos.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {photos.map((p, i) => (
            <Pressable
              key={p.uri}
              accessibilityRole="button"
              accessibilityLabel={t("homework.removePhoto")}
              onPress={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
            >
              <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: radius.md }} />
            </Pressable>
          ))}
        </View>
      )}
      {photos.length < MAX_HOMEWORK_PHOTOS && (
        <>
          <Button
            label={`📷 ${photos.length === 0 ? t("homework.takePhoto") : t("homework.addPhoto")}`}
            onPress={() => void add("camera")}
          />
          <Button label={t("homework.choosePhoto")} variant="secondary" onPress={() => void add("library")} />
        </>
      )}
      <Field
        label={t("homework.orType")}
        placeholder={t("homework.typePlaceholder")}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={4000}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        label={t("homework.send")}
        onPress={send}
        disabled={photos.length === 0 && text.trim().length === 0}
      />
    </Screen>
  );
}
