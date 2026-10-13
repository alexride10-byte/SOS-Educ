// "+ Ajouter de l'argent" : montant obligatoire (> 0), motif facultatif. Aucune validation administrative.
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput } from "react-native";

import { Sheet, useFormStyles } from "./sheet";
import { addMoney } from "@/src/lib/sessions";
import { useTheme } from "@/src/theme";

const AMOUNT_RE = /^\d+([.,]\d{1,2})?$/;

export function AddMoneySheet(props: { visible: boolean; sessionId: string | null; onClose: () => void; onDone: () => void }) {
  const f = useFormStyles();
  const { colors } = useTheme();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (props.visible) {
      setAmount("");
      setReason("");
      setError(null);
    }
  }, [props.visible]);

  const parsed = AMOUNT_RE.test(amount.trim()) ? parseFloat(amount.replace(",", ".")) : NaN;
  const valid = parsed > 0;

  const confirm = async () => {
    if (!valid || !props.sessionId) return;
    try {
      await addMoney(props.sessionId, parsed, reason);
      props.onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Sheet visible={props.visible} title="Ajouter de l'argent" onClose={props.onClose} testID="add-money-sheet">
      <Text style={f.label}>Montant (€)</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="100" placeholderTextColor={colors.muted} style={f.input} autoFocus testID="add-money-amount" />
      {amount.trim() !== "" && !valid && <Text style={f.error} testID="add-money-error">Montant invalide (nombre positif, 2 décimales max.)</Text>}
      <Text style={f.label}>Motif (facultatif)</Text>
      <TextInput value={reason} onChangeText={setReason} placeholder="Ex. complément sortie" placeholderTextColor={colors.muted} style={f.input} testID="add-money-reason" />
      {error && <Text style={f.error}>{error}</Text>}
      <Pressable onPress={confirm} disabled={!valid} style={[f.primary, !valid && { opacity: 0.5 }]} testID="add-money-confirm">
        <Text style={f.primaryText}>Confirmer</Text>
      </Pressable>
    </Sheet>
  );
}
