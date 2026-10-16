"use client";

import { MAX_HOMEWORK_PHOTOS, type HomeworkView } from "@devoirs/shared";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { compressPhoto } from "@/lib/image";
import { Coach } from "./Coach";

type Photo = { mediaType: "image/jpeg"; base64: string; previewUrl: string };

export function NewHomework() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files).slice(0, MAX_HOMEWORK_PHOTOS - photos.length)) {
      try {
        const p = await compressPhoto(file);
        setPhotos((cur) => [...cur, p].slice(0, MAX_HOMEWORK_PHOTOS));
      } catch {
        setError(t("homework.photoTooBig"));
      }
    }
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      const hw = await api<HomeworkView>("/api/child/homework", {
        method: "POST",
        body: {
          photos: photos.map(({ mediaType, base64 }) => ({ mediaType, base64 })),
          text: text.trim() || null,
        },
      });
      router.push(`/enfant/devoirs/${hw.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
      setPending(false);
    }
  }

  if (pending) {
    return (
      <Coach>
        <p className="thinking">{t("homework.reading")}</p>
      </Coach>
    );
  }

  return (
    <div className="stack">
      <Coach>
        <p>{t("homework.newHelpHint")}</p>
        <p className="small muted">{t("homework.photoTip")}</p>
      </Coach>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void addFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void addFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              className="choice"
              style={{ padding: 4 }}
              onClick={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
              aria-label={t("homework.removePhoto")}
            >
              <img src={p.previewUrl} alt="" />
            </button>
          ))}
        </div>
      )}
      {photos.length < MAX_HOMEWORK_PHOTOS && (
        <div className="row">
          <button
            type="button"
            className="btn"
            style={{ flex: 1 }}
            onClick={() => cameraRef.current?.click()}
          >
            📷 {photos.length === 0 ? t("homework.takePhoto") : t("homework.addPhoto")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => galleryRef.current?.click()}
          >
            {t("homework.choosePhoto")}
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="hw-text">{t("homework.orType")}</label>
        <textarea
          id="hw-text"
          className="json"
          style={{ minHeight: 110, fontFamily: "inherit", fontSize: "var(--fs-md)" }}
          placeholder={t("homework.typePlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
        />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn btn-block"
        type="button"
        onClick={send}
        disabled={photos.length === 0 && text.trim().length === 0}
      >
        {t("homework.send")}
      </button>
    </div>
  );
}
