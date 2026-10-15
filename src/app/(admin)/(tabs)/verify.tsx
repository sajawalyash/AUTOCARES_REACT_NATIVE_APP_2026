import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  LoadingState,
  OutlineButton,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { listAdminMechanicProfiles, recordAdminActivity } from '../../../lib/admin';
import { setVerificationStatus } from '../../../lib/mechanics';
import type { AdminMechanicProfile, VerificationStatus } from '../../../lib/types';
import { createNotification } from '../../../lib/notifications';
import { useAuth } from '../../../providers/auth-provider';

export default function AdminVerify() {
  const { user } = useAuth();
  const [mechanics, setMechanics] = useState<AdminMechanicProfile[]>([]);
  const [filter, setFilter] = useState<VerificationStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminMechanicProfiles();
    setMechanics(result.mechanics);
    setError(result.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function decide(userId: string, status: 'approved' | 'rejected') {
    const result = await setVerificationStatus(userId, status);
    if (result.error) {
      Alert.alert('Failed', result.error);
      return;
    }
    if (user) {
      const log = await recordAdminActivity({
        actor_id: user.id,
        action: status === 'approved' ? 'approved mechanic' : 'rejected mechanic',
        entity_type: 'mechanic_profile',
        entity_id: userId,
      });
      if (log.error) Alert.alert('Decision saved, but activity log failed', log.error);
    }
    const notification = await createNotification({
      user_id: userId,
      title: status === 'approved' ? 'Verified' : 'Application rejected',
      body:
        status === 'approved'
          ? 'Your mechanic profile was approved. You can accept jobs.'
          : 'Your mechanic application was rejected. Contact support for details.',
    });
    if (notification.error) {
      Alert.alert('Decision saved, but notification failed', notification.error);
    }
    load();
  }

  const filtered = mechanics.filter((mechanic) => mechanic.verification_status === filter);

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Mechanic verification</Title>
      <Subtitle>Review mechanic identity and update application status.</Subtitle>
      <ErrorText message={error} />
      <View style={styles.filters}>
        {(
          [
            ['pending', 'Pending'],
            ['approved', 'Approved'],
            ['rejected', 'Rejected'],
          ] as const
        ).map(([status, label]) => (
          <Pressable
            key={status}
            onPress={() => setFilter(status)}
            style={[styles.chip, filter === status && styles.chipOn]}>
            <Text style={styles.chipText}>
              {label} ({mechanics.filter((item) => item.verification_status === status).length})
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState message={`No ${filter} mechanic applications.`} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {item.workshop_name || item.profiles?.full_name || 'Mechanic'}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                Experience: {item.experience_years} yrs · Radius: {item.service_radius_km} km
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                CNIC: {item.cnic_number || 'Not provided'}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Status: {item.verification_status}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Specialties: {item.specialties?.join(', ') || 'None listed'}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                Hours: {item.working_hours || 'N/A'}
              </Text>
              {item.bio ? (
                <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{item.bio}</Text>
              ) : null}
              {item.verification_status !== 'approved' && (
                <PrimaryButton label="Approve" onPress={() => decide(item.user_id, 'approved')} />
              )}
              {item.verification_status !== 'rejected' && (
                <OutlineButton label="Reject" onPress={() => decide(item.user_id, 'rejected')} />
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  chipOn: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.blue },
  chipText: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
});
