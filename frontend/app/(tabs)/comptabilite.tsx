import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
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
import { PickedImage, pickFromLibrary, takePhoto } from "@/src/lib/image-picker";
import { deletePhoto, photoDisplayUri, storePhoto } from "@/src/lib/photo-store";
import { reopenSession, updateInitialBudget } from "@/src/lib/sessions";
import { AddMoneySheet } from "@/src/components/add-money-sheet";
import { CloseSessionSheet } from "@/src/components/close-session-sheet";
import { NewSessionSheet } from "@/src/components/new-session-sheet";
import { CropModal } from "@/src/components/crop-modal";
import { categoryColors, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { BudgetDashboard } from "@/src/components/budget-dashboard";
import { BudgetSheet } from "@/src/components/budget-sheet";
import { localIso, parseLocal } from "@/src/lib/time";
import { round2 } from "@/src/lib/money";
import { confirmAction } from "@/src/lib/confirm";
import {
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  Session,
  needsReview,
  paymentLabel,
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
  const [showBudget, setShowBudget] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const params = useLocalSearchParams<{ session?: string }>();

  useEffect(() => {
    if (params.session) setCurrentSessionId(params.session);
  }, [params.session]);

  const reload = useCallback(async () => {
    const [s, e] = await Promise.all([sessionsRepo.list(), expensesRepo.list()]);
    setSessions(s);
    setExpenses(e);
    if (!s.some((x) => x.id === currentSessionId)) setCurrentSessionId(s[0]?.id ?? null);
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

  const saveBudget = async (budget: number | undefined) => {
    if (!currentSession) return;
    await updateInitialBudget(currentSession.id, budget ?? 0);
    setShowBudget(false);
    reload();
  };

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

  const closed = !!currentSession?.closure;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Comptabilité</Text>
        <Text style={styles.subtitle}>Justificatifs et dépenses</Text>
      </View>

      {/* Session selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.sm }}
        style={{ height: 56, flexGrow: 0, flexShrink: 0 }}
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
        <Pressable onPress={() => setShowNewSession(true)} testID="session-create-chip" style={[styles.chip, styles.chipAdd]}>
          <Ionicons name="add" size={16} color={colors.brandPrimary} />
          <Text style={[styles.chipText, { color: colors.brandPrimary, marginLeft: 4 }]}>Nouvelle session</Text>
        </Pressable>
      </ScrollView>

      <FlatList
        data={filtered}
        ListHeaderComponent={
          !currentSession ? (
            <View style={styles.noSession} testID="no-session">
              <Ionicons name="wallet-outline" size={40} color={colors.brandPrimary} />
              <Text style={styles.noSessionTitle}>Aucune session</Text>
              <Text style={styles.noSessionText}>
                Créez une session (ex. du 1er au 15 du mois) avec son budget pour commencer à enregistrer vos tickets.
              </Text>
              <Pressable onPress={() => setShowNewSession(true)} style={[styles.saveBtn, { alignSelf: "stretch" }]} testID="no-session-create">
                <Text style={styles.saveText}>Créer une session</Text>
              </Pressable>
            </View>
          ) : (
          <BudgetDashboard
            session={currentSession}
            expenses={filtered}
            onEditBudget={() => setShowBudget(true)}
            onAddMoney={() => setShowAddMoney(true)}
            onCloseSession={() => setShowClose(true)}
            onReopen={async () => {
              if (currentSession) await reopenSession(currentSession.id);
              reload();
            }}
            onExport={onExport}
            exporting={exporting}
          />
          )
        }
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        ListEmptyComponent={
          currentSession ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>Aucune dépense pour cette session</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            disabled={closed}
            onPress={() => {
              setEditing(item);
              setShowForm(true);
            }}
            testID={`expense-row-${item.id}`}
            style={styles.expenseRow}
          >
            <View
              style={[
                styles.catIcon,
                { backgroundColor: item.category ? categoryColors[item.category] : colors.surfaceTertiary },
              ]}
            >
              <Ionicons
                name={(EXPENSE_CATEGORIES.find((c) => c.key === item.category)?.icon ?? "help-outline") as any}
                size={22}
                color={item.category ? "#0B1220" : colors.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseMerchant}>{item.merchant || "(Sans enseigne)"}</Text>
              {item.category ? (
                <Text style={styles.expenseMeta}>
                  {item.date} - {EXPENSE_CATEGORIES.find((c) => c.key === item.category)?.label} ·{" "}
                  <Text style={needsReview(item) ? { color: colors.warning, fontWeight: "700" } : null} testID={`pay-label-${item.id}`}>
                    {paymentLabel(item.paymentMethod)}
                  </Text>
                </Text>
              ) : (
                <Text style={[styles.expenseMeta, { color: colors.warning, fontWeight: "700" }]} testID={`to-classify-${item.id}`}>
                  {item.date} - À classer · {paymentLabel(item.paymentMethod)}
                </Text>
              )}
            </View>
            <Text style={styles.expenseAmount}>{item.amount.toFixed(2)} EUR</Text>
          </Pressable>
        )}
      />

      {/* FAB (masque si la session est cloturee) */}
      {currentSession && !closed && <Pressable
        onPress={openNew}
        testID="add-expense-fab"
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
      >
        <Ionicons name="camera" color={colors.onBrand} size={26} />
        <Text style={styles.fabText}>Photo</Text>
      </Pressable>}

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

      <BudgetSheet
        visible={showBudget}
        initial={currentSession?.budget}
        onClose={() => setShowBudget(false)}
        onSave={saveBudget}
      />
      <AddMoneySheet
        visible={showAddMoney}
        sessionId={currentSessionId}
        onClose={() => setShowAddMoney(false)}
        onDone={() => {
          setShowAddMoney(false);
          reload();
        }}
      />
      <CloseSessionSheet
        visible={showClose}
        session={currentSession}
        onClose={() => setShowClose(false)}
        onDone={() => {
          setShowClose(false);
          reload();
        }}
      />
      <NewSessionSheet
        visible={showNewSession}
        onClose={() => setShowNewSession(false)}
        onCreated={(ns) => {
          setShowNewSession(false);
          setCurrentSessionId(ns.id);
          reload();
        }}
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | undefined>(undefined);
  const [cropSource, setCropSource] = useState<PickedImage | null>(null);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [comment, setComment] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrInfo, setOcrInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!props.visible) return;
      const i = props.initial;
      setDate(i?.date ?? localIso());
      setMerchant(i?.merchant ?? "");
      setAmount(i ? String(i.amount) : "");
      setPaymentMethod(i ? i.paymentMethod : null);
      setCategory(i ? i.category : null);
      setComment(i?.comment ?? "");
      setPhotoUri(i?.photoUri);
      setOriginalPhotoUri(i?.originalPhotoUri);
      setOcrInfo(null);
      setError(null);
    }, [props.visible, props.initial]),
  );

  // 1. photo -> 2. apercu / recadrage manuel -> 3. image validee envoyee a la reconnaissance existante
  const runOcr = async (source: "camera" | "library") => {
    const pick = source === "camera" ? await takePhoto() : await pickFromLibrary();
    if (pick) setCropSource(pick);
  };

  const onCropValidated = (pick: PickedImage, original: PickedImage) => {
    setCropSource(null);
    setOriginalPhotoUri(original.uri);
    setPhotoUri(pick.uri);
    analyze(pick);
  };

  const analyze = async (pick: PickedImage) => {
    setOcrLoading(true);
    setOcrInfo(null);
    try {
      const r = await ocrReceipt(pick);
      if (r.date) setDate(r.date);
      if (r.merchant) setMerchant(r.merchant);
      if (r.amount != null) setAmount(String(r.amount));
      const sure = !!r.category && !!EXPENSE_CATEGORIES.find((c) => c.key === r.category);
      if (sure) setCategory(r.category as ExpenseCategory);
      const paySure = r.payment_method === "especes" || r.payment_method === "carte";
      if (paySure) setPaymentMethod(r.payment_method as PaymentMethod);
      const doubts = [!sure && "motif principal", !paySure && "mode de paiement"].filter(Boolean).join(" et ");
      setOcrInfo(
        doubts
          ? `Informations détectées. À vérifier : ${doubts}.`
          : "Informations détectées. Vérifiez et modifiez si besoin.",
      );
    } catch {
      setOcrInfo("Lecture automatique impossible. Saisissez les informations du ticket.");
    } finally {
      setOcrLoading(false);
    }
  };

  const save = async () => {
    if (!props.sessionId || saving) return;
    const amt = parseFloat(amount.replace(",", ".").replace(/\s/g, ""));
    if (!(amt > 0)) return setError("Indiquez le montant total du ticket.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parseLocal(date).getTime())) {
      return setError("Date invalide : format AAAA-MM-JJ (ex. 2026-10-28).");
    }
    setError(null);
    setSaving(true);
    try {
      // Photos conservees seulement a l'enregistrement ; la meme image n'est stockee qu'une fois
      const storedPhoto = photoUri ? await storePhoto(photoUri) : undefined;
      const storedOriginal =
        originalPhotoUri && originalPhotoUri !== photoUri ? await storePhoto(originalPhotoUri) : storedPhoto;
      const exp: Expense = {
        id: props.initial?.id ?? `exp-${uuid()}`,
        sessionId: props.sessionId,
        date,
        merchant: merchant.trim(),
        amount: round2(amt),
        paymentMethod,
        category,
        comment,
        photoUri: storedPhoto,
        originalPhotoUri: storedOriginal,
        createdAt: props.initial?.createdAt ?? new Date().toISOString(),
      };
      await expensesRepo.save(exp);
      // Photos remplacees : supprimees de l'appareil (minimisation des donnees)
      const kept = [storedPhoto, storedOriginal];
      for (const old of [props.initial?.photoUri, props.initial?.originalPhotoUri]) {
        if (old && !kept.includes(old)) await deletePhoto(old);
      }
      props.onSaved();
    } catch {
      setError("Enregistrement impossible (stockage du téléphone plein ?).");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!props.initial) return;
    if (!(await confirmAction("Supprimer cette dépense et son justificatif ?"))) return;
    await expensesRepo.remove(props.initial.id);
    await deletePhoto(props.initial.photoUri);
    await deletePhoto(props.initial.originalPhotoUri);
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
          <Text style={styles.modalTitle}>{props.initial ? "Modifier la dépense" : "Nouvelle dépense"}</Text>
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

          {photoUri && <PhotoThumb uri={photoUri} />}

          {ocrLoading && (
            <View style={styles.ocrBanner}>
              <ActivityIndicator color={colors.brandPrimary} />
              <Text style={styles.ocrText}>Lecture du ticket sur l’appareil… (la première fois peut prendre un moment)</Text>
            </View>
          )}
          {ocrInfo && (
            <View style={[styles.ocrBanner, { backgroundColor: colors.brandSecondary }]}>
              <Ionicons name="information-circle" size={18} color={colors.brandPrimary} />
              <Text style={styles.ocrText}>{ocrInfo}</Text>
            </View>
          )}

          <Field label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} placeholder="2026-10-28" testID="field-date" />
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

          <Text style={styles.fieldLabel}>Mode de paiement</Text>
          {paymentMethod !== "especes" && paymentMethod !== "carte" && (
            <Text style={[styles.ocrText, { color: colors.warning, marginBottom: 4 }]} testID="payment-unconfirmed">
              À vérifier : choisissez ESP ou CB.
            </Text>
          )}
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

          <Text style={styles.fieldLabel}>Motif principal du ticket</Text>
          {!category && (
            <Text style={[styles.ocrText, { color: colors.warning, marginBottom: 4 }]} testID="category-unconfirmed">
              Motif non confirmé : la dépense sera marquée « À classer » et exclue de la répartition.
            </Text>
          )}
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
          {error && (
            <Text style={styles.errorText} testID="expense-error">
              {error}
            </Text>
          )}
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} testID="expense-save">
            {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </Pressable>
        </View>
        <CropModal image={cropSource} onCancel={() => setCropSource(null)} onValidated={onCropValidated} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PhotoThumb({ uri }: { uri: string }) {
  const styles = useStyles();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    photoDisplayUri(uri).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [uri]);
  if (!src) return null;
  return <Image source={{ uri: src }} style={styles.thumb} contentFit="contain" testID="expense-photo-thumb" />;
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
  noSession: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  noSessionTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  noSessionText: { fontSize: 14, color: colors.onSurfaceSecondary, textAlign: "center", marginBottom: spacing.sm },
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
  errorText: { color: colors.error, fontSize: 13, fontWeight: "600", marginBottom: spacing.sm },
  thumb: {
    height: 180,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
}));
