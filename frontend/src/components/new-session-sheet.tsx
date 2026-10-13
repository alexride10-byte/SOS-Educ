// Creation d'une session : debut obligatoire, fin facultative, report (prerempli s'il est en attente), budget initial.
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { Sheet, useFormStyles } from "./sheet";
import { findPendingCarry, fmtEur, round2 } from "@/src/lib/money";
import { createSession } from "@/src/lib/sessions";
import { sessionsRepo } from "@/src/lib/storage";
import { localIso, parseLocal } from "@/src/lib/time";
import { useTheme } from "@/src/theme";
import { Session } from "@/src/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUM_RE = /^-?\d+([.,]\d{1,2})?$/;
const isDate = (v: string) => DATE_RE.test(v) && localIso(parseLocal(v)) === v;
const num = (v: string) => (NUM_RE.test(v.trim()) ? parseFloat(v.replace(",", ".")) : NaN);

export function NewSessionSheet(props: { visible: boolean; onClose: () => void; onCreated: (s: Session) => void }) {
  const f = useFormStyles();
  const { colors } = useTheme();
  const [start, setStart] = useState(localIso());
  const [end, setEnd] = useState("");
  const [budget, setBudget] = useState("");
  const [manualCarry, setManualCarry] = useState("0");
  const [pending, setPending] = useState<Session | null>(null);
  const [usePending, setUsePending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.visible) return;
    setStart(localIso());
    setEnd("");
    setBudget("");
    setManualCarry("0");
    setUsePending(true);
    setError(null);
    sessionsRepo.list().then((l) => setPending(findPendingCarry(l)));
  }, [props.visible]);

  const takePending = !!pending && usePending;
  const carry = takePending ? pending!.closure!.finalBalance : num(manualCarry);
  const budgetVal = num(budget);
  const errors: string[] = [];
  if (!isDate(start)) errors.push("Date de début invalide (AAAA-MM-JJ).");
  if (end && (!isDate(end) || end < start)) errors.push("Date de fin invalide ou antérieure au début.");
  if (isNaN(budgetVal) || budgetVal < 0) errors.push("Budget initial requis (0 ou plus).");
  if (isNaN(carry)) errors.push("Montant reporté invalide.");
  const valid = errors.length === 0;

  const create = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const s = await createSession({
        startDate: start,
        endDate: end || undefined,
        budget: budgetVal,
        carryAmount: carry,
        fromSessionId: takePending ? pending!.id : null,
      });
      props.onCreated(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={props.visible} title="Nouvelle session" onClose={props.onClose} testID="new-session-sheet">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Début *</Text>
          <TextInput value={start} onChangeText={setStart} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.muted} style={f.input} testID="new-session-start" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Fin (facultatif)</Text>
          <TextInput value={end} onChangeText={setEnd} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.muted} style={f.input} testID="new-session-end" />
        </View>
      </View>

      <Text style={f.label}>Report de la session précédente</Text>
      {pending ? (
        <View style={f.card} testID="new-session-pending-carry">
          <Text style={f.cardText}>
            {pending.label} (clôturée) : <Text style={f.strong} testID="new-session-carry-amount">{fmtEur(pending.closure!.finalBalance)}</Text>
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, minHeight: 44 }}>
            <Text style={f.cardText}>Reprendre ce report</Text>
            <Switch value={usePending} onValueChange={setUsePending} testID="new-session-use-carry" trackColor={{ true: colors.brandPrimary, false: colors.border }} />
          </View>
        </View>
      ) : null}
      {!takePending && (
        <>
          <TextInput value={manualCarry} onChangeText={setManualCarry} keyboardType="numbers-and-punctuation" style={f.input} testID="new-session-carry-input" />
          <Text style={f.help}>{pending ? "Report non repris : il reste disponible pour plus tard." : "Aucune session clôturée en attente de report : 0 € par défaut."}</Text>
        </>
      )}

      <Text style={f.label}>Budget initial reçu (€) *</Text>
      <TextInput value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="500" placeholderTextColor={colors.muted} style={f.input} testID="new-session-budget" />

      {valid && (
        <View style={f.card}>
          <Text style={f.cardText} testID="new-session-available">
            Budget disponible au départ : <Text style={f.strong}>{fmtEur(round2(carry + budgetVal))}</Text>
          </Text>
        </View>
      )}
      {(budget !== "" || error) && !valid && errors.map((e) => <Text key={e} style={f.error}>{e}</Text>)}
      {error && <Text style={f.error}>{error}</Text>}

      <Pressable onPress={create} disabled={!valid || saving} style={[f.primary, (!valid || saving) && { opacity: 0.5 }]} testID="new-session-create">
        <Text style={f.primaryText}>Créer la session</Text>
      </Pressable>
    </Sheet>
  );
}
