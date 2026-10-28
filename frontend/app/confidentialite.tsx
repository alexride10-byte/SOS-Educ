// Donnees et confidentialite (RGPD) : ou sont les donnees, bonnes pratiques, sauvegarde, effacement.
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { eraseAllData, exportBackup, pickBackupFile, restoreBackup } from "@/src/lib/backup";
import { confirmAction } from "@/src/lib/confirm";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const isWeb = Platform.OS === "web";

export default function Confidentialite() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    setMessage(null);
    try {
      const text = await fn();
      if (text) setMessage({ ok: true, text });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Une erreur est survenue." });
    } finally {
      setBusy(null);
    }
  };

  const onExport = () =>
    run("export", async () => ((await exportBackup()) ? "Sauvegarde créée. Rangez-la dans un endroit sûr." : null));

  const onRestore = () =>
    run("restore", async () => {
      const json = await pickBackupFile();
      if (!json) return null;
      if (!(await confirmAction("Remplacer TOUTES les données de cet appareil par celles de la sauvegarde ?", "Restaurer"))) return null;
      await restoreBackup(json);
      return "Sauvegarde restaurée.";
    });

  const onErase = () =>
    run("erase", async () => {
      const ok = await confirmAction(
        "Effacer définitivement toutes les données (dépenses, photos, agenda) de cet appareil ? Pensez à exporter une sauvegarde avant.",
        "Tout effacer",
      );
      if (!ok) return null;
      await eraseAllData();
      router.replace("/(tabs)");
      return null;
    });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="privacy-back" hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Données et confidentialité</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}>
        <Section icon="phone-portrait-outline" title="Vos données restent sur cet appareil">
          <P>
            Aucun compte, aucun serveur, aucune publicité, aucun traceur. Dépenses, photos de tickets, agenda et préparations
            sont enregistrés uniquement {isWeb ? "dans le navigateur de ce téléphone" : "dans ce téléphone"}.
          </P>
          <P>La lecture des tickets se fait sur l’appareil : la photo n’est envoyée à personne.</P>
        </Section>

        <Section icon="list-outline" title="Ce qui est enregistré">
          <P>• Dépenses : date, enseigne, montant, motif, mode de paiement (ESP / CB), commentaire, photo du ticket.</P>
          <P>• Rendez-vous : titre, date, lieu, code enfant (A à E), commentaires, rappels.</P>
          <P>• Préparations et budget des sessions.</P>
        </Section>

        <Section icon="shield-checkmark-outline" title="Bonnes pratiques">
          <P>• N’écrivez jamais le nom d’un enfant : utilisez les codes A à E.</P>
          <P>• Pas de détail médical ou personnel dans les titres et commentaires (« Consultation » suffit).</P>
          <P>• Verrouillez votre téléphone (code ou biométrie).</P>
          <P>• Pour un usage en structure, faites valider l’outil par votre employeur ou son délégué à la protection des données.</P>
        </Section>

        <Section icon="warning-outline" title="Attention">
          <P>
            {isWeb
              ? "Si vous effacez les données du navigateur, ou désinstallez l'appli de l'écran d'accueil, tout est perdu. "
              : "Si vous désinstallez l'appli, tout est perdu. "}
            Exportez une sauvegarde régulièrement (par exemple à chaque fin de session).
          </P>
          <P>Le fichier de sauvegarde contient vos données et photos : ne le partagez pas, rangez-le dans un endroit sûr.</P>
        </Section>

        {message && (
          <Text style={[styles.message, { color: message.ok ? colors.success : colors.error }]} testID="privacy-message">
            {message.text}
          </Text>
        )}

        <Action icon="download-outline" label="Exporter une sauvegarde" onPress={onExport} busy={busy === "export"} testID="backup-btn" />
        {isWeb && (
          <Action icon="cloud-upload-outline" label="Restaurer une sauvegarde" onPress={onRestore} busy={busy === "restore"} testID="restore-btn" />
        )}
        <Action
          icon="trash-outline"
          label="Effacer toutes mes données"
          onPress={onErase}
          busy={busy === "erase"}
          danger
          testID="erase-btn"
        />
      </ScrollView>
    </View>
  );
}

function Section(props: { icon: string; title: string; children: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={props.icon as any} size={20} color={colors.brandPrimary} />
        <Text style={styles.cardTitle}>{props.title}</Text>
      </View>
      {props.children}
    </View>
  );
}

function P({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.p}>{children}</Text>;
}

function Action(props: { icon: string; label: string; onPress: () => void; busy?: boolean; danger?: boolean; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = props.danger ? colors.error : colors.brandPrimary;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.busy}
      testID={props.testID}
      style={({ pressed }) => [styles.action, { borderColor: color }, pressed && { opacity: 0.7 }]}
    >
      {props.busy ? <ActivityIndicator color={color} /> : <Ionicons name={props.icon as any} size={20} color={color} />}
      <Text style={[styles.actionText, { color }]}>{props.label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.onSurface, flexShrink: 1 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, flexShrink: 1 },
  p: { fontSize: 14, lineHeight: 20, color: colors.onSurfaceSecondary, marginTop: 4 },
  message: { fontSize: 14, fontWeight: "600", marginBottom: spacing.md },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  actionText: { fontSize: 15, fontWeight: "700" },
}));
