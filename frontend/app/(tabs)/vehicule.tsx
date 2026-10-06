import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { sessionsRepo, tripsRepo } from "@/src/lib/storage";
import { ocrOdometer } from "@/src/lib/ocr";
import { pickFromLibrary, takePhoto } from "@/src/lib/image-picker";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Session, Trip } from "@/src/types";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Vehicule() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);

  const reload = useCallback(async () => {
    const [s, t] = await Promise.all([sessionsRepo.list(), tripsRepo.list()]);
    setSessions(s);
    setTrips(t);
    if (!currentSessionId && s[0]) setCurrentSessionId(s[0].id);
  }, [currentSessionId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const filtered = useMemo(
    () =>
      trips
        .filter((t) => t.sessionId === currentSessionId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [trips, currentSessionId],
  );

  const totalKm = filtered.reduce((s, t) => s + Math.max(0, t.kmEnd - t.kmStart), 0);

  // Prefill helpers
  const lastTrip = filtered[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicule</Text>
        <Text style={styles.subtitle}>Deplacements et kilometrage</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.sm }}
        style={{ maxHeight: 56 }}
      >
        {sessions.map((s) => {
          const selected = s.id === currentSessionId;
          return (
            <Pressable
              key={s.id}
              onPress={() => setCurrentSessionId(s.id)}
              testID={`trip-session-chip-${s.id}`}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total parcouru</Text>
          <Text style={styles.totalValue} testID="trip-total-km">
            {totalKm} km
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.totalLabel}>Trajets</Text>
          <Text style={styles.totalValue}>{filtered.length}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Aucun trajet enregistre</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setEditing(item);
              setShowForm(true);
            }}
            testID={`trip-row-${item.id}`}
            style={styles.card}
          >
            <View style={styles.kmBox}>
              <Text style={styles.kmText}>{item.kmEnd - item.kmStart}</Text>
              <Text style={styles.kmUnit}>km</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>{item.destination}</Text>
              <Text style={styles.tripSub}>
                {item.date} - {item.vehicle}
              </Text>
              <Text style={styles.tripMeta}>
                {item.kmStart} -&gt; {item.kmEnd} - {item.purpose}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => {
          setEditing(null);
          setShowForm(true);
        }}
        testID="add-trip-fab"
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
      >
        <Ionicons name="add" color={colors.onBrand} size={28} />
        <Text style={styles.fabText}>Trajet</Text>
      </Pressable>

      <TripForm
        visible={showForm}
        initial={editing}
        sessionId={currentSessionId}
        lastTrip={lastTrip ?? null}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
      />
    </View>
  );
}

