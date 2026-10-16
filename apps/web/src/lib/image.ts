"use client";

import { MAX_PHOTO_BASE64_LENGTH } from "@devoirs/shared";

/**
 * Redimensionne et compresse une photo dans le navigateur avant l'envoi (moins de données,
 * moins de coût IA). Les métadonnées (EXIF, position GPS) disparaissent au passage.
 */
export async function compressPhoto(
  file: File,
  maxSide = 1600,
): Promise<{ mediaType: "image/jpeg"; base64: string; previewUrl: string }> {
  const bitmap = await createImageBitmap(file);
  let quality = 0.8;
  let side = maxSide;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (base64.length <= MAX_PHOTO_BASE64_LENGTH)
      return { mediaType: "image/jpeg", base64, previewUrl: dataUrl };
    quality -= 0.15;
    side = Math.round(side * 0.8);
  }
  throw new Error("photoTooBig");
}
