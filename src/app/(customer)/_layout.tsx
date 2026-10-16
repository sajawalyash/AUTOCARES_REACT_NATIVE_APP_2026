import { Stack } from 'expo-router';

import { RoleGate } from '@/components/role-gate';
import { theme } from '@/constants/autocares-theme';

export default function CustomerLayout() {
  return (
    <RoleGate allow={['customer']}>
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
          name="request"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Request Help',
          }}
        />
        <Stack.Screen
          name="tracking/[id]"
          options={{
            headerShown: true,
            title: 'Live Tracking',
          }}
        />
        <Stack.Screen
          name="vehicles"
          options={{
            headerShown: true,
            title: 'My Vehicles',
          }}
        />
        <Stack.Screen
          name="sos"
          options={{
            headerShown: true,
            title: 'Emergency SOS',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: 'Notifications',
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            headerShown: true,
            title: 'Contact Support',
          }}
        />
        <Stack.Screen
          name="help"
          options={{
            headerShown: true,
            title: 'Help Center',
          }}
        />
        <Stack.Screen
          name="obd-ii"
          options={{
            headerShown: true,
            title: 'OBD-II Diagnostics',
          }}
        />
      </Stack>
    </RoleGate>
  );
}
