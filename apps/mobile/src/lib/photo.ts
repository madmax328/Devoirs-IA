import { MAX_PHOTO_BASE64_LENGTH } from "@devoirs/shared";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export interface PickedPhoto {
  mediaType: "image/jpeg";
  base64: string;
  uri: string;
}

/**
 * Prend ou choisit une photo, puis la redimensionne et la compresse sur le téléphone
 * (moins de données envoyées, métadonnées EXIF/GPS supprimées).
 */
export async function pickPhoto(source: "camera" | "library"): Promise<PickedPhoto | "denied" | null> {
  const perm =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return "denied";
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;

  let side = 1600;
  let compress = 0.75;
  for (let attempt = 0; attempt < 4; attempt++) {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > side)
      ctx.resize(asset.width >= asset.height ? { width: side } : { height: side });
    const ref = await ctx.renderAsync();
    const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    if (out.base64 && out.base64.length <= MAX_PHOTO_BASE64_LENGTH)
      return { mediaType: "image/jpeg", base64: out.base64, uri: out.uri };
    side = Math.round(side * 0.8);
    compress -= 0.15;
  }
  throw new Error("photoTooBig");
}
