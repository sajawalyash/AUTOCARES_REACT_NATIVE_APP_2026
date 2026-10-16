import { Stack } from 'expo-router';

import { RoleGate } from '@/components/role-gate';
import { theme } from '@/constants/autocares-theme';

export default function MechanicLayout() {
  return (
    <RoleGate allow={['mechanic']}>
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
        <Stack.Screen
          name="job/[id]"
          options={{
            headerShown: true,
            title: 'Job Details & Billing',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: 'Job Notifications',
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            headerShown: true,
            title: 'Support',
          }}
        />
        <Stack.Screen
          name="reviews"
          options={{
            headerShown: true,
            title: 'Customer Reviews',
          }}
        />
      </Stack>
    </RoleGate>
  );
}
