import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

import { createTheme, type Theme } from '../constants/autocares-theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@autocares_theme_mode';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  isLoaded: boolean;
  theme: Theme;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference from AsyncStorage
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (!isMounted) return;
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setModeState(savedMode);
        }
      })
      .catch((err) => {
        console.warn('[ThemeProvider] Failed to load theme mode:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (err) {
      console.warn('[ThemeProvider] Failed to save theme mode:', err);
    }
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return deviceColorScheme === 'dark';
  }, [mode, deviceColorScheme]);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setMode(nextMode);
  }, [isDark, setMode]);

  const theme = useMemo(() => createTheme(isDark), [isDark]);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      isLoaded,
      theme,
      setMode,
      toggleTheme,
    }),
    [mode, isDark, isLoaded, theme, setMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} animated />
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider (e.g. tests)
    const fallbackTheme = createTheme(false);
    return {
      mode: 'light',
      isDark: false,
      isLoaded: true,
      theme: fallbackTheme,
      setMode: async () => {},
      toggleTheme: async () => {},
    };
  }
  return context;
}
