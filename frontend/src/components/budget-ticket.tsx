// Budget de la session en cours, dessine comme un ticket de caisse (bord dentele).
// Il "sort de l'imprimante" une seule fois par ouverture de l'appli (sauf si l'animation est reduite).
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Ionicons from "@react-native-vector-icons/ionicons";

import { computeBudget, fmtEur } from "@/src/lib/money";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Expense, Session } from "@/src/types";

const TOOTH = 14;
const TOOTH_H = 8;
let printed = false;

function Teeth({ width, color }: { width: number; color: string }) {
  if (width <= 0) return null;
  const n = Math.ceil(width / TOOTH);
  let d = `M0 0 H${width} V0`;
  for (let i = n; i > 0; i--) d += ` L${Math.max(0, i * TOOTH - TOOTH / 2)} ${TOOTH_H} L${Math.max(0, (i - 1) * TOOTH)} 0`;
  return (
    <Svg width={width} height={TOOTH_H} style={{ marginTop: -1 }}>
      <Path d={d + " Z"} fill={color} />
    </Svg>
  );
}

export function BudgetTicket(props: {
  session: Session | null;
  expenses: Expense[];
  onOpen: () => void;
  onAddTicket: () => void;
  onCreateSession: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [slide] = useState(() => new Animated.Value(printed ? 1 : 0));

  useEffect(() => {
    if (printed) return;
    printed = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return slide.setValue(1);
      Animated.timing(slide, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    });
  }, [slide]);

  const paper = colors.surfaceSecondary;
  const s = props.session;
  const b = s ? computeBudget(s, props.expenses) : null;
  const over = !!b && b.remaining < 0;
  const spentPct = b?.percentSpent == null ? 0 : Math.min(100, b.percentSpent);

  return (
    <View style={styles.slot}>
      <Animated.View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          opacity: slide.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }],
        }}
      >
        <View style={[styles.paper, { backgroundColor: paper }]} testID="budget-ticket">
          {s && b ? (
            <>
              <Pressable onPress={props.onOpen} testID="budget-ticket-open" accessibilityRole="button">
                <Text style={styles.session} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text style={styles.label}>{over ? "Dépassement" : "Reste à dépenser"}</Text>
                <Text
                  style={[styles.amount, { color: over ? colors.margin : colors.onSurface }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  testID="budget-ticket-remaining"
                >
                  {fmtEur(Math.abs(b.remaining))}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${spentPct}%`, backgroundColor: over ? colors.margin : colors.brandPrimary }]} />
                </View>
                <Text style={styles.meta}>
                  {fmtEur(b.total)} dépensés sur {fmtEur(b.available)}
                </Text>
              </Pressable>
              <View style={styles.tear} />
              {s.closure ? (
                <Text style={styles.closed}>Session clôturée</Text>
              ) : (
                <Pressable onPress={props.onAddTicket} style={styles.action} testID="budget-ticket-add">
                  <Ionicons name="camera" size={20} color={colors.brandPrimary} />
                  <Text style={styles.actionText}>Ajouter un ticket</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>Aucune session en cours</Text>
              <Text style={styles.emptyText}>Créez la session du moment avec son budget pour enregistrer vos tickets.</Text>
              <View style={styles.tear} />
              <Pressable onPress={props.onCreateSession} style={styles.action} testID="budget-ticket-create">
                <Ionicons name="add-circle" size={20} color={colors.brandPrimary} />
                <Text style={styles.actionText}>Créer une session</Text>
              </Pressable>
            </>
          )}
        </View>
        <Teeth width={width} color={paper} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  slot: { overflow: "hidden", marginTop: spacing.lg, paddingBottom: 6, paddingHorizontal: 2 },
  paper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    shadowColor: colors.onSurface,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  session: { fontSize: 13, color: colors.muted },
  label: { fontSize: 15, fontWeight: "600", color: colors.onSurfaceSecondary, marginTop: spacing.md },
  amount: { fontFamily: fonts.black, fontSize: 46, lineHeight: 54, letterSpacing: -1, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden", marginTop: spacing.sm },
  fill: { height: 8, borderRadius: 4 },
  meta: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  emptyText: { fontSize: 14, lineHeight: 20, color: colors.onSurfaceSecondary, marginTop: 4 },
  tear: { borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.borderStrong, marginTop: spacing.lg },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52 },
  actionText: { fontSize: 16, fontWeight: "700", color: colors.brandPrimary },
  closed: { fontSize: 14, color: colors.muted, paddingVertical: spacing.md },
}));
