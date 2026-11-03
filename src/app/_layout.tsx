import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CustomAlertModal } from '@/components/custom-alert';
import { AuthProvider } from '@/providers/auth-provider';
import { NotificationProvider } from '@/providers/notification-provider';

// Keep native splash screen visible while app initializes
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Safety guard: ensure native splash is hidden even if the app was opened via a direct deep-link
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <CustomAlertModal />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(mechanic)" />
              <Stack.Screen name="(admin)" />
            </Stack>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
