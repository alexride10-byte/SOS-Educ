import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { eventsRepo, expensesRepo, sessionsRepo, tasksRepo } from "@/src/lib/storage";
import { pendingTasks, setTaskStatus } from "@/src/lib/tasks";
import { ChildBadge } from "@/src/components/child-legend";
import { TaskRow } from "@/src/components/tasks";
import { computeDeparture, formatDateFr, parseLocal } from "@/src/lib/time";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AgendaEvent, Expense, Session, Task, needsReview } from "@/src/types";
import { BudgetTicket } from "@/src/components/budget-ticket";
import { NewSessionSheet } from "@/src/components/new-session-sheet";
import { eraseAllData } from "@/src/lib/backup";
import { confirmAction } from "@/src/lib/confirm";
import { appUrl } from "@/src/lib/base-url";

export default function Home() {
  const styles = useStyles();
  const { colors, scheme, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nextEvent, setNextEvent] = useState<AgendaEvent | null>(null);
  const [toVerify, setToVerify] = useState(0);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [pending, setPending] = useState<Task[]>([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [hasDemo, setHasDemo] = useState(false);
  const [current, setCurrent] = useState<Session | null>(null);
  const [currentExpenses, setCurrentExpenses] = useState<Expense[]>([]);

  const load = useCallback(async () => {
    const [evs, expenses, tasks, sessions] = await Promise.all([
      eventsRepo.list(),
      expensesRepo.list(),
      tasksRepo.list(),
      sessionsRepo.list(),
    ]);
    setHasDemo(sessions.some((s) => s.id === "sess-demo-1"));
    // Session en cours : la plus recente non cloturee
    const cur = sessions.find((s) => !s.closure) ?? null;
    setCurrent(cur);
    setCurrentExpenses(cur ? expenses.filter((e) => e.sessionId === cur.id) : []);
    const now = Date.now();
    const future = evs
      .filter((e) => e.status === "prevu")
      .map((e) => ({ e, ts: parseLocal(e.date, e.time).getTime() }))
      .filter((x) => x.ts >= now)
      .sort((a, b) => a.ts - b.ts);
    setNextEvent(future[0]?.e ?? null);
    setEvents(evs);
    setToVerify(expenses.filter(needsReview).length);
    setPending(pendingTasks(tasks));
  }, []);

  const startFresh = async () => {
    if (!(await confirmAction("Effacer les données de démonstration et commencer avec une appli vide ?", "Commencer"))) return;
    await eraseAllData();
    load();
  };

  const toggleTask = async (t: Task) => {
    await setTaskStatus(t, "done");
    load();
  };

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

        {hasDemo && (
          <View style={styles.demoCard} testID="demo-banner">
            <Ionicons name="flask-outline" size={20} color={colors.onBrandSecondary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.summaryValue}>Données de démonstration</Text>
              <Text style={styles.summarySub}>Les exemples affichés sont fictifs. Effacez-les avant un usage réel.</Text>
              <Pressable onPress={startFresh} testID="demo-start-fresh" style={styles.demoBtn}>
                <Text style={styles.demoBtnText}>Commencer avec une appli vide</Text>
              </Pressable>
            </View>
          </View>
        )}

        <BudgetTicket
          session={current}
          expenses={currentExpenses}
          onOpen={() => current && router.push({ pathname: "/(tabs)/comptabilite", params: { session: current.id } })}
          onAddTicket={() => current && router.push({ pathname: "/(tabs)/comptabilite", params: { session: current.id, add: "1" } })}
          onCreateSession={() => setShowNewSession(true)}
        />

        {/* Resume du jour */}
        <View style={styles.summaryCard} testID="daily-summary-card">
          <Text style={styles.sectionTitle}>À faire maintenant</Text>

          {nextEvent ? (
            <View style={styles.summaryRow}>
              <Ionicons name="calendar" color={colors.brandPrimary} size={22} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.summaryLabel}>Prochain rendez-vous</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {nextEvent.childCode ? <ChildBadge code={nextEvent.childCode} size={20} /> : null}
                  <Text style={[styles.summaryValue, { flexShrink: 1 }]} testID="home-next-event">
                    {nextEvent.title} - {formatDateFr(nextEvent.date)} {nextEvent.time}
                  </Text>
                </View>
                <Text style={styles.summarySub}>
                  Départ recommandé :{" "}
                  <Text style={{ color: colors.brandPrimary, fontWeight: "700" }} testID="home-next-departure">
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

          {toVerify > 0 && (
            <>
              <View style={styles.divider} />
              <Pressable style={styles.summaryRow} onPress={() => router.push("/(tabs)/comptabilite")} testID="home-to-verify">
                <Ionicons name="alert-circle" color={colors.warning} size={22} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.summaryLabel}>Dépenses à vérifier</Text>
                  <Text style={styles.summaryValue}>{toVerify} dépense(s) : motif ou paiement</Text>
                </View>
                <Ionicons name="chevron-forward" color={colors.muted} size={20} />
              </Pressable>
            </>
          )}
        </View>

        <View style={{ marginTop: spacing.xl }} testID="home-prep-section">
          <Text style={styles.sectionTitle}>À préparer</Text>
          {pending.length === 0 ? (
            <Text style={styles.summarySub}>Rien à préparer pour le moment.</Text>
          ) : (
            pending.slice(0, 5).map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                event={events.find((e) => e.id === t.eventId)}
                onToggle={() => toggleTask(t)}
                onPress={() => router.push("/(tabs)/agenda")}
              />
            ))
          )}
        </View>

        {Platform.OS === "web" && (
          <Pressable onPress={() => window.location.assign(appUrl("caresync.apk"))} testID="android-apk-link" style={styles.backupBtn}>
            <Ionicons name="logo-android" size={18} color={colors.muted} />
            <Text style={styles.backupText}>Installer l’appli Android (rappels sonores)</Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.push("/confidentialite")} testID="privacy-link" style={styles.backupBtn}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.muted} />
          <Text style={styles.backupText}>Données, confidentialité et sauvegarde</Text>
        </Pressable>
      </ScrollView>
      <NewSessionSheet
        visible={showNewSession}
        onClose={() => setShowNewSession(false)}
        onCreated={(ns) => {
          setShowNewSession(false);
          router.push({ pathname: "/(tabs)/comptabilite", params: { session: ns.id } });
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  backupBtn: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, marginTop: spacing.xl },
  backupText: { color: colors.muted, fontSize: 13 },
  demoCard: {
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brandSecondary,
  },
  demoBtn: { marginTop: spacing.sm, alignSelf: "flex-start", minHeight: 40, justifyContent: "center" },
  demoBtnText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 14, textDecorationLine: "underline" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  hello: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.5, color: colors.onSurface },
  date: { fontSize: 14, color: colors.muted, marginTop: 4, textTransform: "capitalize" },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface, marginBottom: spacing.sm },
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
}));
