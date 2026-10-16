import { useCallback, useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import AutoCaresLogo from '../../../components/autocares-logo';
import {
  Card,
  EmptyState,
  ErrorText,
  Field,
  LoadingState,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { recordAdminActivity } from '../../../lib/admin';
import { listProfilesByRole, setProfileDisabled } from '../../../lib/profiles';
import type { Profile } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function AdminUsers() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listProfilesByRole();
    setProfiles(result.profiles.filter((p) => p.role !== 'admin'));
    setError(result.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleDisabled(p: Profile) {
    const result = await setProfileDisabled(p.id, !p.is_disabled);
    if (result.error) {
      Alert.alert('Failed', result.error);
      return;
    }
    if (user) {
      const log = await recordAdminActivity({
        actor_id: user.id,
        action: p.is_disabled ? 'enabled account' : 'disabled account',
        entity_type: 'profile',
        entity_id: p.id,
        details: { role: p.role },
      });
      if (log.error) Alert.alert('Account updated, but activity log failed', log.error);
    }
    load();
  }

  const filtered = profiles.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.full_name ?? '').toLowerCase().includes(q) ||
      p.role.includes(q) ||
      (p.phone ?? '').includes(q)
    );
  });

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <AutoCaresLogo size="header" style={{ marginBottom: 12, alignSelf: 'flex-start' }} />
      <Title>User management</Title>
      <Subtitle>View and manage customer and mechanic accounts.</Subtitle>
      <ErrorText message={error} />
      <Field value={query} onChangeText={setQuery} placeholder="Search name, role, phone" />

      {filtered.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {item.full_name || 'Unnamed'}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {item.role} · {item.is_disabled ? 'Disabled' : 'Active'}
              </Text>
              <Text style={{ color: theme.colors.muted }}>{item.phone || 'No phone'}</Text>
              {item.is_disabled ? (
                <PrimaryButton label="Enable account" onPress={() => toggleDisabled(item)} />
              ) : (
                <OutlineButton label="Disable account" onPress={() => toggleDisabled(item)} />
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
