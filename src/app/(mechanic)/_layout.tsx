import { Stack } from 'expo-router';

import { RoleGate } from '@/components/role-gate';

export default function MechanicLayout() {
  return (
    <RoleGate allow={['mechanic']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ headerShown: true, title: 'Job details' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="support" options={{ headerShown: true, title: 'Support' }} />
        <Stack.Screen name="reviews" options={{ headerShown: true, title: 'Reviews' }} />
      </Stack>
    </RoleGate>
  );
}
