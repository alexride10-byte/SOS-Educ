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

import { expensesRepo, sessionsRepo } from "@/src/lib/storage";
import { exportSessionPdf } from "@/src/lib/pdf";
import { ocrReceipt } from "@/src/lib/ocr";
import { pickFromLibrary, takePhoto } from "@/src/lib/image-picker";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import {
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  Session,
} from "@/src/types";

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Comptabilite() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [exporting, setExporting] = useState(false);

  const reload = useCallback(async () => {
    const [s, e] = await Promise.all([sessionsRepo.list(), expensesRepo.list()]);
    setSessions(s);
    setExpenses(e);
    if (!currentSessionId && s[0]) setCurrentSessionId(s[0].id);
  }, [currentSessionId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const currentSession = sessions.find((x) => x.id === currentSessionId) ?? null;
  const filtered = useMemo(
    () => expenses.filter((e) => e.sessionId === currentSessionId),
    [expenses, currentSessionId],
  );
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const onExport = async () => {
    if (!currentSession) return;
    setExporting(true);
    try {
      await exportSessionPdf(currentSession, expenses);
    } finally {
      setExporting(false);
    }
  };

  const createSession = async () => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 14);
    const s: Session = {
      id: `sess-${uuid()}`,
      label: `Session du ${start.getDate()}/${start.getMonth() + 1} au ${end.getDate()}/${end.getMonth() + 1}`,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };
    await sessionsRepo.save(s);
    setCurrentSessionId(s.id);
    reload();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Comptabilite</Text>
        <Text style={styles.subtitle}>Justificatifs et depenses</Text>
      </View>

      {/* Session selector */}
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
              testID={`session-chip-${s.id}`}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={createSession} testID="session-create-chip" style={[styles.chip, styles.chipAdd]}>
          <Ionicons name="add" size={16} color={colors.brandPrimary} />
          <Text style={[styles.chipText, { color: colors.brandPrimary, marginLeft: 4 }]}>Nouvelle session</Text>
        </Pressable>
      </ScrollView>

      {/* Totals */}
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total session</Text>
          <Text style={styles.totalValue} testID="session-total">
            {total.toFixed(2)} EUR
          </Text>
        </View>
        <Pressable
          onPress={onExport}
          disabled={!currentSession || exporting}
          testID="export-session-btn"
          style={[styles.exportBtn, (!currentSession || exporting) && { opacity: 0.5 }]}
        >
          {exporting ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="print-outline" size={18} color={colors.onBrand} />
              <Text style={styles.exportText}>Exporter PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Aucune depense pour cette session</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setEditing(item);
              setShowForm(true);
            }}
            testID={`expense-row-${item.id}`}
            style={styles.expenseRow}
          >
            <View style={styles.catIcon}>
              <Ionicons
                name={(EXPENSE_CATEGORIES.find((c) => c.key === item.category)?.icon ?? "pricetag-outline") as any}
                size={22}
                color={colors.brandPrimary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseMerchant}>{item.merchant || "(Sans enseigne)"}</Text>
              <Text style={styles.expenseMeta}>
                {item.date} - {EXPENSE_CATEGORIES.find((c) => c.key === item.category)?.label}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>{item.amount.toFixed(2)} EUR</Text>
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={openNew}
        testID="add-expense-fab"
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
      >
        <Ionicons name="camera" color={colors.onBrand} size={26} />
        <Text style={styles.fabText}>Photo</Text>
      </Pressable>

      <ExpenseFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await reload();
        }}
        initial={editing}
        sessionId={currentSessionId}
      />
    </View>
  );
}

