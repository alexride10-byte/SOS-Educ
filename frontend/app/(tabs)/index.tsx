import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { eventsRepo, expensesRepo, tripsRepo } from "@/src/lib/storage";
import { computeDeparture, formatDateFr } from "@/src/lib/time";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AgendaEvent, Trip } from "@/src/types";

export default function Home() {
  const styles = useStyles();
  const { colors, scheme, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nextEvent, setNextEvent] = useState<AgendaEvent | null>(null);
  const [expensesCount, setExpensesCount] = useState(0);
  const [lastTrip, setLastTrip] = useState<Trip | null>(null);
  const [upcoming, setUpcoming] = useState<AgendaEvent[]>([]);

  const load = useCallback(async () => {
    const [events, expenses, trips] = await Promise.all([
      eventsRepo.list(),
      expensesRepo.list(),
      tripsRepo.list(),
    ]);
    const now = Date.now();
    const future = events
      .filter((e) => e.status === "prevu")
      .map((e) => ({ e, ts: new Date(`${e.date}T${e.time}:00`).getTime() }))
      .filter((x) => x.ts >= now - 3600 * 1000)
      .sort((a, b) => a.ts - b.ts);
    setNextEvent(future[0]?.e ?? null);
    setUpcoming(future.slice(0, 3).map((x) => x.e));
    setExpensesCount(expenses.length);
    setLastTrip(trips[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <Text style={styles.hello} testID="home-hello">
            Bonjour
          </Text>
          <Pressable
            onPress={toggle}
            testID="theme-toggle-btn"
            accessibilityLabel={scheme === "dark" ? "Passer en theme clair" : "Passer en theme sombre"}
            style={({ pressed }) => [styles.themeBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name={scheme === "dark" ? "sunny" : "moon"} size={22} color={colors.brandPrimary} />
          </Pressable>
        </View>
        <Text style={styles.date} testID="home-date">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </Text>

        {/* Resume du jour */}
        <View style={styles.summaryCard} testID="daily-summary-card">
          <Text style={styles.sectionTitle}>Resume du jour</Text>

          {nextEvent ? (
            <View style={styles.summaryRow}>
              <Ionicons name="calendar" color={colors.brandPrimary} size={22} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.summaryLabel}>Prochain rendez-vous</Text>
                <Text style={styles.summaryValue}>
                  {nextEvent.title} - {nextEvent.time}
                </Text>
                <Text style={styles.summarySub}>
                  Depart recommande:{" "}
                  <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>
                    {computeDeparture(nextEvent.time, nextEvent.travelMin, nextEvent.bufferMin)}
                  </Text>
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Ionicons name="checkmark-circle" color={colors.success} size={22} />
              <Text style={[styles.summaryValue, { marginLeft: spacing.md }]}>Aucun rendez-vous imminent</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="wallet" color={colors.brandPrimary} size={22} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.summaryLabel}>Depenses enregistrees</Text>
              <Text style={styles.summaryValue}>{expensesCount}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="car" color={colors.brandPrimary} size={22} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.summaryLabel}>Dernier deplacement</Text>
              <Text style={styles.summaryValue}>
                {lastTrip ? `${lastTrip.destination} - ${lastTrip.kmEnd - lastTrip.kmStart} km` : "Aucun"}
              </Text>
            </View>
          </View>
        </View>

        {/* Cartes modules */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: spacing.md }]}>Modules</Text>

        <ModuleCard
          testID="module-comptabilite"
          icon="wallet-outline"
          title="Comptabilite"
          subtitle="Justificatifs, depenses, sessions"
          onPress={() => router.push("/(tabs)/comptabilite")}
        />
        <ModuleCard
          testID="module-agenda"
          icon="calendar-outline"
          title="Agenda"
          subtitle="Rendez-vous et rappels"
          onPress={() => router.push("/(tabs)/agenda")}
        />
        <ModuleCard
          testID="module-vehicule"
          icon="car-outline"
          title="Tableau de bord"
          subtitle="Deplacements et kilometrage"
          onPress={() => router.push("/(tabs)/vehicule")}
        />

        {upcoming.length > 1 && (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>Prochaines taches</Text>
            {upcoming.map((e) => (
              <View key={e.id} style={styles.taskRow} testID={`home-task-${e.id}`}>
                <Ionicons name="ellipse" color={colors.brandPrimary} size={10} />
                <Text style={styles.taskText}>
                  {formatDateFr(e.date)} {e.time} - {e.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ModuleCard(props: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      testID={props.testID}
      style={({ pressed }) => [styles.moduleCard, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.moduleIconBox}>
        <Ionicons name={props.icon as any} color={colors.brandPrimary} size={28} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.moduleTitle}>{props.title}</Text>
        <Text style={styles.moduleSub}>{props.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" color={colors.muted} size={22} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  hello: { fontSize: 28, fontWeight: "700", color: colors.onSurface },
  date: { fontSize: 14, color: colors.muted, marginTop: 4, textTransform: "capitalize" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
  summaryCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  summaryLabel: { fontSize: 12, color: colors.muted },
  summaryValue: { fontSize: 15, color: colors.onSurface, fontWeight: "600", marginTop: 2 },
  summarySub: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 72,
  },
  moduleIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  moduleTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  moduleSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  taskText: { marginLeft: spacing.sm, color: colors.onSurfaceSecondary, fontSize: 14 },
}));