function TripForm(props: {
  visible: boolean;
  initial: Trip | null;
  sessionId: string | null;
  lastTrip: Trip | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrInfo, setOcrInfo] = useState<string | null>(null);
  const [ocrTarget, setOcrTarget] = useState<"start" | "end">("start");

  useFocusEffect(
    useCallback(() => {
      if (!props.visible) return;
      const i = props.initial;
      const last = props.lastTrip;
      setDate(i?.date ?? new Date().toISOString().split("T")[0]);
      setVehicle(i?.vehicle ?? last?.vehicle ?? "");
      setDriver(i?.driver ?? last?.driver ?? "");
      setKmStart(i ? String(i.kmStart) : last ? String(last.kmEnd) : "");
      setKmEnd(i ? String(i.kmEnd) : "");
      setDestination(i?.destination ?? last?.destination ?? "");
      setPurpose(i?.purpose ?? "");
      setPhotoUri(i?.photoUri);
      setOcrInfo(null);
    }, [props.visible, props.initial, props.lastTrip]),
  );

  const km = Math.max(0, (parseInt(kmEnd) || 0) - (parseInt(kmStart) || 0));

  const runOcr = async (target: "start" | "end", source: "camera" | "library") => {
    setOcrTarget(target);
    const pick = source === "camera" ? await takePhoto() : await pickFromLibrary();
    if (!pick) return;
    setPhotoUri(pick.uri);
    if (!pick.base64) {
      setOcrInfo("Image sans base64, verifiez manuellement.");
      return;
    }
    setOcrLoading(true);
    setOcrInfo(null);
    try {
      const r = await ocrOdometer(pick.base64, pick.mimeType);
      if (r.kilometers != null) {
        if (target === "start") setKmStart(String(r.kilometers));
        else setKmEnd(String(r.kilometers));
        setOcrInfo(`Kilometrage detecte: ${r.kilometers} km. Verifiez si besoin.`);
      } else {
        setOcrInfo("Kilometrage non detecte. Saisie manuelle.");
      }
    } catch {
      setOcrInfo("OCR indisponible. Saisie manuelle.");
    } finally {
      setOcrLoading(false);
    }
  };

  const save = async () => {
    if (!props.sessionId) return;
    const t: Trip = {
      id: props.initial?.id ?? `trip-${uuid()}`,
      sessionId: props.sessionId,
      date,
      vehicle: vehicle.trim(),
      driver: driver.trim(),
      kmStart: parseInt(kmStart) || 0,
      kmEnd: parseInt(kmEnd) || 0,
      destination: destination.trim(),
      purpose: purpose.trim(),
      photoUri,
      createdAt: props.initial?.createdAt ?? new Date().toISOString(),
    };
    await tripsRepo.save(t);
    props.onSaved();
  };

  const remove = async () => {
    if (!props.initial) return;
    await tripsRepo.remove(props.initial.id);
    props.onSaved();
  };

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={props.onClose} testID="trip-form-close">
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.modalTitle}>{props.initial ? "Modifier trajet" : "Nouveau trajet"}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
          <View style={styles.photoBtnRow}>
            <Pressable style={styles.photoBtn} onPress={() => runOcr("start", "camera")} testID="trip-ocr-start">
              <Ionicons name="camera" size={20} color={colors.onBrand} />
              <Text style={styles.photoBtnText}>Compteur depart</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => runOcr("end", "camera")} testID="trip-ocr-end">
              <Ionicons name="camera" size={20} color={colors.onBrand} />
              <Text style={styles.photoBtnText}>Compteur arrivee</Text>
            </Pressable>
          </View>

          {ocrLoading && (
            <View style={styles.ocrBanner}>
              <ActivityIndicator color={colors.brandPrimary} />
              <Text style={styles.ocrText}>Lecture du compteur ({ocrTarget === "start" ? "depart" : "arrivee"})...</Text>
            </View>
          )}
          {ocrInfo && (
            <View style={[styles.ocrBanner, { backgroundColor: colors.brandSecondary }]}>
              <Ionicons name="information-circle" size={18} color={colors.brandPrimary} />
              <Text style={styles.ocrText}>{ocrInfo}</Text>
            </View>
          )}

          <F label="Date" value={date} onChangeText={setDate} testID="trip-date" />
          <F label="Vehicule" value={vehicle} onChangeText={setVehicle} testID="trip-vehicle" />
          <F label="Conducteur" value={driver} onChangeText={setDriver} testID="trip-driver" />

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <F
                label="Km depart"
                value={kmStart}
                onChangeText={setKmStart}
                keyboardType="number-pad"
                testID="trip-km-start"
              />
            </View>
            <View style={{ flex: 1 }}>
              <F
                label="Km arrivee"
                value={kmEnd}
                onChangeText={setKmEnd}
                keyboardType="number-pad"
                testID="trip-km-end"
              />
            </View>
          </View>

          <View style={styles.kmResultBox} testID="trip-km-calc">
            <Ionicons name="speedometer" size={20} color={colors.brandPrimary} />
            <Text style={styles.kmResultText}>Distance: {km} km</Text>
          </View>

          <F label="Destination" value={destination} onChangeText={setDestination} testID="trip-destination" />
          <F label="Motif" value={purpose} onChangeText={setPurpose} testID="trip-purpose" />

          {props.initial && (
            <Pressable onPress={remove} style={styles.deleteBtn} testID="trip-delete">
              <Ionicons name="trash-outline" color={colors.error} size={20} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={styles.saveBtn} onPress={save} testID="trip-save">
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
        style={styles.input}
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
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
    flexDirection: "row",
  },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "600" },
  chipTextSelected: { color: colors.onBrand },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: { fontSize: 12, color: colors.muted },
  totalValue: { fontSize: 22, fontWeight: "700", color: colors.onSurface, marginTop: 2 },
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
  kmBox: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brandSecondary,
    borderRadius: radius.md,
  },
  kmText: { fontSize: 18, fontWeight: "700", color: colors.brandPrimary },
  kmUnit: { fontSize: 10, color: colors.brandPrimary, marginTop: 2 },
  tripTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  tripSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tripMeta: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 4 },
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
  photoBtnRow: { flexDirection: "row", gap: spacing.sm },
  photoBtn: {
    flex: 1,
    height: 56,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
  },
  photoBtnText: { color: colors.onBrand, fontWeight: "700", fontSize: 13 },
  ocrBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceTertiary,
  },
  ocrText: { color: colors.onSurface, flex: 1, fontSize: 13 },
  kmResultBox: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  kmResultText: { fontSize: 16, fontWeight: "700", color: colors.brandPrimary },
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
