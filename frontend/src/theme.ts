import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, StyleSheet, useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorScheme = "light" | "dark";

// Palette "cahier" : bleu encre, papier bleute, rouge de la marge (accent rare).
const light = {
  // Surfaces
  surface: "#EEF1F8",
  onSurface: "#141B34",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1E2747",
  surfaceTertiary: "#E3E8F4",
  onSurfaceTertiary: "#3A4468",
  surfaceInverse: "#141B34",
  onSurfaceInverse: "#FFFFFF",
  muted: "#5A6688",

  // Encre
  brand: "#2340C8",
  onBrand: "#FFFFFF",
  brandPrimary: "#2340C8",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#DDE3FB",
  onBrandSecondary: "#1B2F99",
  brandTertiary: "#E3E8F4",
  onBrandTertiary: "#3A4468",
  margin: "#E2384D",

  success: "#1E7A46",
  onSuccess: "#FFFFFF",
  warning: "#B4540A",
  onWarning: "#FFFFFF",
  error: "#C8283C",
  onError: "#FFFFFF",
  info: "#0E6FA8",
  onInfo: "#FFFFFF",

  border: "#D5DCEC",
  borderStrong: "#9AA6C6",
  divider: "#E3E8F4",
};

const dark: typeof light = {
  surface: "#0D1330",
  onSurface: "#EEF1FB",
  surfaceSecondary: "#161E45",
  onSurfaceSecondary: "#DCE2F5",
  surfaceTertiary: "#1F2958",
  onSurfaceTertiary: "#C3CBE6",
  surfaceInverse: "#EEF1FB",
  onSurfaceInverse: "#0D1330",
  muted: "#95A0C4",

  brand: "#8FA2FF",
  onBrand: "#0D1330",
  brandPrimary: "#8FA2FF",
  onBrandPrimary: "#0D1330",
  brandSecondary: "#26337A",
  onBrandSecondary: "#DDE3FB",
  brandTertiary: "#1F2958",
  onBrandTertiary: "#C3CBE6",
  margin: "#FF6B7D",

  success: "#4ADE80",
  onSuccess: "#052E16",
  warning: "#FBBF24",
  onWarning: "#1F1203",
  error: "#FF6B7D",
  onError: "#2A0A0A",
  info: "#7CC4F5",
  onInfo: "#082F49",

  border: "#263066",
  borderStrong: "#3A4685",
  divider: "#1F2958",
};

export type ThemeColors = typeof light;

const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

// ---------- Theme context (manual override + system) ----------
type Preference = "system" | ColorScheme;

interface ThemeCtx {
  scheme: ColorScheme;
  colors: ThemeColors;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "cs.theme.pref.v1";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useRNColorScheme();
  const [preference, setPrefState] = useState<Preference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setPrefState(v);
      })
      .finally(() => setLoaded(true));
  }, []);

  const scheme: ColorScheme = useMemo(() => {
    if (preference === "system") return (system === "dark" ? "dark" : "light");
    return preference;
  }, [preference, system]);

  useEffect(() => {
    if (!loaded) return;
    Appearance.setColorScheme?.(preference === "system" ? "unspecified" : (preference as any));
  }, [preference, loaded]);

  const value: ThemeCtx = useMemo(
    () => ({
      scheme,
      colors: themes[scheme],
      toggle: () => {
        const next: Preference = scheme === "dark" ? "light" : "dark";
        setPrefState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    }),
    [scheme],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  // Fallback for non-wrapped render (shouldn't happen in app)
  return {
    scheme: "light",
    colors: light,
    toggle: () => {},
  };
}

// Themed StyleSheet factory: returns a hook that rebuilds the sheet when the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors: c } = useTheme();
    return useMemo(() => StyleSheet.create(factory(c)), [c]);
  };
}

// Couleurs fixes, identiques en theme clair et sombre : graphiques budget et codes enfants.
export const categoryColors = {
  alimentation: "#F59E0B",
  entretien: "#06B6D4",
  animation: "#EC4899",
  divers: "#A855F7",
} as const;

export const budgetPalette = {
  card: "#141B34",
  cardBorder: "#26305A",
  text: "#FFFFFF",
  muted: "#A3ADCF",
  track: "#26337A",
  budget: "#7D93FF",
  spent: "#FFC24B",
  over: "#FF6B7D",
  ok: "#4ADE80",
  warn: "#FF9F43",
};

// Titres et montants : Archivo extra-grasse (chargee au demarrage dans app/_layout.tsx)
export const fonts = { display: "Archivo_800ExtraBold", black: "Archivo_900Black" };

export const childDefaultColors = { A: "#3B82F6", B: "#10B981", C: "#F59E0B", D: "#EF4444", E: "#8B5CF6" };
export const childColorChoices = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#94A3B8",
];
export const onSwatch = "#0B1220"; // texte lisible sur les pastilles colorees

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
