import { router } from 'expo-router';
import { Text } from 'react-native';

import {
  Card,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useAuth } from '../../../providers/auth-provider';

export default function AdminProfile() {
  const { user, profile, signOut } = useAuth();

  return (
    <Screen>
      <Title>Admin profile</Title>
      <Subtitle>Platform management account</Subtitle>

      <Card>
        <Text style={{ fontWeight: '800', color: theme.colors.text }}>
          {profile?.full_name || 'Administrator'}
        </Text>
        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{user?.email}</Text>
        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>Role: admin</Text>
      </Card>

      <OutlineButton
        label="Open user management"
        onPress={() => router.push('/(admin)/(tabs)/users')}
      />
      <OutlineButton
        label="Open verification queue"
        onPress={() => router.push('/(admin)/(tabs)/verify')}
      />

      <PrimaryButton
        label="Sign out"
        danger
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}
      />
    </Screen>
  );
}
