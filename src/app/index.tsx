import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { theme } from '../constants/autocares-theme';
import { roleHome, useAuth } from '../providers/auth-provider';

export default function Index() {
  const { session, role, isLoading } = useAuth();

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

  return <Redirect href={roleHome(role) as Href} />;
}
