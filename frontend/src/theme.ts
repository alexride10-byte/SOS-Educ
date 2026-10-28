import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, StyleSheet, useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#F9FAFB",
  onSurface: "#111827",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1F2937",
  surfaceTertiary: "#F3F4F6",
  onSurfaceTertiary: "#374151",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B7280",

  // Brand (Teal)
  brand: "#0F766E",
  onBrand: "#FFFFFF",
  brandPrimary: "#0F766E",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#CCFBF1",
  onBrandSecondary: "#0F766E",
  brandTertiary: "#E2E8F0",
  onBrandTertiary: "#334155",

  success: "#166534",
  onSuccess: "#FFFFFF",
  warning: "#B45309",
  onWarning: "#FFFFFF",
  error: "#B91C1C",
  onError: "#FFFFFF",
  info: "#0369A1",
  onInfo: "#FFFFFF",

  border: "#E5E7EB",
  borderStrong: "#9CA3AF",
  divider: "#F3F4F6",
};

const dark: typeof light = {
  surface: "#0B1220",
  onSurface: "#F9FAFB",
  surfaceSecondary: "#111827",
  onSurfaceSecondary: "#E5E7EB",
  surfaceTertiary: "#1F2937",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#F9FAFB",
  onSurfaceInverse: "#111827",
  muted: "#9CA3AF",

  brand: "#2DD4BF",
  onBrand: "#042F2E",
  brandPrimary: "#2DD4BF",
  onBrandPrimary: "#042F2E",
  brandSecondary: "#134E4A",
  onBrandSecondary: "#CCFBF1",
  brandTertiary: "#1E293B",
  onBrandTertiary: "#CBD5E1",

  success: "#22C55E",
  onSuccess: "#052E16",
  warning: "#F59E0B",
  onWarning: "#1F1203",
  error: "#F87171",
  onError: "#2A0A0A",
  info: "#38BDF8",
  onInfo: "#082F49",

  border: "#1F2937",
  borderStrong: "#374151",
  divider: "#1F2937",
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
  card: "#0B1220",
  cardBorder: "#1E293B",
  text: "#F9FAFB",
  muted: "#94A3B8",
  track: "#1E3A8A",
  budget: "#3B82F6",
  spent: "#22D3EE",
  over: "#F87171",
  ok: "#34D399",
  warn: "#FBBF24",
};

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
