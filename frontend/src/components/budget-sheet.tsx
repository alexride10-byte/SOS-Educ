// Saisie / modification du budget initial d'une session.
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function BudgetSheet(props: {
  visible: boolean;
  initial?: number;
  onClose: () => void;
  onSave: (budget: number | undefined) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (props.visible) setValue(props.initial != null ? String(props.initial) : "");
  }, [props.visible, props.initial]);

  const parsed = parseFloat(value.replace(",", "."));
  const valid = value.trim() === "" || (!isNaN(parsed) && parsed >= 0);

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} testID="budget-sheet-backdrop" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="budget-sheet">
          <Text style={styles.title}>Budget initial de la session</Text>
          <Text style={styles.help}>Montant en euros. Laisser vide pour retirer le budget.</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="500"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            testID="budget-input"
          />
          {!valid && <Text style={styles.error}>Montant invalide</Text>}
          <Pressable
            disabled={!valid}
            onPress={() => props.onSave(value.trim() === "" ? undefined : Math.round(parsed * 100) / 100)}
            style={[styles.save, !valid && { opacity: 0.5 }]}
            testID="budget-save"
          >
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  help: { fontSize: 13, color: colors.muted, marginTop: 4 },
  input: {
    marginTop: spacing.md,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  error: { color: colors.error, marginTop: 6, fontSize: 13 },
  save: {
    marginTop: spacing.lg,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
}));
