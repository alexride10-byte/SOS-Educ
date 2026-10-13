// Cloture d'une session : solde final calcule depuis les donnees, report confirme explicitement.
// En cas de reouverture d'une session deja reportee, propose de mettre a jour le report lie.
import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { Sheet, useFormStyles } from "./sheet";
import { fmtEur } from "@/src/lib/money";
import { closeSession, getSession, sessionBalance } from "@/src/lib/sessions";
import { useTheme } from "@/src/theme";
import { Session } from "@/src/types";

export function CloseSessionSheet(props: { visible: boolean; session: Session | null; onClose: () => void; onDone: () => void }) {
  const f = useFormStyles();
  const { colors } = useTheme();
  const [balance, setBalance] = useState<number | null>(null);
  const [target, setTarget] = useState<Session | null>(null);
  const [report, setReport] = useState(true);

  useEffect(() => {
    if (!props.visible || !props.session) return;
    const lt = props.session.lastTransfer;
    Promise.all([sessionBalance(props.session.id), lt ? getSession(lt.toSessionId) : Promise.resolve(null)]).then(([b, t]) => {
      setReport(true);
      setBalance(b);
      setTarget(t);
    });
  }, [props.visible, props.session]);

  const s = props.session;
  if (!s) return null;
  const old = s.lastTransfer?.amount;
  const linked = !!s.lastTransfer && !!target;

  const run = async (opts: { report: boolean; updateLinked: boolean }) => {
    await closeSession(s.id, opts);
    props.onDone();
  };

  return (
    <Sheet visible={props.visible} title="Clôturer la session" onClose={props.onClose} testID="close-session-sheet">
      <View style={f.card}>
        <Text style={f.cardText}>{s.label}</Text>
        <Text style={[f.cardText, { marginTop: 4 }]}>
          Solde final :{" "}
          <Text style={[f.strong, { color: balance != null && balance < 0 ? colors.error : colors.success }]} testID="close-final-balance">
            {balance == null ? "…" : fmtEur(balance)}
          </Text>
        </Text>
      </View>

      {balance != null && linked ? (
        <>
          <Text style={[f.help, { marginTop: 12 }]} testID="close-linked-info">
            Ce solde avait déjà été reporté vers « {target!.label} » : {fmtEur(old!)}.
            {old === balance ? " Le montant est inchangé." : ` Nouveau solde : ${fmtEur(balance)}.`}
          </Text>
          {old === balance ? (
            <Pressable style={f.primary} onPress={() => run({ report: true, updateLinked: false })} testID="confirm-close-btn">
              <Text style={f.primaryText}>Clôturer</Text>
            </Pressable>
          ) : (
            <>
              <Pressable style={f.primary} onPress={() => run({ report: true, updateLinked: true })} testID="close-update-carry-btn">
                <Text style={f.primaryText}>Mettre à jour le report ({fmtEur(old!)} → {fmtEur(balance)})</Text>
              </Pressable>
              <Pressable style={f.secondary} onPress={() => run({ report: true, updateLinked: false })} testID="close-keep-carry-btn">
                <Text style={f.secondaryText}>Garder l’ancien report ({fmtEur(old!)})</Text>
              </Pressable>
            </>
          )}
        </>
      ) : balance != null ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, minHeight: 48 }}>
            <Text style={[f.cardText, { flex: 1 }]}>Reporter ce solde vers la prochaine session</Text>
            <Switch value={report} onValueChange={setReport} testID="close-report-switch" trackColor={{ true: colors.brandPrimary, false: colors.border }} />
          </View>
          {report && balance < 0 && <Text style={f.help}>La prochaine session démarrera avec un report négatif.</Text>}
          <Text style={f.help}>
            Le report sera proposé une seule fois, à la création de la prochaine session. Vous pourrez rouvrir cette session pour la corriger.
          </Text>
          <Pressable style={f.primary} onPress={() => run({ report, updateLinked: false })} testID="confirm-close-btn">
            <Text style={f.primaryText}>{report ? "Clôturer et reporter" : "Clôturer sans reporter"}</Text>
          </Pressable>
        </>
      ) : null}
    </Sheet>
  );
}
