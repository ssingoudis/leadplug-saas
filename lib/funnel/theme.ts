import type { FunnelFont, FunnelTheme, IconColor } from "@/types";
import { normalizeHex, darken, mix } from "@/lib/funnel/colors";

// Theme-Auflösung: mergt Tenant-Overrides mit Defaults und leitet alle Sekundär-
// farben (Hover/Muted/Border/Tint) via Color-Math ab — keine manuellen Farben nötig.

const THEME_DEFAULTS = {
  primaryColor:        "#22c55e",
  textColor:           "#1f2937",
  backgroundColor:     "#ffffff",
  pageBackgroundColor: "transparent",
  font:                "system" as FunnelFont,
  borderRadius:        "0.5rem",
  maxWidth:            "720px",
};

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Self-hosted fonts loaded via @font-face in app/globals.css (DSGVO-konform).
// Aufgabe 66: +6 Familien. Merriweather ist die Serife → eigener Serif-Fallback-Stack.
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const FONT_STACKS: Record<FunnelFont, string> = {
  system:         SYSTEM_FONT,
  inter:          `'Inter', ${SYSTEM_FONT}`,
  poppins:        `'Poppins', ${SYSTEM_FONT}`,
  roboto:         `'Roboto', ${SYSTEM_FONT}`,
  montserrat:     `'Montserrat', ${SYSTEM_FONT}`,
  "open-sans":    `'Open Sans', ${SYSTEM_FONT}`,
  lato:           `'Lato', ${SYSTEM_FONT}`,
  nunito:         `'Nunito', ${SYSTEM_FONT}`,
  "dm-sans":      `'DM Sans', ${SYSTEM_FONT}`,
  merriweather:   `'Merriweather', ${SERIF_FALLBACK}`,
};

// Aufgelöstes Theme, das der Render konsumiert. pageBackgroundColor ist mit drin
// (Seiten-/iFrame-Hintergrund um die Card).
export interface ResolvedFunnelTheme {
  primaryColor:        string;
  primaryColorHover:   string;
  textColor:           string;
  textColorMuted:      string;
  backgroundColor:     string;
  borderColor:         string;
  underlineColor:      string;
  tintColor:           string;
  tintColorHover:      string;
  inputBgColor:        string;
  pageBackgroundColor: string;
  borderRadius:        string;
  maxWidth:            string;
  fontFamily:          string;
  // Aufgabe 77: Farbmodus der Bibliotheks-Icons ('neutral' = textColor, 'brand' = primaryColor).
  iconColor:           IconColor;
}

// primary/text/background MÜSSEN durch normalizeHex (Color-Math braucht 6-stelliges
// Hex). pageBackgroundColor bleibt roh — reiner CSS-Wert, darf 'transparent' sein.
export function resolveFunnelTheme(themeOverrides?: Partial<FunnelTheme>): ResolvedFunnelTheme {
  const primaryColor        = normalizeHex(themeOverrides?.primaryColor,    THEME_DEFAULTS.primaryColor);
  const textColor           = normalizeHex(themeOverrides?.textColor,       THEME_DEFAULTS.textColor);
  const backgroundColor     = normalizeHex(themeOverrides?.backgroundColor, THEME_DEFAULTS.backgroundColor);
  const pageBackgroundColor = themeOverrides?.pageBackgroundColor ?? THEME_DEFAULTS.pageBackgroundColor;
  const borderRadius        = themeOverrides?.borderRadius        ?? THEME_DEFAULTS.borderRadius;
  const maxWidth            = themeOverrides?.maxWidth            ?? THEME_DEFAULTS.maxWidth;
  const font                = themeOverrides?.font                ?? THEME_DEFAULTS.font;

  return {
    primaryColor,
    primaryColorHover: darken(primaryColor, 0.12),
    textColor,
    textColorMuted:    mix(backgroundColor, textColor, 0.55),
    backgroundColor,
    borderColor:       mix(backgroundColor, textColor, 0.12),
    // Underline für Text-Inputs (resting state): 35% Brand-Mix mit BG.
    // Aktiv (focus) bleibt voller primaryColor. Gibt subtile Markenpräsenz ohne
    // den cleanen Typeform-Look mit klobigem Border zu zerstören.
    underlineColor:    mix(backgroundColor, primaryColor, 0.35),
    // Tint-Variante des Brand-Colors für „weiche" Hintergründe: Choice-Option-Cards
    // im Resting-State, Back-Button, etc. Hover ist eine Stufe stärker.
    tintColor:         mix(backgroundColor, primaryColor, 0.06),
    tintColorHover:    mix(backgroundColor, primaryColor, 0.12),
    inputBgColor:      mix(backgroundColor, textColor, 0.03),
    pageBackgroundColor,
    borderRadius,
    maxWidth,
    fontFamily:        FONT_STACKS[font],
    iconColor:         themeOverrides?.iconColor === "brand" ? "brand" : "neutral",
  };
}
