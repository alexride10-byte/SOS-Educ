// Verrouillage de l'appli par l'empreinte, le visage ou le code du telephone (Android).
// L'appli ne stocke aucun code : elle demande au systeme de verifier la personne. Sans serveur ni compte.
// Le contenu reste monte sous l'ecran de verrouillage (un formulaire en cours n'est pas perdu).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import Ionicons from "@react-native-vector-icons/ionicons";

import { kv } from "./storage";
import { radius, spacing, useTheme } from "@/src/theme";

const KEY = "cs.lock.v1";
const RELOCK_AFTER_MS = 60_000; // retour apres plus d'une minute en arriere-plan : nouvelle verification

export const lockSupported = Platform.OS !== "web";

// Le telephone doit avoir au moins un code, un schema ou une empreinte
export async function lockAvailable(): Promise<boolean> {
  if (!lockSupported) return false;
  return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: "Annuler" });
  return r.success;
}

const Ctx = createContext<{ enabled: boolean; setEnabled: (on: boolean) => Promise<void> }>({
  enabled: false,
  setEnabled: async () => {},
});
export const useAppLock = () => useContext(Ctx);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(lockSupported); // masque tout tant que le reglage n'est pas lu
  const hiddenAt = useRef<number | null>(null);
  const enabledRef = useRef(false);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (await authenticate("Déverrouiller CareSync")) setLocked(false);
  }, []);

  useEffect(() => {
    if (!lockSupported) return;
    kv.get(KEY, false).then((on) => {
      setEnabledState(on);
      if (on) unlock();
      else setLocked(false);
    });
  }, [unlock]);

  useEffect(() => {
    if (!lockSupported) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") hiddenAt.current = Date.now();
      else if (state === "active" && hiddenAt.current !== null) {
        const away = Date.now() - hiddenAt.current;
        hiddenAt.current = null;
        if (enabledRef.current && away > RELOCK_AFTER_MS) {
          setLocked(true);
          unlock();
        }
      }
    });
    return () => sub.remove();
  }, [unlock]);

  const setEnabled = async (on: boolean) => {
    await kv.set(KEY, on);
    setEnabledState(on);
  };

  return (
    <Ctx.Provider value={{ enabled, setEnabled }}>
      {children}
      {locked && <LockScreen ready={enabled} onUnlock={unlock} />}
    </Ctx.Provider>
  );
}

function LockScreen({ ready, onUnlock }: { ready: boolean; onUnlock: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.surface }]} testID="lock-screen">
      {ready && (
        <>
          <Ionicons name="lock-closed" size={48} color={colors.brandPrimary} />
          <Text style={[styles.title, { color: colors.onSurface }]}>CareSync est verrouillé</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>Empreinte, visage ou code du téléphone</Text>
          <Pressable onPress={onUnlock} style={[styles.btn, { backgroundColor: colors.brandPrimary }]} testID="lock-unlock">
            <Ionicons name="finger-print" size={22} color={colors.onBrand} />
            <Text style={[styles.btnText, { color: colors.onBrand }]}>Déverrouiller</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl, zIndex: 1000 },
  title: { fontSize: 20, fontWeight: "700", marginTop: spacing.sm },
  sub: { fontSize: 14, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  btnText: { fontSize: 16, fontWeight: "700" },
});
