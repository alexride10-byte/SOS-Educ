// Helper: capturer une image via appareil photo ou galerie.
// Retourne une URI temporaire ; la photo n'est conservee (photo-store) qu'a l'enregistrement de la depense.
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

function toPicked(res: ImagePicker.ImagePickerResult): PickedImage | null {
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    width: a.width,
    height: a.height,
    base64: a.base64 ?? "",
    mimeType: a.mimeType ?? "image/jpeg",
  };
}

// Le base64 n'est plus utile (OCR local a partir de l'URI) : evite de charger la photo deux fois en memoire
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  base64: false,
  quality: Platform.OS === "web" ? 1 : 0.6,
  allowsEditing: false,
};

export async function takePhoto(): Promise<PickedImage | null> {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  return toPicked(await ImagePicker.launchCameraAsync(OPTIONS));
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  return toPicked(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}
