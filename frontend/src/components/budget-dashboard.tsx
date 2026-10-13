// Tableau de bord budgetaire (fond sombre, couleurs vives) : anneau de consommation + camembert par motif.
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Ionicons from "@react-native-vector-icons/ionicons";

import { computeBudget, fmtEur } from "@/src/lib/money";
import { budgetPalette as P, categoryColors, makeStyles, radius, spacing } from "@/src/theme";
import { Expense, Session } from "@/src/types";

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function BudgetDashboard(props: {
  session: Session | null;
  expenses: Expense[]; // depenses de la session
  onEditBudget: () => void;
  onAddMoney: () => void;
  onCloseSession: () => void;
  onReopen: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const styles = useStyles();
  const b = computeBudget(props.session, props.expenses);
  const over = b.remaining < 0;
  const closure = props.session?.closure;
  const additions = props.session?.additions ?? [];
  const carryText =
    closure?.carryStatus === "pending"
      ? "report en attente de la prochaine session"
      : closure?.carryStatus === "transferred"
        ? `reporté (${fmtEur(closure.transferredAmount ?? closure.finalBalance)})`
        : "non reporté";

  // Anneau
  const size = 112;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = b.percentSpent == null ? (b.total > 0 ? 1 : 0) : Math.min(b.percentSpent, 100) / 100;

  // Camembert
  const pie = 132;
  const pr = pie / 2;
  const slices = b.byCategory.filter((c) => c.amount > 0);
  let angle = -Math.PI / 2;

  return (
    <View style={styles.card} testID="budget-dashboard">
      <View style={styles.headRow}>
        <Text style={styles.cardTitle}>Budget de la session</Text>
        {!closure && (
          <Pressable onPress={props.onEditBudget} style={styles.iconBtn} testID="edit-budget-btn" accessibilityLabel="Modifier le budget initial">
            <Ionicons name="create-outline" size={20} color={P.text} />
          </Pressable>
        )}
      </View>

      {closure && (
        <View style={styles.closedBox} testID="session-closed-banner">
          <Ionicons name="lock-closed" size={16} color={P.warn} />
          <Text style={styles.closedText}>
            Clôturée le {new Date(closure.closedAt).toLocaleDateString("fr-FR")} · solde final {fmtEur(closure.finalBalance)} · {carryText}
          </Text>
        </View>
      )}

      <View style={styles.ringRow}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={P.track} strokeWidth={stroke} fill="none" />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={over ? P.over : P.spent}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ * progress} ${circ}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, over && { color: P.over }]} testID="budget-percent">
              {b.percentSpent == null ? "—" : `${Math.round(b.percentSpent)} %`}
            </Text>
            <Text style={styles.ringSub}>consommé</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Stat dot={P.budget} label="Disponible" value={fmtEur(b.available)} testID="budget-available" />
          <Stat dot={over ? P.over : P.spent} label="Dépensé" value={fmtEur(b.total)} testID="session-total" />
          <Stat
            dot={over ? P.over : P.ok}
            label={over ? "Dépassement" : "Restant"}
            value={fmtEur(Math.abs(b.remaining))}
            testID="budget-remaining"
            valueColor={over ? P.over : P.ok}
          />
        </View>
      </View>

      <View style={styles.breakdown} testID="budget-breakdown">
        <Text style={styles.breakText}>
          Report <Text style={styles.breakVal} testID="budget-carry">{fmtEur(b.carryOver)}</Text>
        </Text>
        <Text style={styles.breakText}>
          + Initial <Text style={styles.breakVal} testID="budget-initial">{fmtEur(b.initial)}</Text>
        </Text>
        <Text style={styles.breakText}>
          + Ajouts <Text style={styles.breakVal} testID="budget-additions">{fmtEur(b.additionsTotal)}</Text>
        </Text>
      </View>
      {additions.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: 2 }} testID="additions-history">
          {additions.map((a) => (
            <Text key={a.id} style={styles.historyText}>
              {new Date(a.date).toLocaleDateString("fr-FR")} · +{fmtEur(a.amount)}
              {a.reason ? ` · ${a.reason}` : ""}
            </Text>
          ))}
        </View>
      )}

      {!closure ? (
        <View style={styles.actionRow}>
          <Pressable onPress={props.onAddMoney} style={styles.addBtn} testID="add-money-btn">
            <Ionicons name="add" size={20} color={P.card} />
            <Text style={styles.addText}>Ajouter de l’argent</Text>
          </Pressable>
          <Pressable onPress={props.onCloseSession} style={styles.closeBtn} testID="close-session-btn">
            <Ionicons name="lock-closed-outline" size={16} color={P.text} />
            <Text style={styles.closeText}>Clôturer</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={props.onReopen} style={[styles.closeBtn, { marginTop: spacing.md }]} testID="reopen-session-btn">
          <Ionicons name="lock-open-outline" size={16} color={P.text} />
          <Text style={styles.closeText}>Rouvrir pour corriger</Text>
        </Pressable>
      )}

      <View style={styles.sep} />
      <Text style={styles.cardTitle}>Répartition par motif</Text>

      {props.expenses.length === 0 ? (
        <Text style={styles.emptyText} testID="pie-empty">
          Aucune dépense enregistrée dans cette session.
        </Text>
      ) : slices.length === 0 ? (
        <Text style={styles.emptyText} testID="pie-empty">
          Aucune dépense classée. Confirmez les motifs pour afficher la répartition.
        </Text>
      ) : (
        <View style={{ alignItems: "center", marginTop: spacing.md }} testID="category-pie">
          <Svg width={pie} height={pie}>
            {slices.length === 1 ? (
              <Circle cx={pr} cy={pr} r={pr} fill={categoryColors[slices[0].key]} />
            ) : (
              slices.map((c) => {
                const a0 = angle;
                const a1 = angle + (c.amount / b.classifiedTotal) * Math.PI * 2;
                angle = a1;
                return (
                  <Path key={c.key} d={arcPath(pr, pr, pr, a0, a1)} fill={categoryColors[c.key]} stroke={P.card} strokeWidth={2} />
                );
              })
            )}
          </Svg>
        </View>
      )}

      {props.expenses.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: 6 }}>
          {b.byCategory.map((c) => (
            <View key={c.key} style={styles.legendRow} testID={`legend-${c.key}`}>
              <View style={[styles.legendDot, { backgroundColor: categoryColors[c.key] }]} />
              <Text style={styles.legendLabel}>{c.label}</Text>
              <Text style={styles.legendValue}>{fmtEur(c.amount)}</Text>
              <Text style={styles.legendPct}>{Math.round(c.percent)} %</Text>
            </View>
          ))}
          <View style={[styles.legendRow, styles.legendTotal]}>
            <Text style={[styles.legendLabel, { fontWeight: "700" }]}>Total classé</Text>
            <Text style={styles.legendValue} testID="classified-total">
              {fmtEur(b.classifiedTotal)}
            </Text>
            <Text style={styles.legendPct}>100 %</Text>
          </View>
          {b.unclassifiedCount > 0 && (
            <View style={styles.unclassified} testID="unclassified-info">
              <Ionicons name="alert-circle" size={18} color={P.warn} />
              <Text style={styles.unclassifiedText}>
                {b.unclassifiedCount} dépense(s) à classer ({fmtEur(b.unclassifiedTotal)}), non incluse(s) dans la
                répartition.
              </Text>
            </View>
          )}
        </View>
      )}

      <Pressable
        onPress={props.onExport}
        disabled={!props.session || props.exporting}
        testID="export-session-btn"
        style={[styles.exportBtn, (!props.session || props.exporting) && { opacity: 0.5 }]}
      >
        {props.exporting ? (
          <ActivityIndicator color={P.card} />
        ) : (
          <>
            <Ionicons name="print-outline" size={18} color={P.card} />
            <Text style={styles.exportText}>Dossier PDF / impression</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function Stat(p: { dot: string; label: string; value: string; testID: string; valueColor?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <View style={[styles.legendDot, { backgroundColor: p.dot }]} />
      <Text style={styles.statLabel}>{p.label}</Text>
      <Text style={[styles.statValue, p.valueColor ? { color: p.valueColor } : null]} testID={p.testID}>
        {p.value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  card: {
    backgroundColor: P.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: P.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: P.text, fontSize: 15, fontWeight: "700" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closedBox: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: "#422006" },
  closedText: { color: P.warn, fontSize: 12, flex: 1 },
  breakdown: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  breakText: { color: P.muted, fontSize: 12 },
  breakVal: { color: P.text, fontWeight: "700" },
  historyText: { color: P.muted, fontSize: 12 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  addBtn: { flex: 1, height: 48, borderRadius: radius.md, backgroundColor: P.budget, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  addText: { color: P.card, fontWeight: "800" },
  closeBtn: { height: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: P.cardBorder, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  closeText: { color: P.text, fontWeight: "700" },
  defineBtn: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.budget,
  },
  defineText: { color: P.budget, fontWeight: "700" },
  ringRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.sm },
  ringCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ringPct: { color: P.text, fontSize: 22, fontWeight: "800" },
  ringSub: { color: P.muted, fontSize: 11 },
  stat: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabel: { color: P.muted, fontSize: 13, flex: 1 },
  statValue: { color: P.text, fontSize: 15, fontWeight: "700" },
  muted: { color: P.muted, fontSize: 13, marginTop: spacing.sm },
  sep: { height: 1, backgroundColor: P.cardBorder, marginVertical: spacing.lg },
  emptyText: { color: P.muted, fontSize: 13, marginTop: spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 24 },
  legendTotal: { borderTopWidth: 1, borderTopColor: P.cardBorder, paddingTop: 6, marginTop: 2 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { color: P.text, fontSize: 13, flex: 1 },
  legendValue: { color: P.text, fontSize: 13, fontWeight: "700", minWidth: 80, textAlign: "right" },
  legendPct: { color: P.muted, fontSize: 12, width: 44, textAlign: "right" },
  unclassified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#422006",
  },
  unclassifiedText: { color: P.warn, fontSize: 12, flex: 1 },
  exportBtn: {
    marginTop: spacing.lg,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: P.spent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  exportText: { color: P.card, fontWeight: "800" },
}));
