// Taches de preparation : ligne cochable en un geste + formulaire (lien facultatif vers un RDV).
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { ChildBadge } from "./child-legend";
import { deleteTask, saveTask } from "@/src/lib/tasks";
import { dayBefore, formatDateFr, localIso } from "@/src/lib/time";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AgendaEvent, Task, TaskStatus, TASK_STATUS_LABEL } from "@/src/types";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function TaskRow(props: { task: Task; event?: AgendaEvent; onToggle: () => void; onPress?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = props.task;
  const done = t.status === "done";
  return (
    <View style={styles.row} testID={`task-row-${t.id}`}>
      <Pressable
        onPress={props.onToggle}
        style={styles.check}
        testID={`task-check-${t.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? "Marquer à faire" : "Marquer comme fait"}
      >
        <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={28} color={done ? colors.success : colors.brandPrimary} />
      </Pressable>
      <Pressable style={{ flex: 1 }} onPress={props.onPress} disabled={!props.onPress} testID={`task-open-${t.id}`}>
        <Text style={[styles.title, done && styles.done]}>{t.title}</Text>
        <View style={styles.metaRow}>
          {props.event?.childCode ? <ChildBadge code={props.event.childCode} size={18} /> : null}
          {t.dueDate ? (
            <Text style={styles.meta}>
              Pour {formatDateFr(t.dueDate)}
              {t.dueTime ? ` ${t.dueTime}` : ""}
            </Text>
          ) : null}
          {t.reminderDate && t.reminderTime ? (
            <View style={styles.metaRow}>
              <Ionicons name="notifications-outline" size={13} color={colors.muted} />
              <Text style={styles.meta}>
                {formatDateFr(t.reminderDate)} {t.reminderTime}
              </Text>
            </View>
          ) : null}
          {t.status === "reporte" && <Text style={[styles.meta, { color: colors.warning, fontWeight: "700" }]}>Reporté</Text>}
        </View>
        {props.event && <Text style={styles.meta}>Lié à : {props.event.title}</Text>}
      </Pressable>
    </View>
  );
}

export function TaskForm(props: {
  visible: boolean;
  initial: Task | null;
  events: AgendaEvent[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [remind, setRemind] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("18:00");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!props.visible) return;
    const i = props.initial;
    setTitle(i?.title ?? "");
    setDueDate(i?.dueDate ?? "");
    setDueTime(i?.dueTime ?? "");
    setRemind(!!(i?.reminderDate && i?.reminderTime));
    setReminderDate(i?.reminderDate ?? "");
    setReminderTime(i?.reminderTime ?? "18:00");
    setStatus(i?.status ?? "todo");
    setEventId(i?.eventId ?? null);
  }, [props.visible, props.initial]);

  const linkable = props.events.filter((e) => e.status === "prevu" && e.date >= localIso());
  const baseDate = dueDate || props.events.find((e) => e.id === eventId)?.date || "";

  const setEveningBefore = () => {
    if (!baseDate) return;
    setRemind(true);
    setReminderDate(dayBefore(baseDate));
    setReminderTime("18:00");
  };

  const save = async () => {
    if (!title.trim()) return;
    const t: Task = {
      id: props.initial?.id ?? `task-${uuid()}`,
      title: title.trim(),
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      reminderDate: remind && reminderDate ? reminderDate : undefined,
      reminderTime: remind && reminderDate ? reminderTime : undefined,
      status,
      eventId,
      createdAt: props.initial?.createdAt ?? new Date().toISOString(),
    };
    await saveTask(t, props.initial);
    props.onSaved();
  };

  const remove = async () => {
    if (!props.initial) return;
    await deleteTask(props.initial);
    props.onSaved();
  };

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={props.onClose} testID="task-form-close" style={styles.headerBtn}>
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.modalTitle}>{props.initial ? "Modifier la préparation" : "Nouvelle préparation"}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Titre</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Préparer le pique-nique pour demain"
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="task-title"
          />

          <Text style={styles.label}>Rendez-vous lié (facultatif)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Pressable onPress={() => setEventId(null)} style={[styles.chip, !eventId && styles.chipOn]} testID="task-event-none">
              <Text style={[styles.chipText, !eventId && styles.chipTextOn]}>Aucun</Text>
            </Pressable>
            {linkable.map((e) => {
              const on = eventId === e.id;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setEventId(e.id);
                    if (!dueDate) setDueDate(e.date);
                  }}
                  style={[styles.chip, on && styles.chipOn]}
                  testID={`task-event-${e.id}`}
                >
                  {e.childCode ? <ChildBadge code={e.childCode} size={18} /> : null}
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {formatDateFr(e.date)} · {e.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Échéance (AAAA-MM-JJ)</Text>
              <TextInput value={dueDate} onChangeText={setDueDate} placeholder={localIso()} placeholderTextColor={colors.muted} style={styles.input} testID="task-due-date" />
            </View>
            <View style={{ width: 110 }}>
              <Text style={styles.label}>Heure</Text>
              <TextInput value={dueTime} onChangeText={setDueTime} placeholder="HH:MM" placeholderTextColor={colors.muted} style={styles.input} testID="task-due-time" />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Rappel</Text>
            <Switch value={remind} onValueChange={setRemind} testID="task-remind-switch" trackColor={{ true: colors.brandPrimary, false: colors.border }} />
          </View>
          <Pressable
            onPress={setEveningBefore}
            disabled={!baseDate}
            style={[styles.quickBtn, !baseDate && { opacity: 0.4 }]}
            testID="task-remind-eve"
          >
            <Ionicons name="moon-outline" size={18} color={colors.brandPrimary} />
            <Text style={styles.quickText}>La veille à 18:00</Text>
          </Pressable>
          {remind && (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Date du rappel</Text>
                <TextInput value={reminderDate} onChangeText={setReminderDate} placeholder={localIso()} placeholderTextColor={colors.muted} style={styles.input} testID="task-reminder-date" />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Heure</Text>
                <TextInput value={reminderTime} onChangeText={setReminderTime} placeholderTextColor={colors.muted} style={styles.input} testID="task-reminder-time" />
              </View>
            </View>
          )}

          <Text style={styles.label}>Statut</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {(["todo", "done", "reporte"] as TaskStatus[]).map((s) => {
              const on = status === s;
              return (
                <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, on && styles.chipOn]} testID={`task-status-${s}`}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{TASK_STATUS_LABEL[s]}</Text>
                </Pressable>
              );
            })}
          </View>

          {props.initial && (
            <Pressable onPress={remove} style={styles.deleteBtn} testID="task-delete">
              <Ionicons name="trash-outline" color={colors.error} size={20} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={[styles.saveBtn, !title.trim() && { opacity: 0.5 }]} disabled={!title.trim()} onPress={save} testID="task-save">
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  check: { width: 52, height: 48, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  done: { textDecorationLine: "line-through", color: colors.muted },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  meta: { fontSize: 12, color: colors.muted, textTransform: "none" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  label: { fontSize: 12, color: colors.muted, fontWeight: "600", marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
    height: 48,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "600" },
  chipTextOn: { color: colors.onBrand },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg, minHeight: 44 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brandSecondary,
  },
  quickText: { color: colors.brandPrimary, fontWeight: "700" },
  deleteBtn: { marginTop: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: spacing.md },
  deleteText: { color: colors.error, fontWeight: "600" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  saveBtn: { backgroundColor: colors.brandPrimary, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  saveText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
}));
