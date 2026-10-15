import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  LoadingState,
  OutlineButton,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { formatPKR } from '../../../lib/payments';
import { listAllRequests, setRequestDisputeFlag } from '../../../lib/requests';
import { recordAdminActivity } from '../../../lib/admin';
import type { ServiceRequest } from '../../../lib/types';
import { STATUS_LABELS } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

type Filter = 'all' | 'cancelled' | 'completed' | 'disputes' | 'active';

export default function AdminOversight() {
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAllRequests();
    setRequests(result.requests);
    setError(result.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case 'cancelled':
        return requests.filter((r) => r.status === 'cancelled');
      case 'completed':
        return requests.filter((r) => r.status === 'completed');
      case 'disputes':
        return requests.filter((r) => r.dispute_flag);
      case 'active':
        return requests.filter((r) =>
          ['pending', 'accepted', 'en_route', 'in_progress'].includes(r.status)
        );
      default:
        return requests;
    }
  }, [requests, filter]);

  async function toggleDispute(item: ServiceRequest) {
    const result = await setRequestDisputeFlag(item.id, !item.dispute_flag);
    if (result.error) {
      Alert.alert('Failed', result.error);
      return;
    }
    if (user) {
      const log = await recordAdminActivity({
        actor_id: user.id,
        action: item.dispute_flag ? 'cleared request dispute' : 'flagged request dispute',
        entity_type: 'service_request',
        entity_id: item.id,
      });
      if (log.error) Alert.alert('Request updated, but activity log failed', log.error);
    }
    load();
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Service oversight</Title>
      <Subtitle>Monitor requests, cancellations, and disputes.</Subtitle>
      <ErrorText message={error} />
      <ErrorText message={categoryError} />

      <View style={styles.filters}>
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['cancelled', 'Cancelled'],
            ['completed', 'Completed'],
            ['disputes', 'Disputes'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.chip, filter === key && styles.chipOn]}>
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState message="No matching requests." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                {problemLabels[item.problem_type]}
                {item.is_sos ? ' · SOS' : ''}
                {item.dispute_flag ? ' · DISPUTE' : ''}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {STATUS_LABELS[item.status]} · {item.profiles?.full_name ?? 'Customer'}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                {new Date(item.created_at).toLocaleString()}
                {item.final_cost != null ? ` · ${formatPKR(Number(item.final_cost))}` : ''}
              </Text>
              <OutlineButton
                label={item.dispute_flag ? 'Clear dispute flag' : 'Flag dispute'}
                onPress={() => toggleDispute(item)}
              />
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
