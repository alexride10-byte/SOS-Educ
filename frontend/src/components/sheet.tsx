// Fenetre basse reutilisable (formulaires courts).
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, radius, spacing } from "@/src/theme";

export function Sheet(props: { visible: boolean; title: string; onClose: () => void; children: ReactNode; testID?: string }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose} testID={`${props.testID}-backdrop`} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID={props.testID}>
            <Text style={styles.title}>{props.title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
              {props.children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Styles de champs partages par les fenetres de session
export const useFormStyles = makeStyles((colors) => ({
  label: { fontSize: 12, color: colors.muted, fontWeight: "600", marginTop: spacing.md, marginBottom: 6 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  help: { fontSize: 12, color: colors.muted, marginTop: 4 },
  error: { fontSize: 13, color: colors.error, marginTop: 6 },
  primary: { marginTop: spacing.lg, height: 56, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
  secondary: { marginTop: spacing.sm, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  card: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  cardText: { fontSize: 14, color: colors.onSurface },
  strong: { fontWeight: "800" },
}));

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  title: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
}));
