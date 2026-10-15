import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  Card,
  EmptyState,
  ErrorText,
  LoadingState,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { theme } from '../../../constants/autocares-theme';
import { useProblemLabels } from '../../../hooks/use-problem-labels';
import { go } from '../../../lib/nav';
import { formatPKR } from '../../../lib/payments';
import { listMechanicJobs } from '../../../lib/requests';
import type { ServiceRequest } from '../../../lib/types';
import { FIXED_DIAGNOSIS_FEE, STATUS_LABELS } from '../../../lib/types';
import { useAuth } from '../../../providers/auth-provider';

export default function MyJobsScreen() {
  const { user } = useAuth();
  const { problemLabels, categoryError } = useProblemLabels();
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { requests } = await listMechanicJobs(user.id);
    setJobs(requests);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>My jobs</Title>
      <Subtitle>Accepted and completed roadside jobs.</Subtitle>
      <ErrorText message={categoryError} />
      {jobs.length === 0 ? (
        <EmptyState message="No jobs yet. Accept a request to get started." />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => go(`/(mechanic)/job/${item.id}`)}>
              <Card>
                <Text style={{ fontWeight: '800', color: theme.colors.text }}>
                  {problemLabels[item.problem_type]}
                </Text>
                <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                  {STATUS_LABELS[item.status]} · {item.profiles?.full_name ?? 'Customer'}
                </Text>
                <Text style={{ color: theme.colors.blue, fontWeight: '700', marginTop: 4 }}>
                  Diagnosis: {formatPKR(item.diagnosis_fee ?? FIXED_DIAGNOSIS_FEE)} ({item.diagnosis_payment_status === 'paid' ? 'Paid' : 'Pending'})
                  {item.repair_charges != null
                    ? ` · Repair: ${formatPKR(item.repair_charges)} (${item.repair_payment_status === 'paid' ? 'Paid' : 'Pending'})`
                    : ''}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
