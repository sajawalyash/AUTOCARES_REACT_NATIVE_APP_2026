import { Stack } from 'expo-router';

import { RoleGate } from '@/components/role-gate';
import { theme } from '@/constants/autocares-theme';

export default function AdminLayout() {
  return (
    <RoleGate allow={['admin']}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: {
            fontWeight: '800',
            color: theme.colors.text,
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="support" />
        <Stack.Screen name="reviews" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="profile" />
      </Stack>
    </RoleGate>
  );
}
