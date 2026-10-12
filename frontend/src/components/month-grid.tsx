// Calendrier mensuel compact avec barres colorees par statut (inspiration "agenda pro").
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { makeStyles, onSwatch, radius, spacing, useTheme } from "@/src/theme";
import { AgendaEvent } from "@/src/types";
import { useChildColors } from "@/src/lib/child-colors";

const DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

function iso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function MonthGrid(props: {
  events: AgendaEvent[];
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { childColors } = useChildColors();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const e of props.events) (map[e.date] ||= []).push(e);
    return map;
  }, [props.events]);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // lundi = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const todayIso = iso(new Date());
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <View style={styles.wrap} testID="month-grid">
      <View style={styles.headRow}>
        <Pressable onPress={() => shift(-1)} style={styles.navBtn} testID="month-prev">
          <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.monthLabel} testID="month-label">
          {monthLabel}
        </Text>
        <Pressable onPress={() => shift(1)} style={styles.navBtn} testID="month-next">
          <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.dayHead}>
            {d}
          </Text>
        ))}
      </View>

      {Array.from({ length: 6 }, (_, w) => (
        <View key={w} style={styles.row}>
          {cells.slice(w * 7, w * 7 + 7).map((d) => {
            const key = iso(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const evs = byDate[key] ?? [];
            const selected = props.selectedDate === key;
            const isToday = key === todayIso;
            return (
              <Pressable
                key={key}
                testID={`day-${key}`}
                onPress={() => props.onSelectDate(selected ? null : key)}
                style={[styles.cell, selected && styles.cellSelected]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    !inMonth && { color: colors.borderStrong },
                    isToday && styles.today,
                  ]}
                >
                  {d.getDate()}
                </Text>
                <View style={styles.dots}>
                  {evs.slice(0, 3).map((e) => (
                    <View
                      key={e.id}
                      style={[
                        styles.dot,
                        { backgroundColor: e.childCode ? childColors[e.childCode] : colors.borderStrong },
                        e.status === "annule" && { opacity: 0.35 },
                      ]}
                    >
                      <Text style={styles.dotText}>{e.childCode ?? "•"}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  navBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 15, fontWeight: "700", color: colors.onSurface, textTransform: "capitalize" },
  row: { flexDirection: "row" },
  dayHead: { flex: 1, textAlign: "center", fontSize: 10, fontWeight: "700", color: colors.muted, paddingVertical: 4 },
  cell: { flex: 1, height: 48, alignItems: "center", paddingTop: 4, borderRadius: radius.sm },
  cellSelected: { backgroundColor: colors.brandSecondary },
  dayNum: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  today: { color: colors.brandPrimary, fontWeight: "800", textDecorationLine: "underline" },
  dots: { flexDirection: "row", marginTop: 3, gap: 2 },
  dot: { width: 13, height: 13, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 8, fontWeight: "800", color: onSwatch },
}));
