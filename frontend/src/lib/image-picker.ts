// Helper: capturer une image via appareil photo ou galerie.
// Retourne une URI locale et le base64 (pour OCR).
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

export interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

// Copie la photo du cache (purgeable par le systeme) vers le dossier documents prive de l'app.
export function persistPhoto(uri: string): string {
  if (Platform.OS === "web") return uri;
  try {
    const dir = new Directory(Paths.document, "justificatifs");
    if (!dir.exists) dir.create({ idempotent: true });
    const dest = new File(dir, `photo-${Date.now()}.jpg`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

async function toPicked(res: ImagePicker.ImagePickerResult): Promise<PickedImage | null> {
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: persistPhoto(a.uri),
    width: a.width,
    height: a.height,
    base64: a.base64 ?? "",
    mimeType: a.mimeType ?? "image/jpeg",
  };
}

export async function takePhoto(): Promise<PickedImage | null> {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.6,
    allowsEditing: false,
  });
  return toPicked(res);
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.6,
    allowsEditing: false,
  });
  return toPicked(res);
}
