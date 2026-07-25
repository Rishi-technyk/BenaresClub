import React, { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setThemeMode } from '../store/slices/themeSlice';
import {
  AppColors,
  getResolvedThemeMode,
  getThemeColors,
  ResolvedThemeMode,
  ThemeMode,
} from './theme';

type AppThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  colors: AppColors;
  navigationTheme: NavigationTheme;
  paperTheme: MD3Theme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export const AppThemeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const dispatch = useDispatch();
  const preferredMode = useSelector((state: RootState) => state.theme.mode);
  const systemColorScheme = useColorScheme();
  const systemMode: ResolvedThemeMode =
    systemColorScheme === 'dark' ? 'dark' : 'light';
  const resolvedMode = getResolvedThemeMode(preferredMode, systemMode);
  const colors = getThemeColors(resolvedMode);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const baseTheme = resolvedMode === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, resolvedMode]);

  const paperTheme = useMemo<MD3Theme>(() => {
    const baseTheme = resolvedMode === 'dark' ? MD3DarkTheme : MD3LightTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        secondary: colors.secondary,
        background: colors.background,
        surface: colors.surface,
        surfaceVariant: colors.surfaceAlt,
        onSurface: colors.text,
        onBackground: colors.text,
        outline: colors.border,
        error: colors.danger,
      },
    };
  }, [colors, resolvedMode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode: preferredMode,
      resolvedMode,
      colors,
      navigationTheme,
      paperTheme,
      setMode: (mode: ThemeMode) => dispatch(setThemeMode(mode)),
      toggleMode: () =>
        dispatch(setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark')),
    }),
    [colors, dispatch, navigationTheme, paperTheme, preferredMode, resolvedMode],
  );

  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
};