// ============== Form ==============
function ExpenseFormModal(props: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: Expense | null;
  sessionId: string | null;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("carte");
  const [category, setCategory] = useState<ExpenseCategory>("alimentation");
  const [comment, setComment] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrInfo, setOcrInfo] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!props.visible) return;
      const i = props.initial;
      setDate(i?.date ?? new Date().toISOString().split("T")[0]);
      setMerchant(i?.merchant ?? "");
      setAmount(i ? String(i.amount) : "");
      setPaymentMethod(i?.paymentMethod ?? "carte");
      setCategory(i?.category ?? "alimentation");
      setComment(i?.comment ?? "");
      setPhotoUri(i?.photoUri);
      setOcrInfo(null);
    }, [props.visible, props.initial]),
  );

  const runOcr = async (source: "camera" | "library") => {
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
      const r = await ocrReceipt(pick.base64, pick.mimeType);
      if (r.date) setDate(r.date);
      if (r.merchant) setMerchant(r.merchant);
      if (r.amount != null) setAmount(String(r.amount));
      if (r.category && EXPENSE_CATEGORIES.find((c) => c.key === r.category)) {
        setCategory(r.category as ExpenseCategory);
      }
      setOcrInfo("Informations detectees. Verifiez et modifiez si besoin.");
    } catch {
      setOcrInfo("OCR indisponible. Saisie manuelle requise.");
    } finally {
      setOcrLoading(false);
    }
  };

  const save = async () => {
    if (!props.sessionId) return;
    const amt = parseFloat(amount.replace(",", "."));
    const exp: Expense = {
      id: props.initial?.id ?? `exp-${uuid()}`,
      sessionId: props.sessionId,
      date: date || new Date().toISOString().split("T")[0],
      merchant: merchant.trim(),
      amount: isNaN(amt) ? 0 : amt,
      paymentMethod,
      category,
      comment,
      photoUri,
      createdAt: props.initial?.createdAt ?? new Date().toISOString(),
    };
    await expensesRepo.save(exp);
    props.onSaved();
  };

  const remove = async () => {
    if (!props.initial) return;
    await expensesRepo.remove(props.initial.id);
    props.onSaved();
  };

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={props.onClose} testID="expense-form-close">
            <Ionicons name="close" size={28} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.modalTitle}>{props.initial ? "Modifier la depense" : "Nouvelle depense"}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
          <View style={styles.photoBtnRow}>
            <Pressable style={styles.photoBtn} onPress={() => runOcr("camera")} testID="expense-photo-camera">
              <Ionicons name="camera" size={22} color={colors.onBrand} />
              <Text style={styles.photoBtnText}>Photographier</Text>
            </Pressable>
            <Pressable
              style={[styles.photoBtn, styles.photoBtnSecondary]}
              onPress={() => runOcr("library")}
              testID="expense-photo-library"
            >
              <Ionicons name="image" size={22} color={colors.brandPrimary} />
              <Text style={[styles.photoBtnText, { color: colors.brandPrimary }]}>Galerie</Text>
            </Pressable>
          </View>

          {ocrLoading && (
            <View style={styles.ocrBanner}>
              <ActivityIndicator color={colors.brandPrimary} />
              <Text style={styles.ocrText}>Analyse du ticket...</Text>
            </View>
          )}
          {ocrInfo && (
            <View style={[styles.ocrBanner, { backgroundColor: colors.brandSecondary }]}>
              <Ionicons name="information-circle" size={18} color={colors.brandPrimary} />
              <Text style={styles.ocrText}>{ocrInfo}</Text>
            </View>
          )}

          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" testID="field-date" />
          <Field
            label="Enseigne / lieu"
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Supermarche..."
            testID="field-merchant"
          />
          <Field
            label="Montant (EUR)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            testID="field-amount"
          />

          <Text style={styles.fieldLabel}>Moyen de paiement</Text>
          <View style={styles.chipRow}>
            {PAYMENT_METHODS.map((p) => {
              const selected = paymentMethod === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPaymentMethod(p.key)}
                  style={[styles.selectChip, selected && styles.selectChipOn]}
                  testID={`pay-${p.key}`}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={16}
                    color={selected ? colors.onBrand : colors.onSurfaceSecondary}
                  />
                  <Text style={[styles.selectChipText, selected && { color: colors.onBrand }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Categorie</Text>
          <View style={styles.chipRow}>
            {EXPENSE_CATEGORIES.map((c) => {
              const selected = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[styles.selectChip, selected && styles.selectChipOn]}
                  testID={`cat-${c.key}`}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={16}
                    color={selected ? colors.onBrand : colors.onSurfaceSecondary}
                  />
                  <Text style={[styles.selectChipText, selected && { color: colors.onBrand }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Commentaire"
            value={comment}
            onChangeText={setComment}
            placeholder="Optionnel"
            multiline
            testID="field-comment"
          />

          {props.initial && (
            <Pressable onPress={remove} style={styles.deleteBtn} testID="expense-delete">
              <Ionicons name="trash-outline" color={colors.error} size={20} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={styles.saveBtn} onPress={save} testID="expense-save">
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        style={[styles.input, props.multiline && { height: 80, textAlignVertical: "top" }]}
        testID={props.testID}
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
  chipAdd: { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary },
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
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
  },
  exportText: { color: colors.onBrand, fontWeight: "700" },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  expenseMerchant: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  expenseMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  empty: { alignItems: "center", padding: spacing.xxl },
  emptyText: { color: colors.muted, marginTop: spacing.sm, fontSize: 14 },
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.onBrand, fontWeight: "700", fontSize: 15 },

  // Modal
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  photoBtnRow: { flexDirection: "row", gap: spacing.sm },
  photoBtn: {
    flex: 1,
    height: 56,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
  },
  photoBtnSecondary: { backgroundColor: colors.brandSecondary },
  photoBtnText: { color: colors.onBrand, fontWeight: "700" },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
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
