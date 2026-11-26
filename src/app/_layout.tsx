import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CustomAlertModal } from '@/components/custom-alert';
import { AuthProvider } from '@/providers/auth-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { AppThemeProvider, useAppTheme } from '@/providers/theme-provider';

// Keep native splash screen visible while app initializes
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const { isDark, theme } = useAppTheme();

  const navigationTheme = useMemo(
    () => {
      const base = isDark ? DarkTheme : DefaultTheme;
      return {
        ...base,
        dark: isDark,
        colors: {
          ...base.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
        },
      };
    },
    [isDark, theme]
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <CustomAlertModal />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(mechanic)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Safety guard: ensure native splash is hidden even if the app was opened via a direct deep-link
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <RootNavigation />
          </NotificationProvider>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
