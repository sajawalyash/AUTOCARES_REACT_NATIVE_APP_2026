import { Stack } from 'expo-router';

import { RoleGate } from '@/components/role-gate';

export default function CustomerLayout() {
  return (
    <RoleGate allow={['customer']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="request" options={{ presentation: 'modal', headerShown: true, title: 'Request help' }} />
        <Stack.Screen name="tracking/[id]" options={{ headerShown: true, title: 'Live tracking' }} />
        <Stack.Screen name="vehicles" options={{ headerShown: true, title: 'My vehicles' }} />
        <Stack.Screen name="sos" options={{ headerShown: true, title: 'Emergency SOS' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="support" options={{ headerShown: true, title: 'Contact support' }} />
        <Stack.Screen name="help" options={{ headerShown: true, title: 'Help' }} />
        <Stack.Screen name="obd-ii" options={{ headerShown: true, title: 'OBD-II Diagnostics' }} />
      </Stack>
    </RoleGate>
  );
}
