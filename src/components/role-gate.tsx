import { Redirect, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { theme } from '../constants/autocares-theme';
import type { UserRole } from '../lib/types';
import { roleHome, useAuth } from '../providers/auth-provider';

export function RoleGate({
  allow,
  children,
}: PropsWithChildren<{ allow: UserRole[] }>) {
  const { session, role, profile, isLoading } = useAuth();

  if (isLoading || (session && !role)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <ActivityIndicator color={theme.colors.blue} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (profile?.is_disabled) {
    return <Redirect href="/login" />;
  }

  if (!role || !allow.includes(role)) {
    return <Redirect href={roleHome(role) as Href} />;
  }

  return <>{children}</>;
}
