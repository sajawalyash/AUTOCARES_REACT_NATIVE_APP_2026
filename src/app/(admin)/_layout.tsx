import { Stack } from 'expo-router';

import { RoleGate } from '@/components/role-gate';

export default function AdminLayout() {
  return (
    <RoleGate allow={['admin']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </RoleGate>
  );
}
