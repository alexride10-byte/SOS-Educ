// Confirmation avant une action destructive. Sur le web, Alert de React Native ne s'affiche pas :
// on utilise la boite de dialogue du navigateur.
import { Alert, Platform } from "react-native";

export function confirmAction(message: string, confirmLabel = "Supprimer"): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert("Confirmation", message, [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}
