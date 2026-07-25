import {
  THEME_DARK_BACKGROUND,
  THEME_DARK_BORDER,
  THEME_DARK_DANGER,
  THEME_DARK_ON_PRIMARY,
  THEME_DARK_PLACEHOLDER,
  THEME_DARK_PRIMARY,
  THEME_DARK_SECONDARY,
  THEME_DARK_SUCCESS,
  THEME_DARK_SURFACE,
  THEME_DARK_SURFACE_ALT,
  THEME_DARK_TEXT,
  THEME_DARK_TEXT_MUTED,
  THEME_DARK_WARNING,
  THEME_LIGHT_BACKGROUND,
  THEME_LIGHT_BORDER,
  THEME_LIGHT_DANGER,
  THEME_LIGHT_ON_PRIMARY,
  THEME_LIGHT_PLACEHOLDER,
  THEME_LIGHT_PRIMARY,
  THEME_LIGHT_SECONDARY,
  THEME_LIGHT_SUCCESS,
  THEME_LIGHT_SURFACE,
  THEME_LIGHT_SURFACE_ALT,
  THEME_LIGHT_TEXT,
  THEME_LIGHT_TEXT_MUTED,
  THEME_LIGHT_WARNING,
} from '@env';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

export type AppColors = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  onPrimary: string;
  success: string;
  danger: string;
  warning: string;
  placeholder: string;
  overlay: string;
};

const withFallback = (value: string | undefined, fallback: string) =>
  value?.trim() ? value.trim() : fallback;

export const lightColors: AppColors = {
  primary: withFallback(THEME_LIGHT_PRIMARY, '#151831'),
  secondary: withFallback(THEME_LIGHT_SECONDARY, '#79ca14'),
  background: withFallback(THEME_LIGHT_BACKGROUND, '#f6f8fc'),
  surface: withFallback(THEME_LIGHT_SURFACE, '#ffffff'),
  surfaceAlt: withFallback(THEME_LIGHT_SURFACE_ALT, '#eef2ff'),
  text: withFallback(THEME_LIGHT_TEXT, '#0f172a'),
  textMuted: withFallback(THEME_LIGHT_TEXT_MUTED, '#64748b'),
  border: withFallback(THEME_LIGHT_BORDER, '#d8e1eb'),
  onPrimary: withFallback(THEME_LIGHT_ON_PRIMARY, '#ffffff'),
  success: withFallback(THEME_LIGHT_SUCCESS, '#16a34a'),
  danger: withFallback(THEME_LIGHT_DANGER, '#f2664a'),
  warning: withFallback(THEME_LIGHT_WARNING, '#ea580c'),
  placeholder: withFallback(THEME_LIGHT_PLACEHOLDER, '#6b7280'),
  overlay: 'rgba(15, 23, 42, 0.22)',
};

export const darkColors: AppColors = {
  primary: withFallback(THEME_DARK_PRIMARY, '#0f172a'),
  secondary: withFallback(THEME_DARK_SECONDARY, '#8bd44f'),
  background: withFallback(THEME_DARK_BACKGROUND, '#020617'),
  surface: withFallback(THEME_DARK_SURFACE, '#111827'),
  surfaceAlt: withFallback(THEME_DARK_SURFACE_ALT, '#334155'),
  text: withFallback(THEME_DARK_TEXT, '#f8fafc'),
  textMuted: withFallback(THEME_DARK_TEXT_MUTED, '#94a3b8'),
  border: withFallback(THEME_DARK_BORDER, '#334155'),
  onPrimary: withFallback(THEME_DARK_ON_PRIMARY, '#f8fafc'),
  success: withFallback(THEME_DARK_SUCCESS, '#4ade80'),
  danger: withFallback(THEME_DARK_DANGER, '#fb7185'),
  warning: withFallback(THEME_DARK_WARNING, '#fb923c'),
  placeholder: withFallback(THEME_DARK_PLACEHOLDER, '#94a3b8'),
  overlay: 'rgba(2, 6, 23, 0.5)',
  
};

export const getResolvedThemeMode = (
  mode: ThemeMode,
  systemMode: ResolvedThemeMode,
): ResolvedThemeMode => (mode === 'system' ? systemMode : mode);

export const getThemeColors = (mode: ResolvedThemeMode): AppColors =>
  mode === 'dark' ? darkColors : lightColors;
