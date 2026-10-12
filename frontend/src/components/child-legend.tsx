// Pastille de code enfant (couleur + lettre) et legende permanente A-E avec couleurs personnalisables.
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { useChildColors } from "@/src/lib/child-colors";
import { childColorChoices, makeStyles, onSwatch, radius, spacing, useTheme } from "@/src/theme";
import { CHILD_CODES, ChildCode } from "@/src/types";

export function ChildBadge({ code, size = 24 }: { code: ChildCode; size?: number }) {
  const { childColors } = useChildColors();
  return (
    <View
      testID={`child-badge-${code}`}
      accessibilityLabel={`Enfant ${code}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: childColors[code],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: onSwatch, fontWeight: "800", fontSize: size * 0.5 }}>{code}</Text>
    </View>
  );
}

export function ChildLegend() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { childColors, setChildColor } = useChildColors();
  const [editing, setEditing] = useState<ChildCode | null>(null);

  return (
    <View style={styles.wrap} testID="child-legend">
      <View style={styles.row}>
        {CHILD_CODES.map(({ code, group }, i) => (
          <View key={code} style={{ flexDirection: "row", alignItems: "center" }}>
            {i === 3 && <View style={styles.groupSep} />}
            <Pressable
              onPress={() => setEditing(code)}
              style={styles.item}
              testID={`legend-child-${code}`}
              accessibilityLabel={`Changer la couleur de ${code}, fratrie ${group}`}
            >
              <ChildBadge code={code} size={28} />
            </Pressable>
          </View>
        ))}
        <Ionicons name="color-palette-outline" size={18} color={colors.muted} style={{ marginLeft: "auto" }} />
      </View>
      <Text style={styles.caption}>
        A · B · C : fratrie 1 — D · E : fratrie 2 (du plus jeune au plus âgé). Touchez une lettre pour changer sa
        couleur. Codes internes : ils ne garantissent pas l’anonymat.
      </Text>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)} testID="color-picker-backdrop">
          <View style={styles.picker} testID="color-picker">
            <Text style={styles.pickerTitle}>Couleur de {editing}</Text>
            <View style={styles.swatches}>
              {childColorChoices.map((c) => {
                const on = editing ? childColors[editing] === c : false;
                return (
                  <Pressable
                    key={c}
                    testID={`color-choice-${c.slice(1)}`}
                    onPress={() => {
                      if (editing) setChildColor(editing, c);
                      setEditing(null);
                    }}
                    style={[styles.swatch, { backgroundColor: c }, on && styles.swatchOn]}
                  >
                    {on && <Ionicons name="checkmark" size={20} color={onSwatch} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", alignItems: "center" },
  item: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  groupSep: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 4 },
  caption: { fontSize: 11, color: colors.muted, marginTop: 2, paddingHorizontal: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  picker: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, width: 300 },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  swatchOn: { borderWidth: 3, borderColor: colors.onSurface },
}));
