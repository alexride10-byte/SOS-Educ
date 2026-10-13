// Bandeau affiche quand les notifications sont refusees : aucun rappel ne sonnera.
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform, Pressable, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { getNotifPermission, requestNotifPermission } from "@/src/lib/notifications";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function NotifBanner() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [state, setState] = useState<{ granted: boolean; canAskAgain: boolean } | null>(null);

  const check = useCallback(() => {
    getNotifPermission().then(setState);
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => sub.remove();
  }, [check]);

  if (Platform.OS === "web" || !state || state.granted) return null;

  return (
    <View style={styles.banner} testID="notif-denied-banner">
      <Ionicons name="notifications-off" size={20} color={colors.warning} />
      <Text style={styles.text}>Rappels désactivés : aucune alerte ne sonnera pour vos rendez-vous et préparations.</Text>
      <Pressable
        testID="notif-banner-action"
        style={styles.btn}
        onPress={async () => {
          if (state.canAskAgain) {
            await requestNotifPermission();
            check();
          } else {
            Linking.openSettings();
          }
        }}
      >
        <Text style={styles.btnText}>{state.canAskAgain ? "Autoriser" : "Ouvrir les réglages"}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surfaceSecondary,
  },
  text: { flex: 1, fontSize: 12, color: colors.onSurface },
  btn: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: "center", borderRadius: radius.sm, backgroundColor: colors.warning },
  btnText: { color: colors.onWarning, fontWeight: "700", fontSize: 12 },
}));
