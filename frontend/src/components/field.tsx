// Champ de saisie avec libelle, partage par les formulaires (depense, rendez-vous).
import { Text, TextInput, TextInputProps, View } from "react-native";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function Field(props: { label: string } & Pick<TextInputProps, "value" | "onChangeText" | "placeholder" | "keyboardType" | "multiline" | "testID">) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { label, multiline, ...input } = props;
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { fontSize: 12, color: colors.muted, fontWeight: "600", marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
    minHeight: 48,
  },
}));
