import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { eventsRepo, tasksRepo } from "@/src/lib/storage";
import { cancelEventReminders, scheduleEventReminders } from "@/src/lib/notifications";
import { NotifBanner } from "@/src/components/notif-banner";
import { computeDeparture, departureExplanation, formatDateFr, localIso } from "@/src/lib/time";
import { pendingTasks, setTaskStatus } from "@/src/lib/tasks";
import { useChildColors } from "@/src/lib/child-colors";
import { ChildBadge, ChildLegend } from "@/src/components/child-legend";
import { TaskForm, TaskRow } from "@/src/components/tasks";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import {
  AgendaEvent,
  CHILD_CODES,
  ChildCode,
  DEFAULT_REMINDERS,
  EventStatus,
  EVENT_STATUS_LABEL,
  ReminderPrefs,
  Task,
} from "@/src/types";
import { MonthGrid } from "@/src/components/month-grid";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const STATUS_KEY: Record<EventStatus, "info" | "success" | "error" | "warning"> = {
  prevu: "info",
  effectue: "success",
  annule: "error",
  reporte: "warning",
};

export default function Agenda() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const visible = selectedDate ? events.filter((e) => e.date === selectedDate) : events;
  const { childColors } = useChildColors();
  const [tab, setTab] = useState<"rdv" | "prep">("rdv");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const pending = pendingTasks(tasks);
  const doneTasks = tasks.filter((t) => t.status === "done");

  const reload = useCallback(async () => {
    const [list, t] = await Promise.all([eventsRepo.list(), tasksRepo.list()]);
    setEvents(list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
    setTasks(t);
  }, []);

  const toggleTask = async (t: Task) => {
    await setTaskStatus(t, t.status === "done" ? "todo" : "done");
    reload();
  };

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>Rendez-vous, rappels et préparations</Text>
      </View>

      <NotifBanner />

      <View style={styles.segment} testID="agenda-segment">
        {(["rdv", "prep"] as const).map((k) => {
          const on = tab === k;
          return (
            <Pressable key={k} onPress={() => setTab(k)} testID={`segment-${k}`} style={[styles.segmentBtn, on && styles.segmentBtnOn]}>
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {k === "rdv" ? "Rendez-vous" : `À préparer${pending.length ? ` (${pending.length})` : ""}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "prep" ? (
        <FlatList
          data={[...pending, ...doneTasks]}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkbox-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>Aucune préparation</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              event={events.find((e) => e.id === item.eventId)}
              onToggle={() => toggleTask(item)}
              onPress={() => {
                setEditingTask(item);
                setShowTaskForm(true);
              }}
            />
          )}
        />
      ) : (
      <FlatList
        data={visible}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.md }}>
            <MonthGrid events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <ChildLegend />
            {selectedDate && (
              <Text style={styles.filterInfo} testID="agenda-filter-info">
                {formatDateFr(selectedDate)} - toucher a nouveau pour tout afficher
              </Text>
            )}
          </View>
        }
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Aucun rendez-vous</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setEditing(item);
              setShowForm(true);
            }}
            testID={`event-row-${item.id}`}
            style={[styles.card, item.childCode ? { borderLeftWidth: 5, borderLeftColor: childColors[item.childCode] } : null]}
          >
            <View style={styles.timeBox}>
              <Text style={styles.timeText}>{item.time}</Text>
              <Text style={styles.dateText}>{formatDateFr(item.date)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.evTitle}>{item.title}</Text>
              <View style={styles.evSubRow}>
                {item.childCode ? <ChildBadge code={item.childCode} size={20} /> : null}
                <Text style={styles.evSub}>{item.location || "Lieu non précisé"}</Text>
              </View>
              <View style={styles.evMetaRow}>
                <Ionicons name="walk-outline" size={14} color={colors.brandPrimary} />
                <Text style={styles.evDeparture}>
                  Depart {computeDeparture(item.time, item.travelMin, item.bufferMin)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.surfaceTertiary }]}>
                  <Text style={[styles.statusBadgeText, { color: colors[STATUS_KEY[item.status]] }]}>
                    {EVENT_STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
      )}

      <Pressable
        onPress={() => {
          if (tab === "rdv") {
            setEditing(null);
            setShowForm(true);
          } else {
            setEditingTask(null);
            setShowTaskForm(true);
          }
        }}
        testID={tab === "rdv" ? "add-event-fab" : "add-task-fab"}
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
      >
        <Ionicons name="add" color={colors.onBrand} size={28} />
        <Text style={styles.fabText}>{tab === "rdv" ? "Rendez-vous" : "Préparation"}</Text>
      </Pressable>

      <TaskForm
        visible={showTaskForm}
        initial={editingTask}
        events={events}
        onClose={() => setShowTaskForm(false)}
        onSaved={async () => {
          setShowTaskForm(false);
          await reload();
        }}
      />

      <EventForm
        visible={showForm}
        initial={editing}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />
    </View>
  );
}

function EventForm(props: {
  visible: boolean;
  initial: AgendaEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [childCode, setChildCode] = useState<ChildCode | null>(null);
  const [reminders, setReminders] = useState<ReminderPrefs>(DEFAULT_REMINDERS);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [travelMin, setTravelMin] = useState("20");
  const [bufferMin, setBufferMin] = useState("10");
  const [comment, setComment] = useState("");
  const [postComment, setPostComment] = useState("");
  const [status, setStatus] = useState<EventStatus>("prevu");

  useFocusEffect(
    useCallback(() => {
      if (!props.visible) return;
      const i = props.initial;
      setTitle(i?.title ?? "");
      setChildCode(i?.childCode ?? null);
      setReminders(i?.reminders ?? DEFAULT_REMINDERS);
      setDate(i?.date ?? localIso());
      setTime(i?.time ?? "10:00");
      setLocation(i?.location ?? "");
      setDurationMin(String(i?.durationMin ?? 60));
      setTravelMin(String(i?.travelMin ?? 20));
      setBufferMin(String(i?.bufferMin ?? 10));
      setComment(i?.comment ?? "");
      setPostComment(i?.postComment ?? "");
      setStatus(i?.status ?? "prevu");
    }, [props.visible, props.initial]),
  );

  const departure = computeDeparture(time || "00:00", parseInt(travelMin) || 0, parseInt(bufferMin) || 0);

  const save = async () => {
    const old = props.initial;
    await cancelEventReminders(old);

    const ev: AgendaEvent = {
      id: old?.id ?? `evt-${uuid()}`,
      title: title.trim() || "Sans titre",
      childCode,
      reminders,
      date,
      time,
      location: location.trim(),
      durationMin: parseInt(durationMin) || 0,
      travelMin: parseInt(travelMin) || 0,
      bufferMin: parseInt(bufferMin) || 0,
      comment,
      postComment,
      status,
      createdAt: old?.createdAt ?? new Date().toISOString(),
    };
    const notifIds = status === "prevu" ? await scheduleEventReminders(ev) : [];
    ev.notificationIds = notifIds;
    await eventsRepo.save(ev);
    props.onSaved();
  };

  const remove = async () => {
    if (!props.initial) return;
    await cancelEventReminders(props.initial);
    await eventsRepo.remove(props.initial.id);
    props.onSaved();
  };

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={props.onClose} testID="event-form-close">
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.modalTitle}>{props.initial ? "Modifier RDV" : "Nouveau RDV"}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
          <F label="Titre" value={title} onChangeText={setTitle} testID="field-title" />
          <Text style={styles.fieldLabel}>Enfant (code interne, facultatif)</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setChildCode(null)}
              style={[styles.selectChip, !childCode && styles.selectChipOn]}
              testID="child-none"
            >
              <Text style={[styles.selectChipText, !childCode && { color: colors.onBrand }]}>Aucun</Text>
            </Pressable>
            {CHILD_CODES.map(({ code }) => {
              const on = childCode === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setChildCode(code)}
                  style={[styles.childChip, on && { borderColor: colors.onSurface, borderWidth: 3 }]}
                  testID={`child-${code}`}
                  accessibilityState={{ selected: on }}
                >
                  <ChildBadge code={code} size={32} />
                </Pressable>
              );
            })}
          </View>
          <F label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} testID="field-event-date" />
          <F label="Heure (HH:MM)" value={time} onChangeText={setTime} testID="field-event-time" />
          <F label="Lieu" value={location} onChangeText={setLocation} testID="field-location" />

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <F
                label="Duree (min)"
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="number-pad"
                testID="field-duration"
              />
            </View>
            <View style={{ flex: 1 }}>
              <F
                label="Trajet (min)"
                value={travelMin}
                onChangeText={setTravelMin}
                keyboardType="number-pad"
                testID="field-travel"
              />
            </View>
            <View style={{ flex: 1 }}>
              <F
                label="Marge (min)"
                value={bufferMin}
                onChangeText={setBufferMin}
                keyboardType="number-pad"
                testID="field-buffer"
              />
            </View>
          </View>

          <View style={styles.departureBox} testID="departure-box">
            <Ionicons name="walk" size={20} color={colors.brandPrimary} />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.departureLabel}>Depart recommande</Text>
              <Text style={styles.departureValue} testID="departure-value">{departure}</Text>
              <Text style={styles.departureExplain} testID="departure-explain">
                {departureExplanation(time || "00:00", parseInt(travelMin) || 0, parseInt(bufferMin) || 0)}
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Statut</Text>
          <View style={styles.chipRow}>
            {(["prevu", "effectue", "annule", "reporte"] as EventStatus[]).map((s) => {
              const selected = status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[styles.selectChip, selected && styles.selectChipOn]}
                  testID={`status-${s}`}
                >
                  <Text style={[styles.selectChipText, selected && { color: colors.onBrand }]}>
                    {EVENT_STATUS_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Rappels (notifications locales)</Text>
          {status !== "prevu" ? (
            <Text style={styles.reminderNote} testID="reminders-off-note">
              Aucun rappel : les rappels sont annulés quand le rendez-vous n’est pas « Prévu ».
            </Text>
          ) : (
            <View style={styles.reminderBox}>
              {(
                [
                  ["h1", "1 h avant : rappel du rendez-vous"],
                  ["m30", "30 min avant : préparation"],
                  ["departure", `À l'heure de départ (${departure})`],
                  ["m5", "5 min avant : rappel final (facultatif)"],
                ] as [keyof ReminderPrefs, string][]
              ).map(([k, label]) => (
                <View key={k} style={styles.reminderRow}>
                  <Text style={styles.reminderLabel}>{label}</Text>
                  <Switch
                    value={reminders[k]}
                    onValueChange={(v) => setReminders({ ...reminders, [k]: v })}
                    trackColor={{ true: colors.brandPrimary, false: colors.border }}
                    testID={`reminder-${k}`}
                  />
                </View>
              ))}
              <Text style={styles.reminderNote}>
                Les rappels sont reprogrammés à chaque modification. Leur fiabilité doit être vérifiée sur un téléphone réel.
              </Text>
            </View>
          )}

          <F label="Commentaire" value={comment} onChangeText={setComment} multiline testID="field-event-comment" />

          {props.initial && status !== "prevu" && (
            <F
              label="Commentaire après le rendez-vous (court)"
              value={postComment}
              onChangeText={setPostComment}
              multiline
              testID="field-post-comment"
            />
          )}

          {props.initial && (
            <Pressable onPress={remove} style={styles.deleteBtn} testID="event-delete">
              <Ionicons name="trash-outline" color={colors.error} size={20} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={styles.saveBtn} onPress={save} testID="event-save">
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function F(p: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.fieldLabel}>{p.label}</Text>
      <TextInput
        value={p.value}
        onChangeText={p.onChangeText}
        placeholderTextColor={colors.muted}
        keyboardType={p.keyboardType}
        multiline={p.multiline}
        style={[styles.input, p.multiline && { height: 80, textAlignVertical: "top" }]}
        testID={p.testID}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: colors.onSurface },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  filterInfo: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.brandPrimary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  empty: { alignItems: "center", padding: spacing.xxl },
  emptyText: { color: colors.muted, marginTop: spacing.sm, fontSize: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeBox: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brandSecondary,
    borderRadius: radius.md,
  },
  timeText: { fontSize: 18, fontWeight: "700", color: colors.brandPrimary },
  dateText: { fontSize: 10, color: colors.brandPrimary, textTransform: "capitalize", marginTop: 2 },
  evTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  evSub: { fontSize: 12, color: colors.muted },
  evSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  segmentBtn: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  segmentBtnOn: { backgroundColor: colors.surfaceSecondary },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  segmentTextOn: { color: colors.brandPrimary, fontWeight: "700" },
  childChip: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "transparent" },
  departureExplain: { fontSize: 12, color: colors.brandPrimary, marginTop: 2 },
  reminderBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reminderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  reminderLabel: { fontSize: 14, color: colors.onSurface, flex: 1, paddingRight: spacing.sm },
  reminderNote: { fontSize: 12, color: colors.muted, paddingVertical: spacing.sm },
  evMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6, flexWrap: "wrap" },
  evDeparture: { fontSize: 12, color: colors.brandPrimary, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, marginLeft: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 6,
  },
  fabText: { color: colors.onBrand, fontWeight: "700" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  departureBox: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  departureLabel: { fontSize: 12, color: colors.brandPrimary, fontWeight: "600" },
  departureValue: { fontSize: 22, fontWeight: "700", color: colors.brandPrimary },
  fieldLabel: { fontSize: 12, color: colors.muted, fontWeight: "600", marginBottom: 6, marginTop: spacing.md },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  selectChip: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  selectChipOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  selectChipText: { fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "600" },
  saveBtn: {
    backgroundColor: colors.brandPrimary,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
  deleteBtn: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
  },
  deleteText: { color: colors.error, fontWeight: "600" },
}));
