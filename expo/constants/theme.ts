import { Platform } from "react-native";

export type ThemeMode = "light" | "dark";
export type AccentKey = "blueprint" | "amber" | "green" | "red";

export interface AccentDefinition {
  key: AccentKey;
  label: string;
  light: string;
  dark: string;
  faintLight: string;
  faintDark: string;
}

export const ACCENTS: AccentDefinition[] = [
  {
    key: "blueprint",
    label: "Blueprint Blue",
    light: "#2B5BE3",
    dark: "#7C9BFF",
    faintLight: "rgba(43, 91, 227, 0.08)",
    faintDark: "rgba(124, 155, 255, 0.12)",
  },
  {
    key: "amber",
    label: "Amber",
    light: "#B97D10",
    dark: "#E3B25C",
    faintLight: "rgba(185, 125, 16, 0.08)",
    faintDark: "rgba(227, 178, 92, 0.12)",
  },
  {
    key: "green",
    label: "Green",
    light: "#1E7A4E",
    dark: "#5FBF8F",
    faintLight: "rgba(30, 122, 78, 0.08)",
    faintDark: "rgba(95, 191, 143, 0.12)",
  },
  {
    key: "red",
    label: "Red",
    light: "#B8433C",
    dark: "#E0776F",
    faintLight: "rgba(184, 67, 60, 0.08)",
    faintDark: "rgba(224, 119, 111, 0.12)",
  },
];

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  border: string;
  hairline: string;
  accent: string;
  accentFaint: string;
  positive: string;
  negative: string;
  amber: string;
  inverse: string;
  inverseText: string;
}

export function buildTheme(mode: ThemeMode, accentKey: AccentKey): ThemeColors {
  const accent = ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0];
  if (mode === "dark") {
    return {
      background: "#0B0D11",
      surface: "#12151B",
      surfaceRaised: "#181C24",
      text: "#F2F3F6",
      textSecondary: "#9AA1AE",
      textFaint: "#5C6472",
      border: "#232834",
      hairline: "#1B2029",
      accent: accent.dark,
      accentFaint: accent.faintDark,
      positive: "#5FBF8F",
      negative: "#E0776F",
      amber: "#E3B25C",
      inverse: "#F2F3F6",
      inverseText: "#0B0D11",
    };
  }
  return {
    background: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    text: "#0D0F13",
    textSecondary: "#6E7583",
    textFaint: "#A6ACB8",
    border: "#E5E8EE",
    hairline: "#EDEFF4",
    accent: accent.light,
    accentFaint: accent.faintLight,
    positive: "#1E7A4E",
    negative: "#B8433C",
    amber: "#B97D10",
    inverse: "#0D0F13",
    inverseText: "#FFFFFF",
  };
}

/** Monospace family used for blueprint-style annotations and figures. */
export const MONO = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
}) as string;

export const LABEL_SPACING = 1.6;
